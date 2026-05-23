// Lead-matching for ingested transcripts.
//
// Lead match strategy: phone number (deterministic) →
// email/domain (deterministic) → Claude classifier (fallback). Returns
// { lead_id, confidence } or unmatched.

import { supabase } from '../lib/supabase';
import { callClaudeJSON } from '../llm/client';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface LeadCandidate {
  id: string;
  name?: string | null;
  title?: string | null;
  company?: string | null;
  domain?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface MatchResult {
  lead_id: string | null;
  confidence: MatchConfidence;
  reasoning?: string;
  matcher: 'phone' | 'email' | 'domain' | 'classifier' | 'unmatched';
}

const RECENT_DAYS = 30;
const CANDIDATE_CAP = 50;

/**
 * Normalize a phone number to its last 7 digits — robust against country code
 * and formatting drift. "(415) 555-1234", "+1-415-555-1234", "415.555.1234"
 * all collapse to "5551234".
 */
function last7Digits(s: string | null | undefined): string | null {
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-7);
}

const PHONE_RE = /\+?\d[\d\s().\-]{7,}\d/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const DOMAIN_RE = /\b([a-z0-9][a-z0-9-]{1,62}\.[a-z]{2,})\b/gi;

function extractPhones(text: string): string[] {
  return [...new Set((text.match(PHONE_RE) ?? []).map((p) => last7Digits(p)).filter((x): x is string => Boolean(x)))];
}
function extractEmails(text: string): string[] {
  return [...new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))];
}
function extractDomains(text: string): string[] {
  const matches = (text.match(DOMAIN_RE) ?? []).map((d) => d.toLowerCase());
  // Filter common junk
  const skip = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com', 'i.e.', 'e.g.']);
  return [...new Set(matches.filter((d) => !skip.has(d) && d.length >= 4))];
}

async function loadCandidates(vertical_id: string): Promise<LeadCandidate[]> {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase()
    .from('leads')
    .select('id, name, title, company, domain, email, phone')
    .eq('vertical_id', vertical_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_CAP);
  return (data ?? []) as LeadCandidate[];
}

/**
 * Phone-number lookup against the candidate set.
 * Compares last-7 digits to ignore country-code / formatting drift.
 */
function matchByPhone(extractedPhones: string[], candidates: LeadCandidate[]): MatchResult | null {
  if (extractedPhones.length === 0) return null;
  for (const c of candidates) {
    const cand7 = last7Digits(c.phone);
    if (!cand7) continue;
    if (extractedPhones.includes(cand7)) {
      return { lead_id: c.id, confidence: 'high', matcher: 'phone', reasoning: `Last-7-digit phone match: ${cand7}` };
    }
  }
  return null;
}

function matchByEmailOrDomain(emails: string[], domains: string[], candidates: LeadCandidate[]): MatchResult | null {
  for (const c of candidates) {
    if (c.email && emails.includes(c.email.toLowerCase())) {
      return { lead_id: c.id, confidence: 'high', matcher: 'email', reasoning: `Exact email: ${c.email}` };
    }
  }
  for (const c of candidates) {
    if (!c.domain) continue;
    const cd = c.domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]!;
    if (domains.some((d) => d.endsWith(cd) || cd.endsWith(d))) {
      return { lead_id: c.id, confidence: 'high', matcher: 'domain', reasoning: `Domain match: ${cd}` };
    }
  }
  return null;
}

const CLASSIFIER_SYSTEM = `You are matching a sales-call transcript to one of N candidate leads.
Return JSON: { "lead_id": "uuid"|null, "confidence": "high"|"medium"|"low", "reasoning": "<one sentence>" }.
Only return a lead_id if the transcript clearly refers to that lead by name, company, or unambiguous context.
Return null if no candidate matches — do NOT guess.`;

async function matchByClassifier(
  transcriptText: string,
  meetingTitle: string | undefined,
  candidates: LeadCandidate[]
): Promise<MatchResult> {
  if (candidates.length === 0) {
    return { lead_id: null, confidence: 'unmatched', matcher: 'unmatched' };
  }
  const sample = transcriptText.length > 2000 ? transcriptText.slice(0, 1500) + '\n…\n' + transcriptText.slice(-500) : transcriptText;
  const user = `Meeting title: "${meetingTitle ?? '(no title)'}"
Transcript:
"""
${sample}
"""

Candidate leads:
${candidates.map((c) => `- ${c.id} :: ${c.name ?? '(no name)'} — ${c.title ?? ''} at ${c.company ?? ''} (${c.email ?? ''})`).join('\n')}

Return JSON.`;

  try {
    const result = await callClaudeJSON<{ lead_id: string | null; confidence?: string; reasoning?: string }>({
      system: CLASSIFIER_SYSTEM,
      user,
      maxTokens: 400,
      temperature: 0,
    });

    const conf = (result.confidence ?? 'low').toLowerCase();
    const isValidConfidence = conf === 'high' || conf === 'medium' || conf === 'low';
    if (!result.lead_id) {
      return { lead_id: null, confidence: 'unmatched', matcher: 'classifier', reasoning: result.reasoning };
    }
    return {
      lead_id: result.lead_id,
      confidence: (isValidConfidence ? conf : 'low') as 'high' | 'medium' | 'low',
      matcher: 'classifier',
      reasoning: result.reasoning,
    };
  } catch {
    return { lead_id: null, confidence: 'unmatched', matcher: 'unmatched' };
  }
}

export async function matchTranscriptToLead(args: {
  vertical_id: string;
  transcript_text: string;
  meeting_title?: string;
}): Promise<MatchResult> {
  const candidates = await loadCandidates(args.vertical_id);

  const phones = extractPhones(args.transcript_text);
  const phoneHit = matchByPhone(phones, candidates);
  if (phoneHit) return phoneHit;

  const emails = extractEmails(args.transcript_text);
  const domains = extractDomains(args.transcript_text);
  const emailHit = matchByEmailOrDomain(emails, domains, candidates);
  if (emailHit) return emailHit;

  return matchByClassifier(args.transcript_text, args.meeting_title, candidates);
}

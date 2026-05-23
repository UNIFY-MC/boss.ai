// Pre-emptive follow-up email draft. Runs right after brain extraction
// on a fresh transcript: takes the lead's just-updated memory_summary +
// the vertical's voice/tone, asks Claude to draft a short follow-up,
// and persists to email_drafts(status='ready'). The leads page surfaces
// a "Draft ready" badge so the operator can send with one click.

import { callClaudeJSON } from '../llm/client';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import type { VerticalRow } from '../pipeline/types';

interface LeadLite {
  id: string;
  vertical_id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  memory_summary: string | null;
}

interface DraftArgs {
  lead: LeadLite;
  vertical: VerticalRow;
  transcript_id: string;
  senderName: string;
  senderCompany: string;
}

const SYSTEM = `You are drafting a follow-up email after a sales call, in the voice of a specific outbound vertical.

Rules:
- Match the vertical's tone (provided in the prompt).
- Short: 80-120 words for the body.
- Open with one line that references the recipient by name AND something concrete from the call (drawn from "WHAT JUST HAPPENED ON THE CALL").
- Single, concrete next step at the end (15-min call, a specific data send, a date).
- Never use: amazing, awesome, incredible, seamless, cutting-edge, game-changer, revolutionary, synergy, leverage.
- Don't claim pricing or outcomes you didn't actually get on the call.
- Sign off with the sender's name and the company name as given.
- Plain text. No markdown. No HTML.

Return ONLY a JSON object with keys "subject" and "body". No prose around it.`;

interface DraftResult {
  subject: string;
  body: string;
}

export async function draftFollowUpEmail(args: DraftArgs): Promise<DraftResult | null> {
  const { lead, vertical, transcript_id, senderName, senderCompany } = args;

  if (!lead.email) {
    // No point drafting if we can't deliver
    return null;
  }

  const voice = (vertical.config as { voice?: { tone?: string; dos?: string[]; donts?: string[] } } | undefined)?.voice || {};
  const lines: (string | null)[] = [
    `VERTICAL: ${vertical.display_name}`,
    `VOICE/TONE: ${voice.tone || 'professional, direct'}`,
    voice.dos?.length ? `DO: ${voice.dos.join('; ')}` : null,
    voice.donts?.length ? `DON'T: ${voice.donts.join('; ')}` : null,
    '',
    `RECIPIENT: ${lead.name || 'Unknown'} — ${lead.title || '?'} at ${lead.company || '?'}`,
    '',
    lead.memory_summary
      ? `WHAT JUST HAPPENED ON THE CALL: "${lead.memory_summary}"`
      : '(transcript ingested but no memory summary extracted — keep the email generic but warm)',
    '',
    `SENDER: ${senderName}, ${senderCompany}`,
    '',
    'Return JSON: { "subject": "...", "body": "..." }',
  ];

  let result: DraftResult;
  try {
    result = await callClaudeJSON<DraftResult>({
      system: SYSTEM,
      user: lines.filter(Boolean).join('\n'),
      maxTokens: 1500,
      temperature: 0.3,
    });
  } catch (err) {
    console.error('[draft-email] claude call failed:', (err as Error).message);
    await logActivity({
      vertical_id: lead.vertical_id,
      lead_id: lead.id,
      type: 'error',
      message: `❌ Auto-draft failed: ${(err as Error).message}`,
    });
    return null;
  }

  if (!result?.subject || !result?.body) {
    return null;
  }

  // Supersede any older ready drafts for this lead
  await supabase()
    .from('email_drafts')
    .update({ status: 'discarded' })
    .eq('lead_id', lead.id)
    .eq('status', 'ready');

  const { error } = await supabase().from('email_drafts').insert({
    lead_id: lead.id,
    vertical_id: lead.vertical_id,
    transcript_id,
    subject: result.subject,
    body: result.body,
    status: 'ready',
    generated_by: 'agent',
  });
  if (error) {
    console.error('[draft-email] insert failed:', error.message);
    return null;
  }

  await logActivity({
    vertical_id: lead.vertical_id,
    lead_id: lead.id,
    type: 'agent_step',
    message: `✍️ Auto-drafted follow-up email for ${lead.name || 'lead'} — "${result.subject.slice(0, 60)}"`,
  });

  return result;
}

import type { VerticalConfig } from '@verticals';

export interface VerticalRow {
  id: string;
  slug: string;
  display_name: string;
  config: VerticalConfig;
}

export interface BrainEntry {
  id: string;
  type: string;
  content: string;
  weight: number;
  source: string | null;
}

export interface RawSignal {
  source_name: string;
  title: string;
  description?: string;
  url?: string;
  published_at?: string;
  raw?: Record<string, unknown>;
}

export interface RelevantSignal extends RawSignal {
  relevance_score: number; // 0..1
  reason: string;
}

export interface ConsequenceChain {
  event: string;
  cascading_effects: string[];
  charter_trigger?: string;
  target_profile: string;
  urgency: 'high' | 'medium' | 'low';
  apollo_search_hint?: {
    person_titles?: string[];
    locations?: string[];
    q_keywords?: string;
  };
  source_signal_title?: string;
}

export interface ApolloPerson {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  last_name_obfuscated?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  country?: string | null;
  seniority?: string | null;
  organization?: {
    name?: string | null;
    primary_domain?: string | null;
    website_url?: string | null;
    industry?: string | null;
    estimated_num_employees?: number | null;
    city?: string | null;
    country?: string | null;
    keywords?: string[] | null;
  } | null;
}

export interface ScoredLead {
  apollo: ApolloPerson;
  triggering_chain: ConsequenceChain;
  pain_level: 'high' | 'medium' | 'low';
  raw_score: number;
}

export interface ScriptedLead extends ScoredLead {
  suggested_angle: string;
  opener_line: string;
  full_script: string;
  cold_email: string;
  email_subject: string;
  objection_handling: Array<{ objection: string; response: string }>;
  why_this_lead: string;
}

export interface PipelineContext {
  run_id: string;
  vertical_id: string;
  vertical: VerticalRow;
  brain: BrainEntry[];
  signals: RawSignal[];
  relevant_signals: RelevantSignal[];
  chains: ConsequenceChain[];
  apollo_results: ApolloPerson[];
  deduped_against_hubspot: ApolloPerson[];
  scored: ScoredLead[];
  scripted: ScriptedLead[];
}

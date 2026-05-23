// Deals Machine — Universal Sales OS
// Vertical configuration schema.
//
// Reference: AI Week Italia/05-SYSTEM-ARCHITECTURE.md §5
//          + AI Week Italia/spec.md §7
//
// This is the typed source-of-truth for vertical configs.
// Migrations seed the DB from these definitions for the two reference
// verticals. User-created verticals (via Feature D vertical-builder) live
// only in the DB.

export type PricingPolicy = 'never_mention' | 'on_request' | 'open';

export type SignalSourceType = 'news' | 'rss' | 'crunchbase' | 'custom_scrape' | 'composite';

export interface SignalSourceItem {
  name: string;
  url?: string;
  api_key_env?: string;
  filters?: Record<string, unknown>;
}

export interface VerticalConfig {
  icp: {
    titles: string[];
    titles_exclude?: string[];
    company_size_range: [number, number];
    countries: string[];
    industries?: string[];
    company_exclusions: string[];
    // Annual revenue bands the ICP targets, e.g. ["$10M-$50M", "$50M-$250M"].
    // Captured from the wizard input; surfaced on listing + detail pages.
    revenue_range?: string[];
  };
  signal_source: {
    type: SignalSourceType;
    sources: SignalSourceItem[];
    relevance_prompt: string;
  };
  // The "expert" framing for the chain-builder LLM call. This is what makes
  // each vertical feel like a specialist agent — same engine, different brain.
  chain_builder_persona: string;
  script_voice: {
    tone: string;
    anchor_phrases: string[];
    forbidden_phrases: string[];
    pricing_policy: PricingPolicy;
  };
  crm: {
    hubspot_pipeline_id?: string | null;
    custom_fields?: Record<string, string>;
  };
  cron_time?: string;
  timezone?: string;
  // Daily target for visible lead pile size (used by score-and-assign cutoff)
  target_daily_leads?: number;
}

export interface SeededVertical {
  slug: string;
  display_name: string;
  config: VerticalConfig;
}

// Claude calls that process USER-GENERATED text. Pre-flights every payload
// through Lobster Trap (or fallback) before passing to Claude.
//
// Use this for: transcript extraction, inbound reply processing, chat input.
// Use llm/client.ts directly for: scraping summaries, internal reasoning, script
// generation from our own structured data.

import { callClaude, callClaudeJSON, type CallClaudeOptions } from './client';
import { checkInput, SecurityFlagError, type SecurityVerdict } from './lobster-trap';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';

export interface TrustedCallContext {
  // Where this untrusted text came from — used for security_flags row + activity_log
  source_type: 'transcript' | 'reply' | 'chat';
  source_ref?: string | null;
  vertical_id?: string | null;
  lead_id?: string | null;
}

async function recordFlag(verdict: SecurityVerdict, untrusted: string, ctx: TrustedCallContext) {
  const excerpt = untrusted.length > 280 ? untrusted.slice(0, 280) + '…' : untrusted;
  try {
    await supabase().from('security_flags').insert({
      source_type: ctx.source_type,
      source_ref: ctx.source_ref ?? null,
      vertical_id: ctx.vertical_id ?? null,
      lead_id: ctx.lead_id ?? null,
      flagged_content_excerpt: excerpt,
      reason: verdict.reason ?? 'flagged',
      detector: verdict.detector,
    });
  } catch (err) {
    console.error('[trusted-client] failed to record security_flag:', err);
  }

  await logActivity({
    vertical_id: ctx.vertical_id ?? null,
    lead_id: ctx.lead_id ?? null,
    type: 'security_flag',
    message: `🛡️ Security: ${ctx.source_type} flagged (${verdict.detector}) — content rejected`,
    metadata: { reason: verdict.reason, detector: verdict.detector, pattern: verdict.matched_pattern },
  });
}

/**
 * Run pre-flight + Claude call for text-content processing. The `user` content
 * should EMBED the untrusted text, and you pass the untrusted text separately
 * via `untrustedText` so we can scan only that portion.
 */
export interface TrustedCallOptions extends CallClaudeOptions {
  untrustedText: string;
  ctx: TrustedCallContext;
}

export async function callClaudeTrusted(opts: TrustedCallOptions): Promise<string> {
  const verdict = await checkInput(opts.untrustedText);
  if (verdict.verdict === 'flagged') {
    await recordFlag(verdict, opts.untrustedText, opts.ctx);
    throw new SecurityFlagError(verdict);
  }
  return callClaude(opts);
}

export async function callClaudeTrustedJSON<T = unknown>(opts: TrustedCallOptions): Promise<T> {
  const verdict = await checkInput(opts.untrustedText);
  if (verdict.verdict === 'flagged') {
    await recordFlag(verdict, opts.untrustedText, opts.ctx);
    throw new SecurityFlagError(verdict);
  }
  return callClaudeJSON<T>(opts);
}

export { SecurityFlagError };

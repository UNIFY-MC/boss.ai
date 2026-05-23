import { supabase } from './supabase';

export type ActivityType =
  | 'agent_step'
  | 'chain_event'
  | 'security_flag'
  | 'transcript_ingest'
  | 'hubspot_push'
  | 'chat_insight'
  | 'cron_trigger'
  | 'vertical_built'
  | 'error'
  | 'info';

export interface ActivityLogInput {
  run_id?: string | null;
  vertical_id?: string | null;
  lead_id?: string | null;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append a row to activity_log. The cockpit subscribes to this table via
 * Supabase Realtime — every row is one line of the streaming reasoning UI.
 *
 * Failures are swallowed and logged to console. Activity logging must never
 * be the reason a pipeline step crashes.
 */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    const { error } = await supabase()
      .from('activity_log')
      .insert({
        run_id: input.run_id ?? null,
        vertical_id: input.vertical_id ?? null,
        lead_id: input.lead_id ?? null,
        type: input.type,
        message: input.message,
        metadata: input.metadata ?? null,
      });
    if (error) {
      console.error('[activity-log] insert error:', error.message);
    }
  } catch (err) {
    console.error('[activity-log] unexpected error:', err);
  }
}

export function logger(scope: { run_id?: string; vertical_id?: string; lead_id?: string }) {
  return {
    info: (message: string, metadata?: Record<string, unknown>) =>
      logActivity({ ...scope, type: 'info', message, metadata }),
    step: (message: string, metadata?: Record<string, unknown>) =>
      logActivity({ ...scope, type: 'agent_step', message, metadata }),
    error: (message: string, metadata?: Record<string, unknown>) =>
      logActivity({ ...scope, type: 'error', message, metadata }),
    securityFlag: (message: string, metadata?: Record<string, unknown>) =>
      logActivity({ ...scope, type: 'security_flag', message, metadata }),
  };
}

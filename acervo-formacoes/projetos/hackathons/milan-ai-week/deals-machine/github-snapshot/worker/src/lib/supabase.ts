import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env';

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      // Node 20 has no native WebSocket; the worker doesn't use Realtime,
      // but supabase-js instantiates a RealtimeClient eagerly.
      realtime: { transport: WebSocket as any },
    });
  }
  return _client;
}

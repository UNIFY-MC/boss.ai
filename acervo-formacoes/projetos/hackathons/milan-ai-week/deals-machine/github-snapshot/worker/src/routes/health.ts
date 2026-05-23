import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { env } from '../lib/env';

const startedAt = new Date();

async function pingLobsterTrap(): Promise<{ ok: boolean; reachable: boolean; latency_ms?: number; reason?: string }> {
  if (!env.LOBSTER_TRAP_URL) {
    return { ok: false, reachable: false, reason: 'not_configured' };
  }
  const url = env.LOBSTER_TRAP_URL.replace(/\/$/, '') + '/health';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const latency_ms = Date.now() - startedAt;
    if (!res.ok) {
      return { ok: false, reachable: true, latency_ms, reason: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { ok?: boolean; classifier_enabled?: boolean };
    return {
      ok: body.ok === true,
      reachable: true,
      latency_ms,
      reason: body.classifier_enabled ? 'classifier_enabled' : 'regex_only',
    };
  } catch (err) {
    return {
      ok: false,
      reachable: false,
      reason: (err as Error).name === 'AbortError' ? 'timeout' : (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => {
    let supabaseOk = false;
    try {
      const { error } = await supabase().from('verticals').select('id').limit(1);
      supabaseOk = !error;
    } catch {
      supabaseOk = false;
    }

    const lobster = await pingLobsterTrap();

    return {
      status: 'ok',
      service: 'deals-machine-worker',
      version: '0.1.0',
      started_at: startedAt.toISOString(),
      uptime_seconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      checks: {
        supabase: supabaseOk,
        lobster_trap: lobster,
      },
    };
  });
}

// Server-side Supabase client (service-role key).
// Use in /api routes ONLY — never expose the service key to the browser.

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ""
).trim();

export const supabaseServer = url && serviceKey
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Vercel functions run Node 20 which has no native WebSocket;
      // supabase-js instantiates a RealtimeClient eagerly in the constructor.
      // The cockpit doesn't use realtime server-side, but we need to satisfy
      // the constructor or every /api route 500s.
      realtime: { transport: WebSocket },
    })
  : null;

export const isServerConfigured = () => !!supabaseServer;

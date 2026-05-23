import { createClient } from "@supabase/supabase-js";

// Trim defensively — invisible trailing whitespace/newlines from copy-paste
// of env vars (especially from Supabase's API page → Vercel UI) break the
// Realtime WebSocket auth because the JWT ends up with %0A in the URL.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Fallback: if no Supabase, use localStorage
export const isSupabaseConfigured = () => !!supabase;

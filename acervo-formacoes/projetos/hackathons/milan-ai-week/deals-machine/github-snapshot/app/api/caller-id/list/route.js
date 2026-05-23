// GET /api/caller-id/list — server-side caller_ids listing.
//
// The Settings → Caller IDs panel previously queried Supabase directly with
// the public anon key. If Supabase RLS is enabled on caller_ids and there's
// no policy for anon (the safer default for a table that holds phone
// numbers), the panel renders an empty list — even when verified caller IDs
// DO exist. This server route uses the service role so it sees the real
// state regardless of RLS.
//
// Uses createClient directly (not the shared supabaseServer module) to
// match the working pattern of /api/auth/google/status and dodge the
// realtime/ws transport that's flaky on Vercel cold starts.

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) {
    return Response.json({ caller_ids: [], error: "supabase_not_configured" });
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("caller_ids")
    .select("id, phone_e164, display_name, verified, verified_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[caller-id/list] query failed:", error);
    return Response.json({ caller_ids: [], error: error.message }, { status: 500 });
  }
  return Response.json({ caller_ids: data ?? [] });
}

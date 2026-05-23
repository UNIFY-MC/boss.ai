// GET /api/auth/google/status — does the cockpit currently have a
// connected Gmail credential? Used by Settings and FollowUpEmailModal
// to decide which sender to advertise.

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
    console.error("[auth/google/status] missing supabase env", {
      hasUrl: !!url,
      hasKey: !!key,
    });
    return Response.json({ connected: false, error: "missing_supabase_env" });
  }

  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("operator_credentials")
    .select("email, display_name, connected_at, scopes")
    .eq("provider", "gmail")
    .maybeSingle();
  if (error) {
    console.error("[auth/google/status] supabase query failed:", error);
    return Response.json({ connected: false, error: error.message });
  }
  return Response.json({
    connected: !!data,
    email: data?.email ?? null,
    display_name: data?.display_name ?? null,
    connected_at: data?.connected_at ?? null,
    scopes: data?.scopes ?? [],
  });
}

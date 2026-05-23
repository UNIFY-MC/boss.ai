// GET /api/verticals — list active verticals for the switcher dropdown
// Reads directly from Supabase using the server client.
//
// IMPORTANT: force-dynamic. Without it, Next.js caches this route handler
// statically, and freshly-built verticals don't appear in the VerticalSwitcher
// until the cache is invalidated (typically only on redeploy).

import { supabaseServer } from "@/app/lib/supabase-server";
import { supabase as supabaseAnon } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const client = supabaseServer || supabaseAnon;
  if (!client) {
    return Response.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  const { data, error } = await client
    .from("verticals")
    .select("id, slug, display_name, config, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ verticals: data ?? [] });
}

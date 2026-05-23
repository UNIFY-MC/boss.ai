// POST /api/auth/google/disconnect — revoke the refresh_token at Google
// and delete the operator_credentials row.

import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/app/lib/credentials-crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const sb = createClient(url, key);

  const { data: row } = await sb
    .from("operator_credentials")
    .select("refresh_token_encrypted")
    .eq("provider", "gmail")
    .maybeSingle();

  if (row?.refresh_token_encrypted) {
    try {
      const refreshToken = decryptSecret(row.refresh_token_encrypted);
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`,
        { method: "POST" }
      );
    } catch (err) {
      console.error("[gmail-disconnect] revoke failed:", err.message);
    }
  }

  const { error } = await sb
    .from("operator_credentials")
    .delete()
    .eq("provider", "gmail");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ disconnected: true });
}

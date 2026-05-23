// GET /api/auth/google/callback
//
// Google redirects here after consent with ?code=... &state=... .
// We validate state, exchange the code for tokens, fetch the user's
// email + name, encrypt the refresh_token, upsert into
// operator_credentials, and redirect back to /settings.

import { createClient } from "@supabase/supabase-js";
import { encryptSecret } from "@/app/lib/credentials-crypto";

export const dynamic = "force-dynamic";

function sbServer() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function errorRedirect(message) {
  const params = new URLSearchParams({ gmail: "error", message });
  return new Response(null, {
    status: 302,
    headers: { Location: `/settings?${params.toString()}` },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return errorRedirect(`Google returned: ${errorParam}`);
  }

  const cookieState = request.cookies.get("gmail_oauth_state")?.value;
  if (!code) return errorRedirect("Missing code");
  if (!state || state !== cookieState) {
    return errorRedirect("State mismatch (possible CSRF)");
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return errorRedirect("Google OAuth env vars missing on server");
  }

  // Exchange auth code → tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return errorRedirect(`Token exchange failed: ${text.slice(0, 200)}`);
  }
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    return errorRedirect(
      "No refresh_token returned. Revoke at myaccount.google.com/permissions and reconnect."
    );
  }

  // Fetch the user's email + name
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    return errorRedirect("Failed to fetch user info");
  }
  const userInfo = await userRes.json();

  // Encrypt + persist
  let encrypted;
  try {
    encrypted = encryptSecret(tokens.refresh_token);
  } catch (err) {
    return errorRedirect(`Encryption failed: ${err.message}`);
  }

  const sb = sbServer();
  if (!sb) return errorRedirect("Supabase not configured");

  const { error: upsertErr } = await sb
    .from("operator_credentials")
    .upsert(
      {
        provider: "gmail",
        email: userInfo.email,
        display_name: userInfo.name || null,
        refresh_token_encrypted: encrypted,
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );
  if (upsertErr) return errorRedirect(`Persist failed: ${upsertErr.message}`);

  const params = new URLSearchParams({
    gmail: "connected",
    email: userInfo.email,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/settings?${params.toString()}`,
      "Set-Cookie": `gmail_oauth_state=; Path=/; HttpOnly; Max-Age=0`,
    },
  });
}

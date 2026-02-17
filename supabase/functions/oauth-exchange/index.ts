import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "[oauth-exchange] GOOGLE_CLIENT_ID/SECRET are missing. Requests will fail.",
  );
}
if (!ENCRYPTION_KEY) {
  console.warn(
    "[oauth-exchange] ENCRYPTION_KEY is missing. Refresh tokens will be stored in plain text.",
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

async function encrypt(value: string): Promise<string> {
  if (!ENCRYPTION_KEY) return value;

  const rawKey = Uint8Array.from(atob(ENCRYPTION_KEY), (c) => c.charCodeAt(0));
  if (rawKey.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes for AES-GCM.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded,
  );
  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...payload));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { code, redirectUri, userId } = await req.json();
    if (!code || !redirectUri || !userId) {
      return badRequest("code, redirectUri and userId are required.");
    }

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });
    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("[oauth-exchange] token exchange failed:", err);
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const tokenPayload = await tokenResponse.json();
    const refreshToken: string | undefined = tokenPayload.refresh_token;
    const accessToken: string | undefined = tokenPayload.access_token;
    const expiresIn: number | undefined = tokenPayload.expires_in;

    if (!refreshToken) {
      return badRequest(
        "Google did not return a refresh_token. Ensure access_type=offline and prompt=consent.",
      );
    }

    const encryptedRefresh = await encrypt(refreshToken);
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error } = await supabaseAdmin.from("google_credentials").upsert({
      user_id: userId,
      refresh_token: encryptedRefresh,
      access_token: accessToken ?? null,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("[oauth-exchange] upsert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to persist credentials." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[oauth-exchange] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

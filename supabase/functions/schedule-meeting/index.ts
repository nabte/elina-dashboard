import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function decrypt(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (!ENCRYPTION_KEY) return value;

  const payload = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  if (payload.byteLength <= 12) return null;
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);

  const rawKey = Uint8Array.from(atob(ENCRYPTION_KEY), (c) => c.charCodeAt(0));
  if (rawKey.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes for AES-GCM.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function refreshAccessToken(credentials: {
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
}, userId: string) {
  const isExpired = !credentials.access_token ||
    !credentials.expires_at ||
    Date.parse(credentials.expires_at) - 60_000 < Date.now();

  if (!isExpired) {
    return {
      accessToken: credentials.access_token!,
      expiresAt: credentials.expires_at!,
    };
  }

  const params = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
    client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
    grant_type: "refresh_token",
    refresh_token: credentials.refresh_token,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[schedule-meeting] token refresh failed:", err);
    throw new Error("Failed to refresh Google access token.");
  }

  const payload = await response.json();
  const accessToken = payload.access_token as string;
  const expiresIn = payload.expires_in as number | undefined;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin.from("google_credentials").update({
    access_token: accessToken,
    expires_at: expiresAt,
  }).eq("user_id", userId);

  if (error) {
    console.error("[schedule-meeting] failed to persist new access token:", error);
  }

  return { accessToken, expiresAt: expiresAt ?? credentials.expires_at };
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { contactId, start, end, summary, description, timezone } = body ?? {};
    if (!contactId || !start || !end) {
      return new Response(
        JSON.stringify({ error: "contactId, start and end are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from("google_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (credentialsError || !credentials) {
      return new Response(
        JSON.stringify({ error: "Connect Google Calendar first." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const refreshToken = await decrypt(credentials.refresh_token);
    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: "Stored refresh token is invalid." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { accessToken } = await refreshAccessToken(
      {
        refresh_token: refreshToken,
        access_token: credentials.access_token,
        expires_at: credentials.expires_at,
      },
      user.id,
    );

    const eventPayload = {
      summary: summary ?? "Cita vía Elina IA",
      description: description ?? "",
      start: {
        dateTime: start,
        timeZone: timezone ?? "America/Mexico_City",
      },
      end: {
        dateTime: end,
        timeZone: timezone ?? "America/Mexico_City",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const googleResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      },
    );

    if (!googleResponse.ok) {
      const err = await googleResponse.text();
      console.error("[schedule-meeting] google api error:", err);
      return new Response(
        JSON.stringify({ error: "Google Calendar rejected the event." }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const googleEvent = await googleResponse.json();

    const { error: meetingError, data: meetingData } = await supabaseAdmin
      .from("meetings")
      .insert({
        user_id: user.id,
        contact_id: contactId,
        external_id: googleEvent.id,
        html_link: googleEvent.htmlLink,
        summary: googleEvent.summary,
        start_time: googleEvent.start?.dateTime ?? start,
        end_time: googleEvent.end?.dateTime ?? end,
        status: googleEvent.status ?? "confirmed",
        metadata: googleEvent,
      })
      .select()
      .limit(1);

    if (meetingError) {
      console.error("[schedule-meeting] failed to log meeting:", meetingError);
    }

    return new Response(
      JSON.stringify({
        event: googleEvent,
        meeting: meetingData?.[0] ?? null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[schedule-meeting] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

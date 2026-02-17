// Edge Function para crear citas (calendario interno y/o Google Calendar)

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

interface CreateAppointmentRequest {
  contact_id: number;
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  appointment_type_id?: number;
  notes?: string;
  summary?: string;
  description?: string;
  timezone?: string;
}

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
    console.error("[create-appointment] token refresh failed:", err);
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
    console.error("[create-appointment] failed to persist new access token:", error);
  }

  return { accessToken, expiresAt: expiresAt ?? credentials.expires_at };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const body: CreateAppointmentRequest = await req.json();
    const { contactId, start_time, end_time, appointment_type_id, notes, summary, description, timezone } = body;
    
    if (!contactId || !start_time || !end_time) {
      return new Response(
        JSON.stringify({ error: "contactId, start_time and end_time are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Obtener configuración de citas
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("appointment_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Appointment system not enabled for this user." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const tz = timezone || settings.timezone || "America/Mexico_City";
    let googleEvent = null;
    let externalId = null;
    let htmlLink = null;

    // Si tiene Google Calendar conectado, crear evento allí también
    if (settings.calendar_type === "google" || settings.calendar_type === "both") {
      const { data: credentials, error: credentialsError } = await supabaseAdmin
        .from("google_credentials")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!credentialsError && credentials) {
        try {
          const refreshToken = await decrypt(credentials.refresh_token);
          if (refreshToken) {
            const { accessToken } = await refreshAccessToken(
              {
                refresh_token: refreshToken,
                access_token: credentials.access_token,
                expires_at: credentials.expires_at,
              },
              user.id,
            );

            const eventPayload = {
              summary: summary || "Cita vía Elina IA",
              description: description || notes || "",
              start: {
                dateTime: start_time,
                timeZone: tz,
              },
              end: {
                dateTime: end_time,
                timeZone: tz,
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

            if (googleResponse.ok) {
              googleEvent = await googleResponse.json();
              externalId = googleEvent.id;
              htmlLink = googleEvent.htmlLink;
            } else {
              console.error("[create-appointment] google api error:", await googleResponse.text());
            }
          }
        } catch (error) {
          console.error("[create-appointment] error creating google event:", error);
          // Continuar con creación interna aunque falle Google
        }
      }
    }

    // Crear cita en calendario interno (tabla meetings)
    const { error: meetingError, data: meetingData } = await supabaseAdmin
      .from("meetings")
      .insert({
        user_id: user.id,
        contact_id: contactId,
        external_id: externalId || `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        html_link: htmlLink,
        summary: summary || "Cita vía Elina IA",
        start_time: start_time,
        end_time: end_time,
        status: "confirmed",
        appointment_type_id: appointment_type_id || null,
        notes: notes || null,
        reminder_sent: false,
        metadata: googleEvent || {},
      })
      .select()
      .limit(1);

    if (meetingError) {
      console.error("[create-appointment] failed to create appointment:", meetingError);
      return new Response(
        JSON.stringify({ error: "Failed to create appointment", details: meetingError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        appointment: meetingData?.[0] ?? null,
        google_event: googleEvent,
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-appointment] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


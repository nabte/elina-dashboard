import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALERT_WEBHOOK_URL = Deno.env.get("ALERT_WEBHOOK_URL") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getUser(req: Request) {
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

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { contactId, escalationType, message } = body ?? {};
    if (!contactId || !escalationType) {
      return jsonResponse({ error: "contactId and escalationType are required." }, 400);
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("escalation_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings) {
      return jsonResponse({ error: "Configure escalation settings first." }, 400);
    }

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("full_name, phone_number, labels")
      .eq("id", contactId)
      .single();

    const payload = {
      escalation_type: escalationType,
      user_id: user.id,
      contact_id: contactId,
      notify_phone: settings.notify_phone,
      notify_email: settings.notify_email,
      contact,
      message: message ?? null,
    };

    let delivered = false;
    if (ALERT_WEBHOOK_URL) {
      try {
        const webhookResponse = await fetch(ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        delivered = webhookResponse.ok;
        if (!webhookResponse.ok) {
          console.error("[notify-escalation] webhook failed:", await webhookResponse.text());
        }
      } catch (err) {
        console.error("[notify-escalation] webhook error:", err);
      }
    } else {
      console.warn("[notify-escalation] ALERT_WEBHOOK_URL is not configured.");
    }

    const { error: logError } = await supabaseAdmin.from("escalation_events").insert({
      user_id: user.id,
      contact_id: contactId,
      escalation_type: escalationType,
      payload,
      delivered,
      delivered_at: delivered ? new Date().toISOString() : null,
    });

    if (logError) {
      console.error("[notify-escalation] failed to log escalation event:", logError);
    }

    return jsonResponse({ success: true, delivered });
  } catch (err) {
    console.error("[notify-escalation] unexpected error:", err);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});

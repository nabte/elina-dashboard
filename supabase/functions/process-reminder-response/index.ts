// Edge Function para procesar respuestas de confirmación de recordatorios
// Usa IA para detectar si la respuesta es confirmación, cancelación o neutral

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessResponseRequest {
  message: string;
  phone_number: string;
  user_id: string;
  meeting_id?: number;
  reminder_id?: number;
}

interface AIResponse {
  status: "confirmed" | "cancelled" | "neutral";
  confidence: number;
  reasoning?: string;
}

async function detectConfirmationStatus(message: string): Promise<AIResponse> {
  // Si no hay API key de OpenAI, usar detección básica por palabras clave
  if (!OPENAI_API_KEY) {
    return detectConfirmationBasic(message);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Eres un asistente que analiza mensajes de WhatsApp para determinar si un cliente está confirmando, cancelando o simplemente respondiendo a un recordatorio de cita.

Responde SOLO con un JSON válido en este formato:
{
  "status": "confirmed" | "cancelled" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicación"
}

Reglas:
- "confirmed": El cliente confirma que asistirá (ej: "sí", "confirmo", "estaré", "voy", "ok", "de acuerdo")
- "cancelled": El cliente cancela o dice que no asistirá (ej: "no puedo", "cancelar", "no voy", "no asistiré")
- "neutral": Cualquier otra respuesta que no sea confirmación ni cancelación clara

Sé estricto: solo marca como "confirmed" o "cancelled" si hay intención clara.`,
          },
          {
            role: "user",
            content: `Analiza este mensaje de respuesta a un recordatorio de cita: "${message}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.warn("[process-reminder-response] OpenAI API error, falling back to basic detection");
      return detectConfirmationBasic(message);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return detectConfirmationBasic(message);
    }

    // Intentar parsear JSON de la respuesta
    try {
      const parsed = JSON.parse(content);
      if (
        parsed.status &&
        ["confirmed", "cancelled", "neutral"].includes(parsed.status) &&
        typeof parsed.confidence === "number"
      ) {
        return {
          status: parsed.status as "confirmed" | "cancelled" | "neutral",
          confidence: Math.max(0, Math.min(1, parsed.confidence)),
          reasoning: parsed.reasoning,
        };
      }
    } catch {
      // Si no se puede parsear, usar detección básica
    }

    return detectConfirmationBasic(message);
  } catch (error) {
    console.error("[process-reminder-response] Error calling OpenAI:", error);
    return detectConfirmationBasic(message);
  }
}

function detectConfirmationBasic(message: string): AIResponse {
  const msg = message.toLowerCase().trim();

  // Palabras clave de confirmación
  const confirmKeywords = [
    "sí", "si", "yes", "confirmo", "confirmado", "estaré", "voy", "iré",
    "asistiré", "asistir", "de acuerdo", "ok", "okay", "perfecto", "bien",
    "correcto", "claro", "por supuesto", "seguro", "vale", "listo",
  ];

  // Palabras clave de cancelación
  const cancelKeywords = [
    "no", "no puedo", "no voy", "no asistiré", "cancelar", "cancelado",
    "cancelación", "no podré", "imposible", "no es posible", "no asistir",
    "no iré", "no ir", "mejor no", "déjalo", "olvídalo",
  ];

  // Verificar confirmación
  const hasConfirm = confirmKeywords.some((keyword) => msg.includes(keyword));
  const hasCancel = cancelKeywords.some((keyword) => msg.includes(keyword));

  if (hasConfirm && !hasCancel) {
    return { status: "confirmed", confidence: 0.8 };
  }

  if (hasCancel && !hasConfirm) {
    return { status: "cancelled", confidence: 0.8 };
  }

  return { status: "neutral", confidence: 0.5 };
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (error || !user) return null;
  return user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const body: ProcessResponseRequest = await req.json();
    const { message, phone_number, user_id, meeting_id, reminder_id } = body;

    // Verificar autenticación (Permitir JWT de usuario o Secret de Sistema)
    const authHeader = req.headers.get("Authorization");
    const systemSecret = req.headers.get("x-system-secret");
    const validSystemSecret = Deno.env.get("SYSTEM_SECRET") || SERVICE_ROLE_KEY;

    let isAuthenticated = false;
    let authUser = null;

    if (systemSecret === validSystemSecret) {
      isAuthenticated = true;
      console.log("[process-reminder-response] Authenticated via System Secret");
    } else if (authHeader) {
      authUser = await getUser(req);
      if (authUser) {
        isAuthenticated = true;
        // Si el user_id en el body es distinto al del JWT, error (excepto si es system)
        if (user_id && authUser.id !== user_id) {
          return new Response(JSON.stringify({ error: "Forbidden: user_id mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || !phone_number || !user_id) {
      return new Response(
        JSON.stringify({ error: "message, phone_number, and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detectar estado de confirmación
    const aiResult = await detectConfirmationStatus(message);

    let final_meeting_id = meeting_id;
    let final_reminder_id = reminder_id;

    // Si no tenemos IDs, buscamos el recordatorio más reciente enviado a este teléfono
    if (!final_meeting_id || !final_reminder_id) {
      console.log(`[process-reminder-response] Searching for recent reminder for ${phone_number}`);
      const { data: recentReminder, error: reminderError } = await supabaseAdmin
        .from("appointment_reminders")
        .select("id, meeting_id")
        .eq("contact_phone", phone_number)
        .eq("status", "sent")
        .eq("user_id", user_id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();

      if (reminderError || !recentReminder) {
        console.warn("[process-reminder-response] No recent reminder found for this phone");
      } else {
        final_meeting_id = final_meeting_id || recentReminder.meeting_id;
        final_reminder_id = final_reminder_id || recentReminder.id;
        console.log(`[process-reminder-response] Found reminder ${final_reminder_id} for meeting ${final_meeting_id}`);
      }
    }

    // Si hay meeting_id, actualizar el estado de la cita
    if (final_meeting_id && (aiResult.status === "confirmed" || aiResult.status === "cancelled")) {
      const newStatus = aiResult.status === "confirmed" ? "confirmed" : "cancelled";

      const { error: updateError } = await supabaseAdmin
        .from("meetings")
        .update({ confirmation_status: newStatus })
        .eq("id", final_meeting_id)
        .eq("user_id", user_id);

      if (updateError) {
        console.error("[process-reminder-response] Error updating meeting:", updateError);
      }
    }

    // Si hay reminder_id, actualizar el estado del recordatorio
    if (final_reminder_id && (aiResult.status === "confirmed" || aiResult.status === "cancelled")) {
      const { error: updateError } = await supabaseAdmin
        .from("appointment_reminders")
        .update({ status: 'responded', confirmation_status: aiResult.status })
        .eq("id", final_reminder_id)
        .eq("user_id", user_id);

      if (updateError) {
        console.error("[process-reminder-response] Error updating reminder:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        status: aiResult.status,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        updated_meeting: meeting_id ? true : false,
        updated_reminder: reminder_id ? true : false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[process-reminder-response] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


// Edge Function para detección de intenciones de agendar citas
// Similar a detect-critical-intent pero específico para citas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AppointmentIntentRequest {
  contact_id: number;
  user_id: string;
  message_content: string;
  message_id?: number;
}

interface AppointmentIntentResult {
  has_intent: boolean;
  confidence: number;
  detection_type: string | null;
  extracted_info?: {
    original_message: string;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

serve(async (req) => {
  // CORS headers
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
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body: AppointmentIntentRequest = await req.json();
    const { contact_id, user_id, message_content, message_id } = body;

    if (!contact_id || !user_id || !message_content) {
      return jsonResponse(
        { error: "Missing required fields: contact_id, user_id, message_content" },
        400
      );
    }

    // Verificar si el usuario tiene el sistema de citas habilitado
    const { data: settings, error: settingsError } = await supabase
      .from("appointment_settings")
      .select("is_enabled")
      .eq("user_id", user_id)
      .single();

    if (settingsError || !settings?.is_enabled) {
      // Si no está habilitado, retornar sin intención
      return jsonResponse({
        has_intent: false,
        confidence: 0,
        detection_type: null,
      });
    }

    // Llamar a la función SQL de detección
    const { data: detection, error: detectionError } = await supabase.rpc(
      "detect_appointment_intent",
      {
        p_message_content: message_content,
        p_user_id: user_id,
      }
    );

    if (detectionError) {
      console.error("Error en detección de cita:", detectionError);
      return jsonResponse(
        { error: "Error al detectar intención de cita", details: detectionError.message },
        500
      );
    }

    const result: AppointmentIntentResult = {
      has_intent: detection?.has_intent || false,
      confidence: detection?.confidence || 0,
      detection_type: detection?.detection_type || null,
      extracted_info: detection?.extracted_info || {
        original_message: message_content,
      },
    };

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Error inesperado:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});


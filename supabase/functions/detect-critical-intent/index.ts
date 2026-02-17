// Edge Function para detección de intenciones críticas en tiempo real
// Se puede llamar desde n8n o directamente cuando llega un mensaje

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DetectionRequest {
  contact_id: number;
  user_id: string;
  message_content: string;
  message_id?: number;
}

interface DetectionResult {
  is_critical: boolean;
  detection_type: string | null;
  confidence: number;
  detected_content?: string;
  paused?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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

    const body: DetectionRequest = await req.json();
    const { contact_id, user_id, message_content, message_id } = body;

    if (!contact_id || !user_id || !message_content) {
      return jsonResponse(
        { error: "Missing required fields: contact_id, user_id, message_content" },
        400
      );
    }

    // Llamar a la función SQL de detección
    const { data: detection, error: detectionError } = await supabase.rpc(
      "detect_critical_intent",
      {
        p_message_content: message_content,
        p_user_id: user_id,
        p_contact_id: contact_id,
      }
    );

    if (detectionError) {
      console.error("Error en detección:", detectionError);
      return jsonResponse(
        { error: "Error al detectar intención crítica", details: detectionError.message },
        500
      );
    }

    const result: DetectionResult = {
      is_critical: detection?.is_critical || false,
      detection_type: detection?.detection_type || null,
      confidence: detection?.confidence || 0,
      detected_content: detection?.detected_content || message_content,
    };

    // Si se detectó algo crítico, pausar la conversación
    if (result.is_critical && result.detection_type) {
      // Verificar si ya está pausada
      const { data: existingState } = await supabase
        .from("conversation_states")
        .select("id, is_paused")
        .eq("contact_id", contact_id)
        .single();

      if (!existingState || !existingState.is_paused) {
        // Registrar la detección
        const { error: detectionInsertError } = await supabase
          .from("critical_detections")
          .insert({
            contact_id,
            user_id,
            message_id,
            detection_type: result.detection_type,
            detected_content: result.detected_content,
            confidence_score: result.confidence,
            metadata: {
              detected_by: "edge_function",
              timestamp: new Date().toISOString(),
            },
          });

        if (detectionInsertError) {
          console.error("Error al registrar detección:", detectionInsertError);
        }

        // Pausar la conversación
        const { data: pauseResult, error: pauseError } = await supabase.rpc(
          "pause_conversation",
          {
            p_contact_id: contact_id,
            p_user_id: user_id,
            p_reason: result.detection_type,
            p_metadata: {
              auto_paused: true,
              detection_confidence: result.confidence,
              detected_content: result.detected_content,
            },
          }
        );

        if (pauseError) {
          console.error("Error al pausar conversación:", pauseError);
        } else {
          result.paused = true;
        }
      }
    }

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Error inesperado:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});


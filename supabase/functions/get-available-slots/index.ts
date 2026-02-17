// Edge Function para obtener horarios disponibles para agendar citas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface GetSlotsRequest {
  user_id?: string;
  slug?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  appointment_type_id?: number;
  duration_minutes?: number;
}

interface Slot {
  start: string;
  end: string;
  duration_minutes: number;
}

interface GetSlotsResponse {
  available_slots: Slot[];
  date: string;
  timezone: string;
  error?: string;
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

    const body: GetSlotsRequest = await req.json();
    let { user_id, slug, date, appointment_type_id, duration_minutes } = body;

    // Resolver user_id si viene slug
    if (!user_id && slug) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .single();

      if (profile) {
        user_id = profile.id;
      } else {
        return jsonResponse({ error: "Slug/Empresa no encontrada" }, 404);
      }
    }

    if (!user_id || !date) {
      return jsonResponse(
        { error: "Missing required fields: user_id (or slug), date" },
        400
      );
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return jsonResponse(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        400
      );
    }

    // 4. Check for unavailable dates (Blackout dates)
    const { data: apptSettings } = await supabase
      .from('appointment_settings')
      .select('unavailable_dates, timezone')
      .eq('user_id', user_id)
      .single();

    if (apptSettings?.unavailable_dates && Array.isArray(apptSettings.unavailable_dates)) {
      if (apptSettings.unavailable_dates.includes(date)) {
        console.log(`Date ${date} is marked as unavailable.`);
        return jsonResponse({
          available_slots: [],
          date: date,
          timezone: apptSettings.timezone || "America/Mexico_City"
        }, 200);
      }
    }

    // Llamar a la función SQL para obtener slots
    const { data: slotsData, error: slotsError } = await supabase.rpc(
      "get_available_slots",
      {
        p_user_id: user_id,
        p_date: date,
        p_appointment_type_id: appointment_type_id || null,
        p_duration_minutes: duration_minutes || null,
      }
    );

    if (slotsError) {
      console.error("Error al obtener slots:", slotsError);
      return jsonResponse(
        { error: "Error al obtener horarios disponibles", details: slotsError.message },
        500
      );
    }

    const result: GetSlotsResponse = {
      available_slots: slotsData?.available_slots || [],
      date: slotsData?.date || date,
      timezone: slotsData?.timezone || "America/Mexico_City",
      error: slotsData?.error || undefined,
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

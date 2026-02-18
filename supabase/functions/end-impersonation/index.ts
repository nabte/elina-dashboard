import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { logId } = await req.json();

    if (!logId) {
      return jsonResponse({
        success: true,
        message: 'No log to update'
      });
    }

    // Actualizar el log de impersonación con ended_at
    const { error: updateError } = await supabaseAdmin
      .from('impersonation_logs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', logId);

    if (updateError) {
      console.error('Error updating impersonation log:', updateError);
      return jsonResponse({
        error: 'Failed to update log',
        details: updateError.message
      }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Impersonation ended successfully'
    });

  } catch (error) {
    console.error("Error in end-impersonation function:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});

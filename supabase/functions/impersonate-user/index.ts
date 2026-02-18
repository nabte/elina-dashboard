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

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
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
    // Verificar que el que llama sea superadmin
    const superAdminUser = await getUser(req);
    if (!superAdminUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Verificar que es superadmin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_superadmin')
      .eq('id', superAdminUser.id)
      .single();

    if (!profile?.is_superadmin) {
      return jsonResponse({ error: "Forbidden: Not a superadmin" }, 403);
    }

    // Obtener userId del body
    const { userId } = await req.json();
    if (!userId) {
      return jsonResponse({ error: "userId is required" }, 400);
    }

    // Obtener el usuario objetivo
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetError || !targetUser) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    // Registrar en audit log
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: logData, error: logError } = await supabaseAdmin
      .from('impersonation_logs')
      .insert({
        superadmin_id: superAdminUser.id,
        target_user_id: userId,
        started_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error creating impersonation log:', logError);
    }

    // Generar recovery link para obtener hashed_token
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.user.email,
    });

    if (linkError || !linkData) {
      console.error('Error generating recovery link:', linkError);
      return jsonResponse({ error: "Could not generate recovery link" }, 500);
    }

    // Verificar el token para obtener una sesión válida
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
      type: 'recovery',
      token_hash: linkData.properties.hashed_token,
    });

    if (sessionError || !sessionData?.session) {
      console.error('Error verifying OTP:', sessionError);
      return jsonResponse({ error: "Could not create session for target user" }, 500);
    }

    return jsonResponse({
      targetUserId: userId,
      targetUserEmail: targetUser.user.email,
      logId: logData?.id,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }
    });

  } catch (error) {
    console.error("Error in impersonate-user function:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
  // Solo permitir POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Verificar autenticación
    const user = await getUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parsear body
    const body = await req.json();
    const { email, password, user_metadata } = body;

    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    // Verificar que el usuario es admin de un equipo
    const { data: teamMember, error: teamError } = await supabaseAdmin
      .from("team_members")
      .select("team_id, role, teams!inner(owner_id)")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (teamError || !teamMember) {
      return jsonResponse(
        { error: "No tienes permisos para crear usuarios" },
        403
      );
    }

    // Verificar límite de advisors
    const { data: currentAdvisors, error: advisorsError } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamMember.team_id)
      .eq("role", "advisor");

    if (advisorsError) {
      console.error("Error counting advisors:", advisorsError);
      return jsonResponse(
        { error: "Error al verificar límite de advisors" },
        500
      );
    }

    const currentAdvisorCount = currentAdvisors?.length || 0;

    // Obtener límite del plan
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id, plans!inner(max_advisors)")
      .eq("user_id", teamMember.teams.owner_id)
      .single();

    // Si no hay suscripción o plan, usar límite por defecto de 2
    const maxAdvisors = subscription?.plans?.max_advisors ?? 2;

    if (currentAdvisorCount >= maxAdvisors) {
      return jsonResponse(
        {
          error: `Has alcanzado el límite de ${maxAdvisors} advisors incluidos en tu plan. Compra más asientos para agregar más vendedores.`,
          limit_reached: true,
          current_count: currentAdvisorCount,
          max_allowed: maxAdvisors
        },
        403
      );
    }

    // Generar password si no se proporciona
    let finalPassword = password;
    let generatedPassword = null;
    if (!finalPassword) {
      // Generar password aleatorio de 16 caracteres
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      generatedPassword = Array.from(
        { length: 16 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      finalPassword = generatedPassword;
    }

    // Crear usuario usando Admin API
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: user_metadata || {},
      });

    if (createError) {
      console.error("Error creating user:", createError);
      return jsonResponse(
        { error: createError.message || "Error al crear usuario" },
        400
      );
    }

    // Retornar el usuario creado (sin la contraseña generada por seguridad, a menos que se haya proporcionado)
    return jsonResponse({
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
      password: generatedPassword, // Solo retornar si fue generada
    });
  } catch (error) {
    console.error("Error in create-user function:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});


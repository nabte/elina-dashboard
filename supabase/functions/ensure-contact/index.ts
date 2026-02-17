// Edge Function para verificar/crear contactos automáticamente
// Usado por el sistema de recordatorios para asegurar que existe un contacto

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnsureContactRequest {
  phone_number: string;
  user_id: string;
  full_name?: string;
}

function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  
  let num = String(raw).trim();
  if (num.includes("@s.whatsapp.net")) {
    num = num.split("@")[0];
  }
  
  // Quitar todo excepto dígitos
  num = num.replace(/[^\d]/g, "");
  
  // Casos aceptados: 10, 12 (52 + 10), 13 (521 + 10)
  if (/^\d{10}$/.test(num)) {
    // 10 dígitos (MX sin LADA ni '1' de WhatsApp)
    num = "521" + num;
  } else if (/^52\d{10}$/.test(num)) {
    // 52 + 10 => forzamos el '1' de WhatsApp
    num = "521" + num.slice(2);
  } else if (/^521\d{10}$/.test(num)) {
    // ya viene correcto
  } else {
    // formato no soportado
    return null;
  }
  
  // Validación final: 521 + 10 dígitos = 13
  if (!/^521\d{10}$/.test(num)) return null;
  
  return "+" + num;
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

    // Verificar autenticación
    const user = await getUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EnsureContactRequest = await req.json();
    const { phone_number, user_id, full_name } = body;

    if (!phone_number || !user_id) {
      return new Response(
        JSON.stringify({ error: "phone_number and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar que el user_id corresponde al usuario autenticado
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: user_id mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar número de teléfono
    const normalizedPhone = normalizePhone(phone_number);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar contacto existente
    const { data: existingContact, error: checkError } = await supabaseAdmin
      .from("contacts")
      .select("id, full_name, phone_number")
      .eq("user_id", user_id)
      .eq("phone_number", normalizedPhone)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[ensure-contact] Error checking contact:", checkError);
      return new Response(
        JSON.stringify({ error: "Error checking contact", details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingContact) {
      // Contacto ya existe
      return new Response(
        JSON.stringify({
          contact_id: existingContact.id,
          created: false,
          contact: {
            id: existingContact.id,
            full_name: existingContact.full_name,
            phone_number: existingContact.phone_number,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear nuevo contacto
    const { data: newContact, error: createError } = await supabaseAdmin
      .from("contacts")
      .insert({
        user_id: user_id,
        phone_number: normalizedPhone,
        full_name: full_name || null,
      })
      .select("id, full_name, phone_number")
      .single();

    if (createError) {
      console.error("[ensure-contact] Error creating contact:", createError);
      return new Response(
        JSON.stringify({ error: "Error creating contact", details: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        contact_id: newContact.id,
        created: true,
        contact: {
          id: newContact.id,
          full_name: newContact.full_name,
          phone_number: newContact.phone_number,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[ensure-contact] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


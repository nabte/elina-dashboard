import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// EVOLUTION_API_URL: REQUERIDO - Debe configurarse como secret en Supabase
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GroupParticipant {
  jid?: string;
  id?: string;
  name?: string;
  pushName?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

interface WhatsAppGroup {
  id?: string;
  jid?: string;
  subject?: string;
  description?: string;
  participants?: GroupParticipant[];
  admins?: string[];
  creation?: number;
  owner?: string;
}

function normalizeJid(jid: string | undefined | null): string | null {
  if (!jid) return null;
  const trimmed = jid.trim();
  // Los grupos tienen JID que termina en @g.us
  if (trimmed.includes("@g.us")) {
    return trimmed;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Validar que EVOLUTION_API_URL esté configurado
    if (!EVOLUTION_API_URL) {
      throw new Error(
        "EVOLUTION_API_URL no está configurado. Configúralo como secret en Supabase: " +
        "supabase secrets set EVOLUTION_API_URL=https://tu-vps.com"
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, evolution_instance_name, evolution_api_key")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`No se pudo obtener el perfil del usuario: ${profileError?.message}`);
    }

    if (!profile.evolution_instance_name || !profile.evolution_api_key) {
      throw new Error(
        "El usuario no tiene configurada Evolution API. " +
        "Asegúrate de que el perfil tenga 'evolution_instance_name' y 'evolution_api_key'."
      );
    }

    // 2. Actualizar estado a "processing"
    await supabaseAdmin
      .from("profiles")
      .update({ sync_status: "processing" })
      .eq("id", user_id);

    // 3. Obtener grupos de Evolution API
    // Nota: El endpoint puede variar según la versión de Evolution API
    // Intentamos primero con fetchAllGroups, si no funciona probamos otros endpoints
    let groupsResponse;
    try {
      groupsResponse = await fetch(
        `${EVOLUTION_API_URL}/group/fetchAllGroups/${profile.evolution_instance_name}`,
        {
          method: "GET",
          headers: {
            apikey: profile.evolution_api_key,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (fetchError) {
      // Si falla GET, intentar con POST
      groupsResponse = await fetch(
        `${EVOLUTION_API_URL}/group/fetchAllGroups/${profile.evolution_instance_name}`,
        {
          method: "POST",
          headers: {
            apikey: profile.evolution_api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
    }

    if (!groupsResponse.ok) {
      const errorText = await groupsResponse.text();
      throw new Error(`Error al obtener grupos: ${groupsResponse.statusText} - ${errorText}`);
    }

    const groupsData = await groupsResponse.json();
    const groups: WhatsAppGroup[] = Array.isArray(groupsData) 
      ? groupsData 
      : groupsData?.data || groupsData?.groups || [];

    console.log(`Se encontraron ${groups.length} grupos para sincronizar`);

    // 4. Normalizar y procesar grupos
    const normalizedGroups = new Map<string, any>();
    
    for (const group of groups) {
      const groupJid = normalizeJid(group.jid || group.id);
      if (!groupJid || !groupJid.includes("@g.us")) {
        console.warn(`JID de grupo inválido: ${group.jid || group.id}`);
        continue;
      }

      // Normalizar participantes
      const participants: any[] = [];
      const admins: string[] = [];
      
      if (Array.isArray(group.participants)) {
        for (const participant of group.participants) {
          const participantJid = participant.jid || participant.id;
          if (!participantJid) continue;
          
          const participantData = {
            jid: participantJid,
            name: participant.name || participant.pushName || null,
            is_admin: participant.isAdmin || participant.isSuperAdmin || false,
          };
          
          participants.push(participantData);
          
          if (participantData.is_admin) {
            admins.push(participantJid);
          }
        }
      }
      
      // Si hay admins separados en el objeto, agregarlos
      if (Array.isArray(group.admins)) {
        for (const adminJid of group.admins) {
          if (!admins.includes(adminJid)) {
            admins.push(adminJid);
          }
        }
      }

      normalizedGroups.set(groupJid, {
        user_id,
        group_jid: groupJid,
        group_name: group.subject || group.name || "Grupo sin nombre",
        group_description: group.description || null,
        group_participants: participants,
        group_admins: admins,
        participant_count: participants.length,
        updated_at: new Date().toISOString(),
      });
    }

    // 5. Obtener grupos existentes para preservar datos
    const groupJids = Array.from(normalizedGroups.keys());
    if (groupJids.length === 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ sync_status: "Completado", sync_status_message: "0 grupos sincronizados" })
        .eq("id", user_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          groups_synced: 0,
          message: "No se encontraron grupos para sincronizar"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingGroups } = await supabaseAdmin
      .from("whatsapp_groups")
      .select("group_jid, group_name, group_description, created_at")
      .eq("user_id", user_id)
      .in("group_jid", groupJids);

    const existingGroupsMap = new Map(
      (existingGroups || []).map((g) => [g.group_jid, g])
    );

    // 6. Preparar datos para upsert
    const groupsArray = Array.from(normalizedGroups.values()).map((group) => {
      const existing = existingGroupsMap.get(group.group_jid);
      return {
        ...group,
        created_at: existing?.created_at || new Date().toISOString(),
      };
    });

    // 7. Upsert grupos en lotes
    let totalUpserted = 0;
    for (let i = 0; i < groupsArray.length; i += 100) {
      const batch = groupsArray.slice(i, i + 100);
      const { error: upsertError } = await supabaseAdmin
        .from("whatsapp_groups")
        .upsert(batch, {
          onConflict: "user_id,group_jid",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(`Error al hacer upsert del lote ${i}:`, upsertError);
        throw new Error(`Error al sincronizar grupos: ${upsertError.message}`);
      }
      totalUpserted += batch.length;
    }

    // 8. Actualizar estado a "Completado"
    await supabaseAdmin
      .from("profiles")
      .update({ 
        sync_status: "Completado",
        sync_status_message: `${totalUpserted} grupos sincronizados`
      })
      .eq("id", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        groups_synced: totalUpserted,
        message: `Se sincronizaron ${totalUpserted} grupos exitosamente`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en sync-groups:", error);
    
    // Intentar actualizar el estado de error si tenemos user_id
    try {
      const { user_id } = await req.json().catch(() => ({}));
      if (user_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabaseAdmin
          .from("profiles")
          .update({ 
            sync_status: "Error",
            sync_status_message: error.message || "Error desconocido"
          })
          .eq("id", user_id);
      }
    } catch (updateError) {
      console.error("Error al actualizar estado de error:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Error desconocido al sincronizar grupos",
        details: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


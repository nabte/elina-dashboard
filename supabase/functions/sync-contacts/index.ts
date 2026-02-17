import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function fetchEvolutionContacts(
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<any[]> {
  const primaryEndpoint = `/chat/findContacts/${instanceName}`;

  console.log(`[sync-contacts] Fetching contacts for instance: ${instanceName} at ${apiUrl}`);

  try {
    const url = `${apiUrl}${primaryEndpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[sync-contacts] Success with POST. Items: ${Array.isArray(data) ? data.length : 'not-array'}`);
      return Array.isArray(data) ? data : [];
    } else {
      console.warn(`[sync-contacts] Failed POST ${primaryEndpoint}: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error(`[sync-contacts] Error hitting POST ${primaryEndpoint}:`, error);
  }

  // Fallback a GET si falla el POST (algunas versiones de Evolution usan GET)
  const fallbackEndpoint = `/contact/find/${instanceName}`;
  try {
    console.log(`[sync-contacts] Trying fallback GET to: ${fallbackEndpoint}`);
    const url = `${apiUrl}${fallbackEndpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error('Fallback failed', e);
  }

  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Obtener usuario autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 401, headers: corsHeaders });
    }

    // 2. Obtener configuración del perfil
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, evolution_instance_name, evolution_api_key')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil no configurado' }), { status: 404, headers: corsHeaders });
    }

    const instanceName = profile.evolution_instance_name;
    const apiKey = profile.evolution_api_key;
    const apiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host/manager';

    if (!instanceName || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp no configurado en tu perfil (Falta instancia o API Key)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Obtener contactos de Evolution
    const evolutionContacts = await fetchEvolutionContacts(instanceName, apiUrl, apiKey);

    if (evolutionContacts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No se encontraron contactos nuevos', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Procesar y guardar en tabla 'contacts'
    const contactsToUpsert = [];
    const seenNumbers = new Set();

    for (const contact of evolutionContacts) {
      // Filtrar grupos
      if (contact.id?.includes('@g.us') || contact.remoteJid?.includes('@g.us')) continue;

      const raw = contact.number || contact.phone || contact.phoneNumber || (contact.id?.includes('@') ? contact.id.split('@')[0] : null);
      if (!raw) continue;

      let digits = String(raw).replace(/\D/g, '');
      if (digits.length > 15 || digits.length < 8) continue;

      const phoneNumber = '+' + digits;
      if (seenNumbers.has(phoneNumber)) continue;
      seenNumbers.add(phoneNumber);

      const name = contact.pushName || contact.name || contact.verifiedName || phoneNumber;

      contactsToUpsert.push({
        user_id: user.id,
        full_name: name,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      });
    }

    // Upsert en lotes para eficiencia
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < contactsToUpsert.length; i += batchSize) {
      const chunk = contactsToUpsert.slice(i, i + batchSize);
      const { error: upsertError } = await supabaseClient
        .from('contacts')
        .upsert(chunk, { onConflict: 'user_id, phone_number' });

      if (!upsertError) successCount += chunk.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronización completada',
        total_found: evolutionContacts.length,
        synced: successCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

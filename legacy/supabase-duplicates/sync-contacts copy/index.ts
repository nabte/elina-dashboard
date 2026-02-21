// Supabase Edge Function: sync-contacts
// Sincroniza los contactos de WhatsApp desde Evolution API hacia la tabla VOC_patients

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
    // Referencia n8n: POST a /chat/findContacts/{instance} con body {}
    const primaryEndpoint = `/chat/findContacts/${instanceName}`;

    console.log(`[sync-contacts] Fetching contacts for instance: ${instanceName} at ${apiUrl}`);
    console.log(`[sync-contacts] Trying POST to: ${primaryEndpoint}`);

    try {
        const url = `${apiUrl}${primaryEndpoint}`;
        const response = await fetch(url, {
            method: 'POST', // CAMBIO IMPORTANTE: GET -> POST
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}) // Body vacío requerido
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

    // Fallback a GET (método antiguo) si falla el POST
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
    } catch (e) { console.error('Fallback failed', e); }

    return [];
}

serve(async (req) => {
    console.log(`[sync-contacts] Request received: ${req.method}`);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Obtener usuario y clínica
        const authHeader = req.headers.get('Authorization');
        console.log(`[sync-contacts] Auth header present: ${!!authHeader}`); // Debug log

        if (!authHeader) {
            console.error('[sync-contacts] Missing Authorization header');
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);

        if (!user) {
            return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 401, headers: corsHeaders });
        }

        const { data: clinic } = await supabaseClient
            .from('VOC_clinics')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!clinic) {
            return new Response(JSON.stringify({ error: 'Clínica no encontrada' }), { status: 404, headers: corsHeaders });
        }

        // 2. Obtener configuración de Evolution API
        const instanceName = clinic.evolution_instance_name;
        let apiUrl = clinic.evolution_api_url;
        let apiKey = clinic.evolution_api_key;

        if (!apiUrl || !apiKey) {
            // Intentar configuración global
            const { data: globalConfig } = await supabaseClient
                .from('VOC_evolution_api_config')
                .select('api_url, api_key')
                .eq('is_active', true)
                .single();

            if (globalConfig) {
                apiUrl = globalConfig.api_url;
                apiKey = globalConfig.api_key;
            }
        }

        if (!apiUrl || !apiKey || !instanceName) {
            return new Response(
                JSON.stringify({ error: 'Falta configuración de WhatsApp (API URL, Key o Instancia)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Fetch de contactos desde Evolution API
        const evolutionContacts = await fetchEvolutionContacts(instanceName, apiUrl, apiKey);

        if (evolutionContacts.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No se encontraron contactos en WhatsApp', count: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Procesar y guardar en Supabase (Bulk Upsert para velocidad)
        const contactsToUpsert = [];
        const seenNumbers = new Set();

        for (const contact of evolutionContacts) {
            // Filtrar grupos (suelen tener g.us en remoteJid o id)
            if (contact.id?.includes('@g.us') || contact.remoteJid?.includes('@g.us')) continue;

            // Lógica robusta de extracción de teléfono (inspirada en n8n)
            const raw =
                contact.number ||
                contact.phone ||
                contact.phoneNumber ||
                (typeof contact.id === 'string' && contact.id.includes('@') ? contact.id.split('@')[0] : null) ||
                (typeof contact.remoteJid === 'string' ? contact.remoteJid.split('@')[0] : null);

            if (!raw) continue;

            // Limpieza: dejar solo dígitos
            let digits = String(raw).replace(/\D/g, '');

            // Validación INTELIGENTE (LATAM + España + USA real):

            // 1. Bloqueo de Spam Confimado (IDs largos de newsletters/bots)
            // - Si empieza con '1' (USA ficticio) y tiene más de 11 dígitos -> BLOQUEAR
            // - Si tiene más de 14 dígitos en general -> BLOQUEAR (salvo excepciones muy raras, un móvil no es tan largo)
            if (digits.length > 14) continue;
            if (digits.startsWith('1') && digits.length > 11) continue;

            // 2. Lista Blanca de Prefijos (Paises Objetivo)
            // Aceptamos solo si empieza con uno de estos prefijos válidos:
            // 52 (MX), 34 (ES), 54 (AR), 57 (CO), 56 (CL), 51 (PE), 1 (USA - filtro longitud arriba aplica)
            // Opcional: Si quieres abrir a todo el mundo pero filtrar solo por longitud, quita este bloque.
            const validPrefixes = ['52', '34', '54', '57', '56', '51', '1', '502', '503', '504', '505', '506', '507', '593', '591', '598', '595', '58'];
            const hasValidPrefix = validPrefixes.some(p => digits.startsWith(p));

            if (!hasValidPrefix) continue; // Si es de Rusia (+7), Indonesia (+62), etc., y no está en la lista -> ADIÓS.

            const phoneNumber = '+' + digits;

            // Evitar duplicados en este lote
            if (seenNumbers.has(phoneNumber)) continue;
            seenNumbers.add(phoneNumber);

            const name = contact.pushName || contact.verifiedName || contact.name || phoneNumber;

            // Filtro de Calidad de Nombre:
            // Ignorar si el nombre es solo signos de puntuación (., -, ...) o muy corto y no es un número
            const cleanName = name.replace(/[^a-zA-Z0-9\u00C0-\u017F ]/g, '').trim();

            // Si después de quitar símbolos queda vacío, y el nombre original no era el número de teléfono, es basura (ej: "." o "-")
            if (cleanName.length === 0 && name !== phoneNumber) {
                continue;
            }

            // Opcional: Filtrar nombres genéricos específicos si quieres ser más agresivo
            if (['.', '-', '..', '...', 'usuario', 'user'].includes(name.trim())) continue;

            contactsToUpsert.push({
                clinic_id: clinic.id,
                name: name,
                phone_number: phoneNumber,
                updated_at: new Date().toISOString()
            });
        }

        console.log(`[sync-contacts] Preparing to upsert ${contactsToUpsert.length} unique contacts...`);

        // Insertar en lotes de 500 para evitar timeout o payload limits
        const batchSize = 500;
        let successCount = 0;

        for (let i = 0; i < contactsToUpsert.length; i += batchSize) {
            const chunk = contactsToUpsert.slice(i, i + batchSize);
            const { error: upsertError } = await supabaseClient
                .from('VOC_patients')
                .upsert(chunk, { onConflict: 'clinic_id, phone_number' }); // CRUCIAL: Constraint unique en DB

            if (upsertError) {
                console.error(`[sync-contacts] Error inserting batch ${i}:`, upsertError);
            } else {
                successCount += chunk.length;
            }
        }

        console.log(`[sync-contacts] Successfully synced ${successCount} contacts.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Sincronización completada',
                total_found: evolutionContacts.length,
                imported: successCount
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );



    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

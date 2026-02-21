import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const EVOLUTION_API_URL_RAW = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_URL = EVOLUTION_API_URL_RAW.replace(/\/manager\/?$/, '').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
        const { action, user_id, phone } = await req.json()

        if (!user_id) throw new Error("user_id is required");

        // 1. Obtener datos del perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('evolution_instance_name, contact_phone, full_name, email')
            .eq('id', user_id)
            .single();

        if (profileError || !profile) {
            throw new Error("Perfil no encontrado");
        }

        let instanceName = profile.evolution_instance_name;

        // Si no existe instanceName, generarlo ahora
        if (!instanceName) {
            // Generar ID único
            const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const baseName = profile.full_name || profile.email?.split('@')[0] || 'user';
            instanceName = `${baseName.trim().replace(/[^a-zA-Z0-9]/g, '')}-${uniqueId}`;

            // Guardar en el perfil
            await supabase
                .from('profiles')
                .update({
                    evolution_instance_name: instanceName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user_id);
        }

        console.log(`[${action.toUpperCase()}] instanceName: ${instanceName}`);

        // 2. ACCIÓN: STATUS - Verificar estado de conexión
        if (action === 'status') {
            try {
                const fetchUrl = `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`;
                console.log(`[STATUS] Fetching from URL: ${fetchUrl}`);

                const res = await fetch(fetchUrl, {
                    headers: { 'apikey': EVOLUTION_API_KEY! }
                });

                if (!res.ok) {
                    console.error(`[ERROR STATUS] Evolution API responded with ${res.status}`);
                    console.error(`URL: ${fetchUrl}`);
                    const errorData = await res.text();
                    console.error(`Response: ${errorData}`);
                    throw new Error(`Evolution API error: ${res.status}`);
                }

                const instances = await res.json();
                console.log(`[STATUS] Raw API Response:`, JSON.stringify(instances, null, 2));
                console.log(`[STATUS] Response type: ${Array.isArray(instances) ? 'Array' : typeof instances}`);

                if (Array.isArray(instances)) {
                    console.log(`[STATUS] Array length: ${instances.length}`);
                    instances.forEach((inst, idx) => {
                        console.log(`[STATUS] Instance[${idx}]: name="${inst?.name}" connectionStatus="${inst?.connectionStatus}"`);
                    });
                }

                // Evolution API usa 'name' y 'connectionStatus', no 'instanceName' y 'state'
                const inst = Array.isArray(instances)
                    ? instances.find(i => i.name === instanceName)
                    : instances;

                console.log(`[STATUS] Found instance:`, inst ? JSON.stringify(inst, null, 2) : 'undefined');
                console.log(`[STATUS] Connection status: ${inst?.connectionStatus}`);

                const status = inst?.connectionStatus === 'open'
                    ? 'connected'
                    : (inst?.connectionStatus === 'connecting' ? 'connecting' : 'disconnected');

                // Actualizar estado en la base de datos
                if (status === 'connected' && inst) {
                    await supabase
                        .from('profiles')
                        .update({
                            whatsapp_connected: true,
                            evolution_api_key: inst.token || user_id, // Usar token de instancia o user_id como fallback
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user_id);
                } else if (inst) {
                    // ✅ Incluso si no está conectado, guardar API key si falta
                    const { data: currentProfile } = await supabase
                        .from('profiles')
                        .select('evolution_api_key')
                        .eq('id', user_id)
                        .single();

                    if (!currentProfile?.evolution_api_key) {
                        console.log(`[STATUS] Instancia existe pero falta evolution_api_key, guardando ahora`);
                        await supabase
                            .from('profiles')
                            .update({
                                evolution_api_key: inst.token || user_id,
                                evolution_api_url: EVOLUTION_API_URL,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', user_id);
                    }
                }

                return new Response(JSON.stringify({
                    status: status,
                    instance: inst
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                console.error(`[ERROR STATUS] ${e.message}`);
                return new Response(JSON.stringify({
                    status: 'disconnected',
                    error: e.message
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 3. ACCIÓN: GET-QR o PAIRING-CODE - Crear instancia y conectar
        if (action === 'get-qr' || action === 'pairing-code') {

            // A. Verificar si la instancia ya existe en Evolution API
            const checkUrl = `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`;

            const checkRes = await fetch(checkUrl, {
                headers: { 'apikey': EVOLUTION_API_KEY! }
            });

            let instanceExists = false;

            // 404 significa "instancia no encontrada" - esto es OK, vamos a crearla
            if (checkRes.status === 404) {
                console.log(`[CHECK] Instancia ${instanceName} no existe (404), se creará`);
                instanceExists = false;
            } else if (!checkRes.ok) {
                // Otros errores (500, 401, etc.) SÍ son fatales
                console.error(`[ERROR CHECK] Evolution API responded with ${checkRes.status}`);
                console.error(`URL: ${checkUrl}`);
                const errorData = await checkRes.text();
                console.error(`Response: ${errorData}`);
                throw new Error(`Evolution API error: ${checkRes.status} - ${errorData}`);
            } else {
                // Status 200 - verificar si la instancia realmente existe
                const currentInst = await checkRes.json();
                instanceExists = currentInst && (!Array.isArray(currentInst) || currentInst.length > 0);

                // ✅ Si la instancia existe pero no hay API key en DB, guardarla ahora
                if (instanceExists) {
                    const { data: currentProfile } = await supabase
                        .from('profiles')
                        .select('evolution_api_key')
                        .eq('id', user_id)
                        .single();

                    if (!currentProfile?.evolution_api_key) {
                        console.log(`[CHECK] Instancia existe pero falta evolution_api_key, guardando ahora`);
                        await supabase
                            .from('profiles')
                            .update({
                                evolution_api_key: user_id,
                                evolution_api_url: EVOLUTION_API_URL,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', user_id);
                    }
                }
            }

            // B. Crear instancia si no existe en Evolution (pero puede existir en DB)
            if (!instanceExists) {
                // Crear payload según documentación Evolution API
                const createPayload: any = {
                    instanceName: instanceName,
                    token: user_id,
                    qrcode: true,
                    base64: true,
                    integration: "WHATSAPP-BAILEYS", // REQUERIDO: tipo de integración
                    // Configurar webhook durante la creación
                    webhook: {
                        url: 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/message-router',
                        byEvents: false,
                        base64: true,
                        events: [
                            "CHATS_UPSERT",
                            "MESSAGES_UPSERT",
                            "MESSAGES_UPDATE",
                            "CONNECTION_UPDATE"
                        ]
                    }
                };

                // Solo incluir número si está disponible (como Vocco)
                if (phone) {
                    createPayload.number = phone.replace(/\D/g, ''); // Limpiar número
                }

                console.log(`[CREATE INSTANCE] Creando instancia: ${instanceName}`, createPayload);
                const createUrl = `${EVOLUTION_API_URL}/instance/create`;
                const createRes = await fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': EVOLUTION_API_KEY!,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(createPayload)
                });

                const createData = await createRes.json();

                if (!createRes.ok) {
                    console.error(`[ERROR CREATE] Evolution API responded with ${createRes.status}`);
                    console.error(`URL: ${createUrl}`);
                    console.error(`Payload:`, JSON.stringify(createPayload, null, 2));
                    console.error(`Response:`, JSON.stringify(createData, null, 2));
                    throw new Error(`Error al crear instancia: ${JSON.stringify(createData)}`);
                }

                // ✅ GUARDAR API KEY INMEDIATAMENTE después de crear la instancia
                console.log(`[CREATE] Guardando evolution_api_key en la base de datos: ${user_id}`);
                await supabase
                    .from('profiles')
                    .update({
                        evolution_api_key: user_id, // El token ES el user_id (línea 162)
                        evolution_api_url: EVOLUTION_API_URL,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user_id);
                console.log(`[CREATE] evolution_api_key guardada exitosamente`);
            } else {
                // C. Si la instancia ya existe, configurar/actualizar webhook por separado
                try {
                    console.log(`[WEBHOOK] Configurando webhook para instancia existente: ${instanceName}`);
                    await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
                        method: 'POST',
                        headers: {
                            'apikey': EVOLUTION_API_KEY!,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            enabled: true,
                            url: 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/message-router',
                            webhook_by_events: false,
                            webhook_base64: true,
                            events: [
                                "CHATS_UPSERT",
                                "MESSAGES_UPSERT",
                                "MESSAGES_UPDATE",
                                "CONNECTION_UPDATE"
                            ]
                        })
                    });
                } catch (e: any) {
                    console.error(`[ERROR WEBHOOK] ${e.message}`);
                }
            }

            // D. Configurar Settings
            try {
                await fetch(`${EVOLUTION_API_URL}/settings/set/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'apikey': EVOLUTION_API_KEY!,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        rejectCall: false,
                        groupsIgnore: true,
                        alwaysOnline: true,
                        readMessages: true,
                        readStatus: false,
                        syncFullHistory: true,
                        syncFullHistoryDays: 1
                    })
                });
            } catch (e: any) {
                console.error(`[ERROR SETTINGS] ${e.message}`);
            }

            // E. Guardar número de teléfono en el perfil (si se proporcionó)
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, '');
                await supabase
                    .from('profiles')
                    .update({
                        contact_phone: cleanPhone,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user_id);
            }

            // F. Obtener QR o Pairing Code
            if (action === 'get-qr') {
                const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                    headers: { 'apikey': EVOLUTION_API_KEY! }
                });

                if (!qrRes.ok) {
                    console.error(`[ERROR QR] Evolution API responded with ${qrRes.status}`);
                    const errorData = await qrRes.text();
                    console.error(`Response: ${errorData}`);
                    throw new Error(`Error generating QR: ${qrRes.status} - ${errorData}`);
                }

                const qrData = await qrRes.json();

                console.log('[QR] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('[QR] RESPUESTA COMPLETA DE EVOLUTION API:');
                console.log(JSON.stringify(qrData, null, 2));
                console.log('[QR] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('[QR] Tiene qrData.base64?', !!qrData.base64);
                console.log('[QR] Tiene qrData.qrcode?', !!qrData.qrcode);
                console.log('[QR] Tiene qrData.qrcode.base64?', !!qrData.qrcode?.base64);

                // LIMPIAR BASE64 AQUÍ EN EL BACKEND para evitar problemas de cache en frontend
                if (qrData.base64 && qrData.base64.includes('data:image')) {
                    // Si tiene prefijo, extraer solo la parte base64 pura
                    const parts = qrData.base64.split(',');
                    if (parts.length >= 2) {
                        // Tomar la última parte (base64 puro sin prefijo)
                        qrData.base64 = parts[parts.length - 1];
                        console.log('[QR] Base64 limpiado en backend');
                    }
                }

                // Si la instancia ya está conectada (state: 'open'), actualizar base de datos
                if (qrData?.instance?.state === 'open') {
                    await supabase
                        .from('profiles')
                        .update({
                            whatsapp_connected: true,
                            evolution_api_key: qrData.instance.token || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user_id);
                }

                return new Response(JSON.stringify(qrData), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                // PAIRING CODE - Mismo endpoint que QR pero con número
                if (!phone) throw new Error("Se requiere número de teléfono para código de emparejamiento");

                const cleanPhone = phone.replace(/\D/g, '');
                // Usar el mismo endpoint que QR pero con parámetro number
                const pairUrl = `${EVOLUTION_API_URL}/instance/connect/${instanceName}?number=${cleanPhone}`;
                const pairRes = await fetch(pairUrl, {
                    headers: { 'apikey': EVOLUTION_API_KEY! }
                });

                if (!pairRes.ok) {
                    console.error(`[ERROR PAIRING] Evolution API responded with ${pairRes.status}`);
                    console.error(`URL: ${pairUrl}`);
                    const errorData = await pairRes.text();
                    console.error(`Response: ${errorData}`);
                    throw new Error(`Error generating pairing code: ${pairRes.status} - ${errorData}`);
                }

                const pairData = await pairRes.json();

                // LOG COMPLETO para debug
                console.log('[PAIRING] Respuesta completa de Evolution API:', JSON.stringify(pairData, null, 2));

                // Buscar el código de 8 dígitos en diferentes campos posibles
                let extractedCode = null;

                // Buscar en campos comunes
                if (pairData.pairingCode && typeof pairData.pairingCode === 'string' && pairData.pairingCode.length === 8) {
                    extractedCode = pairData.pairingCode;
                } else if (pairData.code && typeof pairData.code === 'string' && pairData.code.length === 8) {
                    extractedCode = pairData.code;
                } else if (pairData.pairing_code && typeof pairData.pairing_code === 'string' && pairData.pairing_code.length === 8) {
                    extractedCode = pairData.pairing_code;
                }

                console.log('[PAIRING] Código de 8 dígitos encontrado:', extractedCode);

                // LIMPIAR BASE64 si viene con QR en pairing code
                if (pairData.base64 && pairData.base64.includes('data:image')) {
                    const parts = pairData.base64.split(',');
                    if (parts.length >= 2) {
                        pairData.base64 = parts[parts.length - 1];
                        console.log('[PAIRING] Base64 limpiado en backend');
                    }
                }

                // Si la instancia ya está conectada (state: 'open'), actualizar base de datos
                if (pairData?.instance?.state === 'open') {
                    await supabase
                        .from('profiles')
                        .update({
                            whatsapp_connected: true,
                            evolution_api_key: pairData.instance.token || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user_id);
                }

                // Asegurar que devolvemos el código en el formato correcto
                return new Response(JSON.stringify({
                    ...pairData,
                    pairingCode: extractedCode // Forzar campo pairingCode
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 4. ACCIÓN: LOGOUT - Desconectar instancia
        if (action === 'logout') {
            try {
                await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': EVOLUTION_API_KEY! }
                });

                // Actualizar estado en la base de datos
                await supabase
                    .from('profiles')
                    .update({
                        whatsapp_connected: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user_id);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                console.error(`[ERROR LOGOUT] ${e.message}`);
                return new Response(JSON.stringify({ error: e.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        return new Response(JSON.stringify({ error: "Acción inválida" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[FATAL ERROR]', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})

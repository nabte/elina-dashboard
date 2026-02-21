import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Variables de entorno
const VENOM_SERVICE_URL = Deno.env.get('VENOM_SERVICE_URL') || 'http://venom-service:3000';
const VENOM_API_KEY = Deno.env.get('VENOM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const { action, user_id, phone } = await req.json();

        if (!user_id) {
            throw new Error("user_id is required");
        }

        console.log(`[Venom] Action: ${action} | User: ${user_id}`);

        // Obtener perfil y suscripción del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', user_id)
            .single();

        if (profileError || !profile) {
            throw new Error("Perfil no encontrado");
        }

        // Plan ya no se usa - límite fijo de 1 instancia por usuario

        // Generar session_id único (solo alfanuméricos)
        let sessionId = `user${user_id.replace(/-/g, '').substring(0, 12)}`;

        console.log('🚨🚨🚨 DEBUG VENOM: SessionId generado:', sessionId);
        console.log('🚨🚨🚨 DEBUG VENOM: user_id original:', user_id);
        console.log('🚨🚨🚨 DEBUG VENOM: user_id sin guiones:', user_id.replace(/-/g, ''));
        console.log('🚨🚨🚨 DEBUG VENOM: Deployment version 6 - CÓDIGO NUEVO');

        // =========================================
        // ACCIÓN: STATUS - Verificar estado
        // =========================================
        if (action === 'status') {
            try {
                // Verificar en base de datos
                const { data: instance, error: dbError } = await supabase
                    .from('venom_instances')
                    .select('*')
                    .eq('user_id', user_id)
                    .single();

                if (dbError || !instance) {
                    return new Response(JSON.stringify({
                        status: 'disconnected',
                        instance: null,
                        message: 'No instance found'
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                sessionId = instance.session_id;

                // Consultar estado en servicio Venom
                const venomRes = await fetch(`${VENOM_SERVICE_URL}/sessions/${sessionId}/status`, {
                    headers: {
                        'X-API-Key': VENOM_API_KEY!
                    }
                });

                if (!venomRes.ok) {
                    // Si no está en memoria, retornar estado de DB
                    return new Response(JSON.stringify({
                        status: instance.status,
                        instance: instance,
                        inMemory: false
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const venomStatus = await venomRes.json();

                // Actualizar DB si el estado cambió
                if (venomStatus.status !== instance.status) {
                    await supabase
                        .from('venom_instances')
                        .update({
                            status: venomStatus.status,
                            updated_at: new Date().toISOString(),
                            ...(venomStatus.status === 'connected' && {
                                last_connected_at: new Date().toISOString()
                            })
                        })
                        .eq('id', instance.id);
                }

                return new Response(JSON.stringify({
                    status: venomStatus.status,
                    instance: {
                        ...instance,
                        ...venomStatus
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (e: any) {
                console.error(`[Venom Status Error] ${e.message}`);
                return new Response(JSON.stringify({
                    status: 'error',
                    error: e.message
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // =========================================
        // ACCIÓN: GET-QR o PAIRING-CODE
        // =========================================
        if (action === 'get-qr' || action === 'pairing-code') {
            try {
                // Verificar si ya existe instancia en DB
                let { data: instance, error: dbError } = await supabase
                    .from('venom_instances')
                    .select('*')
                    .eq('user_id', user_id)
                    .single();

                const isNewInstance = !instance;

                if (isNewInstance) {
                    // Verificar límite de 1 instancia por usuario
                    const { count } = await supabase
                        .from('venom_instances')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user_id);

                    if (count && count >= 1) {
                        throw new Error('Ya tienes una instancia Venom. Desconecta la actual antes de crear otra.');
                    }

                    // Crear instancia en DB
                    const webhookUrl = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/message-router';

                    const { data: newInstance, error: createError } = await supabase
                        .from('venom_instances')
                        .insert({
                            user_id: user_id,
                            session_id: sessionId,
                            status: 'connecting',
                            webhook_url: webhookUrl,
                            phone_number: phone || null
                        })
                        .select()
                        .single();

                    if (createError) {
                        throw new Error(`Error al crear instancia: ${createError.message}`);
                    }

                    instance = newInstance;
                } else {
                    sessionId = instance.session_id;
                }

                // Crear sesión en servicio Venom
                const createPayload: any = {
                    sessionId: sessionId,
                    userId: user_id,
                    webhookUrl: instance.webhook_url
                };

                // Solo agregar phoneNumber si existe (debe ser string)
                if (phone || instance.phone_number) {
                    createPayload.phoneNumber = phone || instance.phone_number;
                }

                console.log(`[Venom] Creating session:`, createPayload);

                let venomSessionRes = await fetch(`${VENOM_SERVICE_URL}/sessions`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': VENOM_API_KEY!,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(createPayload)
                });

                if (!venomSessionRes.ok && venomSessionRes.status !== 409) {
                    // 409 = Already exists (OK)
                    const errorText = await venomSessionRes.text();
                    throw new Error(`Error al crear sesión Venom: ${errorText}`);
                }

                // Esperar 2 segundos para que se genere el QR
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Obtener QR
                if (action === 'get-qr') {
                    const qrRes = await fetch(`${VENOM_SERVICE_URL}/sessions/${sessionId}/qr`, {
                        headers: {
                            'X-API-Key': VENOM_API_KEY!
                        }
                    });

                    if (!qrRes.ok) {
                        throw new Error('Error al obtener QR code');
                    }

                    const qrData = await qrRes.json();

                    // Actualizar estado en DB
                    await supabase
                        .from('venom_instances')
                        .update({
                            status: 'qr_ready',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', instance.id);

                    return new Response(JSON.stringify({
                        qr: qrData.qr,
                        base64: qrData.base64,
                        instance: {
                            ...instance,
                            status: 'qr_ready'
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else {
                    // PAIRING CODE
                    if (!phone) {
                        throw new Error("Se requiere número de teléfono para código de emparejamiento");
                    }

                    // TODO: Implementar pairing code cuando Venom lo soporte
                    throw new Error("Pairing code no implementado aún en Venom. Usa QR code.");
                }

            } catch (e: any) {
                console.error(`[Venom Connect Error] ${e.message}`);
                throw e;
            }
        }

        // =========================================
        // ACCIÓN: LOGOUT - Desconectar
        // =========================================
        if (action === 'logout') {
            try {
                const { data: instance } = await supabase
                    .from('venom_instances')
                    .select('session_id')
                    .eq('user_id', user_id)
                    .single();

                if (!instance) {
                    throw new Error("No se encontró instancia para desconectar");
                }

                sessionId = instance.session_id;

                // Eliminar sesión en servicio Venom
                await fetch(`${VENOM_SERVICE_URL}/sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-API-Key': VENOM_API_KEY!
                    }
                });

                // Actualizar estado en DB
                await supabase
                    .from('venom_instances')
                    .update({
                        status: 'disconnected',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user_id);

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Sesión desconectada'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (e: any) {
                console.error(`[Venom Logout Error] ${e.message}`);
                throw e;
            }
        }

        // =========================================
        // ACCIÓN: DELETE - Eliminar instancia
        // =========================================
        if (action === 'delete') {
            try {
                const { data: instance } = await supabase
                    .from('venom_instances')
                    .select('session_id')
                    .eq('user_id', user_id)
                    .single();

                if (instance) {
                    sessionId = instance.session_id;

                    // Eliminar sesión en servicio Venom
                    await fetch(`${VENOM_SERVICE_URL}/sessions/${sessionId}`, {
                        method: 'DELETE',
                        headers: {
                            'X-API-Key': VENOM_API_KEY!
                        }
                    });
                }

                // Eliminar de DB
                await supabase
                    .from('venom_instances')
                    .delete()
                    .eq('user_id', user_id);

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Instancia eliminada'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (e: any) {
                console.error(`[Venom Delete Error] ${e.message}`);
                throw e;
            }
        }

        // =========================================
        // ACCIÓN: UPDATE-CONFIG (SuperAdmin)
        // =========================================
        if (action === 'update-config') {
            const { instance_id, webhook_url, image_format } = await req.json();

            // Ejecutar función de base de datos
            const { data, error } = await supabase.rpc('superadmin_update_venom_config', {
                p_instance_id: instance_id,
                p_webhook_url: webhook_url,
                p_image_format: image_format
            });

            if (error) throw error;

            // Si webhook cambió, actualizar en servicio Venom
            if (webhook_url) {
                const { data: instance } = await supabase
                    .from('venom_instances')
                    .select('session_id')
                    .eq('id', instance_id)
                    .single();

                if (instance) {
                    await fetch(`${VENOM_SERVICE_URL}/sessions/${instance.session_id}/webhook`, {
                        method: 'PUT',
                        headers: {
                            'X-API-Key': VENOM_API_KEY!,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ webhookUrl: webhook_url })
                    });
                }
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // =========================================
        // ACCIÓN: LIST-ALL (SuperAdmin)
        // =========================================
        if (action === 'list-all') {
            // Verificar que sea superadmin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user_id)
                .single();

            if (profile?.role !== 'superadmin') {
                throw new Error("Solo SuperAdmin puede listar todas las instancias");
            }

            // Obtener desde vista
            const { data: instances, error } = await supabase
                .from('superadmin_venom_instances')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(JSON.stringify({ instances }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // =========================================
        // ACCIÓN: DELETE-BY-ID (SuperAdmin)
        // =========================================
        if (action === 'delete-by-id') {
            const { instance_id } = await req.json();

            // Verificar que sea superadmin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user_id)
                .single();

            if (profile?.role !== 'superadmin') {
                throw new Error("Solo SuperAdmin puede eliminar instancias");
            }

            // Obtener session_id antes de eliminar
            const { data: instance } = await supabase
                .from('venom_instances')
                .select('session_id')
                .eq('id', instance_id)
                .single();

            if (instance) {
                // Eliminar en servicio Venom
                await fetch(`${VENOM_SERVICE_URL}/sessions/${instance.session_id}`, {
                    method: 'DELETE',
                    headers: { 'X-API-Key': VENOM_API_KEY! }
                });
            }

            // Eliminar de BD
            const { error } = await supabase
                .from('venom_instances')
                .delete()
                .eq('id', instance_id);

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            error: "Acción inválida"
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Venom Error]', error.message);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

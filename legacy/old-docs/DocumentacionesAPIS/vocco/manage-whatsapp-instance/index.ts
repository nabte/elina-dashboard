
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { action, clinic_id, phone } = await req.json();

        if (!clinic_id) throw new Error("clinic_id is required");

        // 1. Obtener configuración global de Evolution API
        const { data: globalConfig, error: configError } = await supabaseClient
            .from('VOC_evolution_api_config')
            .select('*')
            .eq('is_active', true)
            .single();

        if (configError || !globalConfig) {
            throw new Error("Configuración de Evolution API no encontrada");
        }

        const API_URL = globalConfig.api_url;
        const GLOBAL_API_KEY = globalConfig.api_key;
        const instanceName = `vocco-${clinic_id.substring(0, 8)}`;
        const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-evolution-webhook`;

        // Acciones: status, get-qr, pairing-code, logout
        if (action === 'status') {
            const res = await fetch(`${API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
                headers: { 'apikey': GLOBAL_API_KEY }
            });
            const instances = await res.json();
            const inst = Array.isArray(instances) ? instances.find(i => i.instanceName === instanceName) : instances;

            return new Response(JSON.stringify({
                status: inst?.status === 'open' ? 'connected' : (inst?.status === 'connecting' ? 'connecting' : 'disconnected'),
                instance: inst
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'get-qr' || action === 'pairing-code') {
            // A. Crear o asegurar instancia
            // Primero verificamos si existe
            const checkRes = await fetch(`${API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
                headers: { 'apikey': GLOBAL_API_KEY }
            });
            const currentInst = await checkRes.json();

            if (!currentInst || (Array.isArray(currentInst) && currentInst.length === 0)) {
                console.log(`Creando nueva instancia: ${instanceName}`);
                await fetch(`${API_URL}/instance/create`, {
                    method: 'POST',
                    headers: { 'apikey': GLOBAL_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instanceName,
                        token: clinic_id,
                        qrcode: true,
                        number: phone // Pasamos el número si lo tenemos
                    })
                });
            }

            // B. Configurar Webhooks (IMPORTANTE para tu pregunta)
            // Esto asegura que Evolution envíe las confirmaciones de vuelta
            console.log(`Configurando webhooks para: ${instanceName}`);
            await fetch(`${API_URL}/webhook/set/${instanceName}`, {
                method: 'POST',
                headers: { 'apikey': GLOBAL_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: true,
                    url: webhookUrl,
                    webhook_by_events: false, // Usar todos los eventos o filtrar
                    events: [
                        "MESSAGES_UPSERT",
                        "MESSAGES_UPDATE",
                        "CONNECTION_UPDATE"
                    ]
                })
            });

            // C. Obtener el recurso solicitado (QR o Código)
            if (action === 'get-qr') {
                const qrRes = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
                    headers: { 'apikey': GLOBAL_API_KEY }
                });
                const qrData = await qrRes.json();
                return new Response(JSON.stringify(qrData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } else {
                // Pairing Code requiere el número obligatorio
                if (!phone) throw new Error("Phone number is required for pairing code");
                const pairRes = await fetch(`${API_URL}/instance/connect/pairing/${instanceName}?number=${phone}`, {
                    headers: { 'apikey': GLOBAL_API_KEY }
                });
                const pairData = await pairRes.json();
                return new Response(JSON.stringify(pairData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        if (action === 'logout') {
            await fetch(`${API_URL}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': GLOBAL_API_KEY }
            });
            // Opcionalmente borrar de la DB de connections
            await supabaseClient.from('VOC_whatsapp_connections').delete().eq('clinic_id', clinic_id);

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });

    } catch (error: any) {
        console.error('Error in manage-whatsapp-instance:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});

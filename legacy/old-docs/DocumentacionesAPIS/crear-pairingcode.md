El sistema que buscas para crear/conectar una cuenta de Evolution API usando solo el número de teléfono (mediante "Pairing Code" en lugar de QR) se encuentra implementado principalmente en la Edge Function manage-whatsapp-instance.

Aquí tienes los archivos y la configuración exacta de ese sistema:

1. Lógica Principal (
manage-whatsapp-instance/index.ts
)
Esta función maneja la creación de la instancia y, crucialmente, la solicitud del Pairing Code cuando se le envía action: 'pairing-code' y un phone.

typescript
// supabase/functions/manage-whatsapp-instance/index.ts
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
            // B. Configurar Webhooks (IMPORTANTE: Conecta con handle-evolution-webhook)
            console.log(`Configurando webhooks para: ${instanceName}`);
            await fetch(`${API_URL}/webhook/set/${instanceName}`, {
                method: 'POST',
                headers: { 'apikey': GLOBAL_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: true,
                    url: webhookUrl,
                    webhook_by_events: false,
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
                // AQUÍ ESTÁ LA LÓGICA DE PAIRING CODE
                if (!phone) throw new Error("Phone number is required for pairing code");
                
                // Limpiar el número (eliminar simbolos, espacios, etc)
                const cleanPhone = phone.replace(/\D/g, '');
                
                const pairRes = await fetch(`${API_URL}/instance/connect/pairing/${instanceName}?number=${cleanPhone}`, {
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
2. Manejo de Webhooks (
handle-evolution-webhook/index.ts
)
Este archivo recibe los eventos de Evolution (mensajes, cambios de conexión) que se configuran automáticamente en el paso anterior.

typescript
// supabase/functions/handle-evolution-webhook/index.ts
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
        const rawBody = await req.text();
        // ... (Lógica de procesamiento de mensajes y confirmación de citas)
        
        // Aquí deberías agregar lógica para CONNECTION_UPDATE si quieres 
        // actualizar el estado en tu base de datos automáticamente
        
        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
    } catch (error: any) {
        console.error('Error en handle-evolution-webhook:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
});
3. Configuración SQL (
setup_evolution_api_global.sql
)
La tabla donde se guarda la URL y API Key "maestras" de tu servidor Evolution.

sql
-- Tabla de configuración global
CREATE TABLE IF NOT EXISTS public."VOC_evolution_api_config" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Insertar configuración (Ejemplo)
INSERT INTO public."VOC_evolution_api_config" (api_url, api_key, is_active)
VALUES (
    'https://tu-evolution-api.com', 
    'TU_API_KEY_GLOBAL', 
    true
)
ON CONFLICT DO NOTHING;
Cómo llamar a la función para obtener el Código de Emparejamiento:
Debes invocar a manage-whatsapp-instance con el siguiente JSON:

json
{
  "action": "pairing-code",
  "clinic_id": "uuid-de-la-clinica",
  "phone": "5215512345678" 
}
El sistema responderá con un JSON que incluye el código (por ejemplo ABC-123) que debes mostrar al usuario para que lo ingrese en su WhatsApp > Dispositivos Vinculados > Vincular con número de teléfono.
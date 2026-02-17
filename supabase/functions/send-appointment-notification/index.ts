import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Usamos una variable de entorno para la URL de la API, o un valor por defecto si es una sola instancia global
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.evolution-api.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { appointment_id, type } = await req.json();

        console.log(`[Notification] Request received for ID: ${appointment_id}, Type: ${type}`);

        if (!appointment_id) {
            throw new Error("Missing appointment_id");
        }

        // 1. Obtener detalles de la Cita (Query Simple)
        const { data: meeting, error: meetingError } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', appointment_id)
            .single();

        if (meetingError) {
            console.error("[Notification] DB Error fetching meeting:", meetingError);
            throw new Error(`DB Error: ${meetingError.message}`);
        }

        if (!meeting) {
            console.error("[Notification] Meeting not found for ID:", appointment_id);
            throw new Error("Cita no encontrada (Meeting not found)");
        }

        // 2. Fetch Relaciones Manualmente (Más seguro que Joins complejos)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email, evolution_instance_name, evolution_api_key, branding_settings')
            .eq('id', meeting.user_id)
            .single();

        if (profileError) {
            console.error(`[Notification] DB Error fetching profile for ID ${meeting.user_id}:`, profileError);
        }

        // Fetch settings separately
        const { data: settings } = await supabase
            .from('appointment_settings')
            .select('reminder_message_template')
            .eq('user_id', meeting.user_id)
            .maybeSingle();

        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('full_name, phone_number')
            .eq('id', meeting.contact_id)
            .single();

        if (contactError) {
            console.error("[Notification] DB Error fetching contact:", contactError);
        }

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('product_name')
            .eq('id', meeting.product_id)
            .single();

        if (productError) {
            console.error("[Notification] DB Error fetching product:", productError);
        }

        console.log(`[Notification] Data details: UserID: ${meeting.user_id}, ProfileFound: ${!!profile}, ContactFound: ${!!contact}`);

        // 3. Configuración de Evolution API
        const apiKey = profile?.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY");
        const instanceName = profile?.evolution_instance_name || Deno.env.get("EVOLUTION_INSTANCE_NAME");

        // El nombre de negocio puede venir de branding_settings o full_name
        let businessName = "Elina";
        if (profile) {
            const branding = profile.branding_settings as any || {};
            businessName = branding.business_name || profile.full_name || profile.email?.split('@')[0] || "Elina IA";
        }

        if (!apiKey || !instanceName) {
            console.error(`[Notification] No Evolution API configuration found. Profile Key: ${!!profile?.evolution_api_key}, Env Key: ${!!Deno.env.get("EVOLUTION_API_KEY")}`);
            return new Response(JSON.stringify({ error: "Configuration Error: No WhatsApp Provider configured" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!contact || !contact.phone_number) {
            throw new Error("La cita no tiene un contacto valido o telefono.");
        }

        // 2. Definir Mensaje
        let message = "";

        // Formatear Fecha
        const dateDate = new Date(meeting.start_time);
        const dateStr = dateDate.toLocaleDateString("es-MX", { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' });
        const timeStr = dateDate.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });

        if (type === 'confirmation') {
            // Mensaje por defecto de confirmación
            message = `Hola ${contact.full_name}, tu cita en *${businessName}* para *${product?.product_name || 'Servicio'}* ha sido agendada exitosamente para el día *${dateStr}* a las *${timeStr}*.\n\nPor favor responde *SÍ* para confirmar tu asistencia.`;
        } else {
            message = `Hola ${contact.full_name}, recordatorio de tu cita en *${businessName}* el *${dateStr}* a las *${timeStr}*.`;
        }

        // 3. Enviar mensaje
        const evolutionUrl = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;

        // Limpiar teléfono: Evolution suele requerir solo números
        // En BD tenemos +52... o 52...
        // Si tiene +, lo quitamos si la API de Evolution v2 lo prefiere sin, 
        // pero la v2 suele ser agnóstica. Normalizamos a 521 o 52 segun se requiera.
        // Asumimos formato simple de numeros.
        let phoneToSend = contact.phone_number.replace(/[^\d]/g, ''); // solo numeros

        // Si es Mexico (52) y faltan digitos... mejor dejarlo como viene del input si ya trae codigo pais
        // Int Input devuelve con + (+52...)
        // Evolution V2 a veces prefiere number sin +

        console.log(`[Notification] Sending to ${evolutionUrl} for ${phoneToSend}`);

        const response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                number: phoneToSend,
                text: message
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("[Notification] Evolution API Error:", result);
            return new Response(JSON.stringify({
                error: "Provider Error",
                details: result
            }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Registrar en appointment_reminders para que n8n pueda procesar la respuesta
        try {
            await supabase.from('appointment_reminders').insert({
                user_id: meeting.user_id,
                meeting_id: meeting.id,
                contact_phone: contact.phone_number,
                message: message,
                status: 'sent',
                sent_at: new Date().toISOString(),
                reminder_type: type === 'confirmation' ? 'confirmation' : 'reminder'
            });
            console.log("[Notification] Record inserted into appointment_reminders");
        } catch (dbErr) {
            // No fallamos si esto falla, pero lo loggeamos
            console.error("[Notification] Error tracking reminder in DB:", dbErr);
        }

        // 5. Actualizar estado de notificación en la Cita (Opcional, si queremos marcar 'sent' en DB)
        if (type === 'confirmation') {
            await supabase.from('meetings').update({
                confirmation_status: 'sent'
            }).eq('id', appointment_id);
        }

        return new Response(JSON.stringify({ success: true, provider_response: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("[Notification] Function Error:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

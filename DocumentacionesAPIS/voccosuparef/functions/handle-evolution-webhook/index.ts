
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

        const body = await req.json();
        console.log('Webhook recibido de Evolution:', JSON.stringify(body, null, 2));

        // Solo procesamos mensajes recibidos (messages.upsert)
        if (body.event !== 'messages.upsert') {
            return new Response(JSON.stringify({ status: 'ignored_event' }), { headers: corsHeaders });
        }

        const message = body.data;
        const isFromMe = message.key.fromMe;

        // Ignorar mensajes enviados por nosotros mismos
        if (isFromMe) {
            return new Response(JSON.stringify({ status: 'ignored_self' }), { headers: corsHeaders });
        }

        // Extraer número de teléfono y texto
        const remoteJid = message.key.remoteJid; // ej: 5219995169313@s.whatsapp.net
        let senderPhoneClean = remoteJid.split('@')[0].replace(/\D/g, '');

        // Normalización clásica para México: 521XXXXXXXXXX -> 52XXXXXXXXXX
        if (senderPhoneClean.startsWith('521') && senderPhoneClean.length === 13) {
            senderPhoneClean = '52' + senderPhoneClean.substring(3);
        }

        const text = (message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.buttonsResponseMessage?.selectedButtonId || // Para cuando usemos botones
            '').trim().toUpperCase();

        console.log(`Mensaje de ${senderPhoneClean}: ${text}`);

        // LÓGICA DE CONFIRMACIÓN: ¿Dice SI o CONFIRMAR en alguna parte?
        const confirmationWords = ['SI', 'SÍ', 'OK', 'CONFIRMAR', 'CONFIRMADO', 'CONFIRMO', 'CLARO', 'DALE', 'ACEPTO'];
        const isConfirming = confirmationWords.some(word =>
            text === word || text.startsWith(word + ' ') || text.includes(' ' + word + ' ') || text.endsWith(' ' + word)
        );

        if (isConfirming) {

            // 1. Buscar la cita pendiente (sent o pending)
            // Usamos LIKE para ser más flexibles con el formato del número en BD
            console.log(`Buscando cita para ${senderPhoneClean}...`);
            const { data: appointments, error: apptError } = await supabaseClient
                .from('VOC_appointments')
                .select('*, clinic:VOC_clinics(*)')
                .in('status', ['sent', 'pending'])
                .or(`phone_number.ilike.%${senderPhoneClean},phone_number.ilike.%${senderPhoneClean.substring(2)}`)
                .order('date_iso', { ascending: true });

            if (appointments && appointments.length > 0) {
                const appointment = appointments[0];
                // 2. Actualizar la cita a 'confirmed'
                await supabaseClient
                    .from('VOC_appointments')
                    .update({ status: 'confirmed' })
                    .eq('id', appointment.id);

                console.log(`Cita ${appointment.id} confirmada automáticamente.`);

                // 3. Opcional: Responder confirmación al cliente
                const clinic = appointment.clinic;
                const apiUrl = clinic.evolution_api_url || 'https://evolutionapi-evolution-vocco.mcjhhb.easypanel.host';
                const apiKey = clinic.evolution_api_key;
                const instanceName = clinic.evolution_instance_name;

                if (apiKey && instanceName) {
                    const responseText = `¡Gracias ${appointment.patient_name}! Tu cita ha sido confirmada con éxito. ✅`;
                    await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ number: senderPhoneClean, text: responseText })
                    });
                }

                return new Response(JSON.stringify({ status: 'confirmed' }), { headers: corsHeaders });
            } else {
                console.log('No se encontró cita "sent" para este número.');
            }
        }

        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });

    } catch (error: any) {
        console.error('Error en webhook-evolution:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
});

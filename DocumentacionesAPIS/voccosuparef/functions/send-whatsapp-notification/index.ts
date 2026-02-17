import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

        const { appointment_id, type } = await req.json();

        if (!appointment_id || !type) {
            throw new Error('Faltan datos requeridos (appointment_id, type)');
        }

        // 1. Obtener datos de la cita y la clínica
        const { data: appointment, error: apptError } = await supabaseClient
            .from('VOC_appointments')
            .select('*, clinic:VOC_clinics(*)')
            .eq('id', appointment_id)
            .single();

        if (apptError || !appointment) {
            throw new Error('Cita no encontrada');
        }

        const clinic = appointment.clinic;

        // Verificar configuración de Evolution API (Híbrido: Clínica o Global)
        let apiUrl = clinic.evolution_api_url;
        let apiKey = clinic.evolution_api_key;
        let instanceName = clinic.evolution_instance_name;

        // Buscar configuración global si falta la URL o la Key
        // IMPORTANTE: Tu clínica tiene Key e Instance, pero URL es null.

        const { data: globalConfig } = await supabaseClient
            .from('VOC_evolution_api_config')
            .select('*')
            .eq('is_active', true)
            .maybeSingle(); // Usar maybeSingle para no lanzar error si no hay

        if (globalConfig) {
            apiUrl = apiUrl || globalConfig.base_url;
            apiKey = apiKey || globalConfig.api_key;
            instanceName = instanceName || globalConfig.instance_name;
        }

        // Fallback de emergencia si aun así no hay URL (Hardcoded para este proyecto)
        if (!apiUrl) {
            apiUrl = 'https://evolutionapi-evolution-vocco.mcjhhb.easypanel.host';
        }

        if (!apiKey || !apiUrl || !instanceName) {
            // Log detallado para saber qué falta exactamente
            console.error(`Config Falta: URL=${apiUrl}, Key=${apiKey ? 'YES' : 'NO'}, Instance=${instanceName}`);
            throw new Error(`La clínica no tiene configurada la API de Evolution correctamente. ID: ${clinic.id}`);
        }

        // 2. Construir el mensaje usando plantillas si existen
        let messageText = '';

        // Obtener nombre real del paciente si está vinculado
        let patientName = appointment.patient_name;
        if (appointment.patient_id) {
            const { data: patientRecord } = await supabaseClient
                .from('VOC_patients')
                .select('name')
                .eq('id', appointment.patient_id)
                .maybeSingle();

            if (patientRecord?.name) {
                patientName = patientRecord.name;
            }
        }

        const businessName = clinic.business_name || clinic.doctor_name || 'nuestra clínica';
        const date = new Date(appointment.date_iso);
        // "sábado 24 de enero" format
        const dateStr = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

        // Format time to AM/PM
        const [hours, minutes] = appointment.time.split(':').map(Number);
        const ampm = hours >= 12 ? 'pm' : 'am';
        const hours12 = hours % 12 || 12;
        const timeStr = `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        const serviceName = appointment.treatment_type || 'un servicio';

        // Buscar plantilla según el tipo
        const templateType = (type === 'recall')
            ? 'recall_reminder'
            : (type === 'invitation' ? 'appointment_invitation' : 'appointment_reminder');

        // For recalls, try to find service-specific template first
        let template = null;
        if (type === 'recall') {
            const { data: serviceTemplate } = await supabaseClient
                .from('VOC_message_templates')
                .select('template_text, discount_percentage')
                .eq('clinic_id', clinic.id)
                .eq('type', templateType)
                .eq('service_id', appointment.service_id)
                .eq('is_active', true) // Only active promotional templates
                .maybeSingle();
            template = serviceTemplate;
        }

        // If no service-specific template, get general template
        if (!template) {
            const { data: generalTemplate } = await supabaseClient
                .from('VOC_message_templates')
                .select('template_text, discount_percentage')
                .eq('clinic_id', clinic.id)
                .eq('type', templateType)
                .is('service_id', null)
                .maybeSingle();
            template = generalTemplate;
        }

        // Calculate time elapsed for recalls
        let tiempoTranscurrido = '';
        if (type === 'recall') {
            const now = new Date();
            const apptDate = new Date(appointment.date_iso);
            const diffMs = now.getTime() - apptDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffMonths = Math.floor(diffDays / 30);
            const diffWeeks = Math.floor(diffDays / 7);

            if (diffMonths >= 2) {
                tiempoTranscurrido = `${diffMonths} meses`;
            } else if (diffWeeks >= 2) {
                tiempoTranscurrido = `${diffWeeks} semanas`;
            } else {
                tiempoTranscurrido = `${diffDays} días`;
            }
        }

        // Build booking link
        const bookingLink = clinic.slug
            ? `https://vocco.app/${clinic.slug}`
            : `https://vocco.app/booking/${clinic.id}`;

        if (template?.template_text) {
            messageText = template.template_text
                .replace(/{cliente}/g, patientName)
                .replace(/{nombre}/g, patientName)
                .replace(/{negocio}/g, businessName)
                .replace(/{doctor}/g, businessName)
                .replace(/{servicio}/g, serviceName)
                .replace(/{fecha}/g, dateStr)
                .replace(/{hora}/g, timeStr)
                .replace(/{tiempo_transcurrido}/g, tiempoTranscurrido)
                .replace(/{link_agendamiento}/g, bookingLink);

            // Add discount if specified
            if (template.discount_percentage && template.discount_percentage > 0) {
                messageText = messageText.replace(/{descuento}/g, `${template.discount_percentage}%`);
            }
        } else {
            // Fallback hardcoded si no hay plantilla
            if (type === 'invitation') {
                messageText = `Hola ${patientName}, te saluda ${businessName} 👋\n\nHemos agendado tu cita de *${serviceName}* para el ${dateStr} a las ${timeStr}.\n\n✅ *Responde SI para confirmar tu asistencia*\n\n¡Te esperamos!`;
            } else if (type === 'reminder') {
                messageText = `Hola ${patientName}, te recordamos tu cita de mañana 📅\n\n*${serviceName}*\n📍 ${businessName}\n🕐 ${dateStr} a las ${timeStr}\n\n✅ *Responde SI si confirmas tu asistencia*\n\n¡Nos vemos pronto!`;
            } else if (type === 'recall') {
                messageText = `Hola ${patientName}, ¿cómo has estado? 😊\n\nVeo que tuvimos una cita de *${serviceName}* hace ${tiempoTranscurrido}. Según nuestras recomendaciones, sería ideal agendar una sesión de refuerzo pronto.\n\n¿Te gustaría agendar para la próxima semana?\n\n📲 Puedes agendar aquí: ${bookingLink}\n\nO simplemente responde y coordinamos juntos.`;
            } else if (type === 'test') {
                messageText = `Hola ${patientName}, esta es una prueba de conexión desde Vocco.`;
            } else {
                messageText = `Hola ${patientName}, mensaje sobre tu cita del ${dateStr} a las ${timeStr}.`;
            }
        }

        // 3. Enviar mensaje via Evolution API
        let phone = appointment.phone_number.replace(/[^\d]/g, '');
        if (!phone.startsWith('52') && phone.length === 10) {
            phone = '52' + phone;
        }

        // Intentar envío interactivo (Botones modernos)
        let evolutionUrl = `${apiUrl}/message/sendInteractive/${instanceName}`;
        let bodyPayload: any = {
            number: phone,
            interactive: {
                type: "button",
                body: { text: messageText },
                footer: { text: "Vocco - Confirmación Automática" },
                action: {
                    buttons: [
                        {
                            buttonId: "SI",
                            buttonText: { displayText: "SÍ, CONFIRMO ✅" }
                        },
                        {
                            buttonId: "NO",
                            buttonText: { displayText: "NO, CANCELAR ❌" }
                        }
                    ]
                }
            }
        };

        console.log(`Intentando enviar botones interactivos a ${phone}...`);

        let evolutionResponse = await fetch(evolutionUrl, {
            method: 'POST',
            headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        // Fallback a texto plano si falla lo interactivo
        if (!evolutionResponse.ok) {
            console.warn('Fallo envío interactivo, reintentando con texto plano...');
            evolutionUrl = `${apiUrl}/message/sendText/${instanceName}`;
            evolutionResponse = await fetch(evolutionUrl, {
                method: 'POST',
                headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: phone, text: messageText })
            });
        }

        if (!evolutionResponse.ok) {
            const errorText = await evolutionResponse.text();
            console.error('Error Evolution API:', errorText);
            throw new Error(`Error enviando WhatsApp: ${evolutionResponse.statusText}`);
        }

        const result = await evolutionResponse.json();

        // 4. Actualizar estado de la cita si fue invitación exitosa
        if (type === 'invitation') {
            await supabaseClient
                .from('VOC_appointments')
                .update({ status: 'sent' }) // Cambiar a 'sent'
                .eq('id', appointment_id);
        }

        return new Response(
            JSON.stringify({ success: true, evolution_response: result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error en send-whatsapp-notification:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

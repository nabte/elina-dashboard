// Supabase Edge Function: send-reminders
// Se ejecuta periódicamente para enviar recordatorios automáticos y notificaciones a administradores

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración Global de Elina (para notificar al admin)
// Estas deben estar en los secretos de la Edge Function
const ELINA_GLOBAL_API_URL = Deno.env.get('ELINA_GLOBAL_API_URL') || Deno.env.get('EVOLUTION_API_URL');
const ELINA_GLOBAL_API_KEY = Deno.env.get('ELINA_GLOBAL_API_KEY') || Deno.env.get('EVOLUTION_API_KEY');
const ELINA_GLOBAL_INSTANCE = Deno.env.get('ELINA_GLOBAL_INSTANCE_NAME') || 'ElinaMain';

interface EvolutionApiResponse {
    success: boolean;
    data?: any;
    error?: string;
}

async function sendMessage(
    instanceName: string,
    phoneNumber: string,
    message: string,
    apiUrl: string,
    apiKey: string
): Promise<EvolutionApiResponse> {
    try {
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        let formattedPhone = cleanPhone;

        if (!formattedPhone.startsWith('+')) {
            if (!formattedPhone.startsWith('52')) {
                formattedPhone = `52${formattedPhone}`;
            }
            formattedPhone = `+${formattedPhone}`;
        }

        // Remover el '+' para Evolution API si es necesario, dependiendo de la versión. 
        // Usualmente Evolution API v2 acepta con o sin +, pero mejor estandarizar.
        // En Vocco usaban con +.

        const url = `${apiUrl}/message/sendText/${instanceName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                number: formattedPhone,
                text: message,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Error sending message to ${formattedPhone}:`, errorData);
            return {
                success: false,
                error: errorData.message || `HTTP ${response.status}`,
            };
        }

        const data = await response.json();
        return {
            success: true,
            data: data,
        };
    } catch (error: any) {
        console.error(`Exception sending message:`, error);
        return {
            success: false,
            error: error.message || 'Error al enviar mensaje',
        };
    }
}

function replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
): string {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
        // Reemplazo simple case-insensitive o exacto
        message = message.replace(new RegExp(`{${key}}`, 'gi'), value || '');
    }
    return message;
}

function formatDateForMessage(dateIso: string): string {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    // Ajustar a zona horaria de México (aproximado, idealmente usar timezone del usuario)
    return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Mexico_City'
    });
}

function formatTimeForMessage(dateIso: string): string {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Mexico_City'
    });
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

        const now = new Date();
        // Ajustar 'now' a la zona horaria objetivo si fuese necesario, 
        // pero para comparaciones relativas (horas/días) el tiempo del servidor suele estar en UTC.
        // Asumiremos que las fechas en BD son UTC (ISO string).

        const nowIso = now.toISOString();

        console.log(`[Send-Reminders] Executing at ${nowIso}`);

        // 1. Obtener todos los usuarios con configuración de recordatorios habilitada
        //    y que tengan una instancia de WhatsApp conectada.
        const { data: users, error: usersError } = await supabaseClient
            .from('profiles')
            .select(`
        id, 
        business_name, 
        contact_phone,
        business_phone,
        evolution_instance_name, 
        evolution_api_key, 
        timezone,
        appointment_settings!inner (
          is_reminder_enabled,
          reminder_days_before,
          reminder_hours_before,
          reminder_message_template
        )
      `)
            .eq('appointment_settings.is_enabled', true)
            .eq('appointment_settings.is_reminder_enabled', true)
            .not('evolution_instance_name', 'is', null);

        if (usersError) throw usersError;

        let sentCount = 0;
        let errorCount = 0;

        for (const user of users) {
            if (!user.evolution_instance_name) continue;

            const settings = user.appointment_settings;
            const daysBefore = settings.reminder_days_before || 2; // Default 2 días
            const hoursBefore = settings.reminder_hours_before || 1; // Default 1 hora

            // API URL/Key del usuario (o global si no tiene, pero asumimos arquitectura user-instance)
            // Si el usuario no tiene API Key definida en su perfil, podríamos usar una global si compartieran servidor
            // pero por ahora usaremos la global como fallback solo para URL si se requiere.
            const userApiUrl = Deno.env.get('EVOLUTION_API_URL'); // Asumimos URL base global para todos los usuarios
            const userApiKey = user.evolution_api_key || Deno.env.get('EVOLUTION_API_KEY'); // O su key específica

            if (!userApiUrl || !userApiKey) {
                console.error(`Falta configuración API para usuario ${user.id}`);
                continue;
            }

            // Obtener Plantillas (Legacy)
            const { data: templatesRaw } = await supabaseClient
                .from('message_templates')
                .select('*')
                .eq('user_id', user.id);

            const templates = templatesRaw || [];

            // Prioridad: 
            // 1. Template en appointment_settings (Editado desde el Panel Simple)
            // 2. Template en message_templates (Sistema Legacy/Avanzado)
            // 3. Default Hardcoded
            const reminderTemplate = settings.reminder_message_template ||
                templates.find(t => t.type === 'appointment_reminder')?.template_text ||
                'Hola {nombre}, te recordamos tu cita en {negocio} para el servicio {servicio} el día {fecha} a las {hora}. Por favor confirma tu asistencia. 📅';

            const adminNotificationTemplate =
                '🔔 *Nueva Cita Próxima*\n\nCliente: {cliente}\nServicio: {servicio}\n📅 {fecha} ⏰ {hora}\n\nRevisa tu calendario para más detalles.\n\n_Responde a este mensaje para confirmar recibido y detener alertas._';

            // --- LOGICA RECORDATORIO 1: DÍAS ANTES ---
            if (daysBefore > 0) {
                // Calcular rango de tiempo: Citas que empiezan en (now + days)
                // Buscamos citas entre [targetStart, targetEnd]
                const targetDateStart = new Date(now);
                targetDateStart.setDate(targetDateStart.getDate() + daysBefore);
                targetDateStart.setHours(0, 0, 0, 0);

                const targetDateEnd = new Date(targetDateStart);
                targetDateEnd.setHours(23, 59, 59, 999);

                // Fetch de citas
                const { data: dayAppointments } = await supabaseClient
                    .from('meetings')
                    .select(`
            id, start_time, end_time, summary,
            contacts (full_name, phone_number),
            products (product_name)
          `)
                    .eq('user_id', user.id)
                    .gte('start_time', targetDateStart.toISOString())
                    .lte('start_time', targetDateEnd.toISOString())
                    .in('status', ['confirmed', 'pending']); // Solo confirmadas o pendientes

                if (dayAppointments) {
                    for (const appt of dayAppointments) {
                        // Verificar si ya enviamos recordatorio DE DÍAS
                        // Usaremos metadata para trackear envíos si no hay tabla de logs,
                        // pero lo ideal es una tabla de logs. 
                        // Vocco usaba VOC_sent_messages. Elina no tiene esa tabla aún en la migración que vi.
                        // CHECK: ¿Creamos tabla de logs?
                        // Por simplicidad y rapidez, usaremos una tabla 'message_logs' si existe, o miraremos metadatos de la cita?
                        // Mejor crear la tabla 'message_logs' en la migración anterior o aquí si pudiéramos.
                        // Asumiré que no existe y modificaré el script para CREARLA si no existe si pudiera.
                        // Como ya apliqué la migración, la crearé con executeSQL ahora o usaré metadata de 'meetings'.
                        // USEMOS METADATA de 'meetings' para evitar overhead de tablas extra por ahora: 
                        // meeting.metadata.reminders_sent = { days: timestamp, hours: timestamp }

                        // Verificar metadata
                        const metadata = (appt as any).metadata || {}; // Type cast rápido
                        const remindersSent = metadata.reminders_sent || {};

                        if (remindersSent.days_before) continue; // Ya enviado

                        const contact = appt.contacts;
                        const product = appt.products;
                        if (!contact || !contact.phone_number) continue;

                        // Mensaje al Cliente
                        const msgVars = {
                            nombre: contact.full_name,
                            negocio: user.business_name || 'Nosotros',
                            servicio: product?.product_name || 'Servicio General',
                            fecha: formatDateForMessage(appt.start_time),
                            hora: formatTimeForMessage(appt.start_time)
                        };

                        const msgText = replaceTemplateVariables(reminderTemplate, msgVars);

                        // Enviar
                        const result = await sendMessage(
                            user.evolution_instance_name,
                            contact.phone_number,
                            msgText,
                            userApiUrl,
                            userApiKey
                        );

                        if (result.success) {
                            sentCount++;
                            // Actualizar metadata
                            remindersSent.days_before = new Date().toISOString();
                            await supabaseClient
                                .from('meetings')
                                .update({ metadata: { ...metadata, reminders_sent: remindersSent } })
                                .eq('id', appt.id);
                        } else {
                            errorCount++;
                        }
                    }
                }
            }

            // --- LOGICA RECORDATORIO 2: HORAS ANTES ---
            // Y NOTIFICACIÓN AL ADMIN (Se hace en la ventana de horas para recordar al admin también)
            if (hoursBefore > 0) {
                const targetTimeStart = new Date(now);
                targetTimeStart.setHours(targetTimeStart.getHours() + hoursBefore);
                // Margen de error de +/- 30 minutos para no perder citas si el cron corre cada hora
                const lookAheadMinutes = 60; // Mirar una hora adelante
                // Rango: [now + hoursBefore, now + hoursBefore + window]
                // Ejemplo: Si reminders_hours = 1. Ahora son las 10:00. Buscamos citas de 11:00 a 11:59.

                const startRange = new Date(now.getTime() + (hoursBefore * 60 * 60 * 1000));
                startRange.setMinutes(0, 0, 0); // Inicio de la hora

                const endRange = new Date(startRange);
                endRange.setMinutes(59, 59, 999); // Fin de la hora

                const { data: hourAppointments } = await supabaseClient
                    .from('meetings')
                    .select(`
            id, start_time, end_time, summary,
            contacts (full_name, phone_number),
            products (product_name)
          `)
                    .eq('user_id', user.id)
                    .gte('start_time', startRange.toISOString())
                    .lte('start_time', endRange.toISOString())
                    .in('status', ['confirmed', 'pending']);

                if (hourAppointments) {
                    for (const appt of hourAppointments) {
                        const metadata = (appt as any).metadata || {};
                        const remindersSent = metadata.reminders_sent || {};

                        // 1. Enviar recordatorio al CLIENTE
                        if (!remindersSent.hours_before) {
                            const contact = appt.contacts;
                            const product = appt.products;
                            if (contact && contact.phone_number) {
                                const msgVars = {
                                    nombre: contact.full_name,
                                    negocio: user.business_name || 'Nosotros',
                                    servicio: product?.product_name || 'Servicio General',
                                    fecha: formatDateForMessage(appt.start_time),
                                    hora: formatTimeForMessage(appt.start_time)
                                };
                                const msgText = replaceTemplateVariables(reminderTemplate, msgVars);

                                const res = await sendMessage(
                                    user.evolution_instance_name,
                                    contact.phone_number,
                                    msgText,
                                    userApiUrl,
                                    userApiKey
                                );

                                if (res.success) {
                                    sentCount++;
                                    remindersSent.hours_before = new Date().toISOString();
                                    // Actualizamos metadata al final, junto con admin notification
                                }
                            }
                        }

                        // 2. Enviar notificación al ADMIN (Usuario)
                        // Solo si no se ha notificado ya
                        if (!remindersSent.admin_notified) {
                            const contact = appt.contacts;
                            const product = appt.products;
                            // Teléfono del admin
                            const adminPhone = user.business_phone || user.contact_phone;

                            if (adminPhone && ELINA_GLOBAL_API_URL && ELINA_GLOBAL_API_KEY) {
                                const msgVars = {
                                    cliente: contact?.full_name || 'Cliente sin nombre',
                                    servicio: product?.product_name || 'Cita',
                                    fecha: formatDateForMessage(appt.start_time),
                                    hora: formatTimeForMessage(appt.start_time)
                                };
                                const adminMsg = replaceTemplateVariables(adminNotificationTemplate, msgVars);

                                // Enviar desde la instancia GLOBAL de Elina
                                const resAdmin = await sendMessage(
                                    ELINA_GLOBAL_INSTANCE,
                                    adminPhone,
                                    adminMsg,
                                    ELINA_GLOBAL_API_URL,
                                    ELINA_GLOBAL_API_KEY
                                );

                                if (resAdmin.success) {
                                    sentCount++;
                                    remindersSent.admin_notified = new Date().toISOString();
                                } else {
                                    console.error('Fallo al notificar admin:', resAdmin.error);
                                }
                            }
                        }

                        // Guardar actualizaciones de metadata
                        await supabaseClient
                            .from('meetings')
                            .update({ metadata: { ...metadata, reminders_sent: remindersSent } })
                            .eq('id', appt.id);
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent: sentCount,
                errors: errorCount,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Critical Error in Send-Reminders:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});

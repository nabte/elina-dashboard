// Supabase Edge Function: send-reminders
// Se ejecuta periódicamente para enviar recordatorios automáticos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return message;
}

function formatDateForMessage(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    // Obtener configuración global de Evolution API
    const { data: globalConfig } = await supabaseClient
      .from('VOC_evolution_api_config')
      .select('api_url, api_key')
      .eq('is_active', true)
      .single();

    // Obtener todas las clínicas con conexión WhatsApp activa
    const { data: allConnections, error: connError } = await supabaseClient
      .from('VOC_whatsapp_connections')
      .select('*, VOC_clinics(*)')
      .eq('status', 'connected');

    if (connError) throw connError;
    if (!allConnections || allConnections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay conexiones activas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar solo las que tienen suscripción activa o en trial
    const connections = [];
    for (const connection of allConnections) {
      const clinic = connection.VOC_clinics;
      if (!clinic) continue;

      // Verificar suscripción
      const { data: subscription } = await supabaseClient
        .from('VOC_subscriptions')
        .select('*')
        .eq('clinic_id', clinic.id)
        .single();

      if (!subscription) continue;

      const now = new Date();
      const isActive = subscription.status === 'active' &&
        (!subscription.current_period_end || new Date(subscription.current_period_end) > now);
      const isTrial = subscription.status === 'trial' &&
        (!subscription.trial_end || new Date(subscription.trial_end) > now);

      if (isActive || isTrial) {
        connections.push(connection);
      }
    }

    if (connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay conexiones activas con suscripción válida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      const clinic = connection.VOC_clinics;
      if (!clinic) continue;

      const clinicId = clinic.id;

      // Prioridad: configuración de clínica > configuración global
      let apiUrl = clinic.evolution_api_url;
      let apiKey = clinic.evolution_api_key;

      if (!apiUrl || !apiKey) {
        if (!globalConfig) continue; // No hay configuración disponible
        apiUrl = globalConfig.api_url;
        apiKey = globalConfig.api_key;
      }

      const instanceName = connection.instance_name || clinic.evolution_instance_name;
      if (!instanceName) continue;

      // Obtener configuración de recordatorios
      const { data: reminderSettings } = await supabaseClient
        .from('VOC_reminder_settings')
        .select('*')
        .eq('clinic_id', clinicId)
        .single();

      const settings = reminderSettings || {
        appointment_reminder_days: 1,
        appointment_reminder_hours: 1,
        recall_advance_weeks: 1,
      };

      // Obtener plantillas de mensajes
      const { data: templates } = await supabaseClient
        .from('VOC_message_templates')
        .select('*')
        .eq('clinic_id', clinicId);

      const appointmentTemplate = templates?.find(t => t.type === 'appointment_reminder')?.template_text ||
        'Hola {nombre}, soy el {doctor}. Te escribo para recordarte tu cita de *{servicio}* el {fecha} a las {hora}. ¿Me confirmas?';

      // 1. Buscar citas que necesitan recordatorio (1 día antes)
      if (settings.appointment_reminder_days > 0) {
        const reminderDate = new Date(now);
        reminderDate.setDate(reminderDate.getDate() + settings.appointment_reminder_days);
        const reminderDateStr = reminderDate.toISOString().split('T')[0];

        const { data: appointments } = await supabaseClient
          .from('VOC_appointments')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('date_iso', reminderDateStr)
          .in('status', ['pending', 'confirmed']);

        if (appointments) {
          for (const appointment of appointments) {
            // Verificar si ya se envió este recordatorio
            const { data: existingMessage } = await supabaseClient
              .from('VOC_sent_messages')
              .select('id')
              .eq('appointment_id', appointment.id)
              .eq('message_type', 'appointment_reminder')
              .gte('sent_at', today)
              .single();

            if (existingMessage) continue;

            if (appointment.phone_number) {
              const message = replaceTemplateVariables(appointmentTemplate, {
                nombre: appointment.patient_name,
                servicio: appointment.treatment_type,
                fecha: formatDateForMessage(appointment.date_iso),
                hora: appointment.time,
                doctor: clinic.doctor_name || 'Dr. Vocco',
              });

              const result = await sendMessage(instanceName, appointment.phone_number, message, apiUrl, apiKey);

              await supabaseClient.from('VOC_sent_messages').insert({
                clinic_id: clinicId,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                message_type: 'appointment_reminder',
                status: result.success ? 'sent' : 'failed',
                evolution_message_id: result.data?.key?.id,
                error_message: result.error,
              });

              if (result.success) {
                sentCount++;
                // Actualizar estado de la cita
                await supabaseClient
                  .from('VOC_appointments')
                  .update({ status: 'sent' })
                  .eq('id', appointment.id);
              } else {
                errorCount++;
              }
            }
          }
        }
      }

      // 2. Buscar citas que necesitan recordatorio (1 hora antes)
      if (settings.appointment_reminder_hours > 0) {
        const reminderTime = new Date(now);
        reminderTime.setHours(reminderTime.getHours() + settings.appointment_reminder_hours);
        const reminderHour = reminderTime.getHours();
        const reminderDateStr = reminderTime.toISOString().split('T')[0];

        const { data: appointments } = await supabaseClient
          .from('VOC_appointments')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('date_iso', reminderDateStr)
          .in('status', ['pending', 'confirmed', 'sent']);

        if (appointments) {
          for (const appointment of appointments) {
            const appointmentHour = parseInt(appointment.time.split(':')[0]);
            if (appointmentHour !== reminderHour) continue;

            // Verificar si ya se envió este recordatorio (hora antes)
            const { data: existingMessage } = await supabaseClient
              .from('VOC_sent_messages')
              .select('id')
              .eq('appointment_id', appointment.id)
              .eq('message_type', 'appointment_reminder')
              .gte('sent_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
              .single();

            if (existingMessage) continue;

            if (appointment.phone_number) {
              const message = replaceTemplateVariables(appointmentTemplate, {
                nombre: appointment.patient_name,
                servicio: appointment.treatment_type,
                fecha: formatDateForMessage(appointment.date_iso),
                hora: appointment.time,
                doctor: clinic.doctor_name || 'Dr. Vocco',
              });

              const result = await sendMessage(instanceName, appointment.phone_number, message, apiUrl, apiKey);

              await supabaseClient.from('VOC_sent_messages').insert({
                clinic_id: clinicId,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                message_type: 'appointment_reminder',
                status: result.success ? 'sent' : 'failed',
                evolution_message_id: result.data?.key?.id,
                error_message: result.error,
              });

              if (result.success) {
                sentCount++;
              } else {
                errorCount++;
              }
            }
          }
        }
      }

      // 3. Buscar pacientes que necesitan recordatorio de regreso
      const recallTemplate = templates?.find(t => t.type === 'recall_reminder')?.template_text ||
        'Hola {nombre}, soy el {doctor}. Ya pasó el tiempo recomendado desde tu último {servicio}. ¿Te gustaría agendar una nueva cita?';

      // Obtener servicios con recall
      const { data: services } = await supabaseClient
        .from('VOC_services')
        .select('*')
        .eq('clinic_id', clinicId)
        .not('recall_amount', 'is', null);

      if (services) {
        for (const service of services) {
          // Obtener última cita de cada paciente para este servicio
          const { data: lastAppointments } = await supabaseClient
            .from('VOC_appointments')
            .select('*, VOC_patients(*)')
            .eq('clinic_id', clinicId)
            .eq('treatment_type', service.name)
            .order('date_iso', { ascending: false });

          if (lastAppointments) {
            const patientLastAppointments = new Map<string, typeof lastAppointments[0]>();
            for (const apt of lastAppointments) {
              const patientId = apt.patient_id || apt.patient_name;
              if (!patientLastAppointments.has(patientId)) {
                patientLastAppointments.set(patientId, apt);
              }
            }

            for (const [patientId, lastAppt] of patientLastAppointments) {
              const lastApptDate = new Date(`${lastAppt.date_iso}T00:00:00`);
              const nowDate = new Date();

              // Calcular fecha objetivo de recall
              let targetDate = new Date(lastApptDate);
              if (service.recall_unit === 'days') {
                targetDate.setDate(targetDate.getDate() + service.recall_amount);
              } else if (service.recall_unit === 'weeks') {
                targetDate.setDate(targetDate.getDate() + (service.recall_amount * 7));
              } else if (service.recall_unit === 'months') {
                targetDate.setMonth(targetDate.getMonth() + service.recall_amount);
              } else if (service.recall_unit === 'years') {
                targetDate.setFullYear(targetDate.getFullYear() + service.recall_amount);
              }

              // Calcular fecha de recordatorio
              const reminderDate = new Date(targetDate);
              reminderDate.setDate(reminderDate.getDate() - (settings.recall_advance_weeks * 7));

              // Verificar si debemos enviar ahora (±3 días)
              const daysDiff = Math.ceil((reminderDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff < -3 || daysDiff > 3) continue;

              // Verificar si ya se envió
              const { data: existingMessage } = await supabaseClient
                .from('VOC_sent_messages')
                .select('id')
                .eq('patient_id', lastAppt.patient_id)
                .eq('message_type', 'recall_reminder')
                .gte('sent_at', new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .single();

              if (existingMessage) continue;

              const phone = lastAppt.phone_number || lastAppt.VOC_patients?.phone_number;
              if (!phone) continue;

              const message = replaceTemplateVariables(recallTemplate, {
                nombre: lastAppt.patient_name,
                servicio: service.name,
                doctor: clinic.doctor_name || 'Dr. Vocco',
              });

              const result = await sendMessage(instanceName, phone, message, apiUrl, apiKey);

              await supabaseClient.from('VOC_sent_messages').insert({
                clinic_id: clinicId,
                appointment_id: lastAppt.id,
                patient_id: lastAppt.patient_id,
                message_type: 'recall_reminder',
                status: result.success ? 'sent' : 'failed',
                evolution_message_id: result.data?.key?.id,
                error_message: result.error,
              });

              if (result.success) {
                sentCount++;
              } else {
                errorCount++;
              }
            }
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


// Supabase Edge Function: check-whatsapp-connections
// Verifica el estado de las conexiones WhatsApp periódicamente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkConnectionStatus(
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<{ status: string; qrcode?: string } | null> {
  try {
    const url = `${apiUrl}/instance/fetchInstances`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const instance = data.find((inst: any) => inst.instance.instanceName === instanceName);

    if (!instance) {
      return null;
    }

    return {
      status: instance.instance.status,
      qrcode: instance.instance.qrcode?.base64,
    };
  } catch (error) {
    console.error('Error checking connection:', error);
    return null;
  }
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

    // Obtener configuración global de Evolution API
    const { data: globalConfig } = await supabaseClient
      .from('VOC_evolution_api_config')
      .select('api_url, api_key')
      .eq('is_active', true)
      .single();

    // Obtener todas las conexiones
    const { data: connections, error: connError } = await supabaseClient
      .from('VOC_whatsapp_connections')
      .select('*, VOC_clinics(*)');

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay conexiones para verificar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let errors = 0;

    for (const connection of connections) {
      const clinic = connection.VOC_clinics;
      if (!clinic) continue;

      // Prioridad: configuración de clínica > configuración global
      let apiUrl = clinic.evolution_api_url;
      let apiKey = clinic.evolution_api_key;
      
      if (!apiUrl || !apiKey) {
        if (!globalConfig) {
          errors++;
          continue;
        }
        apiUrl = globalConfig.api_url;
        apiKey = globalConfig.api_key;
      }
      
      const instanceName = connection.instance_name || clinic.evolution_instance_name;
      if (!instanceName) {
        errors++;
        continue;
      }

      const statusResult = await checkConnectionStatus(instanceName, apiUrl, apiKey);

      if (!statusResult) {
        errors++;
        continue;
      }

      let newStatus = 'disconnected';
      if (statusResult.status === 'open') {
        newStatus = 'connected';
      } else if (statusResult.status === 'connecting') {
        newStatus = 'connecting';
      }

      const updateData: any = {
        status: newStatus,
        last_check: new Date().toISOString(),
      };

      if (newStatus === 'connected') {
        if (connection.status !== 'connected') {
          updateData.connected_at = new Date().toISOString();
        }
        updateData.qr_code = null;
      } else if (newStatus === 'connecting' && statusResult.qrcode) {
        updateData.qr_code = statusResult.qrcode;
      }

      const { error: updateError } = await supabaseClient
        .from('VOC_whatsapp_connections')
        .update(updateData)
        .eq('id', connection.id);

      if (!updateError) {
        updated++;
      } else {
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
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


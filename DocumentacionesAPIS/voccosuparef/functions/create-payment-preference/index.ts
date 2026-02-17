import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { clinicId, planType, hasDiscount } = await req.json();

    if (!clinicId || !planType) {
      return new Response(
        JSON.stringify({ error: 'clinicId and planType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify clinic belongs to user
    const { data: clinic, error: clinicError } = await supabaseClient
      .from('VOC_clinics')
      .select('id, doctor_name')
      .eq('id', clinicId)
      .eq('user_id', user.id)
      .single();

    if (clinicError || !clinic) {
      return new Response(
        JSON.stringify({ error: 'Clinic not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar suscripción para aplicar descuento del 15%
    const { data: subscription } = await supabaseClient
      .from('VOC_subscriptions')
      .select('status')
      .eq('clinic_id', clinicId)
      .single();

    const shouldApplyDiscount = hasDiscount || subscription?.status === 'trial' || subscription?.status === 'expired';
    const discountPercent = shouldApplyDiscount ? 15 : 0;

    // Get Mercado Pago credentials from environment
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const MP_PUBLIC_KEY = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
    const BASE_URL = Deno.env.get('BASE_URL') || 'https://your-domain.com';

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Plan prices
    const plans = {
      monthly: { price: 299, title: 'Plan Mensual - VOCCO' },
      annual: { price: 2990, title: 'Plan Anual - VOCCO (Ahorra 17%)' },
    };

    const plan = plans[planType as keyof typeof plans];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aplicar descuento del 15% si aplica
    const finalPrice = shouldApplyDiscount 
      ? Math.round(plan.price * (1 - discountPercent / 100))
      : plan.price;
    
    const titleWithDiscount = shouldApplyDiscount 
      ? `${plan.title} - 15% OFF de por vida`
      : plan.title;

    // Verificar que BASE_URL esté configurado
    if (!BASE_URL || BASE_URL.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'BASE_URL no configurado',
          details: 'BASE_URL debe estar configurado en Supabase Secrets. Ve a Settings → Edge Functions → Secrets y agrega BASE_URL con tu dominio (ej: https://tu-dominio.com o http://localhost:5173)'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpiar y validar BASE_URL para back_urls
    // Mercado Pago requiere URLs válidas sin hash (#) y con protocolo completo
    let cleanBaseUrl = BASE_URL.trim();
    
    // Remover hash y cualquier fragmento
    cleanBaseUrl = cleanBaseUrl.replace(/#.*$/, '');
    
    // Remover trailing slash
    cleanBaseUrl = cleanBaseUrl.replace(/\/$/, '');
    
    // Asegurar que tenga protocolo
    if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
      // Para localhost usar http, para otros usar https
      if (cleanBaseUrl.includes('localhost') || cleanBaseUrl.includes('127.0.0.1')) {
        cleanBaseUrl = `http://${cleanBaseUrl}`;
      } else {
        cleanBaseUrl = `https://${cleanBaseUrl}`;
      }
    }
    
    // Validar que la URL sea válida
    try {
      new URL(cleanBaseUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          error: 'BASE_URL inválido',
          details: `BASE_URL debe ser una URL válida. Actual: ${BASE_URL}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Construir URLs de retorno (sin hash, Mercado Pago no lo acepta)
    const backUrls = {
      success: `${cleanBaseUrl}/payment/success`,
      failure: `${cleanBaseUrl}/payment/failure`,
      pending: `${cleanBaseUrl}/payment/pending`,
    };
    
    // Crear Mercado Pago preference
    const preferenceData = {
      items: [
        {
          title: titleWithDiscount,
          quantity: 1,
          unit_price: finalPrice,
          currency_id: 'MXN',
        },
      ],
      payer: {
        email: user.email || '',
      },
      back_urls: backUrls,
      auto_return: 'approved',
      external_reference: `vocco-${clinicId}-${planType}-${Date.now()}`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      metadata: {
        clinic_id: clinicId,
        plan_type: planType,
        user_id: user.id,
      },
    };

    // Log para debugging (remover en producción)
    console.log('Creating preference with back_urls:', JSON.stringify(backUrls, null, 2));
    console.log('BASE_URL original:', BASE_URL);
    console.log('cleanBaseUrl:', cleanBaseUrl);
    console.log('Full preference data:', JSON.stringify(preferenceData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('Mercado Pago error:', errorData);
      console.error('Preference data sent:', JSON.stringify(preferenceData, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment preference',
          details: errorData.message || errorText,
          status: mpResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();

    // Save subscription record
    const { data: subscription, error: subError } = await supabaseClient
      .from('VOC_subscriptions')
      .upsert({
        clinic_id: clinicId,
        plan_type: planType,
        status: 'pending',
        mercado_pago_preference_id: preference.id,
        current_period_start: new Date().toISOString(),
        current_period_end: planType === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'clinic_id',
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription error:', subError);
    }

    return new Response(
      JSON.stringify({
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        subscription_id: subscription?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


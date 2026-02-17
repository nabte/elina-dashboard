import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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

    // Get request body (formData from Payment Brick)
    const formData = await req.json();
    const { clinicId, planType } = formData.metadata || {};

    if (!clinicId || !planType) {
      return new Response(
        JSON.stringify({ error: 'clinicId and planType are required in metadata' }),
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

    // Get Mercado Pago credentials
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
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

    // Create payment using Mercado Pago API
    const paymentData = {
      transaction_amount: plan.price,
      token: formData.token,
      description: plan.title,
      installments: formData.installments || 1,
      payment_method_id: formData.paymentMethodId,
      issuer_id: formData.issuerId,
      payer: {
        email: formData.payer?.email || user.email || '',
        identification: formData.payer?.identification || {},
      },
      metadata: {
        clinic_id: clinicId,
        plan_type: planType,
        user_id: user.id,
      },
      external_reference: `vocco-${clinicId}-${planType}-${Date.now()}`,
    };

    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('Mercado Pago payment error:', errorData);
      
      // Mejorar mensaje de error
      let errorMessage = 'Error al procesar el pago';
      if (errorData.cause && Array.isArray(errorData.cause) && errorData.cause.length > 0) {
        const firstCause = errorData.cause[0];
        if (firstCause.code === 'cc_rejected_other_reason') {
          errorMessage = 'La tarjeta fue rechazada. Verifica los datos o usa otra tarjeta.';
        } else if (firstCause.code?.startsWith('cc_rejected')) {
          errorMessage = `Pago rechazado: ${firstCause.description || firstCause.code}`;
        } else {
          errorMessage = firstCause.description || errorMessage;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorData,
          status: mpResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = await mpResponse.json();

    // Save payment record
    const { data: paymentRecord, error: paymentError } = await supabaseClient
      .from('VOC_payments')
      .insert({
        clinic_id: clinicId,
        mercado_pago_payment_id: payment.id.toString(),
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: payment.status === 'approved' ? 'approved' : payment.status === 'rejected' ? 'rejected' : 'pending',
        payment_method: payment.payment_method_id,
        payment_type: payment.payment_type_id,
        description: payment.description,
        metadata: payment,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
    }

    // Update subscription if payment is approved
    if (payment.status === 'approved') {
      // Crear o actualizar suscripción recurrente usando API de Suscripciones
      // Primero, crear un plan de suscripción si no existe
      const planFrequency = planType === 'monthly' ? 30 : 365;
      
      // Crear plan de suscripción
      const planData = {
        reason: plan.title,
        auto_recurring: {
          frequency: planFrequency,
          frequency_type: 'days',
          transaction_amount: plan.price,
          currency_id: 'MXN',
        },
      };

      const planResponse = await fetch('https://api.mercadopago.com/preapproval_plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(planData),
      });

      let planId = null;
      if (planResponse.ok) {
        const planResult = await planResponse.json();
        planId = planResult.id;
      } else {
        // Si el plan ya existe, intentar buscarlo
        console.log('Plan creation failed, trying to find existing plan');
        // Por ahora, continuamos sin plan (puedes mejorarlo después)
      }

      // Crear suscripción recurrente si tenemos card_token
      let mpSubscriptionId = null;
      if (formData.token && planId) {
        const subscriptionData = {
          preapproval_plan_id: planId,
          card_token_id: formData.token,
          payer_email: user.email || '',
          external_reference: `vocco-${clinicId}-${planType}`,
          reason: plan.title,
        };

        const subResponse = await fetch('https://api.mercadopago.com/preapproval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(subscriptionData),
        });

        if (subResponse.ok) {
          const subResult = await subResponse.json();
          mpSubscriptionId = subResult.id;
        }
      }

      // Actualizar suscripción en BD
      const { data: subscription, error: subError } = await supabaseClient
        .from('VOC_subscriptions')
        .update({
          status: 'active',
          mercado_pago_subscription_id: mpSubscriptionId,
          current_period_start: new Date().toISOString(),
          current_period_end: planType === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('clinic_id', clinicId)
        .select()
        .single();

      if (subError) {
        console.error('Error updating subscription:', subError);
      } else if (subscription && paymentRecord) {
        // Update payment with subscription_id
        await supabaseClient
          .from('VOC_payments')
          .update({ subscription_id: subscription.id })
          .eq('id', paymentRecord.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
        },
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


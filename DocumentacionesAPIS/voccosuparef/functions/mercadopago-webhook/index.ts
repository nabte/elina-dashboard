import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validar firma del webhook de Mercado Pago
 * Según documentación: validar con x-signature, x-request-id y data.id
 */
async function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  // Extraer ts y v1 del header x-signature
  const parts = xSignature.split(',');
  let ts = null;
  let receivedHash = null;
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') receivedHash = value;
  }

  if (!ts || !receivedHash) {
    return false;
  }

  // Generar manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  
  // Calcular HMAC SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(manifest)
  );
  
  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return calculatedHash === receivedHash;
}

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

    // Get Mercado Pago credentials
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    
    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get webhook data
    const data = await req.json();
    const { type, data: webhookData } = data;

    // Validar firma del webhook (si está configurada)
    if (MP_WEBHOOK_SECRET) {
      const xSignature = req.headers.get('x-signature');
      const xRequestId = req.headers.get('x-request-id');
      
      // Obtener data.id de query params o del body
      const urlParams = new URL(req.url).searchParams;
      const dataId = urlParams.get('data.id') || webhookData?.id?.toString();

      if (!dataId) {
        console.warn('Missing data.id in webhook');
      } else {
        const isValid = await validateWebhookSignature(
          xSignature,
          xRequestId,
          dataId,
          MP_WEBHOOK_SECRET
        );

        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log('Mercado Pago webhook:', type, webhookData);

    // Handle payment notification
    if (type === 'payment') {
      const paymentId = webhookData?.id;
      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: 'Payment ID missing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      if (!paymentResponse.ok) {
        console.error('Failed to fetch payment from Mercado Pago');
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payment = await paymentResponse.json();
      const externalReference = payment.external_reference;
      const metadata = payment.metadata || {};

      // Parse external reference: vocco-{clinicId}-{planType}-{timestamp}
      const refParts = externalReference?.split('-') || [];
      const clinicId = metadata.clinic_id || refParts[1];
      const planType = metadata.plan_type || refParts[2];

      if (!clinicId || !planType) {
        console.error('Missing clinic_id or plan_type in payment');
        return new Response(
          JSON.stringify({ error: 'Invalid payment reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save or update payment record
      const { data: paymentRecord, error: paymentError } = await supabaseClient
        .from('VOC_payments')
        .upsert({
          clinic_id: clinicId,
          mercado_pago_payment_id: paymentId.toString(),
          mercado_pago_preference_id: payment.preference_id?.toString(),
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          status: payment.status === 'approved' ? 'approved' : payment.status === 'rejected' ? 'rejected' : 'pending',
          payment_method: payment.payment_method_id,
          payment_type: payment.payment_type_id,
          description: payment.description,
          metadata: payment,
        }, {
          onConflict: 'mercado_pago_payment_id',
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error saving payment:', paymentError);
      }

      // Update subscription if payment is approved
      if (payment.status === 'approved') {
        const { data: subscription, error: subError } = await supabaseClient
          .from('VOC_subscriptions')
          .update({
            status: 'active',
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
        } else if (subscription) {
          // Update payment with subscription_id
          await supabaseClient
            .from('VOC_payments')
            .update({ subscription_id: subscription.id })
            .eq('id', paymentRecord?.id);
        }
      }
    }

    // Handle subscription notification (for recurring payments)
    if (type === 'subscription' || type === 'preapproval') {
      const subscriptionId = webhookData?.id;
      console.log('Subscription/preapproval notification:', subscriptionId, webhookData);

      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ error: 'Subscription ID missing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obtener detalles de la suscripción desde Mercado Pago
      const subResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!subResponse.ok) {
        console.error('Failed to fetch subscription from Mercado Pago');
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const subscription = await subResponse.json();
      const externalReference = subscription.external_reference || '';

      // Parse external reference: vocco-{clinicId}-{planType}
      const refParts = externalReference.split('-');
      const clinicId = refParts[1];
      const planType = refParts[2];

      if (!clinicId || !planType) {
        console.error('Missing clinic_id or plan_type in subscription');
        return new Response(
          JSON.stringify({ error: 'Invalid subscription reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determinar el período según el plan
      const planFrequency = planType === 'monthly' ? 30 : 365;
      const now = new Date();
      const nextPeriodEnd = new Date(now);
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + planFrequency);

      // Actualizar suscripción según el estado
      let newStatus = 'active';
      if (subscription.status === 'authorized' || subscription.status === 'active') {
        newStatus = 'active';
      } else if (subscription.status === 'paused' || subscription.status === 'cancelled') {
        newStatus = 'cancelled';
      } else if (subscription.status === 'pending') {
        newStatus = 'pending';
      }

      // Si hay un pago asociado (renovación automática)
      if (subscription.last_payment_date) {
        const lastPaymentDate = new Date(subscription.last_payment_date);
        
        // Actualizar período de suscripción
        const { data: updatedSub, error: subError } = await supabaseClient
          .from('VOC_subscriptions')
          .update({
            status: newStatus,
            current_period_start: lastPaymentDate.toISOString(),
            current_period_end: nextPeriodEnd.toISOString(),
          })
          .eq('mercado_pago_subscription_id', subscriptionId)
          .select()
          .single();

        if (subError) {
          console.error('Error updating subscription:', subError);
        } else if (updatedSub) {
          // Registrar el pago de renovación si existe
          if (subscription.last_payment_id) {
            await supabaseClient
              .from('VOC_payments')
              .upsert({
                clinic_id: clinicId,
                subscription_id: updatedSub.id,
                mercado_pago_payment_id: subscription.last_payment_id.toString(),
                amount: subscription.auto_recurring?.transaction_amount || 0,
                currency: subscription.auto_recurring?.currency_id || 'MXN',
                status: 'approved',
                description: `Renovación automática - ${planType === 'monthly' ? 'Mensual' : 'Anual'}`,
                metadata: subscription,
              }, {
                onConflict: 'mercado_pago_payment_id',
              });
          }
        }
      } else {
        // Solo actualizar estado si no hay pago
        await supabaseClient
          .from('VOC_subscriptions')
          .update({
            status: newStatus,
          })
          .eq('mercado_pago_subscription_id', subscriptionId);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

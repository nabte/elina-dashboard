import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    // Verificar firma del webhook
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret!
    )

    console.log('[Stripe Webhook] Event type:', event.type)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('[Stripe Webhook] Checkout completed:', {
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata
        })

        // Obtener el userId de los metadatos
        const userId = session.metadata?.userId || session.client_reference_id

        if (!userId) {
          console.error('[Stripe Webhook] No userId found in session metadata')
          break
        }

        // Obtener la suscripción de Stripe si existe
        let planId = session.metadata?.planId || 'starter'
        let subscriptionId = session.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          // Preparar datos de la suscripción
          const subscriptionData: any = {
            user_id: userId,
            plan_id: planId,
            status: subscription.status,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            last_payment_at: new Date().toISOString()
          }

          // Solo agregar trial si existe
          if (subscription.trial_start) {
            subscriptionData.trial_started_at = new Date(subscription.trial_start * 1000).toISOString()
          }
          if (subscription.trial_end) {
            subscriptionData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
          }

          console.log('[Stripe Webhook] Upserting subscription:', subscriptionData)

          // Actualizar o crear suscripción en la base de datos
          const { error } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData)

          if (error) {
            console.error('[Stripe Webhook] Error updating subscription:', error)
          } else {
            console.log('[Stripe Webhook] ✅ Subscription updated successfully for user:', userId)
          }
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('[Stripe Webhook] Subscription updated:', subscription.id)

        // Buscar el usuario por stripe_subscription_id
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (existingSub) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('stripe_subscription_id', subscription.id)

          if (error) {
            console.error('[Stripe Webhook] Error updating subscription status:', error)
          } else {
            console.log('[Stripe Webhook] ✅ Subscription status updated')
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('[Stripe Webhook] Subscription deleted:', subscription.id)

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_id: 'free_trial'
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[Stripe Webhook] Error canceling subscription:', error)
        } else {
          console.log('[Stripe Webhook] ✅ Subscription canceled')
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        console.log('[Stripe Webhook] Payment succeeded:', invoice.id)

        if (invoice.subscription) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              last_payment_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('[Stripe Webhook] Error updating last payment:', error)
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        console.log('[Stripe Webhook] Payment failed:', invoice.id)

        if (invoice.subscription) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due'
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('[Stripe Webhook] Error updating payment failure:', error)
          }
        }

        break
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err) {
    console.error('[Stripe Webhook] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    )
  }
})

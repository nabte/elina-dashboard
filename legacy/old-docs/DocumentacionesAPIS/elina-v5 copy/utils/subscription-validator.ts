/**
 * Subscription Validator
 * Validates user subscription status before processing messages
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface SubscriptionStatus {
    isValid: boolean
    status: string
    planId: string | null
    message?: string
}

/**
 * Validates if user has an active subscription
 * @param supabase Supabase client
 * @param userId User ID to validate
 * @returns Subscription status
 */
export async function validateSubscription(
    supabase: SupabaseClient,
    userId: string
): Promise<SubscriptionStatus> {
    try {
        console.log(`🔐 [SUBSCRIPTION] Validating subscription for user: ${userId}`)

        // Query subscription status
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('status, plan_id, trial_ends_at, current_period_end')
            .eq('user_id', userId)
            .single()

        if (error) {
            console.error(`❌ [SUBSCRIPTION] Error querying subscription:`, error)
            // If no subscription found, allow processing (could be legacy user)
            if (error.code === 'PGRST116') {
                console.log(`⚠️ [SUBSCRIPTION] No subscription found, allowing processing`)
                return {
                    isValid: true,
                    status: 'no_subscription',
                    planId: null,
                    message: 'No subscription found, allowing legacy access'
                }
            }
            throw error
        }

        const now = new Date()
        const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null
        const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null

        console.log(`📊 [SUBSCRIPTION] Status: ${subscription.status}, Plan: ${subscription.plan_id}`)

        // Check if subscription is active
        const activeStatuses = ['trialing', 'active']
        if (activeStatuses.includes(subscription.status)) {
            // Check if trial or period has ended
            if (subscription.status === 'trialing' && trialEndsAt && now > trialEndsAt) {
                console.log(`⏰ [SUBSCRIPTION] Trial expired`)
                return {
                    isValid: false,
                    status: 'trial_expired',
                    planId: subscription.plan_id,
                    message: 'Tu período de prueba ha expirado. Por favor actualiza tu suscripción para continuar usando ELINA.'
                }
            }

            if (subscription.status === 'active' && currentPeriodEnd && now > currentPeriodEnd) {
                console.log(`⏰ [SUBSCRIPTION] Subscription period expired`)
                return {
                    isValid: false,
                    status: 'period_expired',
                    planId: subscription.plan_id,
                    message: 'Tu suscripción ha expirado. Por favor renueva tu plan para continuar usando ELINA.'
                }
            }

            console.log(`✅ [SUBSCRIPTION] Valid subscription`)
            return {
                isValid: true,
                status: subscription.status,
                planId: subscription.plan_id
            }
        }

        // Subscription is not active
        console.log(`❌ [SUBSCRIPTION] Inactive subscription: ${subscription.status}`)

        let message = 'Tu suscripción no está activa. Por favor contacta a soporte.'
        if (subscription.status === 'canceled') {
            message = 'Tu suscripción ha sido cancelada. Por favor reactiva tu plan para continuar usando ELINA.'
        } else if (subscription.status === 'past_due') {
            message = 'Tu suscripción tiene pagos pendientes. Por favor actualiza tu método de pago.'
        } else if (subscription.status === 'unpaid') {
            message = 'Tu suscripción no ha sido pagada. Por favor completa el pago para continuar.'
        }

        return {
            isValid: false,
            status: subscription.status,
            planId: subscription.plan_id,
            message
        }

    } catch (error) {
        console.error(`❌ [SUBSCRIPTION] Unexpected error:`, error)
        // On error, allow processing to avoid blocking legitimate users
        return {
            isValid: true,
            status: 'error',
            planId: null,
            message: 'Error validating subscription, allowing access'
        }
    }
}

/**
 * Gets subscription limits for a user
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Subscription limits
 */
export async function getSubscriptionLimits(
    supabase: SupabaseClient,
    userId: string
): Promise<{
    aiEnhancementsLimit: number
    bulkSendsLimit: number
    imageGenerationsLimit: number
    videoGenerationsLimit: number
}> {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('user_id', userId)
            .single()

        if (!subscription?.plan_id) {
            // Default limits for users without subscription
            return {
                aiEnhancementsLimit: 10,
                bulkSendsLimit: 100,
                imageGenerationsLimit: 5,
                videoGenerationsLimit: 0
            }
        }

        const { data: plan } = await supabase
            .from('plans')
            .select('ai_enhancements_limit, bulk_sends_limit, image_generations_limit, video_generations_limit')
            .eq('id', subscription.plan_id)
            .single()

        if (!plan) {
            // Default limits if plan not found
            return {
                aiEnhancementsLimit: 10,
                bulkSendsLimit: 100,
                imageGenerationsLimit: 5,
                videoGenerationsLimit: 0
            }
        }

        return {
            aiEnhancementsLimit: plan.ai_enhancements_limit || 10,
            bulkSendsLimit: plan.bulk_sends_limit || 100,
            imageGenerationsLimit: plan.image_generations_limit || 5,
            videoGenerationsLimit: plan.video_generations_limit || 0
        }

    } catch (error) {
        console.error(`❌ [SUBSCRIPTION] Error getting limits:`, error)
        // Return default limits on error
        return {
            aiEnhancementsLimit: 10,
            bulkSendsLimit: 100,
            imageGenerationsLimit: 5,
            videoGenerationsLimit: 0
        }
    }
}

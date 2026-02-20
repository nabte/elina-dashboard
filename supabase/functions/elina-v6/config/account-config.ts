/**
 * ELINA V5 - Account Configuration Loader
 * 
 * Carga toda la configuración de una cuenta desde múltiples tablas de Supabase
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, CriticalRule, AutoResponse, Profile } from './types.ts'
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from './constants.ts'

/**
 * Carga la configuración completa de una cuenta
 */
/**
 * Carga la configuración completa de una cuenta
 */
export async function loadAccountConfig(
    supabase: SupabaseClient,
    userId: string
): Promise<AccountConfig> {
    console.log(`📋 [CONFIG] Loading account configuration for user: ${userId}`)

    // 1. Cargar datos en paralelo (New Schema)
    const [
        profileResult,
        teamResult,
        rulesResult
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('teams').select('ignored_labels').eq('owner_id', userId).maybeSingle(),
        supabase.from('automation_rules').select('*').eq('user_id', userId).eq('is_active', true)
    ])

    if (profileResult.error || !profileResult.data) {
        throw new Error(`Profile not found for user ${userId}: ${profileResult.error?.message}`)
    }

    const profile = profileResult.data as Profile
    const team = teamResult.data
    const allRules = (rulesResult.data || []) as any[] // Start as any to handle mapping

    // 2. Map Automation Rules to Legacy Structures (for compatibility)
    const criticalRules = allRules
        .filter(r => r.type === 'critical')
        .map(r => ({
            id: r.id,
            ruleName: r.name,
            ruleType: r.trigger_type === 'pattern' ? 'pattern' : 'keyword',
            patternOrKeyword: r.trigger_config?.pattern || r.trigger_config?.keyword || '',
            detectionType: r.trigger_config?.detection_type || 'contains',
            isActive: r.is_active,
            priority: r.priority,
            caseSensitive: false // Default
        }))

    const autoResponses = allRules
        .filter(r => r.type === 'auto_response')
        .map(r => ({
            id: r.id,
            triggerText: r.trigger_config?.keyword || '',
            responseText: r.action_config?.response_text || '',
            isActive: r.is_active,
            matchType: r.trigger_config?.match_type || 'exact',
            mediaUrl: r.action_config?.media_url,
            mediaType: r.action_config?.media_type || 'text'
        }))

    // Extract settings from JSONB columns
    const aptConfig = profile.appointment_config || {}
    const quoteConfig = profile.quote_config || {}

    // 3. Construir objeto de configuración
    const config: AccountConfig = {
        // Identification
        userId,
        instanceName: profile.evolution_instance_name || '',
        serverUrl: profile.evolution_api_url || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host', // Default as fallback

        // AI Configuration
        model: DEFAULT_MODEL,
        temperature: DEFAULT_TEMPERATURE,
        maxTokens: DEFAULT_MAX_TOKENS,

        // Company Info
        companyName: profile.full_name || 'Asistente',
        companyDescription: profile.company_description || '',
        website: profile.website,
        businessAddress: profile.business_address,
        businessPhone: profile.business_phone,
        timezone: profile.timezone || 'America/Mexico_City',
        slug: profile.slug,

        // Personality
        tone: 'profesional',
        customPrompt: profile.system_prompt || undefined, // New Field

        // Business Capabilities
        businessType: (profile.business_type as any) || 'hybrid',
        hasProducts: true, // Siempre permitir búsqueda de productos
        hasServices: true, // Siempre permitir servicios
        hasAppointments: !!(aptConfig.is_enabled),
        hasQuotes: profile.quotes_enabled || false,
        hasShipping: profile.has_shipping_system || false,
        productCount: 0, // Deprecated - se calcula dinámicamente
        serviceCount: 0, // Deprecated - se calcula dinámicamente

        // Filters and Rules
        ignoredLabels: team?.ignored_labels || [],
        criticalRules: criticalRules as any[], // Explicit cast to avoid literal type mismatch
        autoResponses,

        // Integrations
        evolutionApiKey: profile.evolution_api_key || '',
        evolutionApiUrl: profile.evolution_api_url || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host',
        elevenLabsVoiceId: undefined,

        // Working Hours
        workStartHour: profile.work_start_hour || 9,
        workEndHour: profile.work_end_hour || 18,

        // Limits
        maxMessagesPerDay: undefined,

        // Features
        quotesEnabled: profile.quotes_enabled || false,
        appointmentsEnabled: !!(aptConfig.is_enabled),
        remindersEnabled: false
    }

    console.log(`✅ [CONFIG] Configuration loaded successfully (New Schema)`)
    console.log(`   - Company: ${config.companyName}`)
    console.log(`   - Instance: ${config.instanceName}`)
    console.log(`   - API Key Present: ${config.evolutionApiKey ? 'YES' : 'NO'} (${config.evolutionApiKey.substring(0, 4)}...)`)
    return config
}

/**
 * Valida que la configuración de la cuenta sea válida
 */
export function validateAccountConfig(config: AccountConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.userId) {
        errors.push('Missing userId')
    }

    if (!config.instanceName) {
        errors.push('Missing instanceName')
    }

    if (!config.evolutionApiKey) {
        errors.push('Missing evolutionApiKey')
    }

    if (!config.companyName) {
        errors.push('Missing companyName')
    }

    if (config.workStartHour < 0 || config.workStartHour > 23) {
        errors.push('Invalid workStartHour (must be 0-23)')
    }

    if (config.workEndHour < 0 || config.workEndHour > 23) {
        errors.push('Invalid workEndHour (must be 0-23)')
    }

    if (config.workStartHour >= config.workEndHour) {
        errors.push('workStartHour must be less than workEndHour')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}



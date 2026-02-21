/**
 * ELINA V5 - Context Loader
 * 
 * Carga todo el contexto necesario para la conversación
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, ConversationContext, Message, Contact, Product } from '../config/types.ts'
import type { MessagingConfig } from './messaging-client.ts'
import { getRelevantLearnings } from '../memory/long-term.ts'
import { loadAccountConfig } from '../config/account-config.ts'

/**
 * Obtiene el perfil por nombre de instancia (DEPRECATED - usar getProfileByVenomSession)
 */
export async function getProfileByInstance(
    supabase: SupabaseClient,
    instanceName: string
) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('evolution_instance_name', instanceName)
        .single()

    if (error || !data) {
        throw new Error(`Profile not found for instance: ${instanceName}`)
    }

    return data
}

/**
 * Obtiene el perfil y la instancia Venom por sessionId
 */
export async function getProfileByVenomSession(
    supabase: SupabaseClient,
    sessionId: string
) {
    // Buscar instancia Venom
    const { data: instance, error: instanceError } = await supabase
        .from('venom_instances')
        .select('*')
        .eq('session_id', sessionId)
        .single()

    if (instanceError || !instance) {
        throw new Error(`Venom instance not found for session: ${sessionId}`)
    }

    // Verificar que esté conectada
    if (instance.status !== 'connected') {
        throw new Error(`Venom instance not connected. Status: ${instance.status}`)
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', instance.user_id)
        .single()

    if (profileError || !profile) {
        throw new Error(`Profile not found for user_id: ${instance.user_id}`)
    }

    return {
        profile,
        venomInstance: instance
    }
}

/**
 * Detecta el proveedor WhatsApp del usuario y carga la configuración apropiada
 * Soporta tanto Evolution como Venom según el campo whatsapp_provider
 */
export async function getProfileAndMessagingConfig(
    supabase: SupabaseClient,
    instanceIdentifier: string
): Promise<{
    profile: any
    messagingConfig: MessagingConfig
    accountConfig: AccountConfig
}> {
    let profile: any = null
    let messagingConfig: MessagingConfig | null = null

    // PASO 1: Intentar obtener por Venom (sessionId)
    try {
        const { data: venomInstance } = await supabase
            .from('venom_instances')
            .select('*')
            .eq('session_id', instanceIdentifier)
            .single()

        if (venomInstance && venomInstance.status === 'connected') {
            // Obtener perfil
            const { data: venomProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', venomInstance.user_id)
                .single()

            if (venomProfile) {
                profile = venomProfile

                // Verificar proveedor configurado
                if (profile.whatsapp_provider === 'venom' || !profile.whatsapp_provider) {
                    messagingConfig = {
                        provider: 'venom',
                        venom: {
                            sessionId: venomInstance.session_id,
                            imageFormat: venomInstance.image_format || 'url'
                        }
                    }
                    console.log(`✅ [MESSAGING] Using Venom provider for user ${profile.id}`)
                } else {
                    throw new Error('User configured for Evolution but webhook called Venom instance')
                }
            }
        }
    } catch (error) {
        // No es Venom, intentar Evolution
    }

    // PASO 2: Si no se encontró Venom, intentar Evolution (instanceName)
    if (!profile) {
        const { data: evolutionProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('evolution_instance_name', instanceIdentifier)
            .single()

        if (!evolutionProfile) {
            throw new Error(`Profile not found for identifier: ${instanceIdentifier}`)
        }

        profile = evolutionProfile

        // Cargar AccountConfig para Evolution
        const evolutionAccountConfig = await loadAccountConfig(supabase, profile.id)

        messagingConfig = {
            provider: 'evolution',
            evolution: evolutionAccountConfig
        }
        console.log(`✅ [MESSAGING] Using Evolution provider for user ${profile.id}`)
    }

    if (!messagingConfig) {
        throw new Error('Failed to determine messaging provider')
    }

    // PASO 3: Cargar AccountConfig (necesario para ambos proveedores)
    const accountConfig = await loadAccountConfig(supabase, profile.id)

    return {
        profile,
        messagingConfig,
        accountConfig
    }
}

/**
 * Asegura que el contacto existe en la base de datos
 */
export async function ensureContact(
    supabase: SupabaseClient,
    userId: string,
    phoneNumber: string,
    fullName?: string
): Promise<Contact> {
    // Buscar contacto existente
    const { data: existing, error: searchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .maybeSingle()

    if (existing) {
        return existing as Contact
    }

    // Crear nuevo contacto
    const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert({
            user_id: userId,
            phone_number: phoneNumber,
            full_name: fullName || phoneNumber,
            labels: [],
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (insertError || !newContact) {
        throw new Error(`Failed to create contact: ${insertError?.message}`)
    }

    return newContact as Contact
}

/**
 * Obtiene el historial de chat reciente
 *
 * Ventana de 4 horas para mantener continuidad en conversaciones largas.
 * El filtro transaccional en context-filter.ts se encarga de limpiar
 * datos de precios obsoletos cuando hay una nueva solicitud.
 */
export async function getChatHistory(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    limit: number = 20
): Promise<Message[]> {
    // Ventana de 4 horas — suficiente para mantener contexto de conversación
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('chat_history')
        .select('message_type, content, created_at')
        .eq('user_id', userId)
        .eq('contact_id', contactId)
        .gte('created_at', fourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error(`❌ [CONTEXT] Error fetching chat history: ${error.message}`)
        return []
    }

    const messageCount = data?.length || 0;
    console.log(`📚 [CONTEXT] Loaded ${messageCount} messages from last 4 hours`);

    // Convertir a formato Message y revertir orden (más antiguo primero)
    return (data || [])
        .reverse()
        .map(msg => ({
            role: msg.message_type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at)
        })) as Message[]
}

/**
 * Guarda un mensaje en el historial
 */
export async function saveChatHistory(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    userMessage: string,
    assistantMessage: string,
    intent: any
): Promise<void> {
    // Guardar mensaje del usuario
    await supabase.from('chat_history').insert({
        user_id: userId,
        contact_id: contactId,
        message_type: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
    })

    // Guardar respuesta del asistente
    await supabase.from('chat_history').insert({
        user_id: userId,
        contact_id: contactId,
        message_type: 'assistant',
        content: assistantMessage,
        metadata: {
            intent: intent.primary,
            sentiment: intent.sentiment.polarity
        },
        created_at: new Date().toISOString()
    })
}

/**
 * Carga el contexto completo de la conversación
 * 
 * IMPORTANTE: Filtra datos transaccionales antiguos si detecta nueva solicitud
 */
export async function loadConversationContext(
    supabase: SupabaseClient,
    config: AccountConfig,
    contact: Contact,
    currentMessage: string,
    intent: any
): Promise<ConversationContext> {
    console.log(`📚 [CONTEXT] Loading conversation context`)

    // Importar dinámicamente para evitar dependencias circulares
    const { loadConversationState } = await import('./conversation-state.ts')
    const { isNewTransactionalRequest, filterTransactionalContext } = await import('./context-filter.ts')

    // Cargar todo en paralelo
    const [
        recentMessages,
        accountLearnings,
        userPreferences,
        topProducts,
        conversationState
    ] = await Promise.all([
        getChatHistory(supabase, config.userId, contact.id, 20),
        getRelevantLearnings(supabase, config.userId, currentMessage, 5),
        getUserPreferences(supabase, contact.id),
        config.hasProducts ? getTopProducts(supabase, config.userId, 5) : Promise.resolve([]),
        loadConversationState(supabase, contact.id.toString())
    ])

    // Detectar si es nueva solicitud transaccional
    const isNewRequest = isNewTransactionalRequest(currentMessage, recentMessages);

    // Filtrar contexto si es nueva solicitud
    const filteredMessages = filterTransactionalContext(recentMessages, isNewRequest);

    if (isNewRequest && filteredMessages.length < recentMessages.length) {
        console.log(`🧹 [CONTEXT] Filtered ${recentMessages.length - filteredMessages.length} old quote messages`);
    }

    return {
        recentMessages: filteredMessages,
        accountLearnings,
        userPreferences,
        topProducts,
        conversationState: conversationState || null,
        ragContext: undefined, // Set later in index.ts after RAG retrieval
        activePromotions: [], // TODO: Cargar promociones activas
        appointmentSlots: [] // TODO: Cargar slots si es necesario
    }
}

/**
 * Obtiene las preferencias del usuario
 */
async function getUserPreferences(
    supabase: SupabaseClient,
    contactId: number
) {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('contact_id', contactId)

    if (error) {
        console.error(`❌ [CONTEXT] Error fetching preferences: ${error.message}`)
        return []
    }

    return data || []
}

/**
 * Obtiene los productos más populares
 */
async function getTopProducts(
    supabase: SupabaseClient,
    userId: string,
    limit: number
): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .limit(limit)

    if (error) {
        console.error(`❌ [CONTEXT] Error fetching products: ${error.message}`)
        return []
    }

    return (data || []) as Product[]
}

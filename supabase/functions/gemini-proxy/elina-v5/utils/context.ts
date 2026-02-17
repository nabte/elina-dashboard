/**
 * ELINA V5 - Context Loader
 * 
 * Carga todo el contexto necesario para la conversación
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, ConversationContext, Message, Contact, Product } from '../config/types.ts'
import { getRelevantLearnings } from '../memory/long-term.ts'

/**
 * Obtiene el perfil por nombre de instancia
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
 */
export async function getChatHistory(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    limit: number = 10
): Promise<Message[]> {
    const { data, error } = await supabase
        .from('chat_history')
        .select('message_type, content, created_at')
        .eq('user_id', userId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error(`❌ [CONTEXT] Error fetching chat history: ${error.message}`)
        return []
    }

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
 */
export async function loadConversationContext(
    supabase: SupabaseClient,
    config: AccountConfig,
    contact: Contact,
    currentMessage: string,
    intent: any
): Promise<ConversationContext> {
    console.log(`📚 [CONTEXT] Loading conversation context`)

    // Cargar todo en paralelo
    const [
        recentMessages,
        accountLearnings,
        userPreferences,
        topProducts
    ] = await Promise.all([
        getChatHistory(supabase, config.userId, contact.id, 10),
        getRelevantLearnings(supabase, config.userId, currentMessage, 5),
        getUserPreferences(supabase, contact.id),
        config.hasProducts ? getTopProducts(supabase, config.userId, 5) : Promise.resolve([])
    ])

    return {
        recentMessages,
        accountLearnings,
        userPreferences,
        topProducts,
        ragContext: undefined, // TODO: Implementar RAG
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

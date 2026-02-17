import { SupabaseClient } from 'https:
export interface Profile {
    id: string
    evolution_instance_name: string
    evolution_api_key: string
    evolution_api_url?: string
    contact_phone?: string
    prompt_content?: string
    product_search_strict_mode?: boolean
    product_search_min_score?: number
    website?: string
    company_description?: string
    business_address?: string
    business_phone?: string
    work_start_hour?: string
    work_end_hour?: string
    pickup_location?: string
    has_shipping_system?: boolean
    social_media?: any
    slug?: string
}
export interface Contact {
    id: number
    full_name: string
    phone_number: string
    user_id: string
    labels?: string[]
}
export interface BusinessCapabilities {
    user_id: string
    has_physical_products: boolean
    has_services: boolean
    has_appointments: boolean
    has_shipping: boolean
    has_quotes: boolean
    primary_business_type: 'ecommerce' | 'services_only' | 'appointments' | 'hybrid'
    product_count: number
    service_count: number
}
export enum MessageIntent {
    PRODUCT_INQUIRY = 'product_inquiry',
    APPOINTMENT_REQUEST = 'appointment_request',
    QUOTE_REQUEST = 'quote_request',
    GENERAL_SUPPORT = 'general_support'
}
export interface SentimentAnalysis {
    score: number 
    label: 'positive' | 'negative' | 'neutral'
}
export async function getProfileByInstance(
    supabase: SupabaseClient,
    instanceName: string
): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('evolution_instance_name', instanceName)
        .single()
    if (error || !data) {
        return null
    }
    return data as Profile
}
export async function ensureContact(
    supabase: SupabaseClient,
    phoneNumber: string,
    pushName: string,
    userId: string
): Promise<Contact> {
    const { data: existing, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle()
    if (existing) {
        if (pushName && existing.full_name !== pushName) {
            await supabase
                .from('contacts')
                .update({ full_name: pushName })
                .eq('id', existing.id)
        }
        return existing as Contact
    }
    const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
            phone_number: phoneNumber,
            full_name: pushName || phoneNumber,
            user_id: userId,
        })
        .select()
        .single()
    if (createError || !newContact) {
        throw new Error('Failed to create contact')
    }
    return newContact as Contact
}
export async function getChatHistory(
    supabase: SupabaseClient,
    contactId: string,
    limit: number = 5
): Promise<string> {
    const { data, error } = await supabase
        .from('chat_history')
        .select('message_type, content, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error || !data) return ""
    return data.reverse().map((m: any) => {
        const role = (m.message_type === 'user' || m.message_type === 'human') ? 'User' : 'AI'
        return `${role}: ${m.content}`
    }).join('\n')
}
export function getSimulationHistory(text: string): string {
    return ""
}
export async function getSubscription(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()
    return data
}
export async function hasIgnoreTag(supabase: SupabaseClient, contactId: number): Promise<boolean> {
    const { data, error } = await supabase
        .from('contact_tags')
        .select('tags(name)')
        .eq('contact_id', contactId)
    if (error || !data) return false
    return data.some((t: any) => t.tags?.name === 'ignore_ai')
}
export async function getActivePromotion(supabase: SupabaseClient, userId: string): Promise<any> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .limit(1)
        .maybeSingle()
    return data
}
export function formatPromotionText(promotion: any): string {
    if (!promotion) return ""
    return `\n\n📢 PROMOCIÓN ACTIVA: ${promotion.title} - ${promotion.description} (Código: ${promotion.code})`
}
export async function getAppointmentSettings(supabase: SupabaseClient, userId: string): Promise<any> {
    const { data } = await supabase
        .from('appointment_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    return data || { is_enabled: false, duration_minutes: 30, work_days: [] }
}
export async function getAvailableSlots(
    supabase: SupabaseClient,
    userId: string,
    date: string, 
    duration: number
): Promise<string[]> {
    return ["09:00", "10:00", "11:00", "16:00", "17:00"] 
}
export function formatAppointmentContext(settings: any, todaySlots: any[] = []): string {
    if (!settings?.is_enabled) return ""
    let context = `\n📅 SISTEMA DE CITAS: ACTIVO\n`
    context += `Duración estándar: ${settings.duration_minutes} min\n`
    context += `Horario: ${settings.start_time} - ${settings.end_time}\n`
    return context
}
export function detectAppointmentIntent(text: string): boolean {
    const keywords = ['cita', 'agendar', 'reservar', 'turno', 'horario', 'disponible', 'mañana', 'hoy']
    const lower = text.toLowerCase()
    return keywords.some(k => lower.includes(k))
}
export function detectCriticalIntent(text: string): boolean {
    const keywords = ['urgente', 'emergencia', 'ayuda', 'humano', 'persona', 'error', 'falla']
    return keywords.some(k => text.toLowerCase().includes(k))
}
export function detectProductIntent(text: string): boolean {
    const keywords = ['precio', 'costo', 'vende', 'producto', 'comprar', 'stock', 'disponible', 'cuanto', 'tienes', 'vender']
    return keywords.some(k => text.toLowerCase().includes(k))
}
export function detectSimpleGreeting(text: string): boolean {
    const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'hey']
    const lower = text.trim().toLowerCase().replace(/[^\w\s]/gi, '')
    return greetings.includes(lower) || (lower.split(' ').length < 3 && greetings.some(g => lower.startsWith(g)))
}
export function detectQuoteIntent(text: string): boolean {
    const keywords = ['cotizacion', 'presupuesto', 'pdf', 'formal', 'factura']
    return keywords.some(k => text.toLowerCase().includes(k))
}
export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const positive = ['gracias', 'excelente', 'bien', 'bueno', 'perfecto', 'genial']
    const negative = ['mal', 'pesimo', 'horrible', 'lento', 'error', 'falla', 'queja', 'malo', 'tarde']
    const lower = text.toLowerCase()
    let score = 0
    positive.forEach(w => { if (lower.includes(w)) score += 0.3 })
    negative.forEach(w => { if (lower.includes(w)) score -= 0.5 }) 
    score = Math.max(-1, Math.min(1, score))
    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (score > 0.3) label = 'positive'
    if (score < -0.3) label = 'negative'
    return { score, label }
}
export async function getUserPreferences(supabase: SupabaseClient, contactId: number): Promise<any> {
    return {}
}
export async function saveUserPreference(supabase: SupabaseClient, contactId: number, key: string, value: any) {
}
export function formatPreferencesContext(prefs: any): string {
    if (!prefs || Object.keys(prefs).length === 0) return ""
    return `\n👤 PREFERENCIAS DEL USUARIO: ${JSON.stringify(prefs)}\n`
}
export async function getEdgeConfig(
    supabase: SupabaseClient,
    userId: string
): Promise<any> {
    try {
        const { data, error } = await supabase
            .from('edge_function_config')
            .select('*')
            .eq('user_id', userId)
            .single()
        if (error && error.code !== 'PGRST116') { 
            return getDefaultEdgeConfig()
        }
        if (!data) {
            return getDefaultEdgeConfig()
        }
        return data
    } catch (e) {
        return getDefaultEdgeConfig()
    }
}
export function getDefaultEdgeConfig(): any {
    return {
        llm_model: 'gpt-5-nano-2025-08-07',
        max_tokens: 4000,
        temperature: 0.7,
        inventory_injection_mode: 'conditional',
        enable_appointment_detection: true,
        enable_product_detection: true,
        enable_quote_detection: true,
        enable_critical_detection: true,
        enable_sentiment_analysis: true,
        enable_user_preferences: false
    }
}
export async function getBusinessCapabilities(
    supabase: SupabaseClient,
    userId: string
): Promise<BusinessCapabilities | null> {
    try {
        const { data, error } = await supabase
            .from('business_capabilities')
            .select('*')
            .eq('user_id', userId)
            .single()
        if (error || !data) {
            return null
        }
        return data as BusinessCapabilities
    } catch (e) {
        return null
    }
}
export function buildCapabilitiesContext(capabilities: BusinessCapabilities | null): string {
    if (!capabilities) {
        return "\n**TU NEGOCIO:** Tipo no detectado. Usa herramientas para buscar productos/servicios.\n"
    }
    let context = "\n**🏢 TU NEGOCIO Y CAPACIDADES:**\n"
    if (capabilities.has_physical_products) {
        context += `- ✅ VENDES PRODUCTOS FÍSICOS (${capabilities.product_count} productos en inventario)\n`
        context += "  → Cuando pregunten por productos, DEBES usar la herramienta 'search_products'\n"
        context += "  → NUNCA inventes precios o disponibilidad\n"
    } else {
        context += "- ❌ NO VENDES PRODUCTOS FÍSICOS\n"
        context += "  → Si preguntan por productos, explica que te enfocas en servicios/citas\n"
    }
    if (capabilities.has_services) {
        context += `- ✅ OFRECES SERVICIOS (${capabilities.service_count} servicios disponibles)\n`
        context += "  → Menciónalos cuando sea relevante\n"
    }
    if (capabilities.has_appointments) {
        context += "- ✅ PUEDES AGENDAR CITAS\n"
        context += "  → Ofrécelas SOLO si el usuario lo solicita explícitamente\n"
        context += "  → NO insistas en citas si el usuario pregunta por productos\n"
    } else {
        context += "- ❌ NO AGENDAS CITAS\n"
        context += "  → Si preguntan, explica que no manejas agenda\n"
    }
    const typeLabels = {
        'ecommerce': 'E-commerce (Venta de Productos)',
        'services_only': 'Servicios Profesionales',
        'appointments': 'Negocio Basado en Citas',
        'hybrid': 'Híbrido (Productos + Servicios)'
    }
    context += `\n**TIPO DE NEGOCIO:** ${typeLabels[capabilities.primary_business_type]}\n`
    return context
}
export function detectMessageIntent(
    text: string,
    capabilities: BusinessCapabilities | null
): MessageIntent {
    if (!capabilities) return MessageIntent.GENERAL_SUPPORT
    const lower = text.toLowerCase()
    const productKeywords = /(?:precio|costo|vende|producto|comprar|stock|disponible|cuanto|tienes|vender|catalogo|inventario)/i
    if (productKeywords.test(lower) && capabilities.has_physical_products) {
        return MessageIntent.PRODUCT_INQUIRY
    }
    const appointmentKeywords = /(?:cita|agendar|reservar|horario|turno|disponibilidad|agenda)/i
    if (appointmentKeywords.test(lower) && capabilities.has_appointments) {
        return MessageIntent.APPOINTMENT_REQUEST
    }
    const quoteKeywords = /(?:cotización|cotizacion|presupuesto|pdf|factura)/i
    if (quoteKeywords.test(lower)) {
        return MessageIntent.QUOTE_REQUEST
    }
    return MessageIntent.GENERAL_SUPPORT
}
export async function getTopProducts(
    supabase: SupabaseClient,
    userId: string,
    limit: number = 10
): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, product_name, price, stock, product_type')
            .eq('user_id', userId)
            .eq('product_type', 'physical')
            .order('stock', { ascending: false }) 
            .limit(limit)
        if (error || !data) {
            return []
        }
        return data
    } catch (e) {
        return []
    }
}
export function formatTopProductsContext(products: any[]): string {
    if (products.length === 0) return ""
    let context = "\n**📦 PRODUCTOS DESTACADOS (Top 10 por Stock):**\n"
    products.forEach(p => {
        const price = p.price ? `$${Number(p.price).toFixed(2)}` : 'A consultar'
        context += `- [${p.product_name}:${p.id}] - ${price} (Stock: ${p.stock || 0})\n`
    })
    context += "\n💡 **IMPORTANTE:** Para buscar otros productos o información detallada, usa la herramienta 'search_products'\n"
    return context
}
export async function getRecentMessages(
    supabase: any,
    contactId: string,
    limit: number = 10
): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('message_type, content, created_at') 
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(limit)
        if (error) {
            return []
        }
        if (!data) return []
        const messages = data.reverse().map((m: any) => ({
            role: (m.message_type === 'user' || m.message_type === 'human') ? 'user' : 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at).getTime()
        }))
        return messages
    } catch (e) {
        return []
    }
}
export async function addRecentMessage(contactId: string, message: any): Promise<void> {
}
export function formatRecentMessagesContext(messages: any[]): string {
    if (messages.length === 0) return ""
    let context = "\n**📚 CONVERSACIÓN RECIENTE:**\n"
    messages.forEach((m: any) => {
        const role = m.role === 'user' ? 'Usuario' : 'Asistente'
        const content = m.content && m.content.length > 300 ? m.content.substring(0, 300) + '...' : (m.content || '')
        context += `- ${role}: ${content}\n`
    })
    return context
}
export async function getConversationSummary(supabase: any, contactId: string): Promise<string | null> {
    try {
        const { count } = await supabase
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contactId)
        if (!count || count < 20) {
            return null
        }
        return null
    } catch (e) {
        return null
    }
}
export async function recordMetric(supabase: SupabaseClient, metric: any) {
    try {
        await supabase.from('metrics').insert(metric)
    } catch (e) {
        }
}
export async function getMessageBuffer(id: string) { return null }
export async function pushMessageBuffer(id: string, msg: any) { }
export async function uploadToBunnyCDN(url: string) { return url }
export async function getAvailableServices(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase.from('products').select('*').eq('user_id', userId).eq('product_type', 'service')
    return data || []
}
export function checkPresetResponse(text: string): string | null {
    return null
}
export function handleAppointmentIntent(text: string, context: any): string | null {
    return null
}
export function truncateContext(text: string, limit: number): string {
    if (!text) return ""
    return text.length > limit ? text.substring(0, limit) + "..." : text
}
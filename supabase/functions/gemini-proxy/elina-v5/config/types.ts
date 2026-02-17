/**
 * ELINA V5 - Type Definitions
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// Account Configuration
// ============================================================================

export interface AccountConfig {
    // Identification
    userId: string
    instanceName: string

    // AI Configuration
    model: string
    temperature: number
    maxTokens: number

    // Company Info
    companyName: string
    companyDescription: string
    website?: string
    businessAddress?: string
    businessPhone?: string
    timezone: string

    // Personality
    tone: 'profesional' | 'casual' | 'amigable' | 'formal'
    customPrompt?: string

    // Business Capabilities
    businessType: 'ecommerce' | 'services' | 'hybrid' | 'appointments'
    hasProducts: boolean
    hasServices: boolean
    hasAppointments: boolean
    hasQuotes: boolean
    hasShipping: boolean
    productCount: number
    serviceCount: number

    // Filters and Rules
    ignoredLabels: string[]
    criticalRules: CriticalRule[]
    autoResponses: AutoResponse[]

    // Integrations
    evolutionApiKey: string
    evolutionApiUrl: string
    elevenLabsVoiceId?: string

    // Working Hours
    workStartHour: number
    workEndHour: number

    // Limits
    maxMessagesPerDay?: number

    // Features
    quotesEnabled: boolean
    appointmentsEnabled: boolean
    remindersEnabled: boolean
}

// ============================================================================
// Rules and Responses
// ============================================================================

export interface CriticalRule {
    id: number
    ruleName: string
    ruleType: 'keyword' | 'pattern'
    patternOrKeyword: string
    detectionType: string
    isActive: boolean
    priority: number
    caseSensitive: boolean
}

export interface AutoResponse {
    id: number
    triggerText: string
    responseText: string
    isActive: boolean
    matchType: 'exact' | 'contains'
    mediaUrl?: string
    mediaType: 'text' | 'image' | 'video' | 'audio' | 'document'
}

// ============================================================================
// Intent Detection
// ============================================================================

export enum Intent {
    // Basic
    GREETING = 'greeting',
    FAREWELL = 'farewell',
    GENERAL_QUESTION = 'general_question',

    // Business
    PRODUCT_INQUIRY = 'product_inquiry',
    SERVICE_INQUIRY = 'service_inquiry',
    PRICE_INQUIRY = 'price_inquiry',
    STOCK_INQUIRY = 'stock_inquiry',
    APPOINTMENT_REQUEST = 'appointment_request',
    QUOTE_REQUEST = 'quote_request',
    ORDER_STATUS = 'order_status',

    // Critical
    COMPLAINT = 'complaint',
    URGENT_ISSUE = 'urgent_issue',
    CANCELLATION = 'cancellation',
    REFUND_REQUEST = 'refund_request',

    // Conversational
    SMALL_TALK = 'small_talk',
    CLARIFICATION = 'clarification',
    CONFIRMATION = 'confirmation',
    OBJECTION = 'objection',

    // Other
    UNKNOWN = 'unknown'
}

export interface IntentDetectionResult {
    primary: Intent
    secondary?: Intent[]
    confidence: number
    sentiment: SentimentAnalysis
    entities: {
        products?: string[]
        services?: string[]
        dates?: string[]
        prices?: number[]
        phoneNumbers?: string[]
    }
}

export interface SentimentAnalysis {
    polarity: 'positive' | 'neutral' | 'negative'
    score: number // -1 to 1
    emotions?: string[]
}

// ============================================================================
// Memory
// ============================================================================

export interface ConversationContext {
    // Recent Messages
    recentMessages: Message[]

    // Conversation Summary
    summary?: string

    // RAG Context
    ragContext?: string

    // Business Context
    businessCapabilities?: BusinessCapabilities
    topProducts?: Product[]
    activePromotions?: Promotion[]
    appointmentSlots?: AppointmentSlot[]

    // User Preferences
    userPreferences?: UserPreference[]

    // Account Learnings
    accountLearnings?: AccountLearning[]
}

export interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: Date
}

export interface BusinessCapabilities {
    primaryBusinessType: string | null
    hasPhysicalProducts: boolean
    productCount: number
    hasServices: boolean
    serviceCount: number
    hasAppointments: boolean
    appointmentCount: number
    hasShippingSystem: boolean
}

export interface Product {
    id: number
    productName: string
    sku?: string
    price: number
    stock: number
    description?: string
    mediaUrl?: string
    productType: 'physical' | 'service'
    serviceDurationMinutes?: number
}

export interface Promotion {
    id: string
    title: string
    description?: string
    benefits?: string
    callToAction?: string
    imageUrls?: string[]
    discount?: string
    offer?: string
}

export interface AppointmentSlot {
    date: string
    time: string
    available: boolean
}

export interface UserPreference {
    key: string
    value: string
    confidence: number
    lastUpdated: Date
}

export interface AccountLearning {
    id: string
    userId: string
    learningType: 'pattern' | 'objection' | 'product_insight' | 'best_practice'
    content: string
    confidence: number
    usageCount: number
    lastUsed?: Date
}

// ============================================================================
// Agent
// ============================================================================

export interface AgentResponse {
    text: string
    toolCalls?: ToolCall[]
    metadata: {
        model: string
        tokensUsed: number
        finishReason: string
        duration?: number
    }
}

export interface ToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}

// ============================================================================
// Database Types
// ============================================================================

export interface Profile {
    id: string
    full_name?: string
    email?: string
    contact_phone?: string
    evolution_instance_name?: string
    evolution_api_key?: string
    evolution_api_url?: string
    company_description?: string
    website?: string
    business_address?: string
    business_phone?: string
    timezone?: string
    work_start_hour?: number
    work_end_hour?: number
    product_count?: number
    service_count?: number
    business_type?: string
    quotes_enabled?: boolean
    has_shipping_system?: boolean
    // New fields for consolidation
    system_prompt?: string
    prompt_history?: any[]
    appointment_config?: Record<string, any>
    quote_config?: Record<string, any>
    automation_settings?: Record<string, any>
}

export interface AutomationRule {
    id: string
    user_id: string
    name: string
    type: 'critical' | 'auto_response' | 'promotion' | 'label_assignment'
    trigger_type: 'keyword' | 'pattern' | 'intent' | 'schedule'
    trigger_config: Record<string, any>
    action_type: 'reply' | 'assign_label' | 'notify' | 'insert_content'
    action_config: Record<string, any>
    priority: number
    is_active: boolean
    created_at: string
}

export interface Contact {
    id: number
    user_id: string
    phone_number: string
    full_name?: string
    labels?: string[]
    followup_status?: string
    is_simulation?: boolean
}

export interface Team {
    id: string
    owner_id: string
    name: string
    ignored_labels?: string[]
}

export interface ConversationState {
    id: number
    contact_id: number
    user_id: string
    is_paused: boolean
    pause_reason?: string
    paused_at?: Date
}

// ============================================================================
// Utility Types
// ============================================================================

export interface FilterResult {
    ignore: boolean
    reason?: string
}

export interface MediaProcessingResult {
    transcription?: string
    description?: string
    mediaType: 'image' | 'audio' | 'video' | 'document'
    success: boolean
    error?: string
}

export interface QuoteItem {
    product_id: number
    product_name: string
    quantity: number
    price: number
    subtotal: number
}


export interface PlaceholderResult {
    finalText: string
    productIds: number[]
    productsMap: Record<string, Product>
    shouldGenerateQuote: boolean
    quoteItems: QuoteItem[]
}

// ============================================================================
// Tool Calling
// ============================================================================

export interface ToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string  // JSON string
    }
}

export interface ToolResult {
    tool_call_id: string
    role: 'tool'
    name: string
    content: string  // JSON string
}

/**
 * ELINA V5 - Constants and Configuration
 * 
 * Voy a usar supabase-ELINA
 * Confirmo: project_ref = mytvwfbijlgbihlegmfg
 */

// API Configuration
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const DEFAULT_MODEL = 'openai/gpt-4o-mini'
export const FALLBACK_MODEL = 'openai/gpt-3.5-turbo'

// Model Parameters
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_TOKENS = 1000
export const MAX_CONTEXT_MESSAGES = 10

// Memory Configuration
export const REDIS_MESSAGE_BUFFER_TTL = 300 // 5 minutes
export const REDIS_MESSAGE_BUFFER_MAX = 10
export const CONVERSATION_SUMMARY_THRESHOLD = 20 // messages

// Intent Detection
export const INTENT_CONFIDENCE_THRESHOLD = 0.7
export const CRITICAL_INTENT_THRESHOLD = 0.8

// Delays (simulate human typing)
export const MIN_TYPING_DELAY = 500 // ms
export const MAX_TYPING_DELAY = 3000 // ms
export const CHARS_PER_SECOND = 50

// Quote Generation
export const MIN_PRODUCTS_FOR_AUTO_QUOTE = 3
export const QUOTE_VALUE_THRESHOLD = 5000 // MXN

// Embeddings
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536
export const RAG_SIMILARITY_THRESHOLD = 0.7
export const RAG_MAX_RESULTS = 5

// Long-term Memory
export const LEARNING_CONFIDENCE_THRESHOLD = 0.6
export const LEARNING_USAGE_DECAY_DAYS = 30

// Rate Limiting
export const MAX_MESSAGES_PER_MINUTE = 30
export const MAX_MESSAGES_PER_HOUR = 500

// Evolution API
export const EVOLUTION_API_TIMEOUT = 10000 // ms

// Bunny CDN
export const BUNNY_STORAGE_ZONE = 'elina-media'
export const BUNNY_CDN_URL = 'https://elina-media.b-cdn.net'

// Feature Flags
export const ENABLE_LONG_TERM_MEMORY = true
export const ENABLE_SENTIMENT_ANALYSIS = true
export const ENABLE_OBJECTION_DETECTION = true
export const ENABLE_AUTO_LEARNING = true

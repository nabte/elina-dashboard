
// Redis Cache Helper for Supabase Edge Functions
// Uses Upstash Redis for serverless caching

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

interface CacheOptions {
    ttl?: number // Time to live in seconds (default: 300 = 5 minutes)
}

export class RedisCache {
    private baseUrl: string
    private token: string

    constructor() {
        if (!REDIS_URL || !REDIS_TOKEN) {
            console.warn('[REDIS] Upstash credentials not found, cache disabled')
            this.baseUrl = ''
            this.token = ''
        } else {
            this.baseUrl = REDIS_URL
            this.token = REDIS_TOKEN
        }
    }

    private isEnabled(): boolean {
        return this.baseUrl !== '' && this.token !== ''
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isEnabled()) return null

        try {
            const response = await fetch(`${this.baseUrl}/get/${key}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            if (!response.ok) {
                console.warn(`[REDIS] GET failed for key: ${key}`)
                return null
            }

            const data = await response.json()

            if (data.result === null) {
                return null
            }

            // Parse JSON if it's a string
            if (typeof data.result === 'string') {
                try {
                    return JSON.parse(data.result) as T
                } catch {
                    return data.result as T
                }
            }

            return data.result as T
        } catch (error) {
            console.error('[REDIS] Error getting key:', key, error)
            return null
        }
    }

    async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
        if (!this.isEnabled()) return false

        try {
            const ttl = options.ttl || 300 // Default 5 minutes
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)

            const response = await fetch(`${this.baseUrl}/set/${key}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: serializedValue,
                    ex: ttl // Expiration in seconds
                })
            })

            if (!response.ok) {
                console.warn(`[REDIS] SET failed for key: ${key}`)
                return false
            }

            console.log(`[REDIS] Cached: ${key} (TTL: ${ttl}s)`)
            return true
        } catch (error) {
            console.error('[REDIS] Error setting key:', key, error)
            return false
        }
    }

    async delete(key: string): Promise<boolean> {
        if (!this.isEnabled()) return false

        try {
            const response = await fetch(`${this.baseUrl}/del/${key}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            if (!response.ok) {
                console.warn(`[REDIS] DELETE failed for key: ${key}`)
                return false
            }

            console.log(`[REDIS] Deleted: ${key}`)
            return true
        } catch (error) {
            console.error('[REDIS] Error deleting key:', key, error)
            return false
        }
    }

    async invalidatePattern(pattern: string): Promise<boolean> {
        if (!this.isEnabled()) return false

        try {
            // Get all keys matching pattern
            const response = await fetch(`${this.baseUrl}/keys/${pattern}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            if (!response.ok) {
                console.warn(`[REDIS] KEYS failed for pattern: ${pattern}`)
                return false
            }

            const data = await response.json()
            const keys = data.result || []

            if (keys.length === 0) {
                console.log(`[REDIS] No keys found for pattern: ${pattern}`)
                return true
            }

            // Delete all matching keys
            for (const key of keys) {
                await this.delete(key)
            }

            console.log(`[REDIS] Invalidated ${keys.length} keys matching: ${pattern}`)
            return true
        } catch (error) {
            console.error('[REDIS] Error invalidating pattern:', pattern, error)
            return false
        }
    }

    // Helper: Get or Set pattern (cache-aside)
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(key)
        if (cached !== null) {
            console.log(`[REDIS] Cache HIT: ${key}`)
            return cached
        }

        console.log(`[REDIS] Cache MISS: ${key}`)

        // Fetch fresh data
        const fresh = await fetchFn()

        // Cache it
        await this.set(key, fresh, options)

        return fresh
    }
}

// Export singleton instance
export const cache = new RedisCache()

// Cache key builders
export const CacheKeys = {
    profile: (instanceName: string) => `profile:${instanceName}`,
    appointmentSettings: (userId: string) => `appointment_settings:${userId}`,
    activePromo: (userId: string) => `active_promo:${userId}`,
    products: (userId: string) => `products:${userId}`,
    services: (userId: string) => `services:${userId}`,
    businessCapabilities: (userId: string) => `business_capabilities:${userId}`,

    // Fase 3: Memoria
    recentMessages: (contactId: string) => `conversation:${contactId}:recent`,
    conversationSummary: (contactId: string) => `conversation:${contactId}:summary`,

    // Pattern invalidators
    userPattern: (userId: string) => `*:${userId}`,
    profilePattern: (instanceName: string) => `profile:${instanceName}`
}

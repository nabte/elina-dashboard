
import { AccountConfig, AutoResponse } from '../config/types.ts'

/**
 * Verifica si el mensaje coincide con alguna regla de autorespuesta
 */
export function checkAutoResponses(messageText: string, config: AccountConfig): AutoResponse | null {
    if (!config.autoResponses || config.autoResponses.length === 0) return null

    const lowerMessage = messageText.toLowerCase()

    // Sort by specific criteria if needed (e.g. exact match first)
    // For now, iterate in order
    for (const rule of config.autoResponses) {
        if (!rule.isActive) continue

        const trigger = (rule.triggerText || '').toLowerCase()
        const matchType = rule.matchType || 'contains'

        let isMatch = false

        if (matchType === 'exact') {
            isMatch = lowerMessage === trigger
        } else {
            // contains
            isMatch = lowerMessage.includes(trigger)
        }

        if (isMatch) {
            console.log(`✅ [AUTOMATION] Auto-response triggered: ${rule.id} (${trigger})`)
            return rule
        }
    }

    return null
}

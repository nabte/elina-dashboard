/**
 * ELINA V5 - Unified Messaging Client
 *
 * Wrapper que detecta el proveedor WhatsApp (Evolution o Venom)
 * y despacha a la implementación correcta
 */

import type { AccountConfig } from '../config/types.ts'
import * as EvolutionClient from './evolution.ts'
import * as VenomClient from './venom-client.ts'

export interface MessagingConfig {
    provider: 'evolution' | 'venom'
    // Evolution config
    evolution?: AccountConfig
    // Venom config
    venom?: {
        sessionId: string
        imageFormat: 'url' | 'base64'
    }
}

/**
 * Envía un mensaje de texto
 */
export async function sendMessage(
    config: MessagingConfig,
    remoteJid: string,
    text: string
): Promise<void> {
    if (config.provider === 'evolution') {
        if (!config.evolution) {
            throw new Error('Evolution config missing')
        }
        await EvolutionClient.sendMessage(config.evolution, remoteJid, text)
    } else {
        if (!config.venom) {
            throw new Error('Venom config missing')
        }
        await VenomClient.sendMessage(config.venom.sessionId, remoteJid, text)
    }
}

/**
 * Envía una imagen
 */
export async function sendImage(
    config: MessagingConfig,
    remoteJid: string,
    imageUrl: string,
    caption?: string,
    format?: 'url' | 'base64'
): Promise<void> {
    if (config.provider === 'evolution') {
        if (!config.evolution) {
            throw new Error('Evolution config missing')
        }
        await EvolutionClient.sendImage(config.evolution, remoteJid, imageUrl, caption)
    } else {
        if (!config.venom) {
            throw new Error('Venom config missing')
        }
        const imageFormat = format || config.venom.imageFormat || 'url'
        await VenomClient.sendImage(config.venom.sessionId, remoteJid, imageUrl, caption, imageFormat)
    }
}

/**
 * Envía un video
 */
export async function sendVideo(
    config: MessagingConfig,
    remoteJid: string,
    videoUrl: string,
    caption?: string,
    format?: 'url' | 'base64'
): Promise<void> {
    if (config.provider === 'evolution') {
        if (!config.evolution) {
            throw new Error('Evolution config missing')
        }
        await EvolutionClient.sendVideo(config.evolution, remoteJid, videoUrl, caption)
    } else {
        if (!config.venom) {
            throw new Error('Venom config missing')
        }
        const imageFormat = format || config.venom.imageFormat || 'url'
        await VenomClient.sendVideo(config.venom.sessionId, remoteJid, videoUrl, caption, imageFormat)
    }
}

/**
 * Envía un audio
 */
export async function sendAudio(
    config: MessagingConfig,
    remoteJid: string,
    audioUrl: string
): Promise<void> {
    if (config.provider === 'evolution') {
        if (!config.evolution) {
            throw new Error('Evolution config missing')
        }
        await EvolutionClient.sendAudio(config.evolution, remoteJid, audioUrl)
    } else {
        if (!config.venom) {
            throw new Error('Venom config missing')
        }
        await VenomClient.sendAudio(config.venom.sessionId, remoteJid, audioUrl)
    }
}

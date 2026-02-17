
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendMessage, sendMedia, sendImage } from './evolution-client.ts'

export interface WorkflowStep {
    id: string
    type: 'text' | 'number' | 'date' | 'image' | 'payment_details'
    prompt: string
    image_url?: string // For payment_details or visual prompts
}

export interface WorkflowConfig {
    id: string
    name: string
    trigger_keywords: string[]
    pricing_logic: 'auto_tiered' | 'manual_quote'
    product_id_ref?: number
    delivery_rule?: {
        days: number
        urgent_action?: string
    }
    steps: WorkflowStep[]
}

export interface WorkflowState {
    active_workflow: string
    current_step_index: number
    collected_data: Record<string, any>
}

// ==================== MAIN ENGINE ====================

export async function processWorkflowMessage(
    supabase: SupabaseClient,
    contact: any,
    profile: any,
    messageText: string,
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document',
    mediaUrl: string | null,
    state: any // Conversation State row
): Promise<{ processed: boolean, response?: string }> {

    const metadata = state?.metadata || {}
    const workflowState = metadata.active_workflow_state as WorkflowState

    if (!workflowState) {
        return { processed: false }
    }

    console.log(`>>> [WORKFLOW] Procesando paso del flujo: ${workflowState.active_workflow}`)

    // 1. Load Workflow Config
    const workflows = profile.automation_settings?.custom_workflows as WorkflowConfig[]
    const config = workflows?.find(w => w.id === workflowState.active_workflow)

    if (!config) {
        console.error(`!!! [WORKFLOW] Configuración no encontrada para: ${workflowState.active_workflow}`)
        // Cancel workflow to avoid infinite loop
        await updateWorkflowState(supabase, state.id, null)
        return { processed: false }
    }

    const currentStep = config.steps[workflowState.current_step_index]

    // 2. Validate & Collect Input
    const isValid = await validateInput(currentStep, messageText, messageType)

    if (!isValid) {
        console.log(`--- [WORKFLOW] Input inválido para paso ${currentStep.id} (${currentStep.type})`)
        return {
            processed: true,
            response: getValidationErrorMsg(currentStep.type)
        }
    }

    // Save Data
    let dataToSave = messageText
    if (currentStep.type === 'image' && mediaUrl) {
        dataToSave = mediaUrl
    }
    if (currentStep.type === 'number') {
        dataToSave = extractNumber(messageText).toString()
    }
    if (currentStep.type === 'date') {
        // Simple storage, maybe normalize later
        dataToSave = messageText
    }

    workflowState.collected_data[currentStep.id] = dataToSave

    // 3. Move to Next Step
    workflowState.current_step_index++

    if (workflowState.current_step_index < config.steps.length) {
        // Next Step Exists
        const nextStep = config.steps[workflowState.current_step_index]
        await updateWorkflowState(supabase, state.id, workflowState)

        // Handle Payment Details (Auto-send image)
        if (nextStep.type === 'payment_details' && nextStep.image_url) {
            // We return text, but caller (index.ts) might need to handle the image separately or we send it here directly.
            // For simplicity, we send media immediately here.
            await sendMedia(
                profile.evolution_instance_name,
                profile.evolution_api_key,
                contact.phone_number,
                nextStep.image_url,
                'image',
                'payment.jpg',
                nextStep.prompt
            )
            // Payment details is usually an informational step, we might wait for "comprobante" or just move on/finish?
            // Assuming for now it pauses here waiting for ANY input (like a receipt image) or we treat it as "Output Only" and move to next?
            // If it's a prompt "Here is the QR", we expect user to pay.
            // Let's assume we wait for user response (image of receipt).
            return { processed: true, response: "" } // Already sent via sendMedia
        }

        return { processed: true, response: nextStep.prompt }
    } else {
        // 4. Workflow Completed
        console.log(`+++ [WORKFLOW] Completado: ${config.name}`)
        const finalResponse = await finalizeWorkflow(supabase, profile, contact, config, workflowState)

        // Clear State
        await updateWorkflowState(supabase, state.id, null)

        return { processed: true, response: finalResponse }
    }
}

export async function checkWorkflowTriggers(
    supabase: SupabaseClient,
    contact: any,
    profile: any,
    text: string,
    stateId: number
): Promise<{ triggered: boolean, response?: string }> {
    const workflows = profile.automation_settings?.custom_workflows as WorkflowConfig[]

    if (!workflows || workflows.length === 0) return { triggered: false }

    const lowerText = text.toLowerCase()

    for (const flow of workflows) {
        if (flow.trigger_keywords.some(k => lowerText.includes(k.toLowerCase()))) {
            console.log(`+++ [WORKFLOW] Trigger detectado: ${flow.name}`)

            // Initialize State
            const initialState: WorkflowState = {
                active_workflow: flow.id,
                current_step_index: 0,
                collected_data: {}
            }

            await updateWorkflowState(supabase, stateId, initialState)

            const firstStep = flow.steps[0]
            return { triggered: true, response: firstStep.prompt }
        }
    }

    return { triggered: false }
}

// ==================== HELPERS ====================

async function updateWorkflowState(supabase: SupabaseClient, stateId: number, workflowState: WorkflowState | null) {
    // We update the metadata field, creating/removing 'active_workflow_state' key
    // First fetch current metadata to preserve other fields
    const { data } = await supabase.from('conversation_states').select('metadata').eq('id', stateId).single()
    const currentMeta = data?.metadata || {}

    if (workflowState) {
        currentMeta.active_workflow_state = workflowState
    } else {
        delete currentMeta.active_workflow_state
    }

    await supabase.from('conversation_states').update({
        metadata: currentMeta
    }).eq('id', stateId)
}

function validateInput(step: WorkflowStep, text: string, type: string): boolean {
    if (step.type === 'image') {
        return type === 'image'
    }
    if (step.type === 'number') {
        return /\d+/.test(text)
    }
    // Text and Date are loose for now
    return true
}

function getValidationErrorMsg(type: string): string {
    switch (type) {
        case 'image': return "Por favor, envía una imagen para continuar."
        case 'number': return "Por favor, ingresa un número válido (ej. 10)."
        case 'date': return "Por favor, ingresa una fecha válida."
        default: return "No entendí tu respuesta. Por favor intenta de nuevo."
    }
}

function extractNumber(text: string): number {
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
}

async function finalizeWorkflow(
    supabase: SupabaseClient,
    profile: any,
    contact: any,
    config: WorkflowConfig,
    state: WorkflowState
): Promise<string> {

    let summary = `📋 *Resumen del Pedido: ${config.name}*\n\n`
    for (const step of config.steps) {
        if (step.type === 'payment_details') continue; // Skip payment info in summary

        let val = state.collected_data[step.id]
        if (typeof val === 'string' && val.startsWith('http')) val = "[Imagen Recibida]"
        summary += `- *${step.id.replace('_', ' ')}:* ${val}\n`
    }

    // A. Auto-Pricing (Tiered)
    if (config.pricing_logic === 'auto_tiered' && config.product_id_ref) {
        // Fetch Product Pricing Config
        const { data: product } = await supabase
            .from('products')
            .select('product_name, price, pricing_config')
            .eq('id', config.product_id_ref)
            .single()

        if (product && product.pricing_config?.model === 'tiered') {
            const qty = parseInt(state.collected_data['quantity'] || '1')
            const priceUnit = calculateTieredPrice(qty, product.pricing_config.tiers)
            const total = qty * priceUnit

            // Calculate Delivery
            const deliveryDate = new Date()
            deliveryDate.setDate(deliveryDate.getDate() + (config.delivery_rule?.days || 7))
            const dateStr = deliveryDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

            summary += `\n💰 *Cotización Estimada:*\n`
            summary += `- Cantidad: ${qty}\n`
            summary += `- Precio Unitario: $${priceUnit}\n`
            summary += `- *Total: $${total}*\n`
            summary += `- 🚚 Entrega Estimada: ${dateStr}\n`

            return `¡Perfecto! Aquí tienes el detalle:\n\n${summary}\n¿Te gustaría confirmar este pedido para enviarte los datos de pago?`
        }
    }

    // B. Manual Quote (Human Handoff)
    // Send notification to Owner
    if (profile.contact_phone) {
        // Evaluate if we should calculate an "Estimated" price from tiers even for manual review?
        // For now, simple forwarding.
        const handoffMsg = `🔔 *NUEVO LEAD DE FLUJO: ${config.name}*\n\nCliente: ${contact.full_name || contact.phone_number}\n\n${summary}\n⚠️ Requiere cotización manual.`

        await sendMessage(
            profile.evolution_instance_name,
            profile.evolution_api_key,
            profile.contact_phone,
            handoffMsg
        )
    }

    return `¡Gracias! He recibido toda tu información.\n\n${summary}\nUn asesor experto revisará tu caso y te enviará una cotización personalizada en breve. ⏳`
}

function calculateTieredPrice(qty: number, tiers: any[]): number {
    // Tiers example: [{min: 1, max: 20, price: 25}, {min: 21, max: 999, price: 20}]
    // Sort logic handled by logic or trusted order? Better sort first
    tiers.sort((a, b) => a.min - b.min)

    const matchedTier = tiers.find(t => qty >= t.min && qty <= (t.max || Infinity))
    return matchedTier ? Number(matchedTier.price) : 0
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createSupabaseAdminClient } from "../_shared/supabase-client.ts"
import { corsHeaders } from "../_shared/cors.ts"
import OpenAI from "https://esm.sh/openai@4.51.0"

console.log("Apply Auto Tags Function Started v2.0 (Corrected Schema)")

const openai = new OpenAI({
    apiKey: Deno.env.get("GEMINI_API_KEY")!,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
})

interface AutomatedLabel {
    id: string
    name: string // The tag name
    prompt: string // The AI instruction
    is_automated: boolean
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createSupabaseAdminClient()
        const payload = await req.json()

        const { user_id, contact_id } = payload

        if (!user_id || !contact_id) {
            return new Response(JSON.stringify({ error: 'Missing user_id or contact_id' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        console.log(`>>> [AUTO-TAGS] Analizando conversación: user=${user_id}, contact=${contact_id}`)

        // 1. Get automated labels (using correct 'labels' table)
        const { data: automatedLabels, error: labelsError } = await supabase
            .from('labels')
            .select('id, name, prompt, is_automated')
            .eq('user_id', user_id)
            .eq('is_automated', true)

        // Filter out any labels without a prompt just in case
        const validLabels = (automatedLabels || []).filter((l: any) => l.prompt && l.prompt.trim().length > 0)

        if (labelsError || validLabels.length === 0) {
            console.log('--- [AUTO-TAGS] No hay etiquetas automatizadas activas')
            return new Response(JSON.stringify({ message: 'No automated labels found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        console.log(`+++ [AUTO-TAGS] ${validLabels.length} etiquetas automatizadas encontradas`)

        // 2. Get recent chat history (last 20 messages)
        const { data: history, error: historyError } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', user_id)
            .eq('contact_id', contact_id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (historyError || !history || history.length === 0) {
            console.log('--- [AUTO-TAGS] No hay historial suficiente')
            return new Response(JSON.stringify({ message: 'No chat history found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        const reversedHistory = history.reverse()
        console.log(`+++ [AUTO-TAGS] Historial con ${reversedHistory.length} mensajes`)

        // 3. Get current contact labels
        const { data: contact } = await supabase
            .from('contacts')
            .select('labels, full_name, phone_number')
            .eq('id', contact_id)
            .single()

        const currentLabels: string[] = contact?.labels || []
        console.log(`+++ [AUTO-TAGS] Etiquetas actuales: ${currentLabels.join(', ') || 'ninguna'}`)

        // 4. Analyze conversation with AI for each label
        const newLabels: string[] = []

        // Prepare conversation text once
        const conversationText = reversedHistory
            .map(m => `${m.message_type === 'human' ? 'Cliente' : 'Asistente'}: ${m.content}`)
            .join('\n')

        for (const label of validLabels as AutomatedLabel[]) {
            // Skip if already has this label (case insensitive check)
            if (currentLabels.some(l => l.toLowerCase() === label.name.toLowerCase())) {
                console.log(`--- [AUTO-TAGS] Contacto ya tiene etiqueta: ${label.name}`)
                continue
            }

            // Build analysis prompt using the user's custom prompt
            const analysisPrompt = `Analiza la siguiente conversación y determina si debe aplicarse la etiqueta "${label.name}".

INSTRUCCIÓN ESPECÍFICA (DEFINIDA POR EL USUARIO):
"${label.prompt}"

CONVERSACIÓN:
${conversationText}

INSTRUCCIONES DE SALIDA:
- Responde SOLO con "SI" o "NO"
- SI: Si la conversación cumple con la instrucción de la etiqueta.
- NO: Si no cumple o hay dudas.

Respuesta:`

            try {
                const response = await openai.chat.completions.create({
                    model: "gemini-2.0-flash-lite",
                    messages: [
                        { role: "system", content: "Eres un asistente que analiza conversaciones y determina si deben aplicarse etiquetas. Responde SOLO con SI o NO." },
                        { role: "user", content: analysisPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 5
                })

                const decision = response.choices[0].message.content?.trim().toUpperCase()

                if (decision === 'SI' || decision?.includes('SI')) {
                    console.log(`+++ [AUTO-TAGS] Etiqueta APLICABLE: ${label.name}`)
                    newLabels.push(label.name)
                } else {
                    console.log(`--- [AUTO-TAGS] Etiqueta NO APLICABLE: ${label.name}`)
                }

            } catch (err) {
                console.error(`!!! [ERROR] Fallo análisis para ${label.name}:`, err)
            }
        }

        // 5. Update contact labels if new labels found
        if (newLabels.length > 0) {
            // Merge labels avoiding duplicates
            const updatedLabels = [...new Set([...currentLabels, ...newLabels])]

            const { error: updateError } = await supabase
                .from('contacts')
                .update({ labels: updatedLabels })
                .eq('id', contact_id)

            if (updateError) {
                console.error('!!! [ERROR] Fallo al actualizar etiquetas:', updateError)
                return new Response(JSON.stringify({ error: 'Failed to update labels' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500
                })
            }

            console.log(`+++ [AUTO-TAGS] Etiquetas agregadas: ${newLabels.join(', ')}`)

            return new Response(JSON.stringify({
                success: true,
                labels_added: newLabels,
                total_labels: updatedLabels.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        console.log('--- [AUTO-TAGS] No se aplicaron nuevas etiquetas')

        return new Response(JSON.stringify({
            success: true,
            labels_added: [],
            message: 'No new labels applied'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error: any) {
        console.error('!!! [ERROR FATAL] apply-auto-tags:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})

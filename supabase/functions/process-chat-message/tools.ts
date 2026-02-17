
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const toolsDefinition = [
    {
        type: 'function',
        function: {
            name: 'search_products',
            description: `🔍 HERRAMIENTA OBLIGATORIA PARA PRODUCTOS

CUÁNDO USAR (SIEMPRE):
- Usuario pregunta por precios: "¿cuánto cuesta X?"
- Usuario busca producto específico: "tienes impresoras?"
- Usuario menciona marca/modelo: "toner HP"
- Usuario pregunta por disponibilidad: "hay stock de X?"
- Usuario pide información de producto

EJEMPLOS DE USO CORRECTO:
❌ MAL: Usuario: "tienes toner?" → Agente: "Sí, tenemos varios modelos"
✅ BIEN: Usuario: "tienes toner?" → Agente llama search_products(query: "toner")

IMPORTANTE:
- NUNCA inventes precios o disponibilidad
- SIEMPRE usa esta herramienta antes de responder sobre productos
- Si no encuentras resultados, di "No encontré ese producto, ¿buscas algo similar?"
- Usa los IDs devueltos en formato [NOMBRE:ID] para placeholders`,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Término de búsqueda (nombre, modelo, sku, etc). Ej: "toner m477", "impresora canon"',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_appointment',
            description: 'Registrar formalmente una cita en la agenda una vez que el cliente ha confirmado el horario. DEBES usar esta herramienta cuando el cliente confirme explícitamente un horario propuesto.',
            parameters: {
                type: 'object',
                properties: {
                    start_time: {
                        type: 'string',
                        description: 'Fecha y hora de inicio en formato ISO 8601 (Ej: 2026-02-03T15:30:00).',
                    },
                    service_id: {
                        type: 'number',
                        description: 'ID del servicio extraído del placeholder [NOMBRE:ID]. Ejemplo: para [Serive1:8878] usar 8878',
                    },
                    notes: {
                        type: 'string',
                        description: 'Notas adicionales.',
                    },
                },
                required: ['start_time', 'service_id'],
            },
        },
    },
]

export async function searchProducts(
    supabase: SupabaseClient,
    userId: string,
    query: string
) {
    // Call the existing search-products-hybrid function
    // We use the public URL or internal invoke

    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-products-hybrid`

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                query: query,
                limit: 5 // Return top 5
            }),
        })

        if (!response.ok) {
            console.error('Error invoking search-products-hybrid:', await response.text())
            return "Error buscando productos."
        }

        const data = await response.json()
        // Format for LLM to save tokens
        if (!data.products || data.products.length === 0) {
            return "No se encontraron productos con ese término."
        }

        return JSON.stringify(data.products.map((p: any) => ({
            id: p.id,
            name: p.product_name,
            price: p.price,
            stock: p.stock,
            description: p.description,
            url: p.media_url,
            score: p.relevance_score // Optional, maybe helpful for LLM to know confidence
        })))

    } catch (err) {
        console.error('Exception in searchProducts:', err)
        return "Error al conectar con la base de datos de productos."
    }
}

export async function createAppointment(
    supabase: SupabaseClient,
    userId: string,
    contactInfo: { name: string, phone: string, id: number },
    startTime: string,
    serviceId: number,
    notes: string = ""
) {
    console.log(`... [TOOL: Citas] Validando servicio ID ${serviceId} para ${contactInfo.name}`)

    try {
        // STEP 1: Validate service exists and belongs to user
        const { data: service, error: serviceError } = await supabase
            .from('products')
            .select('id, product_name, description, service_duration_minutes')
            .eq('id', serviceId)
            .eq('user_id', userId)
            .eq('product_type', 'service')
            .single()

        if (serviceError || !service) {
            console.error('!!! [ERROR] Servicio inválido o no encontrado:', serviceId, serviceError)
            return `❌ Error: El servicio solicitado no existe o no está disponible. Por favor, elige uno de los servicios listados.`
        }

        // Get duration from service config, default to 30 if not set
        const durationMinutes = service.service_duration_minutes || 30
        console.log(`+++ [TOOL: Citas] Servicio validado: ${service.product_name} (Duración: ${durationMinutes} min)`)

        // STEP 2: Check for overlapping appointments (prevent double-booking)
        const start = new Date(startTime)
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

        const { data: existingMeetings, error: checkError } = await supabase
            .from('meetings')
            .select('id, start_time, end_time, summary')
            .eq('user_id', userId)
            .gte('end_time', start.toISOString())
            .lte('start_time', end.toISOString())

        if (checkError) {
            console.error('!!! [ERROR] Error verificando disponibilidad:', checkError)
            return `Error al verificar disponibilidad: ${checkError.message}`
        }

        if (existingMeetings && existingMeetings.length > 0) {
            console.warn(`!!! [CONFLICTO] Ya existe una cita en este horario: ${existingMeetings[0].summary}`)
            return `Lo siento, ese horario ya está ocupado. Por favor elige otro horario disponible.`
        }

        console.log(`+++ [TOOL: Citas] Horario disponible confirmado`)

        // STEP 3: Create appointment in 'meetings' table (used by frontend)
        const { data, error } = await supabase
            .from('meetings')
            .insert({
                user_id: userId,
                contact_id: contactInfo.id,
                product_id: service.id,
                summary: `${service.product_name} - ${contactInfo.name}`,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'confirmed',
                notes: notes || 'Cita agendada por ELINA IA via WhatsApp',
                confirmation_status: 'confirmed',
                reminder_sent: false,
                metadata: {
                    source: 'whatsapp_ai',
                    service_name: service.product_name,
                    booked_by: 'elina_ai'
                }
            })
            .select()
            .single()

        if (error) {
            console.error('!!! [ERROR] Error insertando cita en meetings:', error)
            return `Error al guardar la cita: ${error.message}`
        }

        console.log(`+++ [TOOL: Citas] Cita creada en 'meetings' con ID: ${data.id}`)
        return `¡Cita confirmada y guardada exitosamente para el ${start.toLocaleString('es-MX')}!`

    } catch (err) {
        console.error('Exception in createAppointment:', err)
        return "Error técnico al intentar agendar la cita."
    }
}

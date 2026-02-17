/**
 * ELINA V5 - Tools Implementation
 * 
 * Implementación de las herramientas disponibles para el agente
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Busca productos por query
 */
export async function buscarProductos(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    limit: number = 5
): Promise<any> {
    console.log(`🔍 [TOOL] Searching products: "${query}"`)

    // Normalización de queries genéricos (con posibles typos o caracteres extra)
    // Si el usuario pone "que vendes_", "catalogo", "lista", lo tratamos como vacío para mostrar todo.
    const genericKeywords = ['que vendes', 'qué vendes', 'que tienes', 'qué tienes', 'catalogo', 'catálogo', 'productos', 'lista', 'precio', 'precios']
    const normalizedQuery = query.toLowerCase().replace(/[^\w\sñáéíóú]/g, '').trim() // Quitar caracteres raros como "_"

    // Detectar si el usuario pregunta específicamente por SERVICIOS
    const serviceKeywords = ['servicio', 'servicios', 'cita', 'citas', 'que servicios', 'qué servicios']
    const isAskingForServices = serviceKeywords.some(k => normalizedQuery.includes(k))

    let effectiveQuery = query
    if (genericKeywords.some(k => normalizedQuery.includes(k)) || normalizedQuery.length < 3 || isAskingForServices) {
        effectiveQuery = '' // Forzar modo "ver todo" para keywords genéricos O servicios
    }

    // CASO 1: Query vacío -> Mostrar catálogo general (sin clasificar)
    if (!effectiveQuery || effectiveQuery.trim() === '') {
        // Si pregunta por servicios, filtrar solo servicios
        if (isAskingForServices) {
            const { data, error } = await supabase
                .from('products')
                .select('id, product_name, sku, price, stock, description, media_url, product_type')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) {
                console.error(`❌ [TOOL] Error fetching services:`, error)
                return { status: "ERROR", message: "Error consultando servicios." }
            }

            return {
                status: "SUCCESS",
                message: "Aquí están los servicios disponibles.",
                exact_match_found: true,
                exact_matches: data?.map(p => ({
                    ...p,
                    formatting_hint: `🛍️ *${p.product_name}* — $${p.price}\n🔹 ${p.description || ''}\n`
                })) || [],
                has_alternatives: false,
                suggested_alternatives: []
            }
        } else {
            // Modo MIXTO: Traer productos y servicios por separado para mostrar variedad
            // 1. Productos Físicos
            const { data: products } = await supabase
                .from('products')
                .select('id, product_name, sku, price, stock, description, media_url, product_type')
                .eq('user_id', userId)
                .neq('product_type', 'service') // Excluir servicios
                .order('created_at', { ascending: false })
                .limit(3)

            // 2. Servicios
            const { data: services } = await supabase
                .from('products')
                .select('id, product_name, sku, price, stock, description, media_url, product_type')
                .eq('user_id', userId)
                .eq('product_type', 'service') // Solo servicios
                .order('created_at', { ascending: false })
                .limit(3)

            const mixedData = [...(products || []), ...(services || [])]

            return {
                status: "SUCCESS",
                message: "Aquí tienes una selección de nuestros productos y servicios.",
                exact_match_found: true,
                exact_matches: mixedData.map(p => ({
                    ...p,
                    formatting_hint: p.product_type === 'service'
                        ? `🛍️ *${p.product_name}* — $${p.price}\n🔹 ${p.description || ''}\n`
                        : `[PRODUCT_CARD:${p.id}]`
                })),
                has_alternatives: false,
                suggested_alternatives: []
            }
        }
    }

    // CASO 2: Búsqueda Vectorial / Fulltext
    const { data, error } = await supabase.rpc('search_products_fulltext', {
        p_user_id: userId,
        p_query: effectiveQuery, // Usar la query normalizada/efectiva
        p_limit: limit
    })

    if (error) {
        console.error(`❌ [TOOL] Error searching products:`, error)
        return { status: "ERROR", message: "Error en la búsqueda." }
    }

    const results = data || []

    // Clasificación por fidelidad (Lógica Proactiva de n8n)
    // Thresholds: >= 0.3 (Exacto), >= 0.15 (Alternativa)
    // Nota: search_products_fulltext retorna 'similarity' o rank. Asumimos que viene algo usable.
    // Si la función SQL no retorna score, usaremos todos como exactos si son pocos, o lógica simple.
    // Para este caso, vamos a simular la lógica si no tenemos score explícito, 
    // pero idealmente la función RPC debería devolverlo.

    // Si la RPC no devuelve score, asumimos que todos son resultados válidos de fulltext
    // Pero si podemos filtrar mejor en el cliente:

    const highConfidence = results // En fulltext, lo que llega suele ser relevante
    // Si tuviéramos similarity: results.filter(r => r.similarity >= 0.3)

    if (highConfidence.length === 0) {
        return {
            status: "NOT_FOUND",
            message: `No encontré productos que coincidan con '${query}'.`
        }
    }

    // Estructura "Anti-Alucinación"
    return {
        status: "SUCCESS",
        message: `Encontré ${highConfidence.length} coincidencias para '${query}'.`,
        exact_match_found: highConfidence.length > 0,
        exact_matches: highConfidence.map(r => ({
            id: r.id,
            name: r.product_name,
            price: r.price,
            stock: r.stock,
            description: r.description,
            // URL solo interna, el LLM usa el placeholder
            formatting_hint: `[PRODUCT_CARD:${r.id}]`
        })),
        has_alternatives: false, // En fulltext simple es difícil distinguir sin vector store
        suggested_alternatives: []
    }
}

/**
 * Consulta disponibilidad de citas
 */
export async function consultarDisponibilidad(
    supabase: SupabaseClient,
    userId: string,
    date?: string,
    slug?: string // Propiedad opcional para link
): Promise<any> {
    console.log(`📅 [TOOL] Checking availability for date: ${date || 'next 7 days'}`)

    const { getAvailableSlots, formatAppointmentContext } = await import('./appointment-manager.ts')
    const slots = await getAvailableSlots(userId, 7)

    return {
        available: slots.length > 0,
        // Proporcionar contexto formateado para que el LLM lo use directamente
        formatted_response: formatAppointmentContext(slots, slug),
        // Mantener slots crudos por si el LLM necesita datos estructurados precisos
        raw_slots: slots.map(slot => ({
            start_time: slot.start_time,
            service_name: slot.service_name,
            duration_minutes: slot.duration_minutes
        }))
    }
}

/**
 * Agenda una cita
 */
export async function agendarCita(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    date: string,
    time: string,
    serviceId?: number,
    notes?: string,
    conversationState?: any  // ← Nuevo parámetro para acceder al estado
): Promise<any> {
    console.log(`📅 [TOOL] Creating appointment...`)

    // Si no se proporciona serviceId, intentar detectarlo del contexto
    let finalServiceId = serviceId

    if (!finalServiceId) {
        console.log(`🔍 [TOOL] No service_id provided, searching conversation context...`)

        // 1. Revisar si hay un servicio en el estado de conversación
        if (conversationState?.potentialService?.id) {
            finalServiceId = conversationState.potentialService.id
            console.log(`✅ [TOOL] Found service in conversation state: ${conversationState.potentialService.name} (${finalServiceId})`)
        }

        // 2. Si no hay en el estado, buscar en mensajes recientes (últimas 24h)
        if (!finalServiceId) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const { data: recentMessages } = await supabase
                .from('chat_history')
                .select('message_text')
                .eq('contact_id', contactId)
                .gt('created_at', oneDayAgo)
                .order('created_at', { ascending: false })
                .limit(10)

            if (recentMessages && recentMessages.length > 0) {
                // Buscar menciones de servicios en los mensajes
                const { data: services } = await supabase
                    .from('products')
                    .select('id, product_name')
                    .eq('user_id', userId)
                    .eq('product_type', 'service')

                if (services) {
                    // Buscar si algún servicio fue mencionado
                    for (const service of services) {
                        const serviceName = service.product_name.toLowerCase()
                        const mentioned = recentMessages.some(msg =>
                            msg.message_text?.toLowerCase().includes(serviceName)
                        )
                        if (mentioned) {
                            finalServiceId = service.id
                            console.log(`✅ [TOOL] Found service mentioned in history: ${service.product_name} (${finalServiceId})`)
                            break
                        }
                    }
                }
            }
        }

        // 3. Si aún no hay, usar el primer servicio disponible
        if (!finalServiceId) {
            console.log(`🔍 [TOOL] No service found in context, fetching default service...`)
            const { data: services } = await supabase
                .from('products')
                .select('id')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .limit(1)
                .single()

            if (services) {
                finalServiceId = services.id
                console.log(`✅ [TOOL] Using default service: ${finalServiceId}`)
            } else {
                return {
                    success: false,
                    error: 'No hay servicios disponibles para agendar'
                }
            }
        }
    }

    // Combinar fecha y hora en ISO 8601
    // IMPORTANTE: La fecha y hora que recibimos (ej: "2026-02-12", "15:00")
    // son en la ZONA HORARIA DEL USUARIO/EMPRESA.
    // Supabase espera UTC. Debemos convertir.

    // 1. Obtener configuración para saber timezone
    const { getAppointmentSettings } = await import('./appointment-manager.ts')
    const settings = await getAppointmentSettings(supabase, userId)
    const timezone = settings?.working_hours?.timezone || 'America/Mexico_City'

    // 2. Crear fecha en esa zona horaria
    // "2026-02-12T15:00:00" -> Interpretar como hora CDMX
    // NOTA: Deno deploy no siempre tiene feriados o timezones complejos nativos,
    // pero podemos usar un hack simple si asumimos offsets fijos o usamos una librería si está disponible.
    // Por ahora, asumiremos que el servidor corre en UTC y haremos el offset manual
    // para America/Mexico_City (UTC-6 en invierno, UTC-5 en verano - aunque MX ya no cambia horario en la mayoría)
    // Asumiremos UTC-6 fijo para CDMX por simplicidad si no hay librería, 
    // PERO lo ideal es dejar que la base de datos maneje la inserción si pudiéramos pasar "AT TOP TIME ZONE".
    // 
    // Mejor enfoque: Construir la fecha con el offset explícito.
    // CDMX es UTC-6.

    const targetTime = new Date(`${date}T${time}:00`)
    // Asumiendo que targetTime se creó en UTC (por defecto en Deno Deploy)
    // Le sumamos 6 horas para "cancelar" el hecho de que era local y convertirlo a UTC real
    // Ejemplo: Usuario quiere 15:00 CDMX.
    // UTC equivalente: 21:00 UTC.
    // new Date("2026-02-12T15:00:00") -> crea 15:00 UTC (incorrecto, esto sería 9:00 AM CDMX)
    // Queremos enviar 21:00 UTC.

    // Solución robusta sin librerías externas pesadas:
    // Usar el offset manual temporalmente.
    const offsetHours = 6 // UTC-6 para México Central (Estándar)
    const utcDate = new Date(targetTime.getTime() + (offsetHours * 60 * 60 * 1000))
    const startTime = utcDate.toISOString()

    console.log(`⏰ [TOOL] Time conversion:`)
    console.log(`   Input (Local): ${date} ${time}`)
    console.log(`   Timezone: ${timezone} (Assuming UTC-6)`)
    console.log(`   Output (UTC): ${startTime}`)

    const { createAppointment } = await import('./appointment-manager.ts')
    const { sendMessage } = await import('./evolution.ts')

    // Obtener teléfono del contacto
    const { data: contact } = await supabase
        .from('contacts')
        .select('phone_number')
        .eq('id', contactId)
        .single()

    if (!contact) {
        throw new Error('Contact not found')
    }

    // Crear función de envío de mensajes
    const sendMessageFn = async (remoteJid: string, text: string) => {
        // Esta función será proporcionada por el contexto
        console.log(`📤 [TOOL] Would send message to ${remoteJid}`)
    }

    const result = await createAppointment(
        supabase,
        {
            userId,
            contactId,
            serviceId: finalServiceId!, // Non-null assertion: ya verificamos arriba
            startTime,
            notes
        },
        sendMessageFn,
        contact.phone_number
    )


    return result
}

/**
 * Consulta las citas del usuario
 */
export async function consultarMisCitas(
    supabase: SupabaseClient,
    userId: string,
    contactId: number
): Promise<any> {
    console.log(`📅 [TOOL] Fetching appointments for contact ${contactId}`)

    const now = new Date().toISOString()

    const { data: appointments, error } = await supabase
        .from('meetings')
        .select(`
            id,
            start_time,
            end_time,
            status,
            notes,
            summary,
            products:product_id (
                product_name,
                service_duration_minutes
            )
        `)
        .eq('user_id', userId)
        .eq('contact_id', contactId)
        .gte('start_time', now)  // Solo citas futuras
        .order('start_time', { ascending: true })
        .limit(10)

    if (error) {
        console.error(`❌ [TOOL] Error fetching appointments:`, error)
        return {
            success: false,
            error: error.message
        }
    }

    if (!appointments || appointments.length === 0) {
        return {
            success: true,
            appointments: [],
            message: 'No tienes citas programadas'
        }
    }

    console.log(`✅ [TOOL] Found ${appointments.length} appointment(s)`)

    return {
        success: true,
        appointments: appointments.map(apt => {
            const date = new Date(apt.start_time)
            const formattedTime = date.toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })

            return {
                id: apt.id,
                serviceName: apt.products?.product_name || 'Servicio',
                startTime: apt.start_time, // Keep ISO for debugging
                formattedTime: formattedTime, // For LLM to read correct local time
                endTime: apt.end_time,
                status: apt.status,
                notes: apt.notes,
                isAIBooked: apt.summary === 'Cita Agendada por IA'
            }
        })
    }
}

/**
 * Modifica/reprograma una cita existente
 */
export async function modificarCita(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    appointmentId: number,
    newDate?: string,
    newTime?: string
): Promise<any> {
    const id = Number(appointmentId)
    console.log(`📅 [TOOL] Modifying appointment #${id}`)

    // Obtener la cita actual
    const { data: currentAppointment, error: fetchError } = await supabase
        .from('meetings')
        .select('*, products:product_id(service_duration_minutes)')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('contact_id', contactId)
        .single()

    if (fetchError || !currentAppointment) {
        console.error(`❌ [TOOL] Appointment not found:`, fetchError)
        return {
            success: false,
            error: 'No se encontró la cita'
        }
    }

    // Calcular nuevo start_time
    let newStartTime: string
    const offsetHours = 6 // UTC-6 para México

    if (newDate && newTime) {
        // Ambos proporcionados
        const targetTime = new Date(`${newDate}T${newTime}:00`)
        const utcDate = new Date(targetTime.getTime() + (offsetHours * 60 * 60 * 1000))
        newStartTime = utcDate.toISOString()
    } else if (newDate) {
        // Solo fecha nueva, mantener hora original
        const currentStart = new Date(currentAppointment.start_time)
        // Adjust back to local to extract time components accurately
        const localCurrent = new Date(currentStart.getTime() - (offsetHours * 60 * 60 * 1000))
        const h = localCurrent.getUTCHours().toString().padStart(2, '0')
        const m = localCurrent.getUTCMinutes().toString().padStart(2, '0')

        const targetTime = new Date(`${newDate}T${h}:${m}:00`)
        const utcDate = new Date(targetTime.getTime() + (offsetHours * 60 * 60 * 1000))
        newStartTime = utcDate.toISOString()
    } else if (newTime) {
        // Solo hora nueva, mantener fecha original
        const currentStart = new Date(currentAppointment.start_time)
        const localCurrent = new Date(currentStart.getTime() - (offsetHours * 60 * 60 * 1000))
        const y = localCurrent.getUTCFullYear()
        const mo = (localCurrent.getUTCMonth() + 1).toString().padStart(2, '0')
        const d = localCurrent.getUTCDate().toString().padStart(2, '0')

        const targetTime = new Date(`${y}-${mo}-${d}T${newTime}:00`)
        const utcDate = new Date(targetTime.getTime() + (offsetHours * 60 * 60 * 1000))
        newStartTime = utcDate.toISOString()
    } else {
        return {
            success: false,
            error: 'Debes proporcionar al menos una nueva fecha o hora'
        }
    }

    // Calcular nuevo end_time
    const durationMinutes = currentAppointment.products?.service_duration_minutes || 60
    const newEndTime = new Date(new Date(newStartTime).getTime() + durationMinutes * 60 * 1000).toISOString()

    // Actualizar la cita
    const { data: updatedAppointment, error: updateError } = await supabase
        .from('meetings')
        .update({
            start_time: newStartTime,
            end_time: newEndTime,
            notes: currentAppointment.notes ? `${currentAppointment.notes} (Reprogramada)` : 'Reprogramada'
        })
        .eq('id', appointmentId)
        .select()
        .single()

    if (updateError) {
        console.error(`❌ [TOOL] Error updating appointment:`, updateError)
        return {
            success: false,
            error: updateError.message
        }
    }

    console.log(`✅ [TOOL] Appointment #${appointmentId} rescheduled`)

    // Format times for LLM response
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    return {
        success: true,
        appointmentId: updatedAppointment.id,
        newStartTime: newStartTime,
        newEndTime: newEndTime,
        formattedStartTime: formatTime(newStartTime),
        formattedEndTime: formatTime(newEndTime)
    }
}

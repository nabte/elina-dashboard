/**
 * ELINA V5 - Tools Implementation
 * 
 * Implementación de las herramientas disponibles para el agente
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Genera respuesta de proceso de compra usando LLM con datos disponibles
 */
async function generatePurchaseResponse(
    companyName: string,
    contactData: string
): Promise<string> {
    try {
        const prompt = `Genera una respuesta BREVE (máximo 2-3 líneas) sobre cómo un cliente puede contratar/comprar.

Empresa: ${companyName}
Canales disponibles:
${contactData}

REGLAS CRÍTICAS:
1. Máximo 2-3 líneas
2. Incluye SOLO los canales mencionados arriba
3. Tono amigable para WhatsApp
4. NO inventes canales que no existen
5. Formato simple, sin markdown complejo`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 100
            })
        })

        if (!response.ok) throw new Error('LLM failed')

        const data = await response.json()
        return data.choices[0]?.message?.content?.trim() || `Contáctanos:\n${contactData}`

    } catch (error) {
        console.error('❌ [TOOL] Error generating response:', error)
        return `Puedes contactarnos:\n${contactData}`
    }
}

/**
 * Sistema de cascada inteligente para obtener info de proceso de compra
 * Nivel 1: Búsqueda semántica en FAQs (RAG)
 * Nivel 2: Generación dinámica con LLM usando datos del perfil
 * Nivel 3: Formato simple de datos disponibles
 * Nivel 4: Mensaje genérico profesional
 */
async function fetchPurchaseProcessInfo(
    supabase: SupabaseClient,
    userId: string
): Promise<string | null> {
    try {
        // NIVEL 1: Búsqueda semántica en knowledge_base usando RAG
        console.log(`🔍 [PURCHASE_INFO] Nivel 1: Buscando en FAQs con RAG...`)

        const { retrieveContext } = await import('./rag-system.ts')
        const purchaseQuery = "¿Cómo puedo contratar, comprar o adquirir este producto o servicio? ¿Dónde lo compro?"

        const ragContext = await retrieveContext(supabase, userId, 0, purchaseQuery)

        if (ragContext.relevantKnowledge && ragContext.relevantKnowledge.length > 0) {
            const topMatch = ragContext.relevantKnowledge[0]
            // Umbral de confianza: 0.35 es suficientemente similar
            if (topMatch.similarity >= 0.35) {
                console.log(`✅ [PURCHASE_INFO] FAQ encontrada (similarity: ${topMatch.similarity})`)
                return `\n\n📋 **INFORMACIÓN IMPORTANTE:**\n${topMatch.content}`
            }
            console.log(`⚠️ [PURCHASE_INFO] FAQ similarity baja (${topMatch.similarity}), continuando...`)
        }

        // NIVEL 2: No hay FAQs relevantes - Buscar datos del perfil
        console.log(`🔍 [PURCHASE_INFO] Nivel 2: Obteniendo datos del perfil...`)

        const { data: profile } = await supabase
            .from('profiles')
            .select('website, business_phone, business_address, social_media, company_name')
            .eq('id', userId)
            .single()

        if (!profile) {
            console.log(`⚠️ [PURCHASE_INFO] No se encontró perfil`)
            return null
        }

        // Construir información de contacto disponible
        const contactChannels: string[] = []
        if (profile.website) contactChannels.push(`🌐 Sitio web: ${profile.website}`)
        if (profile.business_phone) contactChannels.push(`📞 Teléfono: ${profile.business_phone}`)
        if (profile.business_address) contactChannels.push(`📍 Dirección: ${profile.business_address}`)
        if (profile.social_media?.whatsapp) contactChannels.push(`💬 WhatsApp: ${profile.social_media.whatsapp}`)
        if (profile.social_media?.instagram) contactChannels.push(`📱 Instagram: @${profile.social_media.instagram}`)
        if (profile.social_media?.facebook) contactChannels.push(`👥 Facebook: ${profile.social_media.facebook}`)

        if (contactChannels.length === 0) {
            // NIVEL 4: No hay datos - Mensaje genérico profesional
            console.log(`⚠️ [PURCHASE_INFO] Nivel 4: Sin datos de contacto, mensaje genérico`)
            return '\n\n📋 Contáctanos directamente para más información sobre cómo adquirir este producto o servicio.'
        }

        // NIVEL 2B: Generar respuesta inteligente con LLM
        console.log(`🤖 [PURCHASE_INFO] Nivel 2B: Generando respuesta con LLM...`)
        const contactData = contactChannels.join('\n')
        const companyName = profile.company_name || 'nuestra empresa'

        const generatedResponse = await generatePurchaseResponse(companyName, contactData)
        console.log(`✅ [PURCHASE_INFO] Respuesta generada exitosamente`)

        return `\n\n📋 **INFORMACIÓN IMPORTANTE:**\n${generatedResponse}`

    } catch (error) {
        console.error(`❌ [TOOL] Error fetching purchase info:`, error)
        // NIVEL 3: Fallback en caso de error
        return '\n\n📋 Para adquirir este producto, contáctanos directamente.'
    }
}

/**
 * Busca productos por query
 */
export async function buscarProductos(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    limit: number = 5,
    originalMessage?: string // Nuevo parámetro para detectar intent de compra
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
                .select('id, product_name, sku, price, stock, description, media_url, product_type, benefits, usage_instructions, faq')
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
                exact_matches: data?.map(p => {
                    const benefits = p.benefits ? `\n✨ Benefits: ${p.benefits}` : '';
                    const usage = p.usage_instructions ? `\n📝 Usage: ${p.usage_instructions}` : '';
                    const faqContent = p.faq?.content ? `\n❓ FAQ: ${p.faq.content}` : '';
                    return {
                        ...p,
                        formatting_hint: `🛍️ *${p.product_name}* — $${p.price}\n🔹 ${p.description || ''}${benefits}${usage}${faqContent}\n\n`
                    }
                }) || [],
                has_alternatives: false,
                suggested_alternatives: []
            }
        } else {
            // Modo MIXTO: Traer productos y servicios por separado para mostrar variedad
            // 1. Productos Físicos
            const { data: products } = await supabase
                .from('products')
                .select('id, product_name, sku, price, stock, description, media_url, product_type, benefits, usage_instructions, faq')
                .eq('user_id', userId)
                .neq('product_type', 'service') // Excluir servicios
                .order('created_at', { ascending: false })
                .limit(3)

            // 2. Servicios
            const { data: services } = await supabase
                .from('products')
                .select('id, product_name, sku, price, stock, description, media_url, product_type, benefits, usage_instructions, faq')
                .eq('user_id', userId)
                .eq('product_type', 'service') // Solo servicios
                .order('created_at', { ascending: false })
                .limit(3)

            const mixedData = [...(products || []), ...(services || [])]

            return {
                status: "SUCCESS",
                message: "Aquí tienes una selección de nuestros productos y servicios.",
                exact_match_found: true,
                exact_matches: mixedData.map(p => {
                    const benefits = p.benefits ? `\n✨ Benefits: ${p.benefits}` : '';
                    const usage = p.usage_instructions ? `\n📝 Usage: ${p.usage_instructions}` : '';
                    const faqContent = p.faq?.content ? `\n❓ FAQ: ${p.faq.content}` : '';

                    return {
                        ...p,
                        formatting_hint: p.product_type === 'service'
                            ? `🛍️ *${p.product_name}* — $${p.price}\n🔹 ${p.description || ''}${benefits}${usage}${faqContent}\n\n`
                            : `🛍️ *${p.product_name}* — $${p.price}\n🔹 ${p.description || ''}\n\n` // Use same format for physical products
                    }
                }),
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
    const highConfidence = results

    if (highConfidence.length === 0) {
        // 📊 Log búsqueda fallida para analytics (non-blocking)
        supabase.from('product_search_misses').insert({
            user_id: userId,
            query: query,
            original_message: originalMessage,
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log(`📊 [ANALYTICS] Search miss logged: "${query}"`)
        }).catch((err: any) => {
            console.error(`❌ [ANALYTICS] Failed to log search miss:`, err)
        })

        return {
            status: "NOT_FOUND",
            message: `No encontré productos que coincidan con '${query}'.`
        }
    }

    // 🎯 DETECCIÓN AUTOMÁTICA: Si el mensaje original contiene palabras de compra/contratación
    // automáticamente buscamos y agregamos info del proceso de compra
    let purchaseInfo = null
    if (originalMessage) {
        const purchaseKeywords = ['contratar', 'comprar', 'adquirir', 'obtener', 'conseguir', 'me ayuda']
        const hasPurchaseIntent = purchaseKeywords.some(kw =>
            originalMessage.toLowerCase().includes(kw)
        )

        if (hasPurchaseIntent) {
            console.log(`🛒 [TOOL] Purchase intent detected, fetching process info...`)
            purchaseInfo = await fetchPurchaseProcessInfo(supabase, userId)
            if (purchaseInfo) {
                console.log(`✅ [TOOL] Purchase process info added automatically`)
            }
        }
    }

    // Estructura "Anti-Alucinación" con Urgencia/Escasez
    const result: any = {
        status: "SUCCESS",
        message: `Encontré ${highConfidence.length} coincidencias para '${query}'.`,
        exact_match_found: highConfidence.length > 0,
        exact_matches: highConfidence.map(r => {
            let urgencyNote = ''

            // 🔥 URGENCIA: Stock bajo (últimas unidades)
            if (r.stock !== null && r.stock > 0 && r.stock <= 5) {
                urgencyNote = `\n⚠️ ¡Últimas ${r.stock} unidades disponibles!`
            }

            // 🔥 URGENCIA: Sin stock (agotado)
            if (r.stock !== null && r.stock === 0) {
                urgencyNote = `\n❌ Agotado temporalmente`
            }

            return {
                id: r.id,
                name: r.product_name,
                price: r.price,
                stock: r.stock,
                description: r.description,
                formatting_hint: `🛍️ *${r.product_name}* — $${r.price}${urgencyNote}\n🔹 ${r.description || ''}\n\n`
            }
        }),
        has_alternatives: false,
        suggested_alternatives: []
    }

    // Si encontramos info de proceso de compra, agregarla al resultado
    if (purchaseInfo) {
        result.purchase_process_info = purchaseInfo
        result.message += ' ' + purchaseInfo
    }

    return result
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

/**
 * Consulta promociones activas
 * Si no hay promociones, sugiere productos destacados de manera inteligente
 */
export async function consultarPromociones(
    supabase: SupabaseClient,
    userId: string
): Promise<any> {
    console.log(`🎁 [TOOL] Consulting active promotions...`)

    try {
        // 1. Buscar promociones activas
        const now = new Date().toISOString()

        const { data: promotions, error: promoError } = await supabase
            .from('smart_promotions')
            .select('id, title, description, benefits, call_to_action, discount, image_urls')
            .eq('user_id', userId)
            .eq('is_active', true)
            .or(`no_schedule.eq.true,and(start_at.lte.${now},end_at.gte.${now})`)
            .limit(5)

        if (promoError) {
            console.error(`❌ [TOOL] Error fetching promotions:`, promoError)
        }

        // 2. Si HAY promociones, devolverlas
        if (promotions && promotions.length > 0) {
            console.log(`✅ [TOOL] Found ${promotions.length} active promotion(s)`)

            const formattedPromos = promotions.map((p: any) => ({
                title: p.title,
                description: p.description,
                benefits: p.benefits,
                callToAction: p.call_to_action,
                discount: p.discount,
                imageUrls: p.image_urls
            }))

            return {
                hasPromotions: true,
                promotions: formattedPromos,
                message: `Tenemos ${promotions.length} promoción${promotions.length > 1 ? 'es' : ''} activa${promotions.length > 1 ? 's' : ''} en este momento.`
            }
        }

        // 3. NO HAY PROMOCIONES - Buscar productos para sugerir
        console.log(`ℹ️ [TOOL] No active promotions found - fetching featured products...`)

        const productSearch = await buscarProductos(supabase, userId, '', 3) // Buscar 3 productos cualquiera

        // 4. Si hay productos, sugerirlos como alternativa
        if (productSearch.status === 'SUCCESS' && productSearch.exact_matches && productSearch.exact_matches.length > 0) {
            console.log(`✅ [TOOL] Suggesting ${productSearch.exact_matches.length} products as alternative`)

            const products = productSearch.exact_matches.slice(0, 3)

            return {
                hasPromotions: false,
                promotions: [],
                hasSuggestedProducts: true,
                suggestedProducts: products,
                message: `En este momento no tenemos promociones activas, pero aquí te muestro algunos de nuestros productos que podrían interesarte:`
            }
        }

        // 5. No hay ni promociones ni productos
        console.log(`⚠️ [TOOL] No promotions or products available`)

        return {
            hasPromotions: false,
            promotions: [],
            hasSuggestedProducts: false,
            suggestedProducts: [],
            message: `En este momento no tenemos promociones activas. Si necesitas algo específico, con gusto te ayudo a buscarlo.`
        }

    } catch (error) {
        console.error(`❌ [TOOL] Error in consultarPromociones:`, error)
        return {
            hasPromotions: false,
            promotions: [],
            error: error instanceof Error ? error.message : 'Error consultando promociones'
        }
    }
}

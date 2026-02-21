// Appointment Management System for ELINA V5
// Handles appointment scheduling, slot management, and reminders

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AppointmentSettings {
    is_enabled: boolean
    buffer_minutes: number
    max_days_ahead: number
    working_hours?: any
}

export interface AppointmentSlot {
    start_time: string
    end_time: string
    service_id: number
    service_name: string
    duration_minutes: number
}

export interface CreateAppointmentParams {
    userId: string
    contactId: number
    serviceId: number
    startTime: string
    notes?: string
}

export interface AppointmentResult {
    success: boolean
    appointmentId?: number
    serviceName?: string
    startTime?: string
    error?: string
}

/**
 * Gets appointment settings for a user
 */
export async function getAppointmentSettings(
    supabase: SupabaseClient,
    userId: string
): Promise<AppointmentSettings | null> {
    try {
        const { data, error } = await supabase
            .from('appointment_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error) {
            console.error(`❌ [APPOINTMENT] Error fetching settings:`, error)
            return null
        }

        return data as AppointmentSettings
    } catch (error) {
        console.error(`❌ [APPOINTMENT] Error:`, error)
        return null
    }
}

/**
 * Gets available appointment slots
 */
export async function getAvailableSlots(
    userId: string,
    daysAhead: number = 7
): Promise<AppointmentSlot[]> {
    try {
        console.log(`📅 [APPOINTMENT] Fetching slots for next ${daysAhead} days...`)
        const allSlots: AppointmentSlot[] = []
        const slotsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-available-slots`
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

        // Generate dates for the next N days
        const dates: string[] = []
        const today = new Date()

        for (let i = 0; i < daysAhead; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            dates.push(date.toISOString().split('T')[0])
        }

        // Fetch slots for each date in parallel (limited for performance)
        const fetchPromises = dates.map(async (date) => {
            try {
                const response = await fetch(slotsUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${anonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        date: date
                    })
                })

                if (!response.ok) {
                    console.warn(`⚠️ [APPOINTMENT] Failed to fetch slots for ${date}: ${response.status}`)
                    return []
                }

                const data = await response.json()

                if (data.available_slots && Array.isArray(data.available_slots)) {
                    // Map response format to AppointmentSlot format
                    return data.available_slots.map((s: any) => ({
                        start_time: `${date}T${s.start}:00`, // Ensure valid ISO format if strictly time
                        end_time: `${date}T${s.end}:00`,
                        service_id: 0, // Default or generic
                        service_name: 'Cita General', // Default
                        duration_minutes: s.duration_minutes || 60
                    }))
                }

                return []
            } catch (err) {
                console.error(`❌ [APPOINTMENT] Error fetching date ${date}:`, err)
                return []
            }
        })

        const results = await Promise.all(fetchPromises)

        // Flatten results
        results.forEach(slots => {
            allSlots.push(...slots)
        })

        return allSlots

    } catch (error) {
        console.error(`❌ [APPOINTMENT] Error fetching slots:`, error)
        return []
    }
}

/**
 * Formats appointment slots for AI context
 */
/**
 * Formats appointment slots for AI context
 */
export function formatAppointmentContext(slots: AppointmentSlot[], slug?: string): string {
    if (!slots || slots.length === 0) {
        let noSlotsMsg = '[CITAS] No hay horarios disponibles en los próximos días.'
        if (slug) {
            noSlotsMsg += `\nPuedes revisar disponibilidad completa aquí: [APPOINTMENT_CALENDAR_LINK]`
        }
        return noSlotsMsg
    }

    let context = '📅 [HORARIOS DISPONIBLES PARA CITAS]\n\n'

    // Agrupar por día
    const slotsByDay: Record<string, AppointmentSlot[]> = {}

    for (const slot of slots) {
        const date = new Date(slot.start_time)
        const dayKey = date.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })

        // Capitalizar primer letra
        const formattedDayKey = dayKey.charAt(0).toUpperCase() + dayKey.slice(1)

        if (!slotsByDay[formattedDayKey]) {
            slotsByDay[formattedDayKey] = []
        }
        slotsByDay[formattedDayKey].push(slot)
    }

    // Formatear por día con rangos
    const dayEntries = Object.entries(slotsByDay)
    // Limitar a los primeros 3 días para no saturar contexto
    const daysToShow = dayEntries.slice(0, 3)

    for (const [day, daySlots] of daysToShow) {
        context += `📆 ${day}:\n`

        // Ordenar slots por hora
        daySlots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        if (daySlots.length === 0) continue

        // Encontrar primer y último slot del día
        const firstSlot = daySlots[0]
        const lastSlot = daySlots[daySlots.length - 1]

        const startTime = new Date(firstSlot.start_time).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: true
        })

        const endTime = new Date(lastSlot.start_time).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: true
        })

        if (daySlots.length === 1) {
            context += `   • A las ${startTime}\n`
        } else {
            context += `   • Entre las ${startTime} y las ${endTime}\n`
        }

        context += '\n'
    }

    if (slug) {
        context += `🔗 Puedes ver el calendario completo y agendar aquí:\n[APPOINTMENT_CALENDAR_LINK]\n\n`
    }

    context += '📌 INSTRUCCIÓN IMPORTANTE:\n'
    context += 'Ofrece los horarios como RANGOS (ej: "tengo espacio entre las 10 y las 12").\n'
    context += 'Si el usuario pide una hora específica dentro del rango, verifica si está disponible o agenda al horario más cercano.\n'
    context += 'SIEMPRE incluye el enlace al calendario completo al final.\n'

    return context
}

/**
 * Creates an appointment and automatic reminders
 */
export async function createAppointment(
    supabase: SupabaseClient,
    params: CreateAppointmentParams,
    sendMessage: (remoteJid: string, text: string) => Promise<void>,
    contactPhone: string
): Promise<AppointmentResult> {
    try {
        console.log(`\n📅 [APPOINTMENT] Creating appointment...`)
        console.log(`   User: ${params.userId}`)
        console.log(`   Contact: ${params.contactId}`)
        console.log(`   Service: ${params.serviceId}`)
        console.log(`   Time: ${params.startTime}`)

        // ========================================================================
        // 1. GET SERVICE INFO (duration + name)
        // ========================================================================
        const { data: serviceData } = await supabase
            .from('products')
            .select('service_duration_minutes, product_name')
            .eq('id', params.serviceId)
            .single()

        const durationMinutes = serviceData?.service_duration_minutes || 60 // Default 60 min
        const serviceName = serviceData?.product_name || 'Servicio'

        // Calculate end_time
        const startTime = new Date(params.startTime)
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

        console.log(`⏱️ [APPOINTMENT] Service: ${serviceName}`)
        console.log(`   Duration: ${durationMinutes} minutes`)
        console.log(`   Start: ${params.startTime}`)
        console.log(`   End: ${endTime.toISOString()}`)

        // ========================================================================
        // 2. CREATE APPOINTMENT (with AI metadata)
        // ========================================================================
        const { data: appointment, error: createError } = await supabase
            .from('meetings')
            .insert({
                user_id: params.userId,
                contact_id: params.contactId,
                product_id: params.serviceId,
                start_time: params.startTime,
                end_time: endTime.toISOString(),
                status: 'confirmed',
                summary: 'Cita Agendada por IA',  // AI marker
                notes: params.notes ? `${params.notes} (Agendado automáticamente: ${serviceName})` : `Agendado automáticamente: ${serviceName}`,
                confirmation_status: 'confirmed'
            })
            .select()
            .single()

        if (createError) {
            console.error(`❌ [APPOINTMENT] Creation failed:`, createError)
            throw createError
        }

        console.log(`✅ [APPOINTMENT] Created appointment #${appointment.id}`)

        // ========================================================================
        // 2. CREATE AUTOMATIC REMINDERS
        // ========================================================================
        const appointmentTime = new Date(params.startTime)
        const now = new Date()

        // Recordatorio 24h antes (solo si la cita es en más de 24h)
        const twentyFourHoursBefore = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000)
        if (twentyFourHoursBefore > now) {
            await supabase.from('appointment_reminders').insert({
                meeting_id: appointment.id,
                reminder_time: twentyFourHoursBefore.toISOString(),
                reminder_type: '24h_before',
                status: 'pending'
            })
            console.log(`✅ [APPOINTMENT] 24h reminder scheduled`)
        }

        // Recordatorio 2h antes (solo si la cita es en más de 2h)
        const twoHoursBefore = new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000)
        if (twoHoursBefore > now) {
            await supabase.from('appointment_reminders').insert({
                meeting_id: appointment.id,
                reminder_time: twoHoursBefore.toISOString(),
                reminder_type: '2h_before',
                status: 'pending'
            })
            console.log(`✅ [APPOINTMENT] 2h reminder scheduled`)
        }

        // ========================================================================
        // 3. SEND CONFIRMATION TO CUSTOMER
        // ========================================================================
        const confirmationMsg =
            `✅ *Cita Confirmada*\n\n` +
            `📅 Fecha: ${appointmentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
            `🕐 Hora: ${appointmentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}\n` +
            `🔹 Servicio: ${serviceName}\n` +
            `⏱️ Duración: ${durationMinutes} minutos\n\n` +
            `Recibirás recordatorios antes de tu cita.\n` +
            `ID de cita: #${appointment.id}`

        await sendMessage(contactPhone + '@s.whatsapp.net', confirmationMsg)
        console.log(`✅ [APPOINTMENT] Confirmation sent to customer`)

        // ========================================================================
        // 4. NOTIFY OWNER (OPTIONAL)
        // ========================================================================
        const { data: profile } = await supabase
            .from('profiles')
            .select('contact_phone')
            .eq('id', params.userId)
            .single()

        if (profile?.contact_phone) {
            const { data: contact } = await supabase
                .from('contacts')
                .select('full_name, phone_number')
                .eq('id', params.contactId)
                .single()

            const ownerNotification =
                `📅 *Nueva Cita Agendada*\n\n` +
                `Cliente: ${contact?.full_name || contact?.phone_number}\n` +
                `Servicio: ${serviceName}\n` +
                `Fecha: ${appointmentTime.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}\n` +
                `Hora: ${appointmentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}\n` +
                `ID: #${appointment.id}`

            await sendMessage(profile.contact_phone + '@s.whatsapp.net', ownerNotification)
            console.log(`✅ [APPOINTMENT] Owner notified`)
        }

        return {
            success: true,
            appointmentId: appointment.id,
            serviceName: serviceName,  // Use the serviceName we fetched earlier
            startTime: params.startTime
        }

    } catch (error) {
        console.error(`❌ [APPOINTMENT] Error creating appointment:`, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Detects if the message contains an appointment request
 */
export function detectAppointmentIntent(text: string, context?: any): boolean {
    const lowerText = text.toLowerCase().trim()

    // 1. Palabras clave explícitas de cita
    const appointmentKeywords = /(?:cita|agendar|reservar|horario|turno|disponibilidad|agenda|appointment|schedule|book)/i
    if (appointmentKeywords.test(lowerText)) return true

    // 2. Si ya estamos hablando de citas (contexto activo), palabras de confirmación o fechas cuentan como intent
    if (context?.appointmentContext || context?.lastIntent === 'appointment_request') {
        const confirmationKeywords = /^(si|ok|va|dale|acepto|confirmo|claro|por favor|hazlo|que si|seguro)$/i
        const timeKeywords = /(mañana|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|alas|a las)/i

        if (confirmationKeywords.test(lowerText) || timeKeywords.test(lowerText)) {
            return true
        }

        // Si menciona un servicio y estamos en contexto de cita
        if (text.length < 50 && (lowerText.includes('corte') || lowerText.includes('color') || lowerText.includes('peinado'))) {
            return true
        }
    }

    return false
}

/**
 * ELINA V5 - Tool Implementations
 * 
 * Implementaciones de las herramientas disponibles para el agente
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface Product {
    id: number
    product_name: string
    price: string
    stock: number | null
    description: string | null
    enhanced_description?: string | null
    media_url: string | null
    faq?: any // jsonb array
    benefits?: string | null
    usage_instructions?: string | null
}

/**
 * Busca productos en el catálogo
 */
export async function buscarProductos(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    limit: number = 5
): Promise<Product[]> {
    console.log(`🔍 [TOOLS] Searching products: "${query}" (limit: ${limit})`)

    try {
        // Usar la función de búsqueda full-text mejorada
        // Esta función normaliza acentos y usa ts_rank_cd con pesos
        const { data, error } = await supabase
            .rpc('search_products_fulltext', {
                p_user_id: userId,
                p_query: query,
                p_limit: limit
            })

        if (error) {
            console.error(`❌ [TOOLS] Error searching products: ${error.message}`)
            return []
        }

        console.log(`✅ [TOOLS] Found ${data?.length || 0} products`)
        return (data || []) as Product[]

    } catch (error) {
        console.error(`❌ [TOOLS] Exception searching products:`, error)
        return []
    }
}

// Helper para convertir hora AM/PM a 24h
function convertTo24Hour(timeStr: string): string {
    const timeLower = timeStr.toLowerCase().trim()
    const isPM = timeLower.includes('pm')
    const isAM = timeLower.includes('am')

    // Si no tiene AM/PM, asumimos 24h pero normalizamos HH:mm
    if (!isPM && !isAM) {
        const [h, m] = timeStr.split(':')
        return `${h.padStart(2, '0')}:${m ? m.padStart(2, '0') : '00'}`
    }

    // Remover AM/PM y espacios
    const cleanTime = timeLower.replace('am', '').replace('pm', '').trim()
    let [hours, minutes] = cleanTime.split(':')

    let h = parseInt(hours, 10)
    const m = minutes ? parseInt(minutes, 10) : 0

    if (isPM && h < 12) h += 12
    if (isAM && h === 12) h = 0

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Agenda una cita en la base de datos
 */
export async function agendarCita(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    date: string,
    time: string,
    serviceId?: number,
    notes?: string
): Promise<{ success: boolean, appointmentId?: number, error?: string, message?: string }> {
    console.log(`📅 [TOOLS] Scheduling appointment for contact ${contactId} at ${date} ${time}`)

    try {
        // 1. Normalizar hora a 24h
        const time24 = convertTo24Hour(time)
        console.log(`   - Normalized time: ${time} -> ${time24}`)

        // 2. Construir timestamps
        // Nota: date debe ser YYYY-MM-DD
        const startDateTimeStr = `${date}T${time24}:00`
        const startTime = new Date(startDateTimeStr) // Debería funcionar en ISO

        if (isNaN(startTime.getTime())) {
            throw new Error(`Invalid date/time format: ${startDateTimeStr}`)
        }

        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Default 1 hora

        // 3. Insertar en meetings
        const { data, error } = await supabase
            .from('meetings')
            .insert({
                user_id: userId,
                contact_id: contactId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                confirmation_status: 'confirmed',
                reminder_sent: false,
                summary: 'Cita Agendada por IA',
                notes: notes || 'Agendado automáticamente',
                appointment_type_id: serviceId || null
            })
            .select('id')
            .single()

        if (error) {
            console.error(`❌ [TOOLS] Error creating appointment: ${error.message}`)
            return {
                success: false,
                error: `Error al guardar cita: ${error.message}`
            }
        }

        console.log(`✅ [TOOLS] Appointment created: ${data.id}`)
        return {
            success: true,
            appointmentId: data.id,
            message: `Cita agendada exitosamente para el ${date} a las ${time} (${time24})`
        }

    } catch (error) {
        console.error(`❌ [TOOLS] Exception creating appointment:`, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error inesperado al agendar.'
        }
    }
}

/**
 * Consulta la disponibilidad de horarios
 */
export async function consultarDisponibilidad(
    supabase: SupabaseClient,
    userId: string,
    date: string
): Promise<{ date: string, availableSlots: string[], busySlots: string[], workingHours: string }> {
    console.log(`📅 [TOOLS] Checking availability for ${date}`)

    try {
        // 1. Obtener citas del día
        const startOfDay = `${date}T00:00:00`
        const endOfDay = `${date}T23:59:59`

        const { data: meetings, error } = await supabase
            .from('meetings')
            .select('start_time, end_time')
            .eq('user_id', userId)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .neq('status', 'cancelled')

        if (error) {
            console.error(`❌ [TOOLS] Error checking availability: ${error.message}`)
            return { date, availableSlots: [], busySlots: [], workingHours: 'Error al consultar' }
        }

        // Convertir citas existentes a formato HH:mm (24h) para comparación interna
        const busySlots24 = (meetings || []).map((m: any) => {
            const d = new Date(m.start_time)
            // Ajustar a zona horaria si es necesario, pero aquí asumimos UTC en DB y comparamos relativo
            // Mejor extraer horas UTC y convertir a local si tuviéramos timezone
            // Por simplicidad, extraemos HH:mm del string ISO (¡CUIDADO CON TIMEZONE!)
            // La DB guarda en UTC. 
            // Si el usuario pide 5 PM, es 17:00 LOCAL.
            // Necesitamos saber el offset del usuario.
            // Asumiremos que start_time en DB ya está en UTC y el cliente maneja la visualización.
            // PERO la IA trabaja en texto.

            // HACK: Extraer la hora literal del string UTC y asumiendo que guardamos en UTC y leemos en UTC
            // NO. Si guardo '2026-02-11T17:00:00Z', es 17:00 UTC.
            // Si el usuario está en -06:00, son las 11:00 AM.
            // Esto es un lío de timezones.
            // Por ahora, simplifiquemos: Asumimos que la DB y el Usuario están alineados o usamos UTC.

            // Para "consultar disponibilidad", generamos slots locales (09:00 - 18:00).
            // Comparamos con las citas convertidas a local?

            // Vamos a usar simple string matching por ahora.
            return m.start_time.split('T')[1].substring(0, 5) // HH:mm
        })

        // 2. Generar slots disponibles (09:00 - 18:00)
        // Devolver en formato AM/PM para que el usuario sea feliz
        const workStart = 9
        const workEnd = 18
        const availableSlots: string[] = []
        const busySlotsDisplay: string[] = []

        for (let hour = workStart; hour < workEnd; hour++) {
            // Formato 24h para chequeo interno (match con busySlots si coincidieran)
            // Pero busySlots viene de DB UTC... 
            // Si guardamos sin timezone (timestamp without time zone), es literal.
            // Supabase usa timestamptz.

            // Vamos a simplificar: Asumimos que el slot está libre.
            // (La lógica real de busySlots requiere manejo serio de timezones que el código original no tenía).
            // Mantendré la lógica original simplificada pero devolviendo AM/PM.

            const time24 = `${hour.toString().padStart(2, '0')}:00`

            // Convertir a AM/PM para display
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const hour12 = hour > 12 ? hour - 12 : hour
            const timeDisplay = `${hour12}:00 ${ampm}`

            // Chequeo muy básico de colisión (mejorable)
            if (!busySlots24.includes(time24)) {
                availableSlots.push(timeDisplay)
            } else {
                busySlotsDisplay.push(timeDisplay)
            }
        }

        console.log(`✅ [TOOLS] Found ${availableSlots.length} available slots for ${date}`)

        return {
            date,
            availableSlots,
            busySlots: busySlotsDisplay,
            workingHours: "09:00 AM - 06:00 PM"
        }

    } catch (error) {
        console.error(`❌ [TOOLS] Exception checking availability:`, error)
        return { date, availableSlots: [], busySlots: [], workingHours: 'Error' }
    }
}

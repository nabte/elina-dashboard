/**
 * ELINA V5 - Message Buffer (Supabase Table)
 *
 * Agrupa múltiples mensajes consecutivos del mismo usuario en una sola respuesta.
 * Usa tabla message_buffer en Supabase para coordinar entre requests independientes.
 *
 * Flujo:
 * 1. Llega mensaje → INSERT en message_buffer
 * 2. Esperar BUFFER_WINDOW_MS
 * 3. Consultar si mi mensaje es el más reciente para este contacto
 *    - Sí → Tomar todos, DELETE, devolver texto combinado
 *    - No → Otro mensaje llegó después, retornar shouldProcess: false
 */

const BUFFER_WINDOW_MS = 4000 // 4 segundos para agrupar mensajes

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Agrega un mensaje al buffer y decide si procesar o esperar
 */
export async function bufferMessage(
    supabase: any,
    accountId: string,
    contactId: number,
    messageText: string
): Promise<{ shouldProcess: boolean; combinedText: string }> {

    // 1. Insertar mensaje en el buffer
    const { data: inserted, error: insertError } = await supabase
        .from('message_buffer')
        .insert({
            account_id: accountId,
            contact_id: contactId,
            message_text: messageText
        })
        .select('id, created_at')
        .single()

    if (insertError || !inserted) {
        console.error('❌ [BUFFER] Error inserting into buffer:', insertError)
        // Fallback: procesar el mensaje solo sin buffering
        return { shouldProcess: true, combinedText: messageText }
    }

    const myId = inserted.id
    console.log(`📥 [BUFFER] Message buffered (id: ${myId}), waiting ${BUFFER_WINDOW_MS}ms...`)

    // 2. Esperar la ventana de buffer
    await sleep(BUFFER_WINDOW_MS)

    // 3. Verificar si llegaron mensajes más recientes para este contacto
    const { data: latest, error: latestError } = await supabase
        .from('message_buffer')
        .select('id')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .order('id', { ascending: false })
        .limit(1)
        .single()

    if (latestError || !latest) {
        // Buffer fue limpiado por otro request, no procesar
        console.log(`⏭️ [BUFFER] Buffer already consumed by another request`)
        return { shouldProcess: false, combinedText: '' }
    }

    // Si mi mensaje NO es el más reciente, otro llegó después → no procesar
    if (latest.id !== myId) {
        console.log(`⏭️ [BUFFER] Newer message exists (my: ${myId}, latest: ${latest.id}), skipping`)
        return { shouldProcess: false, combinedText: '' }
    }

    // 4. Soy el más reciente → tomar todos los mensajes y procesarlos
    const { data: allMessages, error: fetchError } = await supabase
        .from('message_buffer')
        .select('id, message_text, created_at')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true })

    if (fetchError || !allMessages || allMessages.length === 0) {
        console.error('❌ [BUFFER] Error fetching buffered messages:', fetchError)
        return { shouldProcess: true, combinedText: messageText }
    }

    // 5. Combinar todos los mensajes
    const combinedText = allMessages
        .map((m: any) => m.message_text)
        .join('\n')

    // 6. Limpiar el buffer para este contacto
    const ids = allMessages.map((m: any) => m.id)
    const { error: deleteError } = await supabase
        .from('message_buffer')
        .delete()
        .in('id', ids)

    if (deleteError) {
        console.error('⚠️ [BUFFER] Error cleaning buffer (non-critical):', deleteError)
    }

    console.log(`✅ [BUFFER] Combined ${allMessages.length} messages into one`)
    return { shouldProcess: true, combinedText }
}

/**
 * Limpia mensajes viejos del buffer (seguridad, llamar periódicamente)
 */
export async function cleanOldBuffers(supabase: any): Promise<number> {
    const cutoff = new Date(Date.now() - 60000).toISOString() // 60 segundos
    const { data, error } = await supabase
        .from('message_buffer')
        .delete()
        .lt('created_at', cutoff)
        .select('id')

    if (error) {
        console.error('⚠️ [BUFFER] Error cleaning old buffers:', error)
        return 0
    }
    return data?.length || 0
}

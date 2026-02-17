
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) {
            throw new Error('Unauthorized')
        }

        const { query, history = [] } = await req.json()

        // 1. Generate embedding for query
        const embeddingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embedding-with-cache`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ text: query })
        })
        const { embedding } = await embeddingResponse.json()

        // Fix: Ensure embedding is a proper array of numbers, not a string or stringified JSON
        let query_embedding = embedding

        // Robust parsing: sometimes embedding comes stringified multiple times or as stringified array
        if (typeof query_embedding === 'string') {
            try {
                // First parse
                query_embedding = JSON.parse(query_embedding)

                // If it's still a string (double stringified), parse again
                if (typeof query_embedding === 'string') {
                    query_embedding = JSON.parse(query_embedding)
                }
            } catch (e) {
                console.error('Error parsing embedding string:', e)
            }
        }

        // 2. Fetch Real-time Business Data (Parallel)
        const [
            { data: profile },
            { data: apptSettings },
            { data: upcomingMeetings },
            { data: recentChats },
            { data: workHours }
        ] = await Promise.all([
            supabaseClient.from('profiles').select('company_description, business_address, business_phone').eq('id', user.id).single(),
            supabaseClient.from('appointment_settings').select('is_enabled, calendar_type, unavailable_dates').eq('user_id', user.id).single(),
            supabaseClient.from('meetings')
                .select('start_time, end_time, status, summary, contact_id')
                .eq('user_id', user.id)
                .neq('status', 'cancelled') // Fix: Don't show cancelled meetings
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(5),
            supabaseClient.from('chat_history')
                .select('message_type, content, created_at, contact_id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20),
            supabaseClient.from('appointment_hours').select('day_of_week, start_time, end_time, is_available').eq('user_id', user.id)
        ])

        // 3. Search for relevant context in Business Knowledge
        const { data: chunks, error: matchError } = await supabaseClient.rpc('match_knowledge_embeddings', {
            query_embedding: query_embedding,
            match_threshold: 0.7,
            match_count: 5
        })

        if (matchError) throw matchError

        // Helper to format days
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const hoursText = workHours
            ? workHours.filter(h => h.is_available).map(h => `${days[h.day_of_week]}: ${h.start_time}-${h.end_time}`).join(', ')
            : 'No configurado';

        // 4. Construct System Prompt
        let systemPrompt = `Eres Elina, la asistente IA de este negocio.
    ESTÁS HABLANDO CON EL DUEÑO DEL NEGOCIO (Admin).
    
    Tus funciones:
    1. Responder preguntas sobre el negocio usando RAG y datos en tiempo real.
    2. Consultar la agenda para informar disponibilidad.
    
    DATOS EN TIEMPO REAL:
    - Estado Agenda: ${apptSettings?.is_enabled ? 'ACTIVA' : 'INACTIVA'}
    - Horarios de Trabajo: ${hoursText}
    - Próximas Citas (Máx 5): ${upcomingMeetings?.length > 0
                ? upcomingMeetings.map(m => `\n      * ${new Date(m.start_time).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (${m.status}): ${m.summary || 'Sin título'}`).join('')
                : 'No hay citas próximas.'}
    - Días Bloqueados Manualmente: ${apptSettings?.unavailable_dates?.join(', ') || 'Ninguno'}
    
    REGLAS IMPORTANTES:
    1. **CAPACIDAD TÉCNICA (IMPORTANTE):** Actualmente eres una interfaz de consulta. **NO TIENES PERMISOS PARA ESCRIBIR EN LA BASE DE DATOS (Crear/Editar/Borrar citas)**.
       - Si el usuario te pide agendar, dile: "Entendido, pero en este chat solo puedo consultar información. Por favor, realiza el agendamiento manualmente en el calendario o usa el bot de WhatsApp para agendar."
       - **JAMÁS digas "He agendado la cita"** porque estarías mintiendo.
    
    2. **REPORTAR CONFLICTOS:**
       - Si te preguntan por un horario, SOLO menciona citas que se SOLAPEN con ese horario específico.
       - NO menciones citas de otras horas o días a menos que te pregunten explícitamente "qué más hay ese día".
       - Se directo y conciso.

    ÚLTIMAS INTERACCIONES CON CLIENTES:
    ${recentChats?.length > 0
                ? recentChats.reverse().map(c => `[${new Date(c.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}] ${c.message_type === 'human' ? 'Cliente' : 'IA'}: ${c.content?.substring(0, 100)}...`).join('\n')
                : 'N/A'}

    CONTEXTO RAG:
    ${chunks?.map(c => `- ${c.content} (Fuente: ${c.file_name})`).join('\n') || 'Sin info extra.'}
    
    HISTORIAL DE CHAT:
    ${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    `

        // 5. Generate Answer using LLM
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.5
            })
        })

        const aiData = await openAiResponse.json()
        const aiAnswer = aiData.choices[0].message.content

        // 6. Save interaction history
        await supabaseClient.from('assistant_chat_history').insert({
            user_id: user.id,
            role: 'user',
            content: query,
            context_type: chunks?.length > 0 ? 'business' : 'app',
            created_at: new Date().toISOString()
        })

        await supabaseClient.from('assistant_chat_history').insert({
            user_id: user.id,
            role: 'assistant',
            content: aiAnswer,
            context_type: chunks?.length > 0 ? 'business' : 'app',
            sources: chunks?.map(c => c.file_name) || [],
            created_at: new Date().toISOString()
        })

        return new Response(JSON.stringify({
            answer: aiAnswer,
            sources: chunks?.map(c => c.file_name) || []
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})

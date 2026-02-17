import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, message, draft_prompt } = await req.json()

        if (!user_id || !message) {
            throw new Error('user_id and message are required')
        }

        const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

        // 1. Obtener perfil del usuario para el contexto del negocio
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single()

        if (profileError) throw profileError

        // 2. Obtener prompt oficial si no viene un borrador
        let promptContent = draft_prompt
        if (!promptContent) {
            const { data: promptData } = await supabase
                .from('prompts')
                .select('prompt_content')
                .eq('user_id', user_id)
                .single()
            promptContent = promptData?.prompt_content || ''
        }

        // 3. Obtener ejemplos de entrenamiento (Good/Bad examples)
        const { data: trainingExamples } = await supabase
            .from('training_examples')
            .select('user_message, ai_response, is_good_example')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(10)

        const examplesText = trainingExamples && trainingExamples.length > 0
            ? trainingExamples.map((ex: any) =>
                `### ${ex.is_good_example ? 'EJEMPLO BUENO (Sigue este estilo)' : 'EJEMPLO MALO (Evita esto)'}\nCliente: ${ex.user_message}\nIA: ${ex.ai_response}`
            ).join('\n\n')
            : 'No hay ejemplos de entrenamiento específicos aún.'

        // 4. Construir el System Message
        const businessInfo = [
            profile.website ? `- Sitio Web: ${profile.website}` : '',
            profile.social_media?.instagram ? `- Instagram: ${profile.social_media.instagram}` : '',
            profile.social_media?.facebook ? `- Facebook: ${profile.social_media.facebook}` : '',
            profile.company_description ? `- Descripción: ${profile.company_description}` : '',
            (profile.work_start_hour && profile.work_end_hour) ? `- Horario de atención: ${profile.work_start_hour}hrs a ${profile.work_end_hour}hrs` : '',
            profile.business_address ? `- Dirección: ${profile.business_address}` : '',
            profile.business_phone ? `- Teléfono: ${profile.business_phone}` : '',
            profile.pickup_location ? `- Ubicación de recogida: ${profile.pickup_location}` : ''
        ].filter((line: string) => line !== '').join('\n')

        const systemMessage = `Eres ELINA IA, una asistente virtual de WhatsApp. Tu objetivo es automatizar la atención a clientes, generar ventas y agendar citas.

**CONTEXTO DEL NEGOCIO (Personalizado):**
${promptContent}

**INFORMACIÓN DE LA EMPRESA:**
${businessInfo}

**EJEMPLOS DE ENTRENAMIENTO (BASADOS EN TUS FEEDBACKS):**
${examplesText}

### 🚨 REGLA CRÍTICA: NO INVENTAR DATOS 🚨
- Si NO tienes un dato disponible arriba, NO lo menciones ni lo inventes.
- Tono: Breve, claro y amigable. Usa emojis. Máximo 4 líneas de texto conversacional.
- Si el usuario te pide algo que requiere integración técnica, di: "Un humano te puede ayudar con eso."`

        // 5. Llamar a OpenAI
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: message }
                ],
                temperature: 0.7
            })
        })

        const openaiData = await openaiRes.json()
        if (!openaiRes.ok) throw new Error(openaiData.error?.message || 'Error calling OpenAI')

        const aiResponse = openaiData.choices[0].message.content

        return new Response(JSON.stringify({
            success: true,
            content: aiResponse,
            simulation: true
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

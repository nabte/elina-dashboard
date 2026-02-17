import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { test_message } = await req.json()

        // Simular mensaje ENTRANTE desde 5219995169313 hacia Nabte (5219993895046)
        const FROM_USER = '5219995169313@s.whatsapp.net'  // Tu celular
        const TO_BOT = '5219993895046@s.whatsapp.net'     // Nabte bot
        const INSTANCE = 'Nabte'

        console.log(`📱 Simulando mensaje de ${FROM_USER} hacia bot ${TO_BOT}`)
        console.log(`💬 Mensaje: "${test_message}"`)

        // Payload que Evolution API enviaría al webhook
        const webhookPayload = {
            instance: INSTANCE,
            data: {
                key: {
                    remoteJid: FROM_USER,  // Quien envía (tu celular)
                    fromMe: false,         // NO es del bot
                    id: `TEST_${Date.now()}`
                },
                pushName: 'Test User',
                message: {
                    conversation: test_message
                },
                messageType: 'conversation',
                messageTimestamp: Math.floor(Date.now() / 1000)
            }
        }

        console.log('📤 Enviando a process-chat-message...')

        // Llamar a process-chat-message
        const processUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-chat-message`

        const processResponse = await fetch(processUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
            },
            body: JSON.stringify(webhookPayload)
        })

        const processResult = await processResponse.json()

        console.log('📥 Respuesta:', JSON.stringify(processResult, null, 2))

        if (!processResponse.ok) {
            throw new Error(`Error: ${JSON.stringify(processResult)}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                test_message,
                from: FROM_USER,
                to: TO_BOT,
                process_response: processResult,
                status: '✅ Mensaje procesado. El bot debería responder a 5219995169313 en 20-30 segundos'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('❌ Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

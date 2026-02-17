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
        const { test_message, instance_name } = await req.json()

        const INSTANCE = instance_name || 'Nabte'
        const TEST_PHONE = '5219995169313@s.whatsapp.net'

        console.log(`🧪 Iniciando prueba directa para: ${test_message}`)

        // 1. Llamar a process-chat-message directamente
        const processUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-chat-message`

        const payload = {
            instance: INSTANCE,
            data: {
                key: {
                    remoteJid: TEST_PHONE,
                    fromMe: false,
                    id: `TEST_${Date.now()}`
                },
                message: {
                    conversation: test_message
                },
                messageType: 'conversation',
                pushName: 'Test User'
            }
        }

        console.log('📤 Enviando a process-chat-message...')
        console.log('Payload:', JSON.stringify(payload, null, 2))

        const processResponse = await fetch(processUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
            },
            body: JSON.stringify(payload)
        })

        const processResult = await processResponse.json()

        console.log('📥 Respuesta de process-chat-message:', JSON.stringify(processResult, null, 2))

        if (!processResponse.ok) {
            throw new Error(`process-chat-message error: ${JSON.stringify(processResult)}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                test_message,
                process_response: processResult,
                status: 'Mensaje procesado. Verifica WhatsApp 5219995169313 en 20-30 segundos'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('❌ Error en test directo:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

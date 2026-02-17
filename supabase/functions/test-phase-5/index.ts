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
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const { test_type, instance_name } = await req.json()

        // Número de prueba
        const TEST_PHONE = '5219995169313@s.whatsapp.net'

        // Obtener configuración del perfil
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('evolution_instance_name', instance_name || 'ELINA')
            .single()

        if (profileError || !profile) {
            throw new Error(`Perfil no encontrado: ${profileError?.message}`)
        }

        const evolutionApiKey = profile.evolution_api_key
        const evolutionApiUrl = profile.evolution_api_url || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host'

        // Función para enviar mensaje
        async function sendTestMessage(message: string) {
            const response = await fetch(`${evolutionApiUrl}/message/sendText/${instance_name || 'ELINA'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionApiKey
                },
                body: JSON.stringify({
                    number: TEST_PHONE,
                    text: message,
                    delay: 1200
                })
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Evolution API error: ${error}`)
            }

            return await response.json()
        }

        let testMessage = ''
        let testDescription = ''

        // Seleccionar mensaje según tipo de prueba
        switch (test_type) {
            case 'capabilities':
                testMessage = '🧪 TEST CAPABILITIES: hola'
                testDescription = 'Prueba de detección de capabilities del negocio'
                break

            case 'product_inquiry':
                testMessage = '🧪 TEST INTENT: qué productos tienes?'
                testDescription = 'Prueba de detección de intención product_inquiry'
                break

            case 'search_products':
                testMessage = '🧪 TEST TOOL: busca toner hp'
                testDescription = 'Prueba de ejecución de herramienta search_products'
                break

            case 'memory_reference':
                testMessage = '🧪 TEST MEMORY: cuánto cuesta?'
                testDescription = 'Prueba de memoria (debe recordar "toner hp")'
                break

            case 'memory_context':
                testMessage = '🧪 TEST MEMORY: y ese toner tiene garantía?'
                testDescription = 'Prueba de contexto conversacional'
                break

            case 'appointment':
                testMessage = '🧪 TEST INTENT: quiero agendar una cita'
                testDescription = 'Prueba de detección de appointment_request'
                break

            case 'quote':
                testMessage = '🧪 TEST INTENT: necesito una cotización'
                testDescription = 'Prueba de detección de quote_request'
                break

            case 'custom':
                const { custom_message } = await req.json()
                testMessage = `🧪 TEST CUSTOM: ${custom_message}`
                testDescription = 'Prueba personalizada'
                break

            default:
                testMessage = '🧪 TEST: hola'
                testDescription = 'Prueba básica'
        }

        // Enviar mensaje de prueba
        console.log(`Enviando prueba: ${testDescription}`)
        console.log(`Mensaje: ${testMessage}`)

        const result = await sendTestMessage(testMessage)

        return new Response(
            JSON.stringify({
                success: true,
                test_type,
                test_description: testDescription,
                message_sent: testMessage,
                phone: TEST_PHONE,
                evolution_response: result,
                next_steps: 'Espera 20-30 segundos y verifica la respuesta en WhatsApp 5219995169313'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Error en test:', error)
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

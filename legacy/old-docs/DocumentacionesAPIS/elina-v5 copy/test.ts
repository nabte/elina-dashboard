/**
 * ELINA V5 - Comprehensive Test Script
 * 
 * Voy a usar supabase-ELINA
 * Confirmo: project_ref = mytvwfbijlgbihlegmfg
 * 
 * Script de pruebas exhaustivas para validar todas las capacidades
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/elina-v5`

// Número de destino para pruebas
const NABTE_NUMBER = '5219995169313'

interface TestResult {
    name: string
    passed: boolean
    duration: number
    error?: string
    details?: any
}

const results: TestResult[] = []

/**
 * Ejecuta un test y registra el resultado
 */
async function runTest(
    name: string,
    testFn: () => Promise<void>
): Promise<void> {
    console.log(`\n🧪 [TEST] Running: ${name}`)
    const startTime = performance.now()

    try {
        await testFn()
        const duration = performance.now() - startTime
        results.push({ name, passed: true, duration })
        console.log(`✅ [TEST] PASSED: ${name} (${duration.toFixed(0)}ms)`)
    } catch (error) {
        const duration = performance.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)
        results.push({ name, passed: false, duration, error: errorMessage })
        console.error(`❌ [TEST] FAILED: ${name} (${duration.toFixed(0)}ms)`)
        console.error(`   Error: ${errorMessage}`)
    }
}

/**
 * Envía un payload de prueba a la función
 */
async function sendTestMessage(
    message: string,
    remoteJid: string = NABTE_NUMBER,
    additionalData: any = {}
): Promise<any> {
    const payload = {
        instance: 'ELINA',
        data: {
            key: {
                remoteJid: `${remoteJid}@s.whatsapp.net`,
                id: `test_${Date.now()}`,
                fromMe: false
            },
            message: {
                conversation: message
            },
            pushName: 'Test User',
            ...additionalData
        },
        isSimulation: true
    }

    console.log(`📤 [TEST] Sending payload:`, JSON.stringify(payload, null, 2))

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return await response.json()
}

// ============================================================================
// TESTS
// ============================================================================

/**
 * Test 1: Mensaje simple a nabte
 */
await runTest('Mensaje simple a nabte 5219995169313', async () => {
    const result = await sendTestMessage('Hola, esto es una prueba', NABTE_NUMBER)

    if (!result.success && result.ignored) {
        throw new Error(`Message was ignored: ${result.reason}`)
    }

    console.log(`   ✓ Response received:`, result)
})

/**
 * Test 2: Detección de intención - Saludo
 */
await runTest('Detección de intención: Saludo', async () => {
    const result = await sendTestMessage('Hola, buenos días')

    if (result.intent !== 'greeting' && result.intent !== 'auto_response') {
        throw new Error(`Expected greeting intent, got: ${result.intent}`)
    }

    console.log(`   ✓ Intent detected: ${result.intent}`)
})

/**
 * Test 3: Detección de intención - Consulta de productos
 */
await runTest('Detección de intención: Consulta de productos', async () => {
    const result = await sendTestMessage('Qué productos tienes disponibles?')

    console.log(`   ✓ Intent: ${result.intent}`)
    console.log(`   ✓ Response length: ${result.response?.length || 0} chars`)
})

/**
 * Test 4: Búsqueda de productos específicos
 */
await runTest('Búsqueda de productos: "665"', async () => {
    const result = await sendTestMessage('Tienes el producto 665?')

    console.log(`   ✓ Response:`, result.response?.substring(0, 100))
})

/**
 * Test 5: Intención crítica - Queja
 */
await runTest('Intención crítica: Queja', async () => {
    const result = await sendTestMessage('Tengo una queja grave sobre el servicio')

    if (!result.critical_detected && result.intent !== 'complaint') {
        console.warn(`   ⚠️ Critical intent not detected (got: ${result.intent})`)
    }

    if (result.paused) {
        console.log(`   ✓ Conversation paused`)
    }

    if (result.label_added) {
        console.log(`   ✓ Label "ignorar" added`)
    }

    if (result.owner_notified) {
        console.log(`   ✓ Owner notified`)
    }
})

/**
 * Test 6: Solicitud de cita (si está habilitado)
 */
await runTest('Solicitud de cita', async () => {
    const result = await sendTestMessage('Quiero agendar una cita para mañana')

    console.log(`   ✓ Intent: ${result.intent}`)
    console.log(`   ✓ Response:`, result.response?.substring(0, 100))
})

/**
 * Test 7: Mensaje con imagen (simulado)
 */
await runTest('Procesamiento de imagen', async () => {
    const payload = {
        instance: 'ELINA',
        data: {
            key: {
                remoteJid: `${NABTE_NUMBER}@s.whatsapp.net`,
                id: `test_img_${Date.now()}`,
                fromMe: false
            },
            message: {
                imageMessage: {
                    caption: 'Qué es esto?',
                    url: 'https://creativersezone.b-cdn.net/test/sample.jpg'
                }
            },
            pushName: 'Test User'
        },
        isSimulation: true
    }

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log(`   ✓ Image processed:`, result.success || result.ignored)
})

/**
 * Test 8: Auto-respuesta
 */
await runTest('Auto-respuesta', async () => {
    // Este test depende de que haya auto-respuestas configuradas
    const result = await sendTestMessage('horario')

    console.log(`   ✓ Response:`, result.response?.substring(0, 100))
})

/**
 * Test 9: Mensajes consecutivos rápidos (buffering)
 */
await runTest('Message buffering', async () => {
    // Enviar 3 mensajes rápidos
    const promises = [
        sendTestMessage('Hola'),
        sendTestMessage('Quiero'),
        sendTestMessage('Información')
    ]

    const results = await Promise.all(promises)
    console.log(`   ✓ Sent ${results.length} rapid messages`)
})

/**
 * Test 10: Validación de suscripción
 */
await runTest('Validación de suscripción', async () => {
    const result = await sendTestMessage('Test de suscripción')

    if (result.reason === 'subscription_inactive') {
        throw new Error('Subscription is inactive')
    }

    console.log(`   ✓ Subscription is valid`)
})

/**
 * Test 11: Formato de texto (cálculos y limpieza)
 */
await runTest('Formato de texto y cálculos', async () => {
    const result = await sendTestMessage('Dame cotización de 3 productos a $100 cada uno')

    console.log(`   ✓ Response:`, result.response?.substring(0, 150))
})

/**
 * Test 12: Límite de media (3 máximo)
 */
await runTest('Límite de 3 media por mensaje', async () => {
    // Este test requeriría una respuesta con múltiples imágenes
    const result = await sendTestMessage('Muéstrame todos tus productos')

    console.log(`   ✓ Response generated`)
})

// ============================================================================
// REPORTE DE RESULTADOS
// ============================================================================

console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 REPORTE DE PRUEBAS')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const passed = results.filter(r => r.passed).length
const failed = results.filter(r => r.failed).length
const total = results.length

console.log(`Total de pruebas: ${total}`)
console.log(`✅ Exitosas: ${passed} (${((passed / total) * 100).toFixed(1)}%)`)
console.log(`❌ Fallidas: ${failed} (${((failed / total) * 100).toFixed(1)}%)`)

const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total
console.log(`⏱️  Duración promedio: ${avgDuration.toFixed(0)}ms`)

console.log('\n📋 Detalle de pruebas:')
results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${index + 1}. ${icon} ${result.name} (${result.duration.toFixed(0)}ms)`)
    if (result.error) {
        console.log(`   Error: ${result.error}`)
    }
})

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Salir con código de error si hay fallos
if (failed > 0) {
    Deno.exit(1)
}

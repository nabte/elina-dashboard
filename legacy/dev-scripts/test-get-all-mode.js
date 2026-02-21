/**
 * TEST REAL - Modo Get All
 * Este script hace llamadas HTTP reales a la Edge Function
 * simulando webhooks de Evolution API
 */

const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

const TEST_PHONE = '5219995555555'; // Número de prueba
const TEST_INSTANCE = 'elina26'; // Nombre de instancia

// Colores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log('\n' + '='.repeat(60), 'cyan');
    log(title, 'bright');
    log('='.repeat(60), 'cyan');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crear un flow de prueba en modo GET_ALL
 */
async function createTestFlow() {
    logSection('📝 Creando Flow de Prueba en Modo GET_ALL');

    const flowData = {
        id: 'flow_test_get_all',
        mode: 'get_all',
        trigger_keywords: ['test get all', 'prueba ia'],
        recommended_products: [],
        steps: [
            {
                id: 'step_1',
                type: 'question',
                content: '¿Cuál es tu nombre?',
                variable: 'nombre',
                validation: { type: 'text' },
                next_step: 'step_2'
            },
            {
                id: 'step_2',
                type: 'question',
                content: '¿Qué edad tienes?',
                variable: 'edad',
                validation: { type: 'number' },
                next_step: 'step_3'
            },
            {
                id: 'step_3',
                type: 'question',
                content: '¿De qué ciudad eres?',
                variable: 'ciudad',
                validation: { type: 'text' },
                next_step: 'step_4'
            },
            {
                id: 'step_4',
                type: 'question',
                content: '¿Qué te gusta hacer?',
                variable: 'hobby',
                validation: { type: 'text' },
                next_step: 'step_5'
            },
            {
                id: 'step_5',
                type: 'message',
                content: '¡Genial {{nombre}}! Tienes {{edad}} años, vives en {{ciudad}} y te gusta {{hobby}}. ¡Gracias por compartir!',
                next_step: null
            }
        ],
        variables: {}
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/auto_responses`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            user_id: 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f', // nabte
            trigger_text: 'test get all, prueba ia',
            response_text: 'Flow de prueba GET_ALL',
            is_active: true,
            is_flow: true,
            flow_data: flowData
        })
    });

    if (!response.ok) {
        const error = await response.text();
        log(`❌ Error creando flow: ${error}`, 'red');
        return null;
    }

    const created = await response.json();
    log(`✅ Flow creado con ID: ${created[0].id}`, 'green');
    return created[0].id;
}

/**
 * Simular webhook de Evolution API
 */
async function sendWebhookMessage(message, imageUrl = null) {
    const messageId = `TEST_${Date.now()}`;

    const payload = {
        instance: TEST_INSTANCE,
        data: {
            key: {
                remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
                fromMe: false,
                id: messageId
            },
            pushName: 'Usuario Test',
            message: imageUrl ? {
                imageMessage: {
                    caption: message,
                    url: imageUrl
                }
            } : {
                conversation: message
            }
        }
    };

    log(`\n📤 Enviando: "${message}"`, 'yellow');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-flow-engine-v10`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    log(`📥 Respuesta:`, 'cyan');
    console.log(JSON.stringify(result, null, 2));

    return result;
}

/**
 * Limpiar flow de prueba
 */
async function cleanupTestFlow(flowId) {
    logSection('🧹 Limpiando Flow de Prueba');

    // Eliminar flow
    await fetch(`${SUPABASE_URL}/rest/v1/auto_responses?id=eq.${flowId}`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    // Eliminar estados de flow
    await fetch(`${SUPABASE_URL}/rest/v1/flow_states?contact_phone=like.*${TEST_PHONE}*`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    log('✅ Limpieza completada', 'green');
}

/**
 * TEST 1: Usuario da toda la información de una vez
 */
async function test1_AllFieldsAtOnce() {
    logSection('TEST 1: Usuario da toda la información de una vez');
    log('Objetivo: IA debe extraer todos los campos y completar el flow', 'blue');

    const result = await sendWebhookMessage(
        'Hola! Soy Juan, tengo 28 años, vivo en Mérida y me gusta programar'
    );

    await sleep(2000);

    log('\n✓ Esperado: completion_percentage = 100%, flow completo', 'green');
    if (result.completion_percentage === 100 || result.status === 'completed') {
        log('✅ PASS: Todos los campos extraídos correctamente', 'green');
    } else {
        log(`⚠️ FAIL: Solo ${result.completion_percentage}% completado`, 'red');
        log(`Campos faltantes: ${result.missing_fields?.join(', ')}`, 'yellow');
    }
}

/**
 * TEST 2: Usuario da información parcial
 */
async function test2_PartialFields() {
    logSection('TEST 2: Usuario da información parcial');
    log('Objetivo: IA extrae campos parciales, pregunta por faltantes', 'blue');

    // Primera respuesta - parcial
    const result1 = await sendWebhookMessage(
        'Me llamo Ana y tengo 25 años'
    );

    await sleep(2000);

    log('\n✓ Esperado: Extrae nombre y edad, pregunta por ciudad y hobby', 'green');
    if (result1.missing_fields?.includes('ciudad') && result1.missing_fields?.includes('hobby')) {
        log('✅ PASS: Campos faltantes identificados correctamente', 'green');
    } else {
        log('⚠️ FAIL: No se identificaron campos faltantes correctos', 'red');
    }

    await sleep(2000);

    // Segunda respuesta - resto de campos
    const result2 = await sendWebhookMessage(
        'Vivo en Cancún y me encanta nadar'
    );

    await sleep(2000);

    log('\n✓ Esperado: Extrae ciudad y hobby, completa el flow', 'green');
    if (result2.completion_percentage === 100 || result2.status === 'completed') {
        log('✅ PASS: Flow completado exitosamente', 'green');
    } else {
        log('⚠️ FAIL: Flow no se completó', 'red');
    }
}

/**
 * TEST 3: Usuario da información en desorden
 */
async function test3_UnorderedFields() {
    logSection('TEST 3: Usuario da información en desorden');
    log('Objetivo: IA extrae campos aunque estén en desorden', 'blue');

    const result = await sendWebhookMessage(
        'Me gusta bailar, tengo 32 años, me llamo Carlos y soy de Playa del Carmen'
    );

    await sleep(2000);

    log('\n✓ Esperado: Extrae todos los campos a pesar del desorden', 'green');
    if (result.completion_percentage === 100 || result.status === 'completed') {
        log('✅ PASS: Todos los campos extraídos correctamente', 'green');
    } else {
        log(`⚠️ FAIL: Solo ${result.completion_percentage}% completado`, 'red');
    }
}

/**
 * TEST 4: Usuario envía información con imagen
 */
async function test4_WithImage() {
    logSection('TEST 4: Usuario envía información con imagen');
    log('Objetivo: IA procesa texto + imagen correctamente', 'blue');

    const result = await sendWebhookMessage(
        'Soy Laura, 30 años, Mérida',
        'https://example.com/imagen.jpg'
    );

    await sleep(2000);

    log('\n✓ Esperado: Extrae campos del texto e identifica imagen', 'green');
    if (result.completion_percentage >= 75) {
        log('✅ PASS: Información extraída correctamente', 'green');
    } else {
        log('⚠️ FAIL: No se procesó correctamente', 'red');
    }
}

/**
 * TEST 5: Pregunta fuera de contexto
 */
async function test5_OutOfContext() {
    logSection('TEST 5: Pregunta fuera de contexto durante flow');
    log('Objetivo: Sistema detecta pregunta fuera de contexto y pausa', 'blue');

    // Iniciar flow
    await sendWebhookMessage('test get all');
    await sleep(2000);

    // Pregunta fuera de contexto
    const result = await sendWebhookMessage(
        '¿Cuánto cuesta un tatuaje?'
    );

    await sleep(2000);

    log('\n✓ Esperado: status = OUT_OF_CONTEXT, flow pausado', 'green');
    if (result.status === 'OUT_OF_CONTEXT') {
        log('✅ PASS: Pregunta fuera de contexto detectada', 'green');
    } else {
        log('⚠️ FAIL: No se detectó pregunta fuera de contexto', 'red');
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    log('\n🚀 INICIANDO TESTS REALES - MODO GET_ALL', 'bright');
    log('Edge Function: smart-flow-engine-v10', 'cyan');
    log('Proyecto: mytvwfbijlgbihlegmfg', 'cyan');
    log('\n⚠️  Estos son tests reales que llamarán a la Edge Function desplegada\n', 'yellow');

    try {
        // Crear flow de prueba
        const flowId = await createTestFlow();
        if (!flowId) {
            log('❌ No se pudo crear el flow de prueba. Abortando.', 'red');
            return;
        }

        await sleep(3000);

        // Ejecutar tests
        await test1_AllFieldsAtOnce();
        await sleep(3000);

        // Limpiar estado antes del siguiente test
        await cleanupTestFlow(flowId);
        await createTestFlow();
        await sleep(3000);

        await test2_PartialFields();
        await sleep(3000);

        await cleanupTestFlow(flowId);
        await createTestFlow();
        await sleep(3000);

        await test3_UnorderedFields();
        await sleep(3000);

        await cleanupTestFlow(flowId);
        await createTestFlow();
        await sleep(3000);

        await test4_WithImage();
        await sleep(3000);

        await cleanupTestFlow(flowId);
        await createTestFlow();
        await sleep(3000);

        await test5_OutOfContext();

        // Limpieza final
        await sleep(3000);
        await cleanupTestFlow(flowId);

        logSection('📊 RESUMEN DE TESTS');
        log('Todos los tests completados. Revisa los resultados arriba.', 'green');
        log('\n📝 Siguiente paso: Revisar logs en Supabase Dashboard', 'cyan');
        log('URL: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs/edge-functions', 'cyan');

    } catch (error) {
        log(`\n❌ ERROR CRÍTICO: ${error.message}`, 'red');
        console.error(error);
    }
}

// Ejecutar
runAllTests();

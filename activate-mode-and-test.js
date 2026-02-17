/**
 * Activar modo GET_ALL y ejecutar tests
 */

const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

const TEST_PHONE = '5219995169313'; // nabte
const TEST_INSTANCE = 'elina26';

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
    log('\n' + '='.repeat(70), 'cyan');
    log(title, 'bright');
    log('='.repeat(70), 'cyan');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Activar modo get_all en flow
 */
async function activateGetAllMode() {
    logSection('🔧 Activando Modo GET_ALL en Flow de Tatuajes');

    // Primero obtener el flow actual
    const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/auto_responses?id=eq.5&select=*`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    const flows = await getResponse.json();
    if (flows.length === 0) {
        log('❌ Flow ID 5 no encontrado', 'red');
        return false;
    }

    const flow = flows[0];
    log(`📋 Flow actual: "${flow.trigger_text}"`, 'cyan');
    log(`   Modo actual: ${flow.flow_data?.mode || 'step_by_step'}`, 'yellow');

    // Actualizar a get_all
    const updatedFlowData = {
        ...flow.flow_data,
        mode: 'get_all'
    };

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/auto_responses?id=eq.5`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            flow_data: updatedFlowData
        })
    });

    if (!updateResponse.ok) {
        log(`❌ Error: ${await updateResponse.text()}`, 'red');
        return false;
    }

    log('✅ Modo GET_ALL activado exitosamente', 'green');
    return true;
}

/**
 * Limpiar estados
 */
async function cleanStates() {
    logSection('🧹 Limpiando Estados Activos');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/flow_states?contact_id=eq.2590702&status=in.(active,paused)`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    log('✅ Estados limpiados', 'green');
}

/**
 * Enviar webhook
 */
async function sendWebhook(message, testName) {
    const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
        instance: TEST_INSTANCE,
        data: {
            key: {
                remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
                fromMe: false,
                id: messageId
            },
            pushName: testName,
            message: {
                conversation: message
            }
        }
    };

    log(`\n📤 Enviando: "${message}"`, 'yellow');

    const start = Date.now();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-flow-engine-v10`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - start;
    const result = await response.json();

    log(`📥 Respuesta (${elapsed}ms):`, 'cyan');
    console.log(JSON.stringify(result, null, 2));

    return result;
}

/**
 * TEST 1: Información completa en primer mensaje
 */
async function test1() {
    logSection('TEST 1: Extracción Múltiple con GET_ALL');
    log('Input: Mensaje con múltiples datos (estilo, ubicación, tamaño, color)', 'blue');
    log('Esperado: IA extrae todos los campos, pregunta solo lo que falta', 'green');

    const result = await sendWebhook(
        'Quiero un tatuaje minimalista en mi brazo derecho de unos 5cm a color',
        'Test Get All'
    );

    await sleep(2000);

    log('\n📊 Análisis:', 'bright');
    if (result.status === 'GET_ALL_STARTED' || result.status === 'GET_ALL_WAITING') {
        log('✅ PASS: Modo GET_ALL activado', 'green');
        log(`   Completitud: ${result.completion_percentage}%`, 'cyan');
        log(`   Campos extraídos: ${Object.keys(result.variables || result.extracted || {}).length}`, 'green');
        log(`   Campos faltantes: ${result.missing_fields?.join(', ') || 'ninguno'}`, 'yellow');
        if (result.question_sent) {
            log(`   Pregunta IA: "${result.question_sent}"`, 'blue');
        }
        return true;
    } else {
        log(`❌ FAIL: Estado inesperado - ${result.status}`, 'red');
        if (result.variables) {
            log(`   Variables: ${JSON.stringify(result.variables)}`, 'yellow');
        }
        return false;
    }
}

/**
 * TEST 2: Respuesta a pregunta generada
 */
async function test2() {
    logSection('TEST 2: Continuación con GET_ALL');
    log('Input: Responder pregunta generada por IA', 'blue');

    const result = await sendWebhook(
        'Sí, es mi primer tatuaje y quiero agendar consulta',
        'Test Get All Continue'
    );

    await sleep(2000);

    log('\n📊 Análisis:', 'bright');
    if (result.status === 'GET_ALL_WAITING') {
        log('✅ PASS: IA procesó respuesta adicional', 'green');
        log(`   Completitud: ${result.completion_percentage}%`, 'cyan');
    } else if (result.completion_percentage === 100 || result.status === 'completed') {
        log('✅ PASS: Flow completado (100%)', 'green');
        return true;
    } else {
        log(`ℹ️  Estado: ${result.status}`, 'yellow');
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAll() {
    log('\n🚀 ACTIVACIÓN Y TESTS - MODO GET_ALL', 'bright');
    log('⚡ Con OpenRouter API Key configurada\n', 'cyan');

    try {
        // 1. Activar modo get_all
        const activated = await activateGetAllMode();
        if (!activated) {
            log('❌ No se pudo activar modo get_all. Abortando.', 'red');
            return;
        }

        await sleep(2000);

        // 2. Limpiar estados
        await cleanStates();
        await sleep(2000);

        // 3. Ejecutar tests
        const test1Pass = await test1();
        await sleep(5000); // Esperar procesamiento de GPT-4

        // Solo continuar si test1 pasó
        if (test1Pass) {
            await test2();
        }

        // Resultados finales
        logSection('✅ TESTS COMPLETADOS');
        log('\n📊 Resumen:', 'bright');
        log('   1. Modo GET_ALL activado en flow ID 5', 'green');
        log('   2. Tests ejecutados con GetAllHandler + GPT-4', 'green');
        log('   3. Revisa logs en Supabase para ver procesamiento completo', 'cyan');
        log('\n🔗 Logs:', 'yellow');
        log('   https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs/edge-functions', 'blue');
        log('\n🔍 Buscar en logs:', 'yellow');
        log('   - [GetAllHandler] Analyzing message', 'cyan');
        log('   - [SmartFlowEngine] Flow mode: get_all', 'cyan');
        log('   - GET_ALL extraction result', 'cyan');

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`, 'red');
        console.error(error);
    }
}

runAll();

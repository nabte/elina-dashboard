/**
 * TEST SIMPLIFICADO - Modo Get All
 * Este script prueba el modo get_all usando flows existentes
 */

const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

// Usar número de nabte para testing
const TEST_PHONE = '5219995169313';
const TEST_INSTANCE = 'elina26';

// Colores
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
 * Simular webhook de Evolution API
 */
async function sendWebhookMessage(message, imageUrl = null) {
    const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
        instance: TEST_INSTANCE,
        data: {
            key: {
                remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
                fromMe: false,
                id: messageId
            },
            pushName: 'Test Get All Mode',
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

    log(`\n📤 Enviando webhook:`, 'yellow');
    log(`   Mensaje: "${message}"`, 'yellow');
    if (imageUrl) log(`   Imagen: ${imageUrl}`, 'yellow');

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

    log(`\n📥 Respuesta (${elapsed}ms):`, 'cyan');
    console.log(JSON.stringify(result, null, 2));

    return result;
}

/**
 * TEST 1: Activar flow con keyword y dar información completa
 */
async function test1_FullInfoAtOnce() {
    logSection('TEST 1: Dar toda la información de una vez (Modo Get All)');
    log('Escenario: Cliente activa flow de tatuaje y da TODOS los datos en un mensaje', 'blue');
    log('Esperado: IA extrae múltiples campos, solo pregunta lo que falta', 'green');

    const result = await sendWebhookMessage(
        'Quiero un tatuaje minimalista en mi brazo derecho de unos 5cm a color'
    );

    await sleep(1000);

    log('\n📊 Análisis:', 'bright');
    if (result.status === 'GET_ALL_STARTED' || result.status === 'GET_ALL_WAITING') {
        log(`✅ Modo GET_ALL activado correctamente`, 'green');
        log(`   Completitud: ${result.completion_percentage || 0}%`, 'cyan');
        log(`   Campos faltantes: ${result.missing_fields?.join(', ') || 'ninguno'}`, 'yellow');
        log(`   Pregunta generada: "${result.question_sent || 'N/A'}"`, 'blue');
    } else if (result.message) {
        log(`ℹ️  Flow no activado: ${result.message}`, 'yellow');
    } else {
        log(`❓ Respuesta inesperada`, 'red');
    }
}

/**
 * TEST 2: Respuesta parcial en continuación
 */
async function test2_PartialThenComplete() {
    logSection('TEST 2: Información parcial, luego completar');
    log('Escenario: Responder con solo algunos campos', 'blue');

    const result = await sendWebhookMessage(
        'Sí, es mi primer tatuaje'
    );

    await sleep(1000);

    log('\n📊 Análisis:', 'bright');
    if (result.status === 'GET_ALL_WAITING') {
        log(`✅ IA procesó respuesta parcial`, 'green');
        log(`   Completitud: ${result.completion_percentage}%`, 'cyan');
        log(`   Campos faltantes: ${result.missing_fields?.join(', ')}`, 'yellow');
    } else if (result.status === 'completed') {
        log(`✅ Flow completado exitosamente`, 'green');
    } else {
        log(`ℹ️  Estado: ${result.status || 'desconocido'}`, 'yellow');
    }
}

/**
 * TEST 3: Verificar logs en Supabase
 */
async function test3_CheckLogs() {
    logSection('TEST 3: Verificación de Logs');
    log('🔍 Los logs detallados están en Supabase Dashboard:', 'cyan');
    log('   URL: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs/edge-functions', 'blue');
    log('\n📝 Busca por:', 'yellow');
    log('   - [GetAllHandler] Analyzing message', 'yellow');
    log('   - [SmartFlowEngine] Flow mode: get_all', 'yellow');
    log('   - GET_ALL extraction result', 'yellow');
}

/**
 * TEST 4: Probar extracción con SmartFiller tradicional (step_by_step)
 */
async function test4_StepByStepMode() {
    logSection('TEST 4: Modo Step by Step (Comparación)');
    log('Activar un flow en modo step_by_step para comparar', 'blue');

    // Activar flow de llaveros (debería estar en step_by_step)
    const result = await sendWebhookMessage(
        'Quiero cotizar llaveros personalizados'
    );

    await sleep(1000);

    log('\n📊 Análisis:', 'bright');
    log(`   Modo esperado: step_by_step (guía paso a paso)`, 'yellow');
    log(`   En este modo, el bot hace UNA pregunta a la vez`, 'yellow');
}

/**
 * TEST 5: Error handling - Mensaje vacío
 */
async function test5_EmptyMessage() {
    logSection('TEST 5: Manejo de Errores - Mensaje Vacío');

    const payload = {
        instance: TEST_INSTANCE,
        data: {
            key: {
                remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
                fromMe: false,
                id: `TEST_EMPTY_${Date.now()}`
            },
            pushName: 'Test',
            message: {
                conversation: ''
            }
        }
    };

    log('📤 Enviando mensaje vacío...', 'yellow');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-flow-engine-v10`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    log('\n📥 Respuesta:', 'cyan');
    console.log(JSON.stringify(result, null, 2));
}

/**
 * Ejecutar todos los tests
 */
async function runTests() {
    log('\n🚀 TESTS REALES - MODO GET_ALL', 'bright');
    log('Edge Function: smart-flow-engine-v10 (desplegado)', 'cyan');
    log('Proyecto: mytvwfbijlgbihlegmfg', 'cyan');
    log(`Usuario Test: nabte (${TEST_PHONE})`, 'cyan');
    log('\n⚠️  IMPORTANTE:', 'yellow');
    log('   - Estos tests usan los flows reales de nabte', 'yellow');
    log('   - Para que funcione el modo get_all, el flow debe tener mode="get_all"', 'yellow');
    log('   - Revisa los logs en Supabase para ver el procesamiento completo\n', 'yellow');

    try {
        await test1_FullInfoAtOnce();
        await sleep(3000);

        await test2_PartialThenComplete();
        await sleep(3000);

        await test4_StepByStepMode();
        await sleep(3000);

        await test5_EmptyMessage();
        await sleep(2000);

        await test3_CheckLogs();

        logSection('✅ TESTS COMPLETADOS');
        log('\n📊 Resumen:', 'bright');
        log('   1. Verifica que los flows respondan correctamente', 'cyan');
        log('   2. Revisa logs en Supabase para ver procesamiento GET_ALL', 'cyan');
        log('   3. Compara modo get_all vs step_by_step', 'cyan');
        log('\n💡 Siguiente paso:', 'yellow');
        log('   Edita un flow existente en el frontend y cambia mode a "get_all"', 'yellow');
        log('   Luego vuelve a correr estos tests para ver la diferencia', 'yellow');

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`, 'red');
        console.error(error);
    }
}

// Ejecutar
runTests();

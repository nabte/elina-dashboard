/**
 * Test Script para ELINA V5 Edge Function
 * Simula mensajes de Evolution API al webhook
 */

const EDGE_FUNCTION_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';

// Datos del perfil Nabte
const INSTANCE_NAME = 'Nabte';
const API_KEY = 'F6235095-E971-4C21-B6FA-0A8BF54B0E7A';
const USER_PHONE = '5219995169313@s.whatsapp.net';
const USER_NAME = 'Ismael Nabte / Brandcode';

/**
 * Genera un payload simulado de Evolution API
 */
function createEvolutionPayload(messageText, messageId = null) {
    const id = messageId || `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        event: "messages.upsert",
        instance: INSTANCE_NAME,
        data: {
            key: {
                remoteJid: USER_PHONE,
                fromMe: false,
                id: id,
                participant: "",
                addressingMode: "pn"
            },
            pushName: USER_NAME,
            status: "DELIVERY_ACK",
            message: {
                conversation: messageText,
                messageContextInfo: {
                    threadId: [],
                    deviceListMetadata: {
                        senderKeyIndexes: [],
                        recipientKeyIndexes: [],
                        senderKeyHash: { 0: 124, 1: 106, 2: 115 },
                        senderTimestamp: { low: Math.floor(Date.now() / 1000), high: 0, unsigned: true },
                        recipientKeyHash: { 0: 162, 1: 6, 2: 232 },
                        recipientTimestamp: { low: Math.floor(Date.now() / 1000) - 1000, high: 0, unsigned: true }
                    },
                    deviceListMetadataVersion: 2,
                    messageSecret: Array.from({ length: 32 }, (_, i) => i * 8)
                }
            },
            messageType: "conversation",
            messageTimestamp: Math.floor(Date.now() / 1000),
            instanceId: "test-instance-id",
            source: "test"
        },
        destination: EDGE_FUNCTION_URL,
        date_time: new Date().toISOString(),
        sender: "5219993895046@s.whatsapp.net",
        server_url: "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
        apikey: API_KEY,
        isSimulation: true // Flag para indicar que es una simulación
    };
}

/**
 * Envía un mensaje de prueba a la Edge Function
 */
async function sendTestMessage(messageText, testName = 'Test') {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧪 ${testName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📤 Enviando: "${messageText}"`);

    const payload = createEvolutionPayload(messageText);
    const startTime = Date.now();

    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - startTime;
        const responseData = await response.json();

        console.log(`\n✅ Respuesta recibida (${duration}ms)`);
        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Response:`, JSON.stringify(responseData, null, 2));

        if (responseData.error) {
            console.error(`❌ Error en respuesta:`, responseData.error);
        }

        return { success: response.ok, data: responseData, duration };

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`\n❌ Error en request (${duration}ms):`, error.message);
        return { success: false, error: error.message, duration };
    }
}

/**
 * Ejecuta una suite de pruebas
 */
async function runTestSuite() {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║        ELINA V5 - Test Suite de Conversación          ║`);
    console.log(`╚════════════════════════════════════════════════════════╝`);
    console.log(`\n📍 URL: ${EDGE_FUNCTION_URL}`);
    console.log(`👤 Usuario: ${USER_NAME}`);
    console.log(`📱 Teléfono: ${USER_PHONE}`);
    console.log(`🏢 Instancia: ${INSTANCE_NAME}\n`);

    const tests = [
        {
            name: 'Test 1: Saludo Inicial',
            message: 'Hola, vi tu anuncio en Facebook'
        },
        {
            name: 'Test 2: Consulta de Servicios',
            message: 'Qué servicios ofrecen?'
        },
        {
            name: 'Test 3: Consulta de Precios',
            message: 'Cuánto cuesta el servicio de optimización de procesos?'
        },
        {
            name: 'Test 4: Intención de Compra',
            message: 'Me interesa contratar, necesito una cotización'
        },
        {
            name: 'Test 5: Consulta de Productos (si aplica)',
            message: 'Tienen productos disponibles?'
        },
        {
            name: 'Test 6: Horarios',
            message: 'A qué hora están disponibles?'
        },
        {
            name: 'Test 7: Contacto Directo',
            message: 'Necesito hablar con alguien urgente'
        },
        {
            name: 'Test 8: Despedida',
            message: 'Gracias por la información, nos vemos'
        }
    ];

    const results = [];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = await sendTestMessage(test.message, test.name);
        results.push({ ...test, ...result });

        // Esperar 2 segundos entre cada mensaje para simular conversación real
        if (i < tests.length - 1) {
            console.log(`\n⏳ Esperando 2 segundos antes del siguiente mensaje...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Resumen final
    console.log(`\n\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║                  RESUMEN DE PRUEBAS                    ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`✅ Exitosas: ${successful}/${results.length}`);
    console.log(`❌ Fallidas: ${failed}/${results.length}`);
    console.log(`⏱️  Tiempo promedio: ${avgDuration.toFixed(0)}ms\n`);

    if (failed > 0) {
        console.log(`\n⚠️  Tests fallidos:\n`);
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.name}: ${r.error || 'Error desconocido'}`);
        });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// Ejecutar tests
runTestSuite().catch(console.error);

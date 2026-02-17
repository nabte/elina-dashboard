/**
 * Test de Consultas de Productos - ELINA V5
 * Analiza calidad de respuestas y manejo de imágenes
 */

const EDGE_FUNCTION_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';
const INSTANCE = 'Nabte';
const API_KEY = 'F6235095-E971-4C21-B6FA-0A8BF54B0E7A';
const PHONE = '5219995169313@s.whatsapp.net';
const USER_NAME = 'Ismael Nabte / Brandcode';

// Productos conocidos de la cuenta Nabte
const KNOWN_PRODUCTS = {
    cartucho665: { id: 9527, name: '665', hasImage: true, price: 105 },
    cartucho58A: { id: 7634, name: '58A/CRG057', hasImage: false, price: 383.13 },
    cartucho26A: { id: 7636, name: '26A/CRG052', hasImage: false, price: 232.57 },
    cartucho105X: { id: 7633, name: '105X', hasImage: false, price: 216.92 }
};

const tests = [
    {
        name: 'Test 1: Consulta de 1 Producto (CON imagen)',
        message: 'Tienes el cartucho 665?',
        expectedProducts: 1,
        expectedImage: true,
        analysis: {
            shouldMentionPrice: true,
            shouldMentionStock: true,
            shouldBeShort: true, // Máximo 3 líneas
            shouldIncludeCTA: true // Call to action
        }
    },
    {
        name: 'Test 2: Consulta de 2 Productos específicos',
        message: 'Necesito el 58A y el 26A',
        expectedProducts: 2,
        expectedImage: false,
        analysis: {
            shouldMentionPrice: true,
            shouldMentionStock: false,
            shouldBeShort: true,
            shouldIncludeCTA: true
        }
    },
    {
        name: 'Test 3: Consulta genérica (varios productos)',
        message: 'Qué cartuchos HP tienes disponibles?',
        expectedProducts: 3, // Al menos 3
        expectedImage: false,
        analysis: {
            shouldMentionPrice: true,
            shouldMentionStock: false,
            shouldBeShort: false, // Puede ser más largo
            shouldIncludeCTA: true
        }
    },
    {
        name: 'Test 4: Consulta casual (1 producto)',
        message: 'cuanto sale el 105X',
        expectedProducts: 1,
        expectedImage: false,
        analysis: {
            shouldMentionPrice: true,
            shouldMentionStock: false,
            shouldBeShort: true,
            shouldIncludeCTA: false // Solo info de precio
        }
    }
];

async function sendMessage(message, testName) {
    const payload = {
        event: "messages.upsert",
        instance: INSTANCE,
        data: {
            key: {
                remoteJid: PHONE,
                fromMe: false,
                id: `TEST_${Date.now()}`,
                participant: "",
                addressingMode: "pn"
            },
            pushName: USER_NAME,
            status: "DELIVERY_ACK",
            message: {
                conversation: message
            },
            messageType: "conversation",
            messageTimestamp: Math.floor(Date.now() / 1000),
            instanceId: "test-instance-id",
            source: "test"
        },
        apikey: API_KEY,
        isSimulation: true
    };

    console.log(`📤 Enviando: "${message}"`);
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
        const data = await response.json();

        console.log(`\n✅ Respuesta recibida (${duration}ms)`);
        console.log(`📊 Status: ${response.status}`);

        return {
            success: response.ok,
            status: response.status,
            data,
            duration,
            testName
        };
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        return {
            success: false,
            error: error.message,
            testName
        };
    }
}

function analyzeResponse(result, test) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ANÁLISIS: ${test.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (!result.success) {
        console.log(`❌ Test falló: ${result.error || 'Error desconocido'}`);
        return;
    }

    const { data } = result;

    // Análisis básico
    console.log(`\n📋 Datos de respuesta:`);
    console.log(`   - Intent: ${data.intent}`);
    console.log(`   - Sentiment: ${data.sentiment}`);
    console.log(`   - Productos encontrados: ${data.productsFound || 0}`);
    console.log(`   - Tokens usados: ${data.tokensUsed}`);
    console.log(`   - Duración: ${result.duration}ms`);

    // Análisis de calidad
    console.log(`\n🔍 Análisis de Calidad:`);

    // 1. Número de productos
    const productsMatch = data.productsFound >= test.expectedProducts;
    console.log(`   ${productsMatch ? '✅' : '❌'} Productos esperados: ${test.expectedProducts}, Encontrados: ${data.productsFound || 0}`);

    // 2. Brevedad (si aplica)
    if (test.analysis.shouldBeShort) {
        // Estimamos que una respuesta breve tiene menos de 500 tokens
        const isShort = data.tokensUsed < 500;
        console.log(`   ${isShort ? '✅' : '⚠️'} Brevedad: ${data.tokensUsed} tokens ${isShort ? '(Breve)' : '(Largo - debería ser más conciso)'}`);
    }

    // 3. Intent correcto
    const correctIntent = data.intent === 'product_inquiry';
    console.log(`   ${correctIntent ? '✅' : '❌'} Intent correcto: ${data.intent} ${correctIntent ? '' : '(Esperado: product_inquiry)'}`);

    // 4. Velocidad
    const isFast = result.duration < 10000; // Menos de 10s
    console.log(`   ${isFast ? '✅' : '⚠️'} Velocidad: ${result.duration}ms ${isFast ? '(Rápido)' : '(Lento)'}`);

    console.log(`\n💡 Recomendaciones:`);
    if (!productsMatch) {
        console.log(`   - El agente no encontró suficientes productos. Revisar búsqueda semántica.`);
    }
    if (test.analysis.shouldBeShort && data.tokensUsed > 500) {
        console.log(`   - La respuesta es muy larga. Ajustar system prompt para ser más conciso.`);
    }
    if (!isFast) {
        console.log(`   - La respuesta tardó más de 10s. Considerar optimizar o usar modelo más rápido.`);
    }
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ELINA V5 - Test de Consultas de Productos         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`📍 URL: ${EDGE_FUNCTION_URL}`);
    console.log(`👤 Usuario: ${USER_NAME}`);
    console.log(`📱 Teléfono: ${PHONE}`);
    console.log(`🏢 Instancia: ${INSTANCE}\n`);

    const results = [];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🧪 ${test.name}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const result = await sendMessage(test.message, test.name);
        results.push(result);

        analyzeResponse(result, test);

        // Esperar entre tests
        if (i < tests.length - 1) {
            console.log(`\n⏳ Esperando 3 segundos antes del siguiente test...\n`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Resumen final
    console.log(`\n\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║                  RESUMEN FINAL                         ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;

    console.log(`✅ Tests exitosos: ${successful}/${results.length}`);
    console.log(`❌ Tests fallidos: ${failed}/${results.length}`);
    console.log(`⏱️  Duración promedio: ${avgDuration.toFixed(0)}ms`);

    console.log(`\n📝 Productos conocidos en la cuenta:`);
    Object.entries(KNOWN_PRODUCTS).forEach(([key, prod]) => {
        console.log(`   - ${prod.name} (ID: ${prod.id}) - $${prod.price} ${prod.hasImage ? '🖼️' : ''}`);
    });
}

runTests().catch(console.error);

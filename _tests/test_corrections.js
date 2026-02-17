const EDGE_FUNCTION_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';
const PHONE_NUMBER = "5219995169313"; // Número del usuario Ismael
const INSTANCE = "Nabte";

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(text) {
    const startTime = Date.now();

    const payload = {
        data: {
            key: {
                remoteJid: `${PHONE_NUMBER}@s.whatsapp.net`,
                fromMe: false,
                id: `TEST_${Date.now()}`
            },
            message: {
                conversation: text
            }
        },
        instance: INSTANCE,
        isSimulation: true
    };

    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - startTime;
        const data = await response.json();

        console.log(`\n📤 Enviando: "${text}"`);
        console.log(`⏱️  Tiempo: ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);

        if (response.ok) {
            console.log(`✅ Respuesta Raw:`, JSON.stringify(data, null, 2));
            console.log(`🎯 Intent: ${data.intent || 'N/A'}`);
            console.log(`📦 Productos: ${data.productsFound || 0}`);
        } else {
            console.log(`❌ Error:`, data);
        }

        return data;
    } catch (error) {
        console.error(`❌ Error en request:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('🚀 Iniciando Tests de Correcciones ELINA V5\n');
    console.log('='.repeat(60));

    // Test 1: Producto que NO existe (debe sugerir alternativas, NO decir "solo servicios")
    console.log('\n📋 TEST 1: Producto Inexistente');
    console.log('-'.repeat(60));
    await sendMessage("Tienes iPhone 15 Pro Max?");
    await delay(8000);

    // Test 2: Producto con nombre parcial (debe buscar y encontrar)
    console.log('\n📋 TEST 2: Búsqueda Parcial de Producto');
    console.log('-'.repeat(60));
    await sendMessage("Tienes algo de Samsung?");
    await delay(8000);

    // Test 3: Consultar disponibilidad (debe mostrar slots)
    console.log('\n📋 TEST 3: Consultar Disponibilidad');
    console.log('-'.repeat(60));
    await sendMessage("Que horarios tienes disponibles mañana?");
    await delay(8000);

    // Test 4: Agendar cita (NO debe decir "no hay horarios" después de mostrarlos)
    console.log('\n📋 TEST 4: Agendar Cita');
    console.log('-'.repeat(60));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await sendMessage(`Quiero agendar una cita para ${dateStr} a las 10:00 AM`);
    await delay(8000);

    // Test 5: Producto real (si existe en DB)
    console.log('\n📋 TEST 5: Producto Real');
    console.log('-'.repeat(60));
    await sendMessage("Cuanto cuesta un corte de pelo?");
    await delay(8000);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests Completados');
    console.log('\n📝 VERIFICAR:');
    console.log('1. ❌ NO debe decir "solo ofrecemos servicios"');
    console.log('2. ✅ Debe sugerir alternativas cuando no encuentra producto');
    console.log('3. ✅ Debe mostrar slots disponibles');
    console.log('4. ❌ NO debe contradecirse sobre disponibilidad');
    console.log('5. ✅ Debe crear cita en DB (verificar en Supabase)');
}

runTests().catch(console.error);


const EDGE_FUNCTION_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';
const PHONE_NUMBER = "5219995169313"; // Número del usuario Ismael
const INSTANCE = "Nabte";

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(text) {
    console.log(`\n📤 Enviando: "${text}"`);

    // Create unique ID for each message to avoid deduplication if enabled
    const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
        event: "messages.upsert",
        instance: INSTANCE,
        data: {
            key: {
                remoteJid: `${PHONE_NUMBER}@s.whatsapp.net`,
                fromMe: false,
                id: messageId,
                participant: "",
                addressingMode: "pn"
            },
            pushName: "Test User",
            status: "DELIVERY_ACK",
            message: {
                conversation: text
            },
            messageType: "conversation",
            messageTimestamp: Math.floor(Date.now() / 1000),
            instanceId: "test-instance-id",
            source: "test"
        },
        apikey: "F6235095-E971-4C21-B6FA-0A8BF54B0E7A",
        isSimulation: true // Flag to indicate testing if backend supports it
    };

    try {
        const start = Date.now();
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - start;
        console.log(`⏱️  Tiempo: ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);

        const textResp = await response.text();
        try {
            const json = JSON.parse(textResp);
            // Log relevant parts
            if (json.ai_response) {
                console.log(`🤖 IA: "${json.ai_response}"`);
            } else if (json.response) {
                console.log(`🤖 Bot: "${json.response}"`); // For auto-responses probably
            } else {
                console.log(`✅ Respuesta Raw:`, JSON.stringify(json, null, 2));
            }

            if (json.intent) console.log(`🎯 Intent: ${json.intent}`);
            if (json.productsFound !== undefined) console.log(`📦 Productos: ${json.productsFound}`);
            if (json.toolCalls) console.log(`🔧 Tool Calls:`, JSON.stringify(json.toolCalls, null, 2));

        } catch (e) {
            console.log(`⚠️ Respuesta no JSON: ${textResp}`);
        }

    } catch (error) {
        console.error(`❌ Error enviando mensaje: ${error.message}`);
    }
}

async function runTest() {
    console.log("🚀 Iniciando Test Integral de ELINA V5");

    // 1. Casual Chat
    await sendMessage("Hola");
    await delay(2000);

    await sendMessage("Como estas?");
    await delay(2000);

    // 2. Auto Response
    await sendMessage("PRUEBA_AUTO");
    await delay(2000);

    // 3. Product Inquiry
    await sendMessage("Tienes iPhone 15?");
    await delay(3000); // Give more time for DB search

    await sendMessage("Y Samsung S24?");
    await delay(3000);

    // 4. Memory
    await sendMessage("Que producto te pregunte primero?");
    await delay(3000);

    // 5. Availability (Testing new tool)
    await sendMessage("Que horarios tienes disponibles para mañana?");
    await delay(4000);

    // 6. Appointment (Testing new tool)
    await sendMessage("Agendame una cita para mañana a las 10:00 AM");
    await delay(5000);

    console.log("\n✅ Test Completado");
}

runTest();

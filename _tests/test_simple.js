/**
 * Test simple para ELINA V5
 */

const EDGE_FUNCTION_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';

const payload = {
    event: "messages.upsert",
    instance: "Nabte",
    data: {
        key: {
            remoteJid: "5219995169313@s.whatsapp.net",
            fromMe: false,
            id: `TEST_${Date.now()}`,
            participant: "",
            addressingMode: "pn"
        },
        pushName: "Ismael Nabte / Brandcode",
        status: "DELIVERY_ACK",
        message: {
            conversation: "Hola"
        },
        messageType: "conversation",
        messageTimestamp: Math.floor(Date.now() / 1000),
        instanceId: "test-instance-id",
        source: "test"
    },
    apikey: "F6235095-E971-4C21-B6FA-0A8BF54B0E7A",
    isSimulation: true
};

console.log('📤 Enviando mensaje de prueba...\n');
console.log('Payload:', JSON.stringify(payload, null, 2));

fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
})
    .then(async response => {
        console.log(`\n📊 Status: ${response.status}`);
        const text = await response.text();
        console.log(`📋 Response:`, text);

        try {
            const json = JSON.parse(text);
            console.log('\nJSON parseado:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('\n⚠️  La respuesta no es JSON válido');
        }
    })
    .catch(error => {
        console.error('\n❌ Error:', error.message);
    });

/**
 * Test rápido de consulta de producto
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
            conversation: "Tienes el cartucho 665?"
        },
        messageType: "conversation",
        messageTimestamp: Math.floor(Date.now() / 1000),
        instanceId: "test-instance-id",
        source: "test"
    },
    apikey: "F6235095-E971-4C21-B6FA-0A8BF54B0E7A",
    isSimulation: true
};

console.log('📤 Probando consulta de producto: "Tienes el cartucho 665?"\n');

fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
})
    .then(async response => {
        console.log(`📊 Status: ${response.status}`);
        const text = await response.text();

        try {
            const json = JSON.parse(text);
            console.log('\n✅ Respuesta:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('\n⚠️ Respuesta no JSON:', text);
        }
    })
    .catch(error => {
        console.error('\n❌ Error:', error.message);
    });

// Test de detección crítica con label "ignorar" y notificación al dueño
const URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5";

// Test 1: Mensaje crítico (cancelación)
const criticalPayload = {
    instance: "Nabte",
    apikey: "F6235095-E971-4C21-B6FA-0A8BF54B0E7A",
    data: {
        key: {
            remoteJid: "5219995169313@s.whatsapp.net",
            fromMe: false,
            id: "CRITICAL_TEST_" + Date.now()
        },
        pushName: "Isman Test",
        message: {
            conversation: "Quiero cancelar mi suscripción, esto es una porquería"
        },
        messageType: "conversation"
    }
};

async function testCriticalIntent() {
    console.log("🚨 Testing Critical Intent Detection...\n");

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(criticalPayload),
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.critical_detected || data.is_critical) {
            console.log("\n✅ CRITICAL INTENT DETECTED!");
            console.log("- Label added:", data.label_added);
            console.log("- Owner notified:", data.owner_notified);
            console.log("- Paused:", data.paused);
        } else {
            console.log("\n❌ Critical intent NOT detected (expected to be detected)");
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

testCriticalIntent();

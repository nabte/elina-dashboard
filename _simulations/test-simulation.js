
// test-simulation.js
const URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5";

const payload = {
    instance: "Nabte",
    apikey: "F6235095-E971-4C21-B6FA-0A8BF54B0E7A",
    data: {
        key: {
            remoteJid: "5219995169313@s.whatsapp.net",
            fromMe: false,
            id: "TEST_MSG_" + Date.now()
        },
        pushName: "Isman Simulation",
        message: {
            conversation: "Quiero cancelar mi suscripción"
        },
        messageType: "conversation"
    }
};

console.log("Sending payload to:", URL);
console.log("Payload:", JSON.stringify(payload, null, 2));

async function run() {
    try {
        const res = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + "F6235095-E971-4C21-B6FA-0A8BF54B0E7A"
            },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();

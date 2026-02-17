
const URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function runTest(label, phone, message) {
    console.log(`\n--- TEST: ${label} ---`);
    const payload = {
        data: {
            key: { remoteJid: `${phone}@s.whatsapp.net`, id: `TEST_${Date.now()}` },
            pushName: "Tester",
            message: { conversation: message }
        },
        instance: "ElinaHead", // TARGET INSTANCE
        apikey: "5F629C3E7E82-4814-B20C-0ED25A9359E3", // Correct API Key
        return_context_only: true // CRITICAL: Don't send real WS message, just return context
    };

    try {
        const res = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        const util = require('util');
        console.log("RAW RESPONSE:", util.inspect(data, { showHidden: false, depth: null, colors: true }));

        if (data.data && data.data.profile) {
            console.log(`[PASS] Profile Selected: ${data.data.profile.full_name} (${data.data.profile.id})`);

            // Check System Prompt Snippet
            let prompt = "";
            if (data.data.system_prompt) prompt = data.data.system_prompt;
            else if (data.data.profile.system_prompt) prompt = data.data.profile.system_prompt;

            console.log("PROMPT TYPE:", typeof prompt);

            if (typeof prompt === 'string') {
                if (prompt.includes("[MODO ASISTENTE PERSONAL]")) {
                    console.log(`[RESULT] MODE: PERSONAL ASSISTANT ✅`);
                } else if (prompt.includes("asistente de ventas")) {
                    console.log(`[RESULT] MODE: SALES BOT ✅`);
                } else {
                    console.log(`[RESULT] MODE: UNKNOWN ❓`);
                }
            } else {
                console.log(`[RESULT] PROMPT IS NOT A STRING:`, prompt);
            }

        } else {
            console.log(`[FAIL] No profile returned. Error:`, data);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

async function main() {
    // Test 1: Unknown User -> Expect Sales Mode
    await runTest("Unknown User (Sales Mode)", "5215550000000", "Hola, me interesa Elina");

    // Test 2: Known User (Client) -> Expect Support Mode
    // Using phone from DB: 5219991610790 (finanzas@bop.mx)
    await runTest("Known Client (Support Mode)", "5219991610790", "Hola Elina, dame un resumen");
}

main();

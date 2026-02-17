
// Test Suite for ELINA v5 Optimizations
// Run with: deno run --allow-net test-suite.ts

const FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message";
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U"; // Service Role Token from n8n

// Test Config
const INSTANCE_NAME = "ElinaIA 2025";
const TEST_PHONE = "5215555555555";
const TEST_CONTACT_ID = 999999;
const TEST_NAME = "Test User Script";

async function runTest(testName: string, message: string, expectedPattern: string | null) {
    console.log(`\n----------------------------------------`);
    console.log(`🧪 TEST: ${testName}`);
    console.log(`📨 Enviando: "${message}"`);

    try {
        const start = performance.now();
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: {
                    key: {
                        remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
                        id: String(TEST_CONTACT_ID)
                    },
                    pushName: TEST_NAME,
                    message: {
                        conversation: message
                    }
                },
                instance: INSTANCE_NAME,
                return_context_only: false
            })
        });

        const end = performance.now();
        const duration = (end - start).toFixed(0);

        if (!response.ok) {
            console.error(`❌ ERROR HTTP ${response.status}:`, await response.text());
            return;
        }

        const json = await response.json();
        console.log(`⏱️ Latencia: ${duration}ms`);

        const output = json.data?.output || "";
        console.log(`🤖 Respuesta: "${output.substring(0, 100)}..."`);

        if (expectedPattern) {
            if (output.includes(expectedPattern)) {
                console.log(`✅ EXITO: Se detectó el patrón esperado "${expectedPattern}"`);
            } else {
                console.error(`❌ FALLO: No se detectó patrón "${expectedPattern}"`);
                console.log("Full Response:", JSON.stringify(json, null, 2));
            }
        } else {
            console.log(`✅ Completado (sin chequeo de patrón)`);
        }

        // Check specifics
        if (json.preset_response) console.log("✨ [Metadato] Preset Response: ACTIVADO");
        if (json.data?.should_generate_quote) console.log("📄 [Metadato] Quote Generation: SI");

    } catch (e) {
        console.error(`❌ EXCEPCIÓN:`, e);
    }
}

async function main() {
    console.log("🚀 Iniciando Pruebas de Humo ELINA v5...");

    // 1. Test Preset Response
    await runTest(
        "Preset Response Check",
        "TEST_PING",
        "PONG_AUTO_SUCCESS"
    );

    // 2. Test Semantic Objection
    await runTest(
        "Semantic Objection Detection",
        "es un robo todo esto",
        "calidad" // Esperamos que la IA mencione algo de calidad o precio basado en el contexto inyectado
    );

    // 3. Test Regular Flow (y latencia)
    await runTest(
        "Regular IA Flow",
        "Hola, ¿qué servicios ofrecen?",
        null
    );

    console.log(`\n----------------------------------------`);
    console.log("🏁 Pruebas finalizadas.");
}

main();

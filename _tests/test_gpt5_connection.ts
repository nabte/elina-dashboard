
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load environment variables if running locally
try {
    await load({ export: true });
} catch (e) {
    // Ignore error if .env file is missing (e.g. in Supabase Edge Runtime)
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL_ID = "gpt-5-nano-2025-08-07";

if (!OPENAI_API_KEY) {
    console.error("Please set OPENAI_API_KEY environment variable");
    Deno.exit(1);
}

console.log(`Starting connectivity test for model: ${MODEL_ID}`);

async function testChatCompletions() {
    console.log("\n--- Testing Chat Completions API ---");
    const url = "https://api.openai.com/v1/chat/completions";
    const body = {
        model: MODEL_ID,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 10
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Chat Completions API SUCCESS!");
            console.log("Response:", data.choices[0].message.content);
            return true;
        } else {
            const error = await res.text();
            console.log(`❌ Chat Completions API FAILED (Status: ${res.status})`);
            console.log("Error:", error);
            return false;
        }
    } catch (e) {
        console.error("Exception:", e);
        return false;
    }
}

async function testResponsesAPI() {
    console.log("\n--- Testing Responses API ---");
    const url = "https://api.openai.com/v1/responses";
    // Construct body based on official examples
    const body = {
        model: MODEL_ID,
        input: [
            { role: "user", content: "Ping" }
        ]
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Responses API SUCCESS!");
            console.log("Response:", data); // Adjust based on actual shape
            return true;
        } else {
            const error = await res.text();
            console.log(`❌ Responses API FAILED (Status: ${res.status})`);
            console.log("Error:", error);
            return false;
        }
    } catch (e) {
        console.error("Exception:", e);
        return false;
    }
}

// Run tests
const chatSuccess = await testChatCompletions();
if (!chatSuccess) {
    await testResponsesAPI();
}

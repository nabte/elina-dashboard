
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MODEL_ID = "gpt-5-nano-2025-08-07";

serve(async (req) => {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
        return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const results = {
        chat_completions: { success: false, data: null, error: null },
        responses_api: { success: false, data: null, error: null }
    };

    // 1. Test Chat Completions
    try {
        console.log("Testing Chat Completions...");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: [{ role: "user", content: "Ping" }],
                max_tokens: 10
            })
        });

        if (res.ok) {
            results.chat_completions.success = true;
            results.chat_completions.data = await res.json();
        } else {
            results.chat_completions.error = await res.text();
            results.chat_completions.status = res.status;
        }
    } catch (e) {
        results.chat_completions.error = e.message;
    }

    // 2. Test Responses API (if Chat fails or just to test both)
    try {
        console.log("Testing Responses API...");
        const res = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL_ID,
                input: [
                    { role: "user", content: "Ping" }
                ]
            })
        });

        if (res.ok) {
            results.responses_api.success = true;
            results.responses_api.data = await res.json();
        } else {
            results.responses_api.error = await res.text();
            results.responses_api.status = res.status;
        }
    } catch (e) {
        results.responses_api.error = e.message;
    }

    return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" }
    });
});

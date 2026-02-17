
const url = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/test-gpt5';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function testGPT5() {
    console.log("Testing GPT-5 Nano connectivity...\n");

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log("\nResults:");
        console.log(JSON.stringify(data, null, 2));

        // Analyze results
        console.log("\n--- ANALYSIS ---");
        if (data.chat_completions?.success) {
            console.log("✅ Chat Completions API works with gpt-5-nano-2025-08-07");
            console.log("   Response:", data.chat_completions.data?.choices?.[0]?.message?.content);
        } else {
            console.log("❌ Chat Completions API failed");
            console.log("   Error:", data.chat_completions?.error);
        }

        if (data.responses_api?.success) {
            console.log("✅ Responses API works with gpt-5-nano-2025-08-07");
        } else {
            console.log("❌ Responses API failed");
            console.log("   Error:", data.responses_api?.error);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

testGPT5();

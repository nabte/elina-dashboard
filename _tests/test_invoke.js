
const URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function test() {
    const payload = {
        data: {
            key: {
                remoteJid: "5215512340099@s.whatsapp.net",
                id: "NODE001"
            },
            pushName: "Ana Node",
            message: {
                conversation: "Quiero agendar corte de pelo para mañana a las 11:00 AM"
            }
        },
        instance: "Nabte",
        return_context_only: false
    };

    console.log("Enviando petición...");
    try {
        const res = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log("Respuesta:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

test();

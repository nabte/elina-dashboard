const VERIFY_APPOINTMENT_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5';
const SB_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';
const PHONE_NUMBER = "5219995169313";
const INSTANCE = "Nabte";
let USER_ID = 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(text) {
    const payload = {
        data: {
            key: {
                remoteJid: `${PHONE_NUMBER}@s.whatsapp.net`,
                fromMe: false,
                id: `VERIFY_${Date.now()}`
            },
            message: {
                conversation: text
            }
        },
        instance: INSTANCE,
        isSimulation: true
    };

    try {
        const response = await fetch(VERIFY_APPOINTMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SB_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`\n📤 Usuario: "${text}"`);
        if (response.ok) {
            console.log(`✅ IA: "${data.text}"`); // Asumiendo que devuelve 'text' en JSON
            if (data.userId) USER_ID = data.userId;

            if (data.toolCalls && data.toolCalls.length > 0) {
                console.log(`🔧 Tool Call:`, JSON.stringify(data.toolCalls[0].function, null, 2));
            }
        } else {
            console.log(`❌ Error IA:`, data);
        }
        return data;
    } catch (error) {
        console.error(`❌ Renquest Error:`, error.message);
        return null;
    }
}

async function verifyMeetingCreated() {
    console.log('\n🔍 Verificando DB...');
    const endpoint = `${SB_URL}/rest/v1/meetings?user_id=eq.${USER_ID}&order=created_at.desc&limit=1`;

    try {
        const response = await fetch(endpoint, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const meetings = await response.json();

        if (meetings.length === 0) {
            console.log('❌ No hay citas.');
            return;
        }

        const last = meetings[0];
        const createdAt = new Date(last.created_at);
        const diff = (new Date() - createdAt) / 1000 / 60;

        console.log(`📅 Última Cita: ${last.start_time} (Creada hace ${diff.toFixed(1)} mins)`);

        if (diff < 5) console.log('✅ Cita creada RECIENTEMENTE. ¡EXITO!');
        else console.log('⚠️ Cita ANTIGUA. No se creó una nueva.');

    } catch (e) {
        console.error('Error DB:', e);
    }
}

async function runScenario() {
    console.log('🚀 Iniciando Escenario Conversacional Completo');

    // 1. Pedir Cita
    await sendMessage("Hola, quiero agendar una cita para corte de cabello");
    await delay(3000);

    // 2. IA pregunta cuándo (o da opciones). Usuario dice "Mañana".
    await sendMessage("Para mañana");
    await delay(5000); // Dar tiempo a consultar disponibilidad

    // 3. IA da horas. Usuario elige "3pm".
    await sendMessage("A las 3pm");
    await delay(8000); // Dar tiempo a agendar

    // 4. Verificar
    await verifyMeetingCreated();
}

runScenario();

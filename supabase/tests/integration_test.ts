
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_SERVICE_KEY';
const USER_ID = 'REPLACE_WITH_VALID_USER_ID'; // UPDATE THIS
const CONTACT_ID = 1; // UPDATE THIS IF NEEDED

console.log(`\n--- ELINA EDGE FUNCTION TESTS ---`);
console.log(`Target: ${SUPABASE_URL}`);

// 1. Test get-available-slots
async function testGetAvailableSlots() {
    console.log('\n[TEST 1] Testing get-available-slots...');
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-available-slots`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: USER_ID,
                date: new Date().toISOString().split('T')[0]
            })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log(`Slots found: ${data.available_slots ? data.available_slots.length : 0}`);
            // console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('Error:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

// 2. Test send-appointment-reminders
async function testSendReminders() {
    console.log('\n[TEST 2] Testing send-appointment-reminders (Manual Trigger)...');
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-appointment-reminders`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Default manual trigger
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Result:', data);
    } catch (e) {
        console.error('Exception:', e);
    }
}

// 3. Test Assistant "Recuerda" Command
async function testAssistantCommand() {
    console.log('\n[TEST 3] Testing Assistant "Recuerda" Command...');
    try {
        // Construct a payload mimicking the webhook
        const payload = {
            instance: 'ElinaHead', // Needs to match profile.evolution_instance_name
            data: {
                key: {
                    remoteJid: '5215512345678@s.whatsapp.net', // Needs to match profile.contact_phone
                    fromMe: false,
                    id: 'TEST_MSG_' + Date.now()
                },
                pushName: 'Admin User',
                message: {
                    conversation: 'Elina recuerda comprar leche mañana a las 10am'
                }
            },
            apikey: 'test-api-key'
        };

        const res = await fetch(`${SUPABASE_URL}/functions/v1/process-chat-message`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log('AI Response:', data.data?.generated_response);
        } else {
            console.error('Error:', data);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

// Run tests
if (USER_ID === 'REPLACE_WITH_VALID_USER_ID') {
    console.error('!!! PLEASE UPDATE "USER_ID" CONSTANT IN THE SCRIPT BEFORE RUNNING !!!');
} else {
    await testGetAvailableSlots();
    await testSendReminders();
    // await testAssistantCommand(); // Uncomment if you have a valid configured profile for assistant
}

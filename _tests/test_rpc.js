
const SB_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function testRpc() {
    try {
        const response = await fetch(`${SB_URL}/rest/v1/rpc/test_ping_mcp`, {
            method: 'POST',
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const text = await response.text();
            console.log('✅ SUCCESS:', text);
        } else {
            console.log('❌ FAILURE:', response.status, await response.text());
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
}
testRpc();

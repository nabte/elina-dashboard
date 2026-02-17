const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function findFlows() {
    console.log('🔍 Buscando flows de tatuaje...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/auto_responses?user_id=eq.f2ef49c6-4646-42f8-8130-aa5cd0d3c84f&is_flow=eq.true&select=id,trigger_text,is_active,flow_data`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    const flows = await response.json();

    console.log(`✅ Encontrados ${flows.length} flows:\n`);

    flows.forEach(flow => {
        console.log(`ID: ${flow.id}`);
        console.log(`Trigger: ${flow.trigger_text}`);
        console.log(`Activo: ${flow.is_active ? '✅' : '❌'}`);
        console.log(`Modo: ${flow.flow_data?.mode || 'step_by_step'}`);
        console.log(`Steps: ${flow.flow_data?.steps?.length || 0}`);
        console.log('---\n');
    });
}

findFlows();

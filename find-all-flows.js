const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function findAllFlows() {
    console.log('🔍 Buscando TODOS los flows (limit 50)...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/auto_responses?is_flow=eq.true&select=id,user_id,trigger_text,is_active,flow_data&limit=50`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    const flows = await response.json();

    console.log(`✅ Encontrados ${flows.length} flows:\n`);

    flows.forEach((flow, idx) => {
        console.log(`#${idx + 1} | ID: ${flow.id} | User: ${flow.user_id?.substring(0, 8)}...`);
        console.log(`    Trigger: ${flow.trigger_text?.substring(0, 50)}`);
        console.log(`    Activo: ${flow.is_active ? '✅' : '❌'} | Modo: ${flow.flow_data?.mode || 'step_by_step'}`);
        console.log('');
    });

    // Buscar específicamente flows con palabra tatuaje
    console.log('\n🔍 Flows con "tatuaje":');
    const tattooFlows = flows.filter(f => f.trigger_text?.toLowerCase().includes('tatuaje') || f.trigger_text?.toLowerCase().includes('tattoo'));
    tattooFlows.forEach(flow => {
        console.log(`   ID: ${flow.id} | "${flow.trigger_text}" | Modo: ${flow.flow_data?.mode || 'step_by_step'}`);
    });

    // Buscar flows con palabra llavero
    console.log('\n🔍 Flows con "llavero":');
    const keyFlows = flows.filter(f => f.trigger_text?.toLowerCase().includes('llavero'));
    keyFlows.forEach(flow => {
        console.log(`   ID: ${flow.id} | "${flow.trigger_text}" | Modo: ${flow.flow_data?.mode || 'step_by_step'}`);
    });
}

findAllFlows();

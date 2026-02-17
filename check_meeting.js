import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://mytvwfbijlgbihlegmfg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE'
);

async function checkMeeting() {
    const { data, error } = await supabase
        .from('meetings')
        .select('id, summary, start_time, created_at')
        .eq('contact_id', 2590686)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('\n✅ Cita creada con GPT-5 Nano:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkMeeting();

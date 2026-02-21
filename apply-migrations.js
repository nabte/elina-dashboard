#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration(filePath) {
    console.log(`\n📄 Applying migration: ${path.basename(filePath)}`);

    const sql = fs.readFileSync(filePath, 'utf8');

    try {
        // Execute SQL using rpc
        const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

        if (error) {
            // If exec_sql doesn't exist, try direct execution
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({ query: sql })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
        }

        console.log(`✅ Migration applied successfully`);
        return true;
    } catch (err) {
        console.error(`❌ Error applying migration:`, err.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Applying RAG improvements migrations...\n');

    const migrations = [
        './supabase/migrations/20260220_separate_faqs_table.sql',
        './supabase/migrations/20260220_rag_metrics_system.sql'
    ];

    let successCount = 0;

    for (const migration of migrations) {
        const fullPath = path.join(__dirname, migration);
        if (fs.existsSync(fullPath)) {
            const success = await applyMigration(fullPath);
            if (success) successCount++;
        } else {
            console.error(`❌ Migration file not found: ${migration}`);
        }
    }

    console.log(`\n📊 Summary: ${successCount}/${migrations.length} migrations applied successfully`);

    if (successCount === migrations.length) {
        console.log('\n✅ All migrations applied! Next steps:');
        console.log('   1. Deploy edge functions: npm run deploy-functions');
        console.log('   2. Test chunking: Create a new document in dashboard');
        console.log('   3. Check metrics: See docs/COMO-LEER-METRICAS-RAG.md\n');
    }
}

main().catch(console.error);

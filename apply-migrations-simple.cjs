#!/usr/bin/env node

/**
 * Script simple para aplicar migraciones RAG
 * Ejecutar: node apply-migrations-simple.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';

// Buscar SERVICE_ROLE_KEY en variables de entorno o archivo .env
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
    console.log('\n⚠️  No encontré SUPABASE_SERVICE_ROLE_KEY\n');
    console.log('📋 Para aplicar las migraciones automáticamente, necesitas:\n');
    console.log('1. Ve a: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/settings/api');
    console.log('2. Copia el "service_role" secret (JWT)');
    console.log('3. Ejecuta: set SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui');
    console.log('4. Vuelve a ejecutar: node apply-migrations-simple.js\n');
    console.log('🔗 O usa la Opción 1 (Dashboard Manual):');
    console.log('   Ver archivo: APLICAR-MEJORAS.md\n');
    process.exit(1);
}

async function executeSql(sqlContent) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sqlContent })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response;
}

async function applyMigration(filePath, name) {
    console.log(`\n📄 Aplicando: ${name}...`);

    const sql = fs.readFileSync(filePath, 'utf8');

    try {
        await executeSql(sql);
        console.log(`✅ ${name} - Aplicada exitosamente`);
        return true;
    } catch (error) {
        console.error(`❌ ${name} - Error:`, error.message);

        // Si el error es porque las tablas ya existen, está bien
        if (error.message.includes('already exists')) {
            console.log(`ℹ️  ${name} - Ya aplicada anteriormente`);
            return true;
        }

        return false;
    }
}

async function main() {
    console.log('\n🚀 Aplicando Mejoras RAG\n');
    console.log(`🔗 Proyecto: ${SUPABASE_URL}\n`);

    const migrations = [
        {
            path: './supabase/migrations/20260220_separate_faqs_table.sql',
            name: 'Tabla FAQs Dedicada'
        },
        {
            path: './supabase/migrations/20260220_rag_metrics_system.sql',
            name: 'Sistema de Métricas RAG'
        }
    ];

    let successCount = 0;

    for (const migration of migrations) {
        const fullPath = path.join(__dirname, migration.path);

        if (!fs.existsSync(fullPath)) {
            console.error(`❌ No encontrado: ${migration.path}`);
            continue;
        }

        const success = await applyMigration(fullPath, migration.name);
        if (success) successCount++;
    }

    console.log(`\n📊 Resultado: ${successCount}/${migrations.length} migraciones aplicadas\n`);

    if (successCount === migrations.length) {
        console.log('✅ ¡Migraciones aplicadas correctamente!\n');
        console.log('📋 Próximos pasos:');
        console.log('   1. Deploy edge functions (ver abajo)');
        console.log('   2. Probar chunking en el dashboard');
        console.log('   3. Ver métricas: docs/COMO-LEER-METRICAS-RAG.md\n');
        console.log('📦 Deploy de funciones edge:');
        console.log('   npx supabase functions deploy smart-chunk-document --project-ref mytvwfbijlgbihlegmfg\n');
    } else {
        console.log('⚠️  Algunas migraciones fallaron');
        console.log('💡 Alternativa: Aplicar manualmente desde el dashboard');
        console.log('   Ver: APLICAR-MEJORAS.md\n');
    }
}

main().catch(error => {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
});

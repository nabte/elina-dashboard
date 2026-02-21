// Script para aplicar la migración de autenticación
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('🔧 Aplicando migración de autenticación...\n');

  // Verificar Service Role Key
  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada\n');
    console.log('📋 Sigue estos pasos:\n');
    console.log('1. Ve a: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/settings/api');
    console.log('2. Copia el "service_role" secret (NO el anon key)');
    console.log('3. Ejecuta: set SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui');
    console.log('4. Vuelve a ejecutar: node apply-auth-fix.js\n');
    console.log('⚠️  O aplica manualmente en:');
    console.log('   https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/sql/new\n');
    return;
  }

  // Leer el archivo de migración
  const migrationPath = path.join(__dirname, 'supabase/migrations/20260220_fix_auth_create_subscription.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ No se encontró el archivo de migración:', migrationPath);
    return;
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📝 Ejecutando migración...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error al ejecutar migración:', result);
      console.log('\n⚠️  Aplica manualmente en:');
      console.log('   https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/sql/new\n');
      return;
    }

    console.log('✅ Migración aplicada exitosamente\n');
    console.log('🔍 Verificando resultados...\n');

    // Verificar que ya no haya usuarios sin suscripción
    const verifyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/check_users_without_subscription`,
      {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (verifyResponse.ok) {
      const count = await verifyResponse.json();
      console.log(`   Usuarios sin suscripción: ${count}`);

      if (count === 0) {
        console.log('\n✅ ÉXITO: Todos los usuarios ahora tienen suscripción\n');
      } else {
        console.log(`\n⚠️  Aún hay ${count} usuarios sin suscripción\n`);
      }
    } else {
      console.log('   ℹ️  Ejecuta verify-auth-issues.js para verificar manualmente\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Aplica manualmente en:');
    console.log('   https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/sql/new\n');
  }
}

applyMigration().catch(console.error);

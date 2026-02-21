// Script para verificar problemas de autenticación antes de aplicar la migración
const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

async function supabaseQuery(table, select, filters = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;

  for (const [key, value] of Object.entries(filters)) {
    url += `&${key}=${encodeURIComponent(value)}`;
  }

  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  return response.json();
}

async function supabaseRpc(functionName, params) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  return response.json();
}

async function verifyIssues() {
  console.log('🔍 Verificando problemas de autenticación...\n');

  // 1. Verificar usuarios sin suscripción
  console.log('1️⃣ Verificando usuarios sin suscripción...');
  const profiles = await supabaseQuery('profiles', 'id,email,full_name,role', {
    'role': 'neq.superadmin'
  });

  if (!Array.isArray(profiles)) {
    console.error('❌ Error obteniendo profiles:', profiles);
    return;
  }

  let usersWithoutSub = 0;
  const problematicUsers = [];

  for (const profile of profiles) {
    const subscriptions = await supabaseQuery('subscriptions', 'plan_id,status', {
      'user_id': `eq.${profile.id}`
    });

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      usersWithoutSub++;
      problematicUsers.push({
        email: profile.email,
        name: profile.full_name,
        id: profile.id
      });
    }
  }

  console.log(`   Total usuarios (sin superadmins): ${profiles.length}`);
  console.log(`   Usuarios SIN suscripción: ${usersWithoutSub}`);

  if (usersWithoutSub > 0) {
    console.log('\n   ⚠️  Usuarios afectados:');
    problematicUsers.forEach(u => {
      console.log(`      - ${u.email} (${u.name})`);
    });
  } else {
    console.log('   ✅ Todos los usuarios tienen suscripción');
  }

  // 2. Verificar si existe la función check_account_access
  console.log('\n2️⃣ Verificando función check_account_access...');
  try {
    const result = await supabaseRpc('check_account_access', {
      p_user_id: profiles[0]?.id || '00000000-0000-0000-0000-000000000000'
    });

    if (result.message || result.code) {
      console.log('   ❌ Función NO existe o tiene error:', result.message || result.code);
    } else {
      console.log('   ✅ Función existe y responde correctamente');
      console.log('      Respuesta:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.log('   ❌ Error al invocar función:', err.message);
  }

  // 3. Verificar trigger handle_new_user
  console.log('\n3️⃣ Verificando trigger handle_new_user...');
  // No podemos verificar triggers directamente con el anon key,
  // pero podemos verificar si los nuevos usuarios reciben suscripción
  console.log('   ℹ️  Requiere verificación manual en Supabase Dashboard');
  console.log('   Query: SELECT tgname FROM pg_trigger WHERE tgname = \'on_auth_user_created\';');

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));

  if (usersWithoutSub > 0) {
    console.log(`❌ PROBLEMA CONFIRMADO: ${usersWithoutSub} usuarios sin suscripción`);
    console.log('\n✅ SOLUCIÓN RECOMENDADA:');
    console.log('   1. Aplicar migración: supabase/migrations/20260220_fix_auth_create_subscription.sql');
    console.log('   2. Esto creará suscripciones para usuarios existentes');
    console.log('   3. Actualizará el trigger para nuevos usuarios');
  } else {
    console.log('✅ No se encontraron usuarios sin suscripción');
    console.log('   Aun así, puedes aplicar la migración para mejorar el trigger');
  }

  console.log('\n📝 Para aplicar la migración:');
  console.log('   1. Ve a: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/sql/new');
  console.log('   2. Copia el contenido de: supabase/migrations/20260220_fix_auth_create_subscription.sql');
  console.log('   3. Ejecuta');
}

verifyIssues().catch(console.error);

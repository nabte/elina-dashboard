import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// Limpiar la URL: quitar /manager si viene en el secreto
const EVOLUTION_API_URL_RAW = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_URL = EVOLUTION_API_URL_RAW.replace(/\/manager\/?$/, '').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatPhoneNumber(input: string) {
    console.log(`[ONBOARDING] 📱 Procesando número original: ${input}`);

    // Limpiar el número: quitar símbolos y espacios
    let num = input.replace(/\D/g, '');

    // Detectar lada (1–3 dígitos)
    // Añadimos banderas simbólicas para el log
    const countries = [
        { lada: '52', flag: '🇲🇽', name: 'México' },
        { lada: '54', flag: '🇦🇷', name: 'Argentina' },
        { lada: '55', flag: '🇧🇷', name: 'Brasil' },
        { lada: '34', flag: '🇪🇸', name: 'España' },
        { lada: '1', flag: '🇺🇲', name: 'USA/Canada' },
        { lada: '502', flag: '🇬🇹', name: 'Guatemala' },
        { lada: '591', flag: '🇧🇴', name: 'Bolivia' },
        { lada: '597', flag: '🇸🇷', name: 'Surinam' }
    ];

    // Ordenar países por longitud de lada descendente para coincidir con el más específico primero
    countries.sort((a, b) => b.lada.length - a.lada.length);

    let country = countries.find(c => num.startsWith(c.lada));
    let lada = "";
    let resto = "";

    if (country) {
        lada = country.lada;
        resto = num.slice(lada.length);
        console.log(`[ONBOARDING] 📍 País detectado: ${country.flag} ${country.name} (Lada: ${lada})`);
    } else {
        lada = num.slice(0, 2);
        resto = num.slice(2);
        console.log(`[ONBOARDING] 📍 País desconocido. Usando prefijo: ${lada}`);
    }

    // Reglas por país
    if (lada === '52' && !resto.startsWith('1')) {
        console.log(`[ONBOARDING] 🛠️ Aplicando regla MX (Añadiendo '1' para WhatsApp)`);
        resto = '1' + resto;
    }

    if (lada === '54') {
        if (resto.startsWith('15')) {
            console.log(`[ONBOARDING] 🛠️ Aplicando regla AR (Quitando '15')`);
            resto = resto.slice(2);
        }
        if (!resto.startsWith('9')) {
            console.log(`[ONBOARDING] 🛠️ Aplicando regla AR (Añadiendo '9')`);
            resto = '9' + resto;
        }
    }

    if (lada === '55') {
        const add9Areas = ['11', '21', '22', '24', '27', '28'];
        const area = resto.slice(0, 2);
        if (add9Areas.includes(area) && !resto.startsWith('9')) {
            console.log(`[ONBOARDING] 🛠️ Aplicando regla BR (Añadiendo '9' para área ${area})`);
            resto = '9' + resto;
        }
    }

    const cleanNumber = lada + resto;
    console.log(`[ONBOARDING] ✅ Número formateado final: ${cleanNumber}`);
    return { cleanNumber, flag: country?.flag || '🌐' };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
        const { email, nombre, telefono_admin } = await req.json()

        console.log(`\n[ONBOARDING] 🚀 INICIANDO PROCESO PARA: ${email}`);

        // 1. Generar ID único de 4 dígitos para nombre de instancia
        const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const instanceName = `${nombre.trim()}-${uniqueId}`;
        console.log(`[ONBOARDING] 🏷️ Nombre de instancia generado: ${instanceName}`);

        // 2. Formatear teléfono
        const { cleanNumber, flag } = formatPhoneNumber(telefono_admin);

        // 3. Obtener User ID de Supabase Auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
        if (authError) throw authError;

        const user = users.find(u => u.email === email)
        if (!user) throw new Error(`Usuario no encontrado: ${email}`);

        // 4. Generar Slug Personalizado
        let baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!baseSlug || baseSlug.length < 3) {
            baseSlug = instanceName.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        const userSlug = baseSlug;
        console.log(`[ONBOARDING] 🐌 Slug generado: ${userSlug}`);

        // 5. Guardar datos en Supabase (SIN crear instancia todavía)
        console.log(`[SUPABASE] 📝 Guardando perfil en base de datos...`);
        const { error: dbError } = await supabase
            .from('profiles')
            .update({
                evolution_instance_name: instanceName,
                full_name: nombre,
                contact_phone: cleanNumber,
                email: email,
                slug: userSlug,
                whatsapp_connected: false, // Se conectará cuando el usuario escanee QR o ingrese código
                bulk_sends_used: 0,
                video_generations_used: 0,
                image_generations_used: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (dbError) throw dbError;
        console.log(`[SUPABASE] ✅ Perfil guardado. Usuario debe conectar WhatsApp desde el dashboard.`);

        console.log(`[SUCCESS] 🏁 ONBOARDING BÁSICO COMPLETADO PARA ${email}`);
        console.log(`[INFO] ℹ️ El usuario deberá conectar su WhatsApp desde el dashboard.\n`);

        return new Response(JSON.stringify({
            success: true,
            message: "Registro completado. Conecta tu WhatsApp desde el dashboard.",
            data: {
                instanceName: instanceName,
                phoneNumber: cleanNumber,
                requiresWhatsAppConnection: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error(`[FATAL ERROR] ❌ ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

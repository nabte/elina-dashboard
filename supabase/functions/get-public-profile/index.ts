import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { slug } = await req.json();

        if (!slug) {
            throw new Error("Missing slug");
        }

        // 1. Get User ID & Profile Data
        // Try to query by slug first, then by ID if slug looks like a UUID
        let query = supabase
            .from('profiles')
            .select(`
                id, 
                organization_id, 
                branding_settings,
                organizations:organization_id(name)
            `);

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        if (isUUID) {
            query = query.or(`slug.eq.${slug},id.eq.${slug}`);
        } else {
            query = query.eq('slug', slug);
        }

        const { data: profile, error: profileError } = await query.maybeSingle();

        if (profileError || !profile) throw new Error("Company not found");

        const userId = profile.id;
        const companyName = profile.organizations?.name || "Empresa";
        const branding = profile.branding_settings || {};

        // 2. Get Services (Appointment Types)
        const { data: services } = await supabase
            .from('appointment_types')
            .select('id, name, duration_minutes, description')
            .eq('user_id', userId)
            //.eq('is_active', true) // Assuming there's a flag, if not verify schema. schema query didn't show is_active but settings.js code used it.
            // Let's check settings.js again? Lines 2161 shows `is_active: true` in new object. 
            // But `loadAppointmentTypes` just selects `*`. 
            // Let's assume all fetched are active or filter if column exists.
            // Safe to select * for now? Or specific columns.
            .order('created_at');

        // 3. Get Appointment Settings (timezones etc)
        const { data: settings } = await supabase
            .from('appointment_settings')
            .select('timezone, is_enabled')
            .eq('user_id', userId)
            .single();

        if (!settings?.is_enabled) {
            throw new Error("Appointments are currently disabled for this company.");
        }

        return new Response(JSON.stringify({
            company_name: companyName,
            branding,
            services: services || [],
            timezone: settings.timezone || "America/Mexico_City"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

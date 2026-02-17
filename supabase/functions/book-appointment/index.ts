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
        const { slug, start_time, end_time, contact_name, contact_phone, contact_email, notes, appointment_type_id } = await req.json();

        if (!slug || !start_time || !end_time || !contact_name || !contact_phone) {
            throw new Error("Missing required fields: slug, start_time, end_time, contact_name, contact_phone");
        }

        // 1. Get User ID from Slug
        const { data: profile } = await supabase.from('profiles').select('id').eq('slug', slug).single();
        if (!profile) throw new Error("Company not found");
        const userId = profile.id;

        // 2. Check Availability (Overlap Check)
        // We check if there are any CONFIRMED or PENDING meetings that overlap.
        const { count, error: countError } = await supabase
            .from('meetings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['confirmed', 'pending'])
            .lt('start_time', end_time)
            .gt('end_time', start_time);

        if (countError) throw countError;
        if (count && count > 0) {
            return new Response(JSON.stringify({ error: "Time slot is no longer available" }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 3. Create/Get Contact
        // Clean phone number (simple logic)
        const phone = contact_phone.trim();
        let contactId;

        // Try to find existing contact by phone
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .eq('phone_number', phone)
            .limit(1);

        if (contacts && contacts.length > 0) {
            contactId = contacts[0].id;
            // Optional: Update email/name if provided? Let's skip to keep it simple/safe.
        } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase.from('contacts').insert({
                user_id: userId,
                full_name: contact_name,
                phone_number: phone,
                email: contact_email || null,
                is_active: true
            }).select().single();

            if (contactError) throw new Error("Error creating contact: " + contactError.message);
            contactId = newContact.id;
        }

        // 4. Create Meeting
        // Generate a secure external_id or just let it stay null? 
        // The previous create-appointment used random string.
        const externalId = `public_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const { data: meeting, error: meetingError } = await supabase.from('meetings').insert({
            user_id: userId,
            contact_id: contactId,
            start_time,
            end_time,
            summary: `Cita: ${contact_name}`,
            status: 'confirmed', // Auto-confirm public bookings for now, or use 'pending' if manual approval required?
            // User said "system accepts appointments with order". Let's assume confirmed if slot is free.
            appointment_type_id: appointment_type_id || null,
            notes: notes || "Booking from Public Page",
            external_id: externalId,
            confirmation_status: 'confirmed'
        }).select().single();

        if (meetingError) throw new Error("Error creating meeting: " + meetingError.message);

        return new Response(JSON.stringify({ success: true, meeting }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Booking Error:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

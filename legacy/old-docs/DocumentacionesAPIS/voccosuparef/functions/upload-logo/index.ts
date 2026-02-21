import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const formData = await req.formData();
        const imageFile = formData.get('image') as File;
        const clinicId = formData.get('clinic_id') as string;

        if (!imageFile || !clinicId) {
            throw new Error('Missing image or clinic_id');
        }

        // 1. Get clinic info
        const { data: clinic, error: clinicErr } = await supabaseClient
            .from('VOC_clinics')
            .select('slug, user_id')
            .eq('id', clinicId)
            .single();

        if (clinicErr || !clinic) throw new Error('Clinic not found');

        // 2. Get Hosting Config
        const { data: hostingConfig } = await supabaseClient
            .from('VOC_hosting_config')
            .select('*')
            .eq('clinic_id', clinicId)
            .maybeSingle();

        // 3. Image Optimization: Convert to WebP
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Decode image
        const decoded = await Image.decode(uint8Array);

        // Ensure we have an Image object (could be GIF or Frame)
        const image = decoded instanceof Image ? decoded : (Array.isArray(decoded) ? decoded[0] : decoded);

        if (!image || typeof image.resize !== 'function') {
            throw new Error('Could not process image: Invalid format or decoding failed.');
        }

        // Resize proportionally if more than 512px
        if (image.height > 512) {
            image.resize(Image.RESIZE_AUTO, 512);
        }

        // Fallback logic for encoding
        let webpData;
        try {
            // Try WebP first as requested
            webpData = await (image as any).encodeWEBP(80);
        } catch (e) {
            console.warn('WebP encoding failed, falling back to PNG:', e);
            webpData = await image.encode(80); // Fallback to PNG (high quality)
        }

        const isWebP = webpData.length > 0 && webpData[0] === 0x52 && webpData[1] === 0x49; // Simple check for RIFF (WebP)
        const finalType = isWebP ? 'image/webp' : 'image/png';
        const finalExt = isWebP ? 'webp' : 'png';
        const webpBlob = new Blob([webpData], { type: finalType });

        // 4. Prepare payload for the PHP Bridge
        const baseUrl = hostingConfig?.base_url || 'https://vocco.app/uploads/';
        const bridgeUrl = `${baseUrl}upload_bridge.php`;

        const timestamp = Date.now();
        const filename = `logo-${clinic.slug || clinic.user_id}-${timestamp}.${finalExt}`;

        const bridgeData = new FormData();
        bridgeData.append('image', webpBlob, filename);
        bridgeData.append('folder', clinic.slug || clinic.user_id);
        bridgeData.append('key', 'VOCCO_SECURE_KEY_2025');

        // 5. Send to Vocco Host
        const bridgeResponse = await fetch(bridgeUrl, {
            method: 'POST',
            body: bridgeData,
        });

        if (!bridgeResponse.ok) {
            const errorText = await bridgeResponse.text();
            throw new Error(`Hostinger bridge error: ${errorText || bridgeResponse.statusText}`);
        }

        const result = await bridgeResponse.json();
        const publicUrl = result.url;

        // 6. Update Clinic with the new URL
        const { error: updateErr } = await supabaseClient
            .from('VOC_clinics')
            .update({ logo_url: publicUrl })
            .eq('id', clinicId);

        if (updateErr) throw updateErr;

        return new Response(
            JSON.stringify({
                success: true,
                url: publicUrl,
                filename
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Upload Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

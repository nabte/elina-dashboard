// supabase/functions/bunny-upload/index.ts
// Función Edge para subir archivos directamente a Bunny.net CDN

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-folder, x-user-id, x-user-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, PUT'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get secrets from Supabase environment variables
    const BUNNY_STORAGE_ZONE_NAME = Deno.env.get('BUNNY_STORAGE_ZONE_NAME');
    const BUNNY_STORAGE_REGION_HOST = Deno.env.get('BUNNY_STORAGE_REGION_HOST') || 'storage.bunnycdn.com';
    const BUNNY_STORAGE_ACCESS_KEY = Deno.env.get('BUNNY_STORAGE_ACCESS_KEY');
    const BUNNY_PULL_ZONE_HOSTNAME = Deno.env.get('BUNNY_PULL_ZONE_HOSTNAME');

    if (!BUNNY_STORAGE_ZONE_NAME || !BUNNY_STORAGE_ACCESS_KEY || !BUNNY_PULL_ZONE_HOSTNAME) {
      throw new Error('Bunny.net secrets are not configured in Supabase environment variables.');
    }

    // 2. Get file info and buffer from the request
    const userId = req.headers.get('X-User-Id') || 'general';
    const userEmail = req.headers.get('X-User-Email');
    const folder = decodeURIComponent(req.headers.get('X-Folder') ?? 'general');
    const fileName = decodeURIComponent(req.headers.get('X-File-Name') ?? `file-${Date.now()}`);

    // Get file buffer from request body
    const fileBuffer = await req.arrayBuffer();

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw new Error('No file data provided');
    }

    // 3. Construct the destination path on Bunny.net
    // Format: Elina/{safeEmail}/{folder}/{timestamp}-{filename}
    const safeFolder = folder.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeEmail = (userEmail || userId).replace(/[^a-zA-Z0-9._-]/g, '_');
    const destinationPath = `Elina/${safeEmail}/${safeFolder}/${Date.now()}-${fileName}`;
    const bunnyUploadUrl = `https://${BUNNY_STORAGE_REGION_HOST}/${BUNNY_STORAGE_ZONE_NAME}/${destinationPath}`;

    // 4. Upload the file to Bunny.net Storage
    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_STORAGE_ACCESS_KEY,
        'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Bunny.net Error:', errorText);
      throw new Error(`Failed to upload file to Bunny.net (status: ${uploadResponse.status}): ${errorText}`);
    }

    // 5. Return the final CDN (Pull Zone) URL
    const cdnUrl = `https://${BUNNY_PULL_ZONE_HOSTNAME}/${destinationPath}`;

    return new Response(JSON.stringify({ cdnUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error('bunny-upload error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});


import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// --- Configuración de CORS y Bunny.net ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE_NAME');
const BUNNY_STORAGE_REGION_HOST = Deno.env.get('BUNNY_STORAGE_REGION_HOST') || 'storage.bunnycdn.com';
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_PULL_ZONE_HOSTNAME');
const BUNNY_API_KEY = Deno.env.get('BUNNY_STORAGE_ACCESS_KEY');

serve(async (req) => {
  // Manejar la petición pre-vuelo (preflight) de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // 1. Validar y parsear el cuerpo de la petición
    if (!BUNNY_API_KEY) {
      throw new Error("La clave de API de Bunny.net no está configurada en las variables de entorno.");
    }

    const { sourceUrl, userId, userEmail, b64_json, subfolder, fileName, folder } = await req.json();

    if (!userId || (!sourceUrl && !b64_json)) {
      throw new Error("Faltan parámetros. Se requiere 'userId' y 'sourceUrl' o 'b64_json'.");
    }

    // Usar userEmail si está disponible, sino usar userId como fallback
    const emailOrId = userEmail || userId;

    let fileBuffer: ArrayBuffer;
    let contentType: string;
    let originalFileName: string;

    if (sourceUrl) {
      console.log(`[SmartWorker] Procesando desde URL: ${sourceUrl}`);
      let sourceResponse: Response | undefined;

      // --- INICIO: Reintento automático para la descarga ---
      for (let i = 0; i < 3; i++) {
        sourceResponse = await fetch(sourceUrl);
        if (sourceResponse.ok) {
          break;
        }
        console.warn(`[SmartWorker] Intento ${i + 1} fallido para descargar ${sourceUrl}. Reintentando en 1 segundo...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      // --- FIN: Reintento automático ---

      if (!sourceResponse || !sourceResponse.ok) {
        throw new Error(`No se pudo descargar el archivo desde la URL de origen tras varios intentos (código: ${sourceResponse?.status}).`);
      }

      fileBuffer = await sourceResponse.arrayBuffer();
      contentType = sourceResponse.headers.get('content-type') || 'application/octet-stream';

      // CORRECCIÓN: Usar el fileName proporcionado desde el cliente si está disponible
      if (fileName) {
        originalFileName = fileName;
        console.log(`[SmartWorker] Usando nombre de archivo proporcionado: ${fileName}`);
      } else {
        // Si no se proporciona, extraer de la URL
        const urlParts = sourceUrl.split('/');
        originalFileName = urlParts[urlParts.length - 1];
      }
    } else if (b64_json) {
      console.log('[SmartWorker] Procesando desde base64...');
      fileBuffer = decodeBase64(b64_json).buffer;
      contentType = 'image/png'; // OpenAI con b64_json devuelve PNG
      originalFileName = `${Date.now()}.png`;
    } else {
      throw new Error("No se proporcionó ni 'sourceUrl' ni 'b64_json'.");
    }

    // 3. Construir el nombre final del archivo preservando la extensión original
    let finalFileName = originalFileName;

    // CORRECCIÓN: Solo añadir extensión si el archivo NO tiene ninguna extensión
    // No forzar .jpg si ya tiene una extensión válida (incluso si no es de imagen)
    const hasExtension = /\.([a-zA-Z0-9]+)$/.test(finalFileName);

    if (!hasExtension) {
      // Solo si no tiene extensión, intentar inferirla del Content-Type
      let extension = '';
      if (contentType.startsWith('image/')) {
        const subtype = contentType.split('/')[1];
        if (subtype) {
          extension = `.${subtype.split(';')[0].trim()}`;
        }
      } else if (contentType.startsWith('video/')) {
        const subtype = contentType.split('/')[1];
        if (subtype) {
          extension = `.${subtype.split(';')[0].trim()}`;
        }
      } else if (contentType.startsWith('audio/')) {
        const subtype = contentType.split('/')[1];
        if (subtype) {
          extension = `.${subtype.split(';')[0].trim()}`;
        }
      }

      // Si no se pudo inferir, usar .jpg como último recurso solo para imágenes
      if (!extension && contentType.startsWith('image/')) {
        extension = '.jpg';
      }

      if (extension) {
        finalFileName += extension;
        console.log(`[SmartWorker] Añadida extensión ${extension} al archivo sin extensión`);
      }
    } else {
      // El archivo ya tiene extensión, preservarla tal cual
      console.log(`[SmartWorker] Preservando extensión original: ${finalFileName}`);
    }

    // CORRECCIÓN: Usar la subcarpeta o folder si se proporciona e incluir carpeta madre 'Elina'
    const targetFolder = folder || subfolder || '';
    const safeEmailOrId = emailOrId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const basePath = targetFolder ? `Elina/${safeEmailOrId}/${targetFolder}` : `Elina/${safeEmailOrId}`;
    const destinationPath = `${basePath}/${Date.now()}-${finalFileName}`;
    const bunnyUploadUrl = `https://${BUNNY_STORAGE_REGION_HOST}/${BUNNY_STORAGE_ZONE}/${destinationPath}`;

    console.log(`[SmartWorker] Subiendo a Bunny.net en: ${destinationPath}`);

    // 4. Subir el archivo a Bunny.net
    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[SmartWorker] Error de Bunny.net:', errorText);
      throw new Error(`Error al subir el archivo a Bunny.net (código: ${uploadResponse.status}).`);
    }

    // 5. Devolver la URL final de la CDN
    const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${destinationPath}`;
    console.log(`[SmartWorker] ¡Éxito! URL final: ${cdnUrl}`);

    return new Response(JSON.stringify({
      cdnUrl
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[SmartWorker] Error general:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});


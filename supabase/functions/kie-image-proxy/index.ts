import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const KIE_API_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_API_KEY = Deno.env.get("KIE_API_KEY");

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    ...init,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      },
    });
  }

  if (!KIE_API_KEY) {
    return jsonResponse(
      { error: "KIE_API_KEY is not configured in the environment." },
      { status: 500 },
    );
  }

  try {
    // Si es GET, es una consulta de estado de tarea
    if (req.method === "GET") {
      const url = new URL(req.url);
      const taskId = url.searchParams.get("taskId");
      
      if (!taskId) {
        return jsonResponse(
          { error: "Missing required parameter `taskId`" },
          { status: 400 },
        );
      }

      const queryResponse = await fetch(`${KIE_QUERY_URL}?taskId=${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
        },
      });

      const text = await queryResponse.text();
      const asJson = text ? JSON.parse(text) : {};

      if (!queryResponse.ok) {
        return jsonResponse(
          { error: asJson?.msg ?? "Kie.ai query failed", details: asJson },
          { status: queryResponse.status },
        );
      }

      return jsonResponse(asJson);
    }

    // POST: Crear nueva tarea
    const payload = await req.json();

    // Validar modelo
    const model = payload.model;
    if (!model) {
      return jsonResponse(
        { error: "Missing required field `model`" },
        { status: 400 },
      );
    }

    // Validar según el modelo
    let inputParams: any = {};

    if (model === "google/imagen4-fast") {
      // Imagen4 Fast (Gemini desde KIE)
      if (!payload.prompt) {
        return jsonResponse(
          { error: "Missing required field `prompt` for imagen4-fast" },
          { status: 400 },
        );
      }

      inputParams = {
        prompt: payload.prompt,
        negative_prompt: payload.negative_prompt || "",
        aspect_ratio: payload.aspect_ratio || "16:9",
        num_images: payload.num_images || "1",
        seed: payload.seed || null,
      };
    } else if (model === "flux-2/pro-text-to-image") {
      // Flux 2 Pro Text-to-Image
      if (!payload.prompt) {
        return jsonResponse(
          { error: "Missing required field `prompt` for flux-2/pro-text-to-image" },
          { status: 400 },
        );
      }

      inputParams = {
        prompt: payload.prompt,
        aspect_ratio: payload.aspect_ratio || "1:1",
        resolution: payload.resolution || "1K",
      };
    } else if (model === "flux-2/pro-image-to-image") {
      // Flux 2 Pro Image-to-Image
      if (!payload.prompt) {
        return jsonResponse(
          { error: "Missing required field `prompt` for flux-2/pro-image-to-image" },
          { status: 400 },
        );
      }
      if (!payload.input_urls || !Array.isArray(payload.input_urls) || payload.input_urls.length === 0) {
        return jsonResponse(
          { error: "Missing required field `input_urls` (array) for flux-2/pro-image-to-image" },
          { status: 400 },
        );
      }

      inputParams = {
        input_urls: payload.input_urls,
        prompt: payload.prompt,
        aspect_ratio: payload.aspect_ratio || "1:1",
        resolution: payload.resolution || "1K",
      };
    } else if (model === "google/nano-banana-edit") {
      // Google Nano Banana Edit - Image-to-Image with up to 10 images
      if (!payload.prompt) {
        return jsonResponse(
          { error: "Missing required field `prompt` for google/nano-banana-edit" },
          { status: 400 },
        );
      }
      if (!payload.image_urls || !Array.isArray(payload.image_urls) || payload.image_urls.length === 0) {
        return jsonResponse(
          { error: "Missing required field `image_urls` (array) for google/nano-banana-edit. Up to 10 images supported." },
          { status: 400 },
        );
      }
      if (payload.image_urls.length > 10) {
        return jsonResponse(
          { error: "Maximum 10 images allowed for google/nano-banana-edit" },
          { status: 400 },
        );
      }

      inputParams = {
        prompt: payload.prompt,
        image_urls: payload.image_urls,
        output_format: payload.output_format || "png", // png or jpeg
        image_size: payload.image_size || "1:1", // 1:1, 9:16, 16:9, 3:4, 4:3, 3:2, 2:3, 5:4, 4:5, 21:9, auto
      };
    } else {
      return jsonResponse(
        { error: `Unsupported model: ${model}. Supported models: google/imagen4-fast, flux-2/pro-text-to-image, flux-2/pro-image-to-image, google/nano-banana-edit` },
        { status: 400 },
      );
    }

    // Crear tarea en KIE
    const kieResponse = await fetch(KIE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        callBackUrl: payload.callBackUrl ?? null,
        input: inputParams,
      }),
    });

    const text = await kieResponse.text();
    const asJson = text ? JSON.parse(text) : {};

    if (!kieResponse.ok) {
      return jsonResponse(
        { error: asJson?.msg ?? "Kie.ai request failed", details: asJson },
        { status: kieResponse.status },
      );
    }

    return jsonResponse(asJson);
  } catch (err) {
    console.error("kie-image-proxy error:", err);
    return jsonResponse(
      { error: "Unexpected error invoking Kie.ai", details: `${err}` },
      { status: 500 },
    );
  }
});

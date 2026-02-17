import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const KIE_VEO_URL = "https://api.kie.ai/api/v1/veo/generate";
const KIE_API_KEY = Deno.env.get("KIE_API_KEY");

function json(body: unknown, init: ResponseInit = {}): Response {
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (!KIE_API_KEY) {
    return json(
      { error: "KIE_API_KEY is not configured in the environment." },
      { status: 500 },
    );
  }

  try {
    const payload = await req.json();

    if (!payload?.prompt) {
      return json(
        { error: "Missing required field `prompt` in request body." },
        { status: 400 },
      );
    }

    const model = payload.model ?? "veo3_fast";
    // Por defecto: vertical (9:16) con Auto si no se especifica
    const aspectRatio = payload.aspectRatio ?? "Auto";
    const generationType = payload.generationType ?? "TEXT_2_VIDEO";

    const kieResponse = await fetch(KIE_VEO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        imageUrls: payload.imageUrls ?? undefined,
        model,
        watermark: payload.watermark ?? undefined,
        callBackUrl: payload.callBackUrl ?? undefined,
        aspectRatio,
        seeds: payload.seeds ?? undefined,
        enableTranslation: payload.enableTranslation ?? true,
        generationType,
      }),
    });

    const text = await kieResponse.text();
    const asJson = text ? JSON.parse(text) : {};

    if (!kieResponse.ok) {
      return json(
        { error: asJson?.msg ?? "Kie.ai request failed", details: asJson },
        { status: kieResponse.status },
      );
    }

    const kieTaskId = asJson?.data?.taskId ?? asJson?.data?.task_id ?? null;
    const kieCode = typeof asJson?.code === "number" ? asJson.code : Number.NaN;

    if ((Number.isFinite(kieCode) && kieCode !== 200) || !kieTaskId) {
      return json(
        {
          error: asJson?.msg ?? "Kie.ai request did not return a valid task id",
          details: asJson,
        },
        { status: 400 },
      );
    }

    if (kieTaskId && asJson?.data && typeof asJson.data === "object") {
      asJson.data.taskId = kieTaskId;
    }

    return json(asJson);
  } catch (err) {
    console.error("kie-veo-proxy error:", err);
    return json(
      { error: "Unexpected error invoking Kie.ai", details: `${err}` },
      { status: 500 },
    );
  }
});

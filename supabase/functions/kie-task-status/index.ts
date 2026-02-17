import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const KIE_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
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
    const taskId = payload?.taskId;

    if (!taskId || typeof taskId !== "string") {
      return json(
        { error: "Missing required field `taskId` in request body." },
        { status: 400 },
      );
    }

    const url = new URL(KIE_TASK_URL);
    url.searchParams.set("taskId", taskId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
      },
    });

    const text = await response.text();
    const asJson = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return json(
        { error: asJson?.message ?? "Kie.ai request failed", details: asJson },
        { status: response.status },
      );
    }

    return json(asJson);
  } catch (err) {
    console.error("kie-task-status error:", err);
    return json(
      { error: "Unexpected error fetching Kie.ai task", details: `${err}` },
      { status: 500 },
    );
  }
});

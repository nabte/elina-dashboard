import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const escalatePatterns = [
  { type: "call_me", patterns: [/ll[aá]mame/, /ll[aá]mar/i, /quiero hablar por tel/i] },
  { type: "human_agent", patterns: [/humano/i, /asesor/i, /persona real/i] },
  { type: "angry", patterns: [/enojad[ao]/i, /molest[oa]/i, /queja/i, /p[eé]sim[oa]/i, /horrible/i] },
  { type: "unresolved", patterns: [/no (me )?sirve/i, /no entiendes/i, /no puedes/i, /no resuelves/i] },
];

function detectEscalations(message: string): string[] {
  const lower = message.toLowerCase();
  const hits = new Set<string>();
  for (const rule of escalatePatterns) {
    if (rule.patterns.some((regex) => regex.test(lower))) {
      hits.add(rule.type);
    }
  }
  if (lower.includes("llamar") && lower.includes("urgente")) {
    hits.add("call_me");
  }
  if (lower.includes("cancelar") && lower.includes("servicio")) {
    hits.add("angry");
  }
  return Array.from(hits);
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const message = body?.message;
    if (!message || typeof message !== "string") {
      return jsonResponse({ error: "message is required." }, 400);
    }

    const escalations = detectEscalations(message);
    return jsonResponse({ escalations });
  } catch (err) {
    console.error("[classify-escalation] unexpected error:", err);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});

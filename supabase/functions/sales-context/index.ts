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

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  return error.message?.toLowerCase().includes("schema cache") ?? false;
}

function shouldFallbackToLegacyPrompts(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (isMissingRelationError(error)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("is_active") || message.includes("column");
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

async function fetchActiveSalesPrompt(userId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const selectLatestActive = () =>
    supabase
      .from("sales_prompts")
      .select("id,user_id,title,prompt,updated_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

  let { data, error } = await selectLatestActive();

  if (error && shouldFallbackToLegacyPrompts(error)) {
    ({ data, error } = await supabase
      .from("sales_prompts_active")
      .select("id,user_id,title,prompt,updated_at")
      .eq("user_id", userId)
      .limit(1));
  }

  if (error) throw error;
  return data?.[0] ?? null;
}

serve(async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    let promptRecord = null;
    try {
      promptRecord = await fetchActiveSalesPrompt(user.id);
    } catch (fetchErr) {
      console.error("[sales-context] fetch error:", fetchErr);
      return jsonResponse({ error: "Failed to load sales context." }, 500);
    }
    const context = promptRecord?.prompt ?? null;
    return jsonResponse({ context, raw: promptRecord ?? null });
  } catch (err) {
    console.error("[sales-context] unexpected error:", err);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});

// Edge Function para cerrar venta (confirmar pedido)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CloseSaleRequest {
  quote_id?: string;
  contact_id: number;
  user_id: string;
  payment_method?: string;
  shipping_address?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body: CloseSaleRequest = await req.json();
    const { quote_id, contact_id, user_id, payment_method, shipping_address } = body;

    if (!contact_id || !user_id) {
      return jsonResponse(
        { error: "Missing required fields: contact_id, user_id" },
        400
      );
    }

    let orderId: string;

    if (quote_id) {
      // Confirmar desde cotización
      const { data, error } = await supabase.rpc("confirm_order_from_quote", {
        p_quote_id: quote_id,
        p_payment_method: payment_method || "credito",
        p_shipping_address: shipping_address,
      });

      if (error) throw error;
      orderId = data;
    } else {
      // Crear orden directamente desde carrito
      // Primero crear cotización, luego confirmarla
      const { data: quoteId, error: quoteError } = await supabase.rpc(
        "create_quote_from_cart",
        {
          p_contact_id: contact_id,
          p_user_id: user_id,
          p_valid_days: 1,
        }
      );

      if (quoteError) throw quoteError;

      // Enviar cotización
      await supabase
        .from("quotes")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", quoteId);

      // Confirmar orden
      const { data, error } = await supabase.rpc("confirm_order_from_quote", {
        p_quote_id: quoteId,
        p_payment_method: payment_method || "credito",
        p_shipping_address: shipping_address,
      });

      if (error) throw error;
      orderId = data;
    }

    // Obtener datos de la orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, contacts:contact_id(full_name, phone_number)")
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    return jsonResponse({
      success: true,
      order_id: orderId,
      order: order,
      message: "Pedido confirmado exitosamente",
    });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});


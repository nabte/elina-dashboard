import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Parse Optional Body (for manual triggering)
        let user_id = null;
        let batch_size = 25; // Optimized: reduced from 50 to prevent timeouts

        try {
            const body = await req.json();
            user_id = body.user_id;
            if (body.batch_size) batch_size = body.batch_size;
        } catch {
            // Body is optional (e.g. if called from Cron)
        }

        // Initialize Admin Client (Service Role is required for cross-tenant access)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        console.log(`🤖 Batch Processor Started. User Filter: ${user_id || 'ALL (Global)'}`);

        // Build Query
        let query = supabase
            .from("products")
            .select("id, user_id, product_name, sku, description")
            .is("description_embedding", null)      // Only those missing embeddings
            .not("description", "is", null)         // Only those having a description
            .limit(batch_size);

        // Apply strict filter if user_id is provided
        if (user_id) {
            query = query.eq("user_id", user_id);
        }

        const { data: products, error: fetchError } = await query;

        if (fetchError) {
            throw new Error(`Error fetching products queue: ${fetchError.message}`);
        }

        if (!products || products.length === 0) {
            console.log("💤 No pending products found. Sleeping.");
            return new Response(
                JSON.stringify({
                    message: "Queue empty. No products need embedding generation.",
                    processed: 0
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📦 Processing batch of ${products.length} products...`);

        let successCount = 0;
        let errorCount = 0;

        // Process batch with concurrent requests (optimized)
        const CONCURRENT_LIMIT = 5; // Process 5 products in parallel

        for (let i = 0; i < products.length; i += CONCURRENT_LIMIT) {
            const batch = products.slice(i, i + CONCURRENT_LIMIT);

            const results = await Promise.allSettled(
                batch.map(async (product) => {
                    try {
                        // Prepare text: "Name SKU Description"
                        const textForEmbedding = [
                            product.product_name,
                            product.sku,
                            product.description
                        ]
                            .filter(Boolean)
                            .join(" ");

                        // Call embedding generation with timeout
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                        const embeddingResponse = await fetch(
                            `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-embedding-with-cache`,
                            {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    text: textForEmbedding,
                                    model: "text-embedding-3-small",
                                    user_id: product.user_id,
                                }),
                                signal: controller.signal
                            }
                        );

                        clearTimeout(timeoutId);

                        if (!embeddingResponse.ok) {
                            throw new Error(`HTTP ${embeddingResponse.status}`);
                        }

                        const { embedding } = await embeddingResponse.json();

                        // Update the product
                        const { error: updateError } = await supabase
                            .from("products")
                            .update({ description_embedding: embedding })
                            .eq("id", product.id);

                        if (updateError) {
                            throw updateError;
                        }

                        return { success: true, id: product.id };
                    } catch (err) {
                        console.error(`❌ Product ${product.id}:`, err);
                        return { success: false, id: product.id, error: err };
                    }
                })
            );

            // Count results
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            });

            // Progress logging
            console.log(`📊 Progress: ${Math.min(i + CONCURRENT_LIMIT, products.length)}/${products.length} | ✅ ${successCount} | ❌ ${errorCount}`);
        }

        console.log(`✅ Batch Complete. Success: ${successCount}, Errors: ${errorCount}`);

        return new Response(
            JSON.stringify({
                message: "Batch processing complete",
                processed: successCount,
                errors: errorCount,
                remaining_hint: products.length === batch_size ? "more_pending" : "done"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("🔥 Fatal Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

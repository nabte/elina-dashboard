// Script para generar embeddings de productos
// Ejecutar con: deno run --allow-net --allow-env generate_embeddings.ts

const SUPABASE_URL = "https://mytvwfbijlgbihlegmfg.supabase.co";
const USER_ID = "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f";

// Necesitarás tu SUPABASE_SERVICE_ROLE_KEY
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "TU_SERVICE_ROLE_KEY_AQUI";

async function generateEmbeddings() {
    console.log("🚀 Iniciando generación de embeddings...");

    let totalProcessed = 0;
    let batch = 1;

    while (true) {
        console.log(`\n📦 Procesando lote ${batch}...`);

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/generate-product-embeddings`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: USER_ID,
                    batch_size: 50,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Error en lote ${batch}:`, error);
            break;
        }

        const result = await response.json();
        console.log(`✅ Lote ${batch} completado:`, result);

        totalProcessed += result.processed;

        // Si no hay más productos para procesar, terminar
        if (result.processed === 0) {
            console.log("\n🎉 ¡Todos los embeddings han sido generados!");
            break;
        }

        batch++;

        // Pequeña pausa entre lotes para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Total de productos procesados: ${totalProcessed}`);
}

generateEmbeddings().catch(console.error);

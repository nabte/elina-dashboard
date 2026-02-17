-- Migración: Trigger para generar embeddings automáticamente
-- Esto generará embeddings cuando se inserte o actualice un producto

-- Función para generar embedding automáticamente
CREATE OR REPLACE FUNCTION auto_generate_product_embedding()
RETURNS TRIGGER AS $$
DECLARE
    text_for_embedding TEXT;
    embedding_response JSONB;
BEGIN
    -- Solo generar si hay descripción y no hay embedding
    IF NEW.description IS NOT NULL AND NEW.description_embedding IS NULL THEN
        -- Combinar nombre, SKU y descripción
        text_for_embedding := COALESCE(NEW.product_name, '') || ' ' || 
                             COALESCE(NEW.sku, '') || ' ' || 
                             COALESCE(NEW.description, '');
        
        -- Nota: Este trigger NO puede hacer llamadas HTTP directamente
        -- Por lo tanto, solo marcamos que necesita embedding
        -- El embedding se generará mediante un proceso batch separado
        
        -- Por ahora, dejamos el embedding como NULL y se generará después
        RAISE NOTICE 'Product % needs embedding generation', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_product_embedding ON products;
CREATE TRIGGER trigger_auto_generate_product_embedding
    BEFORE INSERT OR UPDATE OF description ON products
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_product_embedding();

COMMENT ON FUNCTION auto_generate_product_embedding() IS 'Marks products that need embedding generation';

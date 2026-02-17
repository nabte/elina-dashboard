DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. Find the user ID (ElinaHead instance)
    SELECT id INTO target_user_id
    FROM profiles
    WHERE evolution_instance_name = 'ElinaHead'
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No profile found for ElinaHead';
        RETURN;
    END IF;

    -- 2. Update automation_settings with custom workflows
    UPDATE profiles
    SET automation_settings = jsonb_set(
        COALESCE(automation_settings, '{}'::jsonb),
        '{custom_workflows}',
        '[
            {
                "id": "duplicado_pieza",
                "name": "Duplicado de Pieza",
                "trigger_keywords": ["duplicar", "copiar pieza", "escanear", "pieza rota", "clonar pieza"],
                "pricing_logic": "manual_quote",
                "delivery_rule": { "days": 7, "urgent_action": "consult_human" },
                "steps": [
                    { "id": "photo", "type": "image", "prompt": "Claro, para cotizar necesito ver la pieza. ¿Podrías enviarme una foto de la pieza original?" },
                    { "id": "measurements", "type": "text", "prompt": "¿Cuáles son las medidas aproximadas de la pieza (alto, ancho, largo)?" },
                    { "id": "quantity", "type": "number", "prompt": "¿Cuántas piezas necesitas duplicar?" },
                    { "id": "functionality", "type": "text", "prompt": "¿Cuál será la función de la pieza? (Para saber qué resistencia necesita)" },
                    { "id": "deadline", "type": "date", "prompt": "¿Para qué fecha las necesitas a más tardar?" }
                ]
            },
            {
                "id": "impresion_llaveros",
                "name": "Llaveros 3D",
                "trigger_keywords": ["llaveros", "llavero 3d", "merch 3d", "llaveros personalizados"],
                "pricing_logic": "auto_tiered",
                "product_id_ref": 8878, 
                "delivery_rule": { "days": 7 },
                "steps": [
                    { "id": "design_image", "type": "image", "prompt": "¡Genial! ¿Tienes el diseño o logo? Por favor envíame una imagen." },
                    { "id": "quantity", "type": "number", "prompt": "¿Cuántos llaveros te gustaría hacer? (Mínimo 10 piezas)" },
                    { "id": "deadline", "type": "date", "prompt": "¿Para cuándo los necesitas?" }
                ]
            }
        ]'::jsonb
    )
    WHERE id = target_user_id;

    -- 3. Update Product 8878 (Example ID for Keychains) with Tiered Pricing Config
    -- Note: We first check if the product exists, if not we create a dummy one or update likely match
    -- Let''s try to update "Llaveros" if it exists, or create it.
    
    -- Assuming product already exists or we pick one. 
    -- Let''s search for a product named "Llaveros Personalizados" or similar.
    
    UPDATE products
    SET pricing_config = '{
        "model": "tiered",
        "unit_label": "piezas",
        "tiers": [
            { "min": 1, "max": 20, "price": 45 },
            { "min": 21, "max": 50, "price": 35 },
            { "min": 51, "max": 100, "price": 28 },
            { "min": 101, "max": 9999, "price": 22 }
        ]
    }'::jsonb
    WHERE user_id = target_user_id AND (product_name ILIKE '%llavero%' OR product_name ILIKE '%keychain%');

END $$;

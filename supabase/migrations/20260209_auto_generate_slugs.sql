-- Migration: Auto-generate booking slugs from business name
-- This migration creates a function to auto-generate slugs and applies it to existing profiles

-- Function to generate slug from text
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Convert to lowercase, remove accents, replace spaces/special chars with hyphens
    slug := lower(unaccent(text_input));
    slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
    slug := regexp_replace(slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing hyphens
    slug := substring(slug, 1, 50); -- Limit length
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing profiles that don't have a slug or have the default 'agendar'
UPDATE profiles
SET slug = generate_slug(
    COALESCE(
        company_name,
        business_name,
        CONCAT('negocio-', id::text)
    )
)
WHERE slug IS NULL 
   OR slug = 'agendar'
   OR slug = '';

-- Add trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' OR NEW.slug = 'agendar' THEN
        NEW.slug := generate_slug(
            COALESCE(
                NEW.company_name,
                NEW.business_name,
                CONCAT('negocio-', NEW.id::text)
            )
        );
        
        -- Ensure uniqueness by appending number if needed
        WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = NEW.slug AND id != NEW.id) LOOP
            NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON profiles;
CREATE TRIGGER trigger_auto_generate_slug
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slug();

-- Comment
COMMENT ON FUNCTION generate_slug(TEXT) IS 'Generates URL-safe slug from business name';
COMMENT ON FUNCTION auto_generate_slug() IS 'Trigger function to auto-generate booking slug from company name';

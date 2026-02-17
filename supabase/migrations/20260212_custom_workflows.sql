-- Add pricing_config column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_config JSONB;

COMMENT ON COLUMN products.pricing_config IS 'Configuration for tiered, variable, or custom pricing models (e.g., {"model": "tiered", "tiers": [...]})';

-- Migration to add discount_percent and tax_percent to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 0;

-- Ensure RLS policies allow update (if not already handled)
-- Usually existing update policies cover new columns if they use 'check' on rows, 
-- but we should verify if there are column-specific restrictions. 
-- Assuming standard policies, this ALTER TABLE is enough.

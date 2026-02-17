-- Add knowledge fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS benefits TEXT,
ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::JSONB;

-- Comment on new columns
COMMENT ON COLUMN public.products.benefits IS 'Key benefits of the product for sales pitch';
COMMENT ON COLUMN public.products.usage_instructions IS 'Instructions on how to use the product';
COMMENT ON COLUMN public.products.faq IS 'List of frequently asked questions and answers';

-- Create storage bucket for audio if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiostemp', 'audiostemp', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to audio bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'audiostemp' );

-- Policy to allow authorized uploads (service role or authenticated users)
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'audiostemp' );

-- Tabla de Configuración de Cotizaciones
-- Permite personalizar el diseño y contenido de los PDFs de cotizaciones

CREATE TABLE IF NOT EXISTS public.quote_settings (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name text,
    company_type text, -- 'individual', 'business', 'corporation', etc.
    company_logo_url text, -- URL del logo en Bunny.net
    company_address text,
    company_phone text,
    company_email text,
    company_website text,
    business_hours text, -- Horarios de atención
    tax_id text, -- RFC, NIT, etc.
    footer_text text, -- Texto personalizado para el pie de página
    show_logo boolean DEFAULT true,
    show_address boolean DEFAULT true,
    show_phone boolean DEFAULT true,
    show_email boolean DEFAULT true,
    show_website boolean DEFAULT false,
    show_tax_id boolean DEFAULT false,
    show_business_hours boolean DEFAULT true,
    primary_color text DEFAULT '#000000', -- Color principal del PDF
    secondary_color text DEFAULT '#666666', -- Color secundario
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (user_id)
);

-- Habilitar RLS
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver/editar su propia configuración
CREATE POLICY "Users can view own quote settings"
    ON public.quote_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quote settings"
    ON public.quote_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quote settings"
    ON public.quote_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_quote_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_quote_settings_updated_at
    BEFORE UPDATE ON public.quote_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quote_settings_updated_at();


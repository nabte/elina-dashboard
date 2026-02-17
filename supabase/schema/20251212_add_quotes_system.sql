-- Sistema de Cotizaciones en PDF para Elina V4
-- Fecha: 2025-12-12
-- Descripción: Tabla y funciones para gestionar cotizaciones con IDs secuenciales por usuario

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS public.quotes (
    id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id bigint NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    subtotal numeric NOT NULL DEFAULT 0,
    discount numeric NOT NULL DEFAULT 0,
    tax numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    valid_until timestamptz,
    pdf_url text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (user_id, id) -- Clave primaria compuesta para permitir secuencias independientes por usuario
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON public.quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- Función para generar ID secuencial por usuario
CREATE OR REPLACE FUNCTION public.generate_quote_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_number integer;
    v_quote_id text;
BEGIN
    -- Obtener el siguiente número secuencial para este usuario
    -- Extraer el número del ID más alto para este usuario
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(id FROM 'COT-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_next_number
    FROM public.quotes
    WHERE user_id = p_user_id
    AND id ~ '^COT-\d+$'; -- Solo considerar IDs con formato COT-XXX
    
    -- Si no hay cotizaciones previas, empezar en 1
    IF v_next_number IS NULL THEN
        v_next_number := 1;
    END IF;
    
    -- Formatear como COT-001, COT-002, etc. (3 dígitos mínimo)
    v_quote_id := 'COT-' || LPAD(v_next_number::text, 3, '0');
    
    RETURN v_quote_id;
END;
$$;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quotes_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias cotizaciones
CREATE POLICY "Users can view their own quotes"
    ON public.quotes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propias cotizaciones
CREATE POLICY "Users can insert their own quotes"
    ON public.quotes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propias cotizaciones
CREATE POLICY "Users can update their own quotes"
    ON public.quotes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propias cotizaciones
CREATE POLICY "Users can delete their own quotes"
    ON public.quotes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comentarios en la tabla
COMMENT ON TABLE public.quotes IS 'Tabla de cotizaciones con IDs secuenciales independientes por usuario';
COMMENT ON COLUMN public.quotes.id IS 'ID de cotización en formato COT-001, COT-002, etc. (secuencial por usuario)';
COMMENT ON COLUMN public.quotes.items IS 'Array JSON con productos: [{"product_id": 123, "quantity": 2, "price": 100.00, ...}]';
COMMENT ON COLUMN public.quotes.pdf_url IS 'URL del PDF almacenado en Bunny.net CDN';
COMMENT ON FUNCTION public.generate_quote_id(uuid) IS 'Genera un ID secuencial de cotización (COT-XXX) para el usuario especificado';


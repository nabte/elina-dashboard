-- SCRIPT: Automate default prompt creation for new users
-- This script ensures every existing user has a prompt and every new user gets one automatically.

-- 1. Create the default prompt content as a variable or just use it in the trigger
-- We'll use a simple but effective default prompt.

-- 2. Backfill existing users who don't have a prompt
INSERT INTO public.prompts (user_id, prompt_content)
SELECT p.id, '# Instrucciones del Asistente

Eres un asistente de ventas inteligente para %empresa%. Tu objetivo es ayudar a los clientes y cerrar ventas de manera profesional.

## REGLAS:
1. Saluda amablemente usando %nombre% si está disponible.
2. Mantén un tono servicial y experto.
3. Si el cliente tiene dudas sobre precios, consulta el catálogo.
4. Siempre intenta guiar al cliente hacia el siguiente paso de la compra.

## FORMATO:
- Usa párrafos cortos.
- Usa emojis para ser amigable 🚀.
'
FROM public.profiles p
LEFT JOIN public.prompts pr ON p.id = pr.user_id
WHERE pr.user_id IS NULL;

-- 3. Create a function to handle new user prompt creation
CREATE OR REPLACE FUNCTION public.handle_new_user_prompt()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.prompts (user_id, prompt_content)
    VALUES (
        NEW.id, 
        '# Instrucciones del Asistente

Eres un asistente de ventas inteligente para %empresa%. Tu objetivo es ayudar a los clientes y cerrar ventas de manera profesional.

## REGLAS:
1. Saluda amablemente usando %nombre% si está disponible.
2. Mantén un tono servicial y experto.
3. Si el cliente tiene dudas sobre precios, consulta el catálogo.
4. Siempre intenta guiar al cliente hacia el siguiente paso de la compra.

## FORMATO:
- Usa párrafos cortos.
- Usa emojis para ser amigable 🚀.
'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on the profiles table
DROP TRIGGER IF EXISTS trg_on_auth_user_created_prompt ON public.profiles;
CREATE TRIGGER trg_on_auth_user_created_prompt
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_prompt();

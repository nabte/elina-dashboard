# Instrucciones Finales - Corrección de Errores

## 1. Actualizar n8n (CRÍTICO)
El error que me mostraste (`contact_id: -15301...`) indica que **todavía estás usando la versión anterior** del workflow. Esa versión generaba números negativos, lo cual ya no soportamos.
La nueva versión (que ya te envié) llama directamente a Supabase para obtener un contacto real.

**Pasos:**
1. Ve a n8n.
2. **Borra** el workflow actual de "Simulación".
3. Importa de nuevo el archivo `n8n/Elina V4 Simulacion COMPLETO.json` (asegúrate que es la versión más reciente que guardé hace unos momentos).
4. **Activa** el workflow.

**¿Cómo saber si tengo la versión correcta?**
Si abres el nodo "buscar contacto1", en la versión NUEVA su tipo es **"HTTP Request"**. Si sigue siendo "Code" (Javascript), es la vieja.

## 2. Arreglar Tabla Prompts (Error 400)
El error 400 al guardar el prompt sucede porque tu tabla `prompts` no tiene la restricción `UNIQUE` en `user_id`, por lo que el `upsert` falla.

**Pasos:**
1. Ve al Editor SQL de Supabase.
2. Copia y ejecuta el siguiente script "nuclear" (borra y recrea la tabla para garantizar que esté bien):

```sql
DROP TABLE IF EXISTS public.prompts CASCADE;

CREATE TABLE public.prompts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompt" ON public.prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own prompt" ON public.prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prompt" ON public.prompts FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER trg_prompts_updated_at BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

## 3. Arreglar Tabla Contacts (Error "column name/phone does not exist")
El error que tuviste antes ("column name does not exist") fue porque intenté insertar en una columna que no existía.

**Pasos:**
1. Ve al Editor SQL de Supabase.
2. Ejecuta este script corregido para la función de simulación:

```sql
CREATE OR REPLACE FUNCTION get_or_create_simulation_contact(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contact_id BIGINT;
    v_contact RECORD;
BEGIN
    -- 1. Buscar contacto existente
    SELECT * INTO v_contact FROM contacts WHERE user_id = p_user_id AND is_simulation = true LIMIT 1;
    IF FOUND THEN RETURN to_jsonb(v_contact); END IF;

    -- 2. Crear nuevo (con los nombres de columna correctos 'full_name' y 'phone_number')
    INSERT INTO contacts (user_id, full_name, phone_number, is_simulation, created_at, updated_at)
    VALUES (p_user_id, 'Usuario de Simulación', 'SIM-' || substring(p_user_id::text from 1 for 8), true, now(), now())
    RETURNING * INTO v_contact;

    RETURN to_jsonb(v_contact);
END;
$$;
```

Haz estos tres pasos en orden y todo funcionará.

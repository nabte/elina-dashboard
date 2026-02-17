-- ============================================
-- Asegurar que el Plan Business esté configurado correctamente
-- ============================================
-- Este script verifica y configura el plan business con todas sus características

-- Verificar si el plan business existe
DO $$
DECLARE
  v_plan_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.plans WHERE id = 'business') INTO v_plan_exists;
  
  IF NOT v_plan_exists THEN
    -- Crear el plan business si no existe
    INSERT INTO public.plans (
      id,
      name,
      image_generations_limit,
      video_generations_limit,
      ai_enhancements_limit,
      bulk_sends_limit,
      templates_limit,
      features,
      max_advisors
    )
    VALUES (
      'business',
      'Business',
      150,  -- 150 imágenes
      25,   -- 25 videos VEO 3.1
      0,    -- Sin límite de mejoras de texto (o ajustar según necesidad)
      0,    -- Sin límite de envíos masivos (o ajustar según necesidad)
      0,    -- Sin límite de plantillas (o ajustar según necesidad)
      jsonb_build_object(
        'multi_user', true,
        'follow_ups', true,
        'designer_ai', true,
        'video_ai', true
      ),
      2     -- 2 advisors por defecto (configurable)
    );
    RAISE NOTICE 'Plan business creado exitosamente';
  ELSE
    RAISE NOTICE 'Plan business ya existe, actualizando configuración...';
  END IF;
END $$;

-- Actualizar el plan business con las características correctas
UPDATE public.plans
SET 
  name = COALESCE(name, 'Business'),
  image_generations_limit = COALESCE(image_generations_limit, 150),
  video_generations_limit = COALESCE(video_generations_limit, 25),
  ai_enhancements_limit = COALESCE(ai_enhancements_limit, 0),
  bulk_sends_limit = COALESCE(bulk_sends_limit, 0),
  templates_limit = COALESCE(templates_limit, 0),
  features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
    'multi_user', true,
    'follow_ups', COALESCE(features->>'follow_ups', 'true')::boolean,
    'designer_ai', COALESCE(features->>'designer_ai', 'true')::boolean,
    'video_ai', COALESCE(features->>'video_ai', 'true')::boolean
  ),
  max_advisors = COALESCE(max_advisors, 2)
WHERE id = 'business';

-- Agregar columna max_advisors si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'plans' 
    AND column_name = 'max_advisors'
  ) THEN
    ALTER TABLE public.plans ADD COLUMN max_advisors INTEGER DEFAULT 2;
    RAISE NOTICE 'Columna max_advisors agregada a la tabla plans';
  END IF;
END $$;

-- Verificar configuración final
SELECT 
  id,
  name,
  image_generations_limit,
  video_generations_limit,
  ai_enhancements_limit,
  bulk_sends_limit,
  templates_limit,
  features->>'multi_user' as multi_user,
  features->>'follow_ups' as follow_ups,
  features->>'designer_ai' as designer_ai,
  features->>'video_ai' as video_ai,
  max_advisors
FROM public.plans
WHERE id = 'business';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Plan business configurado correctamente';
  RAISE NOTICE '   - 150 imágenes + 25 videos VEO 3.1';
  RAISE NOTICE '   - Multi-usuario habilitado';
  RAISE NOTICE '   - Límite de advisors: 2 (configurable)';
END $$;


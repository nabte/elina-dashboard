-- ============================================
-- Verificación y Actualización de Límites por Plan
-- ============================================
-- Este script verifica que los planes tengan los límites correctos
-- según PLANES_ELINA_ANALISIS.md

-- ============================================
-- Verificar límites actuales
-- ============================================
SELECT 
  id,
  name,
  ai_enhancements_limit,
  image_generations_limit,
  video_generations_limit,
  bulk_sends_limit
FROM public.plans
WHERE id IN ('free_trial', 'starter', 'grow', 'business')
ORDER BY 
  CASE id
    WHEN 'free_trial' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'grow' THEN 3
    WHEN 'business' THEN 4
  END;

-- ============================================
-- Actualizar límites según especificaciones
-- ============================================
-- Nota: Los límites exactos deben verificarse manualmente
-- Este script solo muestra los valores esperados

-- Starter: 300 respuestas IA y 30 imágenes
UPDATE public.plans
SET 
  ai_enhancements_limit = COALESCE(ai_enhancements_limit, 300),
  image_generations_limit = COALESCE(image_generations_limit, 30),
  video_generations_limit = COALESCE(video_generations_limit, 0)
WHERE id = 'starter'
  AND (ai_enhancements_limit IS NULL OR ai_enhancements_limit != 300 
       OR image_generations_limit IS NULL OR image_generations_limit != 30);

-- Grow: 80 imágenes + 12 videos
UPDATE public.plans
SET 
  ai_enhancements_limit = COALESCE(ai_enhancements_limit, 0),
  image_generations_limit = COALESCE(image_generations_limit, 80),
  video_generations_limit = COALESCE(video_generations_limit, 12)
WHERE id = 'grow'
  AND (image_generations_limit IS NULL OR image_generations_limit != 80 
       OR video_generations_limit IS NULL OR video_generations_limit != 12);

-- Business: 150 imágenes + 25 videos
UPDATE public.plans
SET 
  ai_enhancements_limit = COALESCE(ai_enhancements_limit, 0),
  image_generations_limit = COALESCE(image_generations_limit, 150),
  video_generations_limit = COALESCE(video_generations_limit, 25)
WHERE id = 'business'
  AND (image_generations_limit IS NULL OR image_generations_limit != 150 
       OR video_generations_limit IS NULL OR video_generations_limit != 25);

-- Free Trial: Límites de prueba (ajustar según necesidad)
UPDATE public.plans
SET 
  ai_enhancements_limit = COALESCE(ai_enhancements_limit, 50),
  image_generations_limit = COALESCE(image_generations_limit, 5),
  video_generations_limit = COALESCE(video_generations_limit, 0)
WHERE id = 'free_trial'
  AND (ai_enhancements_limit IS NULL OR image_generations_limit IS NULL);

-- ============================================
-- Verificar límites después de actualización
-- ============================================
SELECT 
  id,
  name,
  ai_enhancements_limit,
  image_generations_limit,
  video_generations_limit,
  bulk_sends_limit,
  features->>'multi_user' as multi_user
FROM public.plans
WHERE id IN ('free_trial', 'starter', 'grow', 'business')
ORDER BY 
  CASE id
    WHEN 'free_trial' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'grow' THEN 3
    WHEN 'business' THEN 4
  END;

-- ============================================
-- Nota sobre límite de 50 usos
-- ============================================
-- El plan menciona un "límite de 50 usos" pero no está claro si es:
-- 1. Un límite global (suma de todos los tipos de uso)
-- 2. Un límite por tipo de uso
-- 3. Un límite específico del free_trial
-- 
-- Por ahora, se ha configurado free_trial con 50 mejoras de texto
-- Si el límite de 50 es global, se necesitaría una función adicional
-- para verificar el uso total (texto + imágenes + videos)


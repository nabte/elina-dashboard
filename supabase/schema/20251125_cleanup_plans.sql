-- ============================================
-- Limpieza de Planes - Eliminar planes de otro servicio
-- ============================================
-- Este script elimina los planes que NO pertenecen a Elina
-- y mantiene solo los 4 planes correctos:
-- 1. free_trial - Prueba Gratuita
-- 2. starter - Plan Starter
-- 3. grow - Plan Grow
-- 4. business - Plan Business

-- ⚠️ IMPORTANTE: Verifica que no haya usuarios con estos planes antes de ejecutar
-- Si hay usuarios con estos planes, primero migra sus suscripciones

-- Verificar usuarios con planes a eliminar
DO $$
DECLARE
  v_users_with_deleted_plans integer;
BEGIN
  SELECT COUNT(*) INTO v_users_with_deleted_plans
  FROM public.subscriptions
  WHERE plan_id IN ('crecimiento', 'empresarial', 'gratuito', 'solopreneur');
  
  IF v_users_with_deleted_plans > 0 THEN
    RAISE EXCEPTION 'Hay % usuarios con planes que se van a eliminar. Primero migra sus suscripciones a otro plan.', v_users_with_deleted_plans;
  END IF;
END $$;

-- Eliminar planes que NO pertenecen a Elina
DELETE FROM public.plans 
WHERE id IN ('crecimiento', 'empresarial', 'gratuito', 'solopreneur');

-- Verificar que solo quedan los 4 planes correctos
DO $$
DECLARE
  v_remaining_plans integer;
  v_expected_plans text[] := ARRAY['free_trial', 'starter', 'grow', 'business'];
  v_missing_plans text[];
BEGIN
  SELECT COUNT(*) INTO v_remaining_plans
  FROM public.plans
  WHERE id = ANY(v_expected_plans);
  
  IF v_remaining_plans != 4 THEN
    SELECT array_agg(id) INTO v_missing_plans
    FROM unnest(v_expected_plans) AS id
    WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plans.id = id);
    
    RAISE WARNING 'Faltan algunos planes esperados: %', v_missing_plans;
  END IF;
END $$;

-- Mostrar planes restantes
SELECT 
  id,
  name,
  price_monthly,
  max_advisors,
  features->>'multi_user' as multi_user
FROM public.plans
ORDER BY 
  CASE id
    WHEN 'free_trial' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'grow' THEN 3
    WHEN 'business' THEN 4
    ELSE 5
  END;


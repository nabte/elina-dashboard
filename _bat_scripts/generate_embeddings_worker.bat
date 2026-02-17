@echo off
setlocal EnableDelayedExpansion

REM Configuración
set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-product-embeddings
REM Reemplaza con tu SERVICE_ROLE_KEY real o setear en variable de entorno
if "%SERVICE_KEY%"=="" set SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

echo ===================================================
echo   GLOBAL EMBEDDINGS WORKER (Multi-Tenant)
echo ===================================================
echo.
echo Este script se ejecuta cada minuto para procesar productos pendientes.
echo PROCESA TODAS LAS CUENTAS AUTOMATICAMENTE.
echo.

:LOOP
echo [%DATE% %TIME%] Verificando productos pendientes...

REM Llamada a la API (Batch global de 20 productos)
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"batch_size\":20}" > response.json

REM Mostrar un resumen simple (leeremos las primeras lineas o simplemente confirmamos)
type response.json
echo.

REM Esperar 60 segundos (1 minuto) antes del siguiente ciclo
echo Esperando 60 segundos...
timeout /t 60 /nobreak >nul
goto LOOP

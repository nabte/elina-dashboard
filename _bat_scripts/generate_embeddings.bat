@echo off
echo Generando embeddings para productos...
echo.

REM Reemplaza con tu SERVICE_ROLE_KEY real
set SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTYxNDk3NiwiZXhwIjoyMDQ3MTkwOTc2fQ.YOUR_KEY_HERE

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-product-embeddings
set USER_ID=f2ef49c6-4646-42f8-8130-aa5cd0d3c84f

echo Lote 1...
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 2...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 3...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 4...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 5...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 6...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Lote 7...
timeout /t 3 /nobreak >nul
curl -X POST %URL% ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"%USER_ID%\",\"batch_size\":50}"

echo.
echo Completado!
pause

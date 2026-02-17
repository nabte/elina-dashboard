@echo off
echo.
echo ========================================
echo   TEST SUITE - ELINA v5 OPTIMIZACIONES
echo   (Esquema Corregido)
echo ========================================
echo.

SET URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
SET TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U

echo [TEST 1] Preset Response (Tabla: auto_responses)
echo Input: TEST_PING_AUTO
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215555555555@s.whatsapp.net\", \"id\": \"REQ001\"}, \"pushName\": \"Test User\", \"message\": {\"conversation\": \"TEST_PING_AUTO\"}}, \"instance\": \"ElinaIA 2025\", \"return_context_only\": false}"

echo.
echo.
echo ----------------------------------------
echo [TEST 2] Semantic Objection (Tabla: sales_prompts)
echo Input: 'es robo'
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215555555555@s.whatsapp.net\", \"id\": \"REQ002\"}, \"pushName\": \"Test User\", \"message\": {\"conversation\": \"es robo\"}}, \"instance\": \"ElinaIA 2025\", \"return_context_only\": false}"

echo.
echo.
echo ----------------------------------------
echo [TEST 3] Auto Tags (Tabla: labels)
echo Input: 'ponme etiqueta' (Debe activar EtiquetaTest en background)
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215555555555@s.whatsapp.net\", \"id\": \"REQ003\"}, \"pushName\": \"Test User\", \"message\": {\"conversation\": \"ponme etiqueta\"}}, \"instance\": \"ElinaIA 2025\", \"return_context_only\": false}"

echo.
echo.
echo ========================================
echo   PRUEBAS FINALIZADAS
echo ========================================

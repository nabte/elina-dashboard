@echo off
setlocal enabledelayedexpansion

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE

echo Limpiando etiquetas...
REM Esto requiere SQL execution via Supabase CLI o similar, pero asumiremos que lo hago via tool

echo [1.4] Solicitud de cotizacion - TEST AISLADO
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM_MARIA_TEST_1\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Me puedes hacer una cotizacion de 3 toner 105X y 2 del 58A por favor?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_test.json

echo.
echo Hecho.

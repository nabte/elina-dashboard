@echo off
setlocal enabledelayedexpansion

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE

echo ========================================
echo   TEST FINAL - AGENDAMIENTO EN MEETINGS
echo ========================================
echo.

REM Mensaje 1: Pregunta por cita
echo [MSG 1] Intencion de cita
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219997779999@s.whatsapp.net\", \"id\": \"FINAL001\"}, \"pushName\": \"Ana Test\", \"message\": {\"conversation\": \"Hola, quiero agendar corte de pelo para manana\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > final_test_1.json

timeout /t 5 >nul

REM Mensaje 2: Confirmacion de horario (asumiendo que ELINA ofrecera 11:00 AM)
echo [MSG 2] Confirmacion de hora
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219997779999@s.whatsapp.net\", \"id\": \"FINAL002\"}, \"pushName\": \"Ana Test\", \"message\": {\"conversation\": \"Si, a las 11:00 AM por favor\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > final_test_2.json

echo.
echo Cita procesada. Verificando base de datos...
echo.
pause

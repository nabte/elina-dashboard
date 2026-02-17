@echo off
setlocal enabledelayedexpansion

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2MjEwNDksImV4cCI6MjA0NzE5NzA0OX0.yLCUWbTCBOZvLNlbCZqpWHqYwTSGPNIGqkJPJlbCZqo

echo ========================================
echo   PRUEBA RAPIDA - CITA EN MEETINGS
echo ========================================
echo.

REM Mensaje 1: Agendar cita directa
echo [MSG 1] Agenda cita directa
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219992222222@s.whatsapp.net\", \"id\": \"QUICK001\"}, \"pushName\": \"Maria Test\", \"message\": {\"conversation\": \"Quiero agendar corte de pelo para manana a las 2pm\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > quick_test.json

echo.
echo Respuesta guardada en quick_test.json
echo.
pause

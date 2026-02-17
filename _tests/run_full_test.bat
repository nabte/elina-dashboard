@echo off
setlocal enabledelayedexpansion

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2MjEwNDksImV4cCI6MjA0NzE5NzA0OX0.yLCUWbTCBOZvLNlbCZqpWHqYwTSGPNIGqkJPJlbCZqo

echo ========================================
echo   PRUEBA COMPLETA - PRODUCTOS + CITAS
echo ========================================
echo.
echo Usuario: Ana Lopez (5219991111111)
echo Perfil: Nabte (ismanabte)
echo.

REM Mensaje 1: Saludo
echo [MSG 1] Saludo inicial
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST001\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Hola! Vi tu publicacion en Facebook\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg1.json
echo Respuesta guardada en test_msg1.json
timeout /t 3 >nul
echo.

REM Mensaje 2: Consulta servicios
echo [MSG 2] Pregunta por servicios
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST002\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Que servicios tienen disponibles?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg2.json
echo Respuesta guardada en test_msg2.json
timeout /t 3 >nul
echo.

REM Mensaje 3: Pregunta precio específico
echo [MSG 3] Pregunta precio de servicio
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST003\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Cuanto cuesta el corte de pelo?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg3.json
echo Respuesta guardada en test_msg3.json
timeout /t 3 >nul
echo.

REM Mensaje 4: Pregunta por productos
echo [MSG 4] Pregunta por productos en venta
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST004\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Tienen productos para comprar?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg4.json
echo Respuesta guardada en test_msg4.json
timeout /t 3 >nul
echo.

REM Mensaje 5: Cotización múltiple
echo [MSG 5] Solicita cotizacion de 2 servicios
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST005\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Me interesa el corte de pelo y sacar una muela. Me das cotizacion?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg5.json
echo Respuesta guardada en test_msg5.json
timeout /t 3 >nul
echo.

REM Mensaje 6: Agendar cita
echo [MSG 6] Agenda cita
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST006\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Quiero agendar el corte de pelo para manana a las 10am\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg6.json
echo Respuesta guardada en test_msg6.json
timeout /t 3 >nul
echo.

REM Mensaje 7: Confirmación
echo [MSG 7] Confirma horario
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219991111111@s.whatsapp.net\", \"id\": \"TEST007\"}, \"pushName\": \"Ana Lopez\", \"message\": {\"conversation\": \"Si, perfecto las 10am\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > test_msg7.json
echo Respuesta guardada en test_msg7.json
echo.

echo ========================================
echo   PRUEBA COMPLETADA
echo ========================================
echo.
echo Archivos generados:
echo - test_msg1.json (Saludo)
echo - test_msg2.json (Servicios)
echo - test_msg3.json (Precio)
echo - test_msg4.json (Productos)
echo - test_msg5.json (Cotizacion)
echo - test_msg6.json (Agendar)
echo - test_msg7.json (Confirmar)
echo.
pause

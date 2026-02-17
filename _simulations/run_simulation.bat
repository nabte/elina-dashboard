@echo off
SET URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
SET TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U

echo.
echo ========================================
echo   SIMULACION DE CONVERSACION - ELINA
echo ========================================
echo.

echo [MENSAJE 1] Primer contacto - Cliente nuevo
echo Input: "Hola, buenas tardes"
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219998887999@s.whatsapp.net\", \"id\": \"SIM001\"}, \"pushName\": \"Carlos Martinez\", \"message\": {\"conversation\": \"Hola, buenas tardes\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_msg1.json

echo.
echo Respuesta guardada en sim_msg1.json
timeout /t 3 /nobreak > nul

echo.
echo [MENSAJE 2] Consulta de servicios
echo Input: "Que servicios ofrecen?"
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219998887999@s.whatsapp.net\", \"id\": \"SIM002\"}, \"pushName\": \"Carlos Martinez\", \"message\": {\"conversation\": \"Que servicios ofrecen?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_msg2.json

echo.
echo Respuesta guardada en sim_msg2.json
timeout /t 3 /nobreak > nul

echo.
echo [MENSAJE 3] Pregunta por precio especifico
echo Input: "Cuanto cuesta el corte de pelo?"
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219998887999@s.whatsapp.net\", \"id\": \"SIM003\"}, \"pushName\": \"Carlos Martinez\", \"message\": {\"conversation\": \"Cuanto cuesta el corte de pelo?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_msg3.json

echo.
echo Respuesta guardada en sim_msg3.json
timeout /t 3 /nobreak > nul

echo.
echo [MENSAJE 4] Solicitud de cotizacion
echo Input: "Me interesa el corte de pelo y sacar una muela, me das una cotizacion?"
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219998887766@s.whatsapp.net\", \"id\": \"SIM004\"}, \"pushName\": \"Carlos Martinez\", \"message\": {\"conversation\": \"Me interesa el corte de pelo y sacar una muela, me das una cotizacion?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_msg4.json

echo.
echo Respuesta guardada en sim_msg4.json
timeout /t 3 /nobreak > nul

echo.
echo [MENSAJE 5] Agendar cita
echo Input: "Quiero agendar una cita para el corte de pelo manana"
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5219998887766@s.whatsapp.net\", \"id\": \"SIM005\"}, \"pushName\": \"Carlos Martinez\", \"message\": {\"conversation\": \"Quiero agendar una cita para el corte de pelo manana\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_msg5.json

echo.
echo Respuesta guardada en sim_msg5.json

echo.
echo ========================================
echo   SIMULACION COMPLETADA
echo ========================================
echo.
echo Revisa los archivos sim_msg1.json a sim_msg5.json para ver las respuestas

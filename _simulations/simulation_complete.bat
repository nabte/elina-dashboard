@echo off
setlocal enabledelayedexpansion

set URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE

echo ========================================
echo   SIMULACION COMPLETA - ELINA IA
echo   Probando todos los servicios internos
echo ========================================
echo.

REM ============================================
REM CONVERSACION 1: CLIENTE COTIZACION (Maria)
REM ============================================
echo.
echo [CONVERSACION 1] Cliente: Maria Lopez
echo ========================================
echo.

REM Mensaje 1: Saludo inicial
echo [1.1] Saludo inicial
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM001\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Hola, buenos dias\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_1.json
timeout /t 8 >nul

REM Mensaje 2: Pregunta por productos
echo [1.2] Pregunta por productos
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM002\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Necesito toner 105X y tambien el 58A, cuanto cuestan?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_2.json
timeout /t 10 >nul

REM Mensaje 3: Pregunta adicional sobre otro producto
echo [1.3] Pregunta por otro producto
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM003\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Y el 26X tambien lo tienen?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_3.json
timeout /t 8 >nul

REM Mensaje 4: Solicitud de cotización con cantidades
echo [1.4] Solicitud de cotizacion
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM004\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Me puedes hacer una cotizacion de 3 toner 105X y 2 del 58A por favor?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_4.json
timeout /t 12 >nul

REM Mensaje 5: Pregunta casual (probar proactividad)
echo [1.5] Pregunta casual
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM005\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Oye y ustedes hacen envios a domicilio?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_5.json
timeout /t 8 >nul

REM Mensaje 6: Despedida
echo [1.6] Despedida
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345001@s.whatsapp.net\", \"id\": \"SIM006\"}, \"pushName\": \"Maria Lopez\", \"message\": {\"conversation\": \"Perfecto, muchas gracias!\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_maria_6.json
timeout /t 5 >nul

echo.
echo [CONVERSACION 1 COMPLETADA]
echo.
timeout /t 3 >nul

REM ============================================
REM CONVERSACION 2: CLIENTE CITAS (Carlos)
REM ============================================
echo.
echo [CONVERSACION 2] Cliente: Carlos Ruiz
echo ========================================
echo.

REM Mensaje 1: Saludo y pregunta por servicio
echo [2.1] Saludo y consulta de servicio
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM101\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Hola, hacen cortes de pelo?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_1.json
timeout /t 8 >nul

REM Mensaje 2: Pregunta casual (probar conversación natural)
echo [2.2] Pregunta casual
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM102\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Que dias trabajan?\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_2.json
timeout /t 8 >nul

REM Mensaje 3: Solicitud de cita
echo [2.3] Solicitud de cita
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM103\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Quiero agendar un corte para manana\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_3.json
timeout /t 10 >nul

REM Mensaje 4: Confirmación de horario
echo [2.4] Confirmacion de horario
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM104\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Si, a las 10:00 AM esta bien\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_4.json
timeout /t 10 >nul

REM Mensaje 5: Intento de segunda cita (mismo horario - debe rechazar)
echo [2.5] Intento de doble reserva
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM105\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Espera, mejor quiero cambiarla a las 10:00 AM del mismo dia\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_5.json
timeout /t 10 >nul

REM Mensaje 6: Nueva cita en diferente horario
echo [2.6] Nueva cita en horario diferente
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM106\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Ok, entonces mejor agendame para pasado manana a las 3:00 PM\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_6.json
timeout /t 10 >nul

REM Mensaje 7: CRITICO - Mensaje urgente
echo [2.7] MENSAJE CRITICO - Urgencia
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM107\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"URGENTE: Necesito cancelar todas mis citas, tengo una emergencia familiar\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_7.json
timeout /t 10 >nul

REM Mensaje 8: Despedida
echo [2.8] Despedida
curl -s -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215512345002@s.whatsapp.net\", \"id\": \"SIM108\"}, \"pushName\": \"Carlos Ruiz\", \"message\": {\"conversation\": \"Gracias por todo\"}}, \"instance\": \"Nabte\", \"return_context_only\": false}" > sim_carlos_8.json
timeout /t 5 >nul

echo.
echo [CONVERSACION 2 COMPLETADA]
echo.

echo ========================================
echo   SIMULACION COMPLETA FINALIZADA
echo ========================================
echo.
echo Archivos generados:
echo - sim_maria_*.json (Conversacion 1: Cotizacion)
echo - sim_carlos_*.json (Conversacion 2: Citas + Critico)
echo.
echo Presiona cualquier tecla para ver resumen...
pause >nul

echo.
echo RESUMEN DE PRUEBAS:
echo ===================
echo.
echo CONVERSACION 1 (Maria - Cotizacion):
echo - Saludo inicial
echo - Consulta de 3 productos (105X, 58A, 26X)
echo - Cotizacion con cantidades (3x105X + 2x58A)
echo - Pregunta casual sobre envios
echo - Despedida
echo.
echo CONVERSACION 2 (Carlos - Citas):
echo - Consulta de servicio
echo - Pregunta por horarios
echo - Agendamiento de cita
echo - Confirmacion de horario
echo - Intento de doble reserva (debe rechazar)
echo - Nueva cita en horario diferente
echo - MENSAJE CRITICO (emergencia)
echo - Despedida
echo.
echo Revisa los archivos JSON para ver las respuestas completas.
echo.
pause

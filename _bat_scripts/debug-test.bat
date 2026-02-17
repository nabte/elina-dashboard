@echo off
SET URL=https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message
SET TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U
SET INSTANCE=\"ElinaIA 2025\"

echo [DEBUG] URL: %URL%
echo [DEBUG] INSTANCE: %INSTANCE%
echo.

curl -v -X POST %URL% ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"data\": {\"key\": {\"remoteJid\": \"5215555555555@s.whatsapp.net\", \"id\": \"999999\"}, \"pushName\": \"Test User\", \"message\": {\"conversation\": \"TEST_PING\"}}, \"instance\": \"ElinaIA 2025\", \"return_context_only\": false}"

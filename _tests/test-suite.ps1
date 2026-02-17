
# Test Suite for ELINA v5 Optimizations (PowerShell Version)

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message"
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U"

# Test Config
$INSTANCE_NAME = "ElinaIA 2025"
$TEST_PHONE = "5215555555555"
$TEST_CONTACT_ID = 999999
$TEST_NAME = "Test User Script"

function Run-Test {
    param (
        [string]$TestName,
        [string]$Message,
        [string]$ExpectedPattern
    )

    Write-Host "`n----------------------------------------" -ForegroundColor Cyan
    Write-Host "🧪 TEST: $TestName" -ForegroundColor Yellow
    Write-Host "📨 Enviando: `"$Message`"" -ForegroundColor Gray
    
    $payloadObj = @{
        data                = @{
            key      = @{
                remoteJid = "$TEST_PHONE@s.whatsapp.net"
                id        = [string]$TEST_CONTACT_ID
            }
            pushName = $TEST_NAME
            message  = @{
                conversation = $Message
            }
        }
        instance            = $INSTANCE_NAME
        return_context_only = $false
    }
    
    $payload = $payloadObj | ConvertTo-Json -Depth 5

    try {
        $headers = @{
            "Authorization" = "Bearer $AUTH_TOKEN"
            "Content-Type"  = "application/json"
        }

        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers $headers -Body $payload
        
        $stopwatch.Stop()
        $duration = $stopwatch.ElapsedMilliseconds

        Write-Host "⏱️ Latencia: ${duration}ms" -ForegroundColor Green
        
        if ($response.data -and $response.data.output) {
            $output = $response.data.output
            $len = [Math]::Min($output.Length, 100)
            Write-Host "🤖 Respuesta: `"$($output.Substring(0, $len))...`"" -ForegroundColor White
            
            if ($ExpectedPattern) {
                if ($output -match $ExpectedPattern) {
                    Write-Host "✅ EXITO: Se detectó el patrón esperado `"$ExpectedPattern`"" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ FALLO: No se detectó patrón `"$ExpectedPattern`"" -ForegroundColor Red
                }
            }
            else {
                Write-Host "✅ Completado" -ForegroundColor Green
            }
        }
        else {
            Write-Host "⚠️ Respuesta sin data.output" -ForegroundColor Yellow
            Write-Host ($response | ConvertTo-Json -Depth 2)
        }

        if ($response.preset_response) { Write-Host "✨ [Metadato] Preset Response: ACTIVADO" -ForegroundColor Cyan }

    }
    catch {
        Write-Host "❌ EXCEPCIÓN: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            # Try to read response stream
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $respBody = $reader.ReadToEnd()
                Write-Host "Response Body: $respBody" -ForegroundColor Red
            }
            catch {}
        }
    }
}

Write-Host "🚀 Iniciando Pruebas de Humo ELINA v5..." -ForegroundColor Magenta

# 1. Test Preset Response
Run-Test -TestName "Preset Response Check" -Message "TEST_PING" -ExpectedPattern "PONG_AUTO_SUCCESS"

# 2. Test Semantic Objection
Run-Test -TestName "Semantic Objection Detection" -Message "es un robo todo esto" -ExpectedPattern "calidad"

# 3. Test Regular Flow
Run-Test -TestName "Regular IA Flow" -Message "Hola, ¿qué servicios ofrecen?" -ExpectedPattern ""

Write-Host "`n----------------------------------------" -ForegroundColor Cyan
Write-Host "🏁 Pruebas finalizadas." -ForegroundColor Magenta

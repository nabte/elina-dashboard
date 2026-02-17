# Test Simple - ELINA V5
# Simula UN mensaje de prueba desde un numero externo

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5"
$TEST_SENDER_NUMBER = "5219991234567"  # Numero de prueba (quien envia)
$DELAY = 3

Write-Host "PRUEBA SIMPLE DE ELINA V5" -ForegroundColor Magenta
Write-Host ("=" * 60)
Write-Host ""
Write-Host "IMPORTANTE: El agente respondera AL numero de prueba ($TEST_SENDER_NUMBER)" -ForegroundColor Yellow
Write-Host "NO al numero del negocio (5219995169313)" -ForegroundColor Yellow
Write-Host ""

$payload = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${TEST_SENDER_NUMBER}@s.whatsapp.net"
            id        = "test_simple_$(Get-Date -Format 'HHmmss')"
            fromMe    = $false
        }
        message  = @{
            conversation = "Hola, tienen disponible el producto 666?"
        }
        pushName = "Cliente Prueba"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Write-Host ">> Enviando mensaje de prueba..." -ForegroundColor Cyan
Write-Host "   Remitente simulado: $TEST_SENDER_NUMBER" -ForegroundColor Gray
Write-Host "   Mensaje: 'Hola, tienen disponible el producto 666?'" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Body $payload -ContentType "application/json"
    Write-Host "[OK] Mensaje procesado exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "RESULTADO:" -ForegroundColor Cyan
    Write-Host "- El agente deberia haber respondido al numero: $TEST_SENDER_NUMBER" -ForegroundColor White
    Write-Host "- Revisa los logs de Supabase para ver la respuesta generada" -ForegroundColor White
    Write-Host "- O verifica en Evolution API si el mensaje fue enviado" -ForegroundColor White
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Detalle: $body" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "NOTA: Para que TU recibas mensajes en 5219995169313," -ForegroundColor Yellow
Write-Host "debes enviar un mensaje REAL desde tu WhatsApp al bot." -ForegroundColor Yellow

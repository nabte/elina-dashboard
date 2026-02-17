# Test - Verificar que el bot responde después de despausar

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5"
$YOUR_NUMBER = "5219995169313"

$payload = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${YOUR_NUMBER}@s.whatsapp.net"
            id        = "test_unpause_$(Get-Date -Format 'HHmmss')"
            fromMe    = $false
        }
        message  = @{
            conversation = "Hola, ya me puedes responder?"
        }
        pushName = "Ismael"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Write-Host "Enviando mensaje de prueba a TU numero ($YOUR_NUMBER)..." -ForegroundColor Cyan
Write-Host "Mensaje: 'Hola, ya me puedes responder?'" -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Body $payload -ContentType "application/json"
    Write-Host "[OK] Mensaje procesado" -ForegroundColor Green
    Write-Host ""
    Write-Host "Revisa tu WhatsApp para ver si recibes la respuesta del bot." -ForegroundColor Yellow
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

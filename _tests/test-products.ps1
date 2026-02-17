
# ELINA V5 - Product Search Simulation
# Simulates various product inquiries to test search functionality

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5"
$NABTE_NUMBER = "5219995169313"

# Helper function to send message
function Send-Message {
    param (
        [string]$text,
        [string]$testId
    )

    $payload = @{
        instance     = "Nabte"
        data         = @{
            key      = @{
                remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
                id        = "test_prod_${testId}_$(Get-Date -Format 'HHmmss')"
                fromMe    = $false
            }
            message  = @{
                conversation = $text
            }
            pushName = "Tester"
        }
        isSimulation = $false
    } | ConvertTo-Json -Depth 10

    Write-Host "`n➤ Enviando: '$text'" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Body $payload -ContentType "application/json"
        Write-Host "✅ Enviado. Status: 200 OK" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "   Detalle: $body" -ForegroundColor Yellow
        }
    }
    
    # Esperar un poco entre mensajes para no saturar y dar tiempo a procesar
    Start-Sleep -Seconds 5
}

Write-Host "🚀 Iniciando simulación de productos..." -ForegroundColor Magenta

# 1. Producto por NOMBRE EXACTO (que existe)
# Basado en lo que vi en la BD: "666"
Send-Message "Tienen disponible el producto 666?" "name_exist"

# 2. Producto por CÓDIGO/SKU (que existe)
# Basado en BD: SKU "79865"
Send-Message "Busco el producto con código 79865" "sku_exist"

# 3. Producto por DESCRIPCIÓN (que existe)
# Basado en BD: Description "4865"
Send-Message "Me interesa algo que tenga descripción 4865" "desc_exist"

# 4. Producto que NO EXISTE
Send-Message "Tienen unicornios voladores?" "no_exist"

# 5. Producto por NOMBRE PARCIAL (que existe)
# Basado en BD: "58A/CRG057" -> buscar "58A"
Send-Message "Precio del toner 58A" "partial_exist"

Write-Host "`n🏁 Simulación completada." -ForegroundColor Magenta

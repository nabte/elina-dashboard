# ELINA V5 - Test Completo con Numero Externo
# Simula mensajes DESDE un cliente externo HACIA el negocio

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5"
$TEST_CLIENT_NUMBER = "5219991234567"  # Cliente de prueba
$DELAY_BETWEEN_TESTS = 6

function Send-ClientMessage {
    param (
        [string]$category,
        [int]$testNumber,
        [string]$text
    )

    $testId = "${category}_${testNumber}_$(Get-Date -Format 'HHmmss')"
    
    $payload = @{
        instance     = "Nabte"
        data         = @{
            key      = @{
                remoteJid = "${TEST_CLIENT_NUMBER}@s.whatsapp.net"
                id        = "msg_${testId}"
                fromMe    = $false
            }
            message  = @{
                conversation = $text
            }
            pushName = "Cliente Test"
        }
        isSimulation = $false
    } | ConvertTo-Json -Depth 10

    Write-Host "`n[$category #$testNumber]" -ForegroundColor Cyan
    Write-Host ">> Cliente dice: '$text'" -ForegroundColor White
    
    try {
        $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Body $payload -ContentType "application/json"
        Write-Host "[OK] Procesado - Revisa logs para ver respuesta del agente" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $DELAY_BETWEEN_TESTS
}

Write-Host "INICIANDO PRUEBAS COMPLETAS - ELINA V5" -ForegroundColor Magenta
Write-Host ("=" * 60)
Write-Host "Cliente simulado: $TEST_CLIENT_NUMBER" -ForegroundColor Yellow
Write-Host "Instancia: Nabte" -ForegroundColor Yellow
Write-Host ""

# CATEGORIA 1: BUSQUEDA DE PRODUCTOS
Write-Host "`nCATEGORIA 1: BUSQUEDA DE PRODUCTOS (5 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "product" 1 "Hola, tienen disponible el producto 666?"
Send-ClientMessage "product" 2 "Busco el producto con codigo 79865"
Send-ClientMessage "product" 3 "Me interesa algo que tenga descripcion 4865"
Send-ClientMessage "product" 4 "Tienen unicornios voladores?"
Send-ClientMessage "product" 5 "Precio del toner CRG057"

# CATEGORIA 2: CONSULTAS GENERALES
Write-Host "`nCATEGORIA 2: CONSULTAS GENERALES (3 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "general" 1 "Hola, buenos dias"
Send-ClientMessage "general" 2 "Cual es su horario de atencion?"
Send-ClientMessage "general" 3 "Donde estan ubicados?"

# CATEGORIA 3: COTIZACIONES
Write-Host "`nCATEGORIA 3: COTIZACIONES (3 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "quote" 1 "Me interesa cotizar el producto 666"
Send-ClientMessage "quote" 2 "Necesito cotizacion para los productos 666 y 665"
Send-ClientMessage "quote" 3 "Quiero 5 unidades del 79865, cuanto seria?"

# CATEGORIA 4: CITAS
Write-Host "`nCATEGORIA 4: CITAS (3 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "appointment" 1 "Tienen disponibilidad esta semana?"
Send-ClientMessage "appointment" 2 "Quiero agendar una cita para el miercoles a las 3 PM"
Send-ClientMessage "appointment" 3 "Necesito cancelar mi cita"

# CATEGORIA 5: CRITICO
Write-Host "`nCATEGORIA 5: INTENCION CRITICA (2 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "critical" 1 "URGENTE: Necesito hablar con alguien YA"
Send-ClientMessage "critical" 2 "Estoy muy molesto, el producto no funciona"

# CATEGORIA 6: NATURAL
Write-Host "`nCATEGORIA 6: CONVERSACION NATURAL (3 pruebas)" -ForegroundColor Yellow

Send-ClientMessage "natural" 1 "Busco algo para imprimir"
Send-ClientMessage "natural" 2 "Ah, y tambien necesito tinta"
Send-ClientMessage "natural" 3 "Me puedes recordar que te pregunte?"

Write-Host ("`n" + ("=" * 60))
Write-Host "PRUEBAS COMPLETADAS" -ForegroundColor Magenta
Write-Host ""
Write-Host "TOTAL: 19 mensajes enviados" -ForegroundColor Cyan
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "1. Revisa los logs de Supabase (edge-function)" -ForegroundColor White
Write-Host "2. Busca las respuestas del agente en los logs" -ForegroundColor White
Write-Host "3. Verifica que Evolution API haya enviado los mensajes" -ForegroundColor White
Write-Host ""
Write-Host "NOTA: Las respuestas fueron enviadas a: $TEST_CLIENT_NUMBER" -ForegroundColor Gray
Write-Host "      (no a tu numero personal 5219995169313)" -ForegroundColor Gray

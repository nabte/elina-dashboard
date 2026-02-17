# ELINA V5 - Comprehensive Testing Suite
# Tests all agent capabilities with realistic scenarios

$FUNCTION_URL = "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/elina-v5"
$NABTE_NUMBER = "5219995169313"
$DELAY_BETWEEN_TESTS = 8  # seconds

function Send-TestMessage {
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
                remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
                id        = "test_${testId}"
                fromMe    = $false
            }
            message  = @{
                conversation = $text
            }
            pushName = "Tester"
        }
        isSimulation = $false
    } | ConvertTo-Json -Depth 10

    Write-Host "`n[$category #$testNumber]" -ForegroundColor Cyan
    Write-Host ">> Enviando: '$text'" -ForegroundColor White
    
    try {
        $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Body $payload -ContentType "application/json"
        Write-Host "[OK] Enviado exitosamente" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $DELAY_BETWEEN_TESTS
}

Write-Host "INICIANDO PRUEBAS COMPLETAS DE ELINA V5" -ForegroundColor Magenta
Write-Host ("=" * 60)
Write-Host ""

# ============================================================
# CATEGORIA 1: BUSQUEDA DE PRODUCTOS (Ya ejecutadas)
# ============================================================
Write-Host "`nCATEGORIA 1: BUSQUEDA DE PRODUCTOS (5 pruebas)" -ForegroundColor Yellow
Write-Host "   [Ya ejecutadas anteriormente - Ver resultados previos]"

# ============================================================
# CATEGORIA 2: CONSULTAS GENERALES
# ============================================================
Write-Host "`nCATEGORIA 2: CONSULTAS GENERALES (3 pruebas)" -ForegroundColor Yellow

Send-TestMessage "general" 1 "Hola, buenos dias"
Send-TestMessage "general" 2 "Cual es su horario de atencion?"
Send-TestMessage "general" 3 "Donde estan ubicados y como los contacto?"

# ============================================================
# CATEGORIA 3: COTIZACIONES
# ============================================================
Write-Host "`nCATEGORIA 3: COTIZACIONES (3 pruebas)" -ForegroundColor Yellow

Send-TestMessage "quote" 1 "Me interesa cotizar el producto 666"
Send-TestMessage "quote" 2 "Necesito cotizacion para los productos 666 y 665"
Send-TestMessage "quote" 3 "Quiero 5 unidades del producto con codigo 79865, cuanto seria?"

# ============================================================
# CATEGORIA 4: CITAS/AGENDAMIENTO
# ============================================================
Write-Host "`nCATEGORIA 4: CITAS/AGENDAMIENTO (3 pruebas)" -ForegroundColor Yellow

Send-TestMessage "appointment" 1 "Tienen disponibilidad esta semana?"
Send-TestMessage "appointment" 2 "Quiero agendar una cita para el miercoles a las 3 PM"
Send-TestMessage "appointment" 3 "Necesito cancelar mi cita del miercoles"

# ============================================================
# CATEGORIA 5: INTENCION CRITICA
# ============================================================
Write-Host "`nCATEGORIA 5: INTENCION CRITICA (2 pruebas)" -ForegroundColor Yellow

Send-TestMessage "critical" 1 "URGENTE: Necesito hablar con alguien YA, tengo un problema grave"
Send-TestMessage "critical" 2 "Estoy muy molesto, el producto que me vendieron no funciona"

# ============================================================
# CATEGORIA 6: CONVERSACION NATURAL
# ============================================================
Write-Host "`nCATEGORIA 6: CONVERSACION NATURAL (3 pruebas)" -ForegroundColor Yellow

Send-TestMessage "natural" 1 "Busco algo para imprimir"
Send-TestMessage "natural" 2 "Ah, y tambien necesito tinta"
Send-TestMessage "natural" 3 "Me puedes recordar que te pregunte antes?"

Write-Host ("`n" + ("=" * 60))
Write-Host "SIMULACION COMPLETADA" -ForegroundColor Magenta
Write-Host ""
Write-Host "TOTAL DE PRUEBAS ENVIADAS: 14 mensajes" -ForegroundColor Cyan
Write-Host "Tiempo estimado de procesamiento: ~2-3 minutos" -ForegroundColor Cyan
Write-Host ""
Write-Host "Por favor revisa tu WhatsApp (nabte 5219995169313)" -ForegroundColor Yellow
Write-Host "y califica cada respuesta usando los criterios del test_plan.md" -ForegroundColor Yellow

# ELINA V5 - PowerShell Test Script
# Voy a usar supabase-ELINA
# Confirmo: project_ref = mytvwfbijlgbihlegmfg

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧪 ELINA V5 - Test Suite" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Configuración
$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/elina-v5"
$NABTE_NUMBER = "5219995169313"

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "❌ ERROR: Variables de entorno no configuradas" -ForegroundColor Red
    Write-Host "   Configura SUPABASE_URL y SUPABASE_ANON_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configuración:" -ForegroundColor Green
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   Destino: nabte $NABTE_NUMBER`n" -ForegroundColor Gray

# Función para enviar test
function Send-TestMessage {
    param(
        [string]$TestName,
        [string]$Message,
        [string]$RemoteJid = $NABTE_NUMBER
    )
    
    Write-Host "`n🧪 [TEST] $TestName" -ForegroundColor Cyan
    Write-Host "   Mensaje: `"$Message`"" -ForegroundColor Gray
    
    $payload = @{
        instance     = "ELINA"
        data         = @{
            key      = @{
                remoteJid = "${RemoteJid}@s.whatsapp.net"
                id        = "test_$(Get-Date -Format 'yyyyMMddHHmmss')"
                fromMe    = $false
            }
            message  = @{
                conversation = $Message
            }
            pushName = "Test User"
        }
        isSimulation = $true
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type"  = "application/json"
        } -Body $payload
        
        Write-Host "   ✅ PASSED" -ForegroundColor Green
        Write-Host "   Intent: $($response.intent)" -ForegroundColor Gray
        
        if ($response.response) {
            $preview = $response.response.Substring(0, [Math]::Min(100, $response.response.Length))
            Write-Host "   Response: $preview..." -ForegroundColor Gray
        }
        
        return @{ passed = $true; response = $response }
    }
    catch {
        Write-Host "   ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return @{ passed = $false; error = $_.Exception.Message }
    }
}

# ============================================================================
# TESTS
# ============================================================================

$results = @()

# Test 1: Mensaje simple a nabte
$results += Send-TestMessage -TestName "Mensaje simple a nabte 5219995169313" -Message "Hola, esto es una prueba"

Start-Sleep -Seconds 2

# Test 2: Saludo
$results += Send-TestMessage -TestName "Detección de intención: Saludo" -Message "Hola, buenos días"

Start-Sleep -Seconds 2

# Test 3: Consulta de productos
$results += Send-TestMessage -TestName "Consulta de productos" -Message "Qué productos tienes disponibles?"

Start-Sleep -Seconds 2

# Test 4: Búsqueda específica
$results += Send-TestMessage -TestName "Búsqueda de producto específico" -Message "Tienes el producto 665?"

Start-Sleep -Seconds 2

# Test 5: Intención crítica
$results += Send-TestMessage -TestName "Intención crítica: Queja" -Message "Tengo una queja grave sobre el servicio"

Start-Sleep -Seconds 2

# Test 6: Solicitud de cita
$results += Send-TestMessage -TestName "Solicitud de cita" -Message "Quiero agendar una cita para mañana"

Start-Sleep -Seconds 2

# Test 7: Precio
$results += Send-TestMessage -TestName "Consulta de precio" -Message "Cuánto cuesta?"

Start-Sleep -Seconds 2

# Test 8: Despedida
$results += Send-TestMessage -TestName "Despedida" -Message "Gracias, hasta luego"

# ============================================================================
# REPORTE
# ============================================================================

Write-Host "`n`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 REPORTE DE RESULTADOS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.passed }).Count
$failed = ($results | Where-Object { -not $_.passed }).Count
$total = $results.Count

Write-Host "Total de pruebas: $total" -ForegroundColor White
Write-Host "✅ Exitosas: $passed ($([math]::Round(($passed/$total)*100, 1))%)" -ForegroundColor Green
Write-Host "❌ Fallidas: $failed ($([math]::Round(($failed/$total)*100, 1))%)" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host "`n🎉 TODAS LAS PRUEBAS PASARON" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️  ALGUNAS PRUEBAS FALLARON" -ForegroundColor Yellow
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Instrucciones para validación manual
Write-Host "📱 VALIDACIÓN MANUAL REQUERIDA:" -ForegroundColor Yellow
Write-Host "   1. Verifica que nabte $NABTE_NUMBER recibió los mensajes" -ForegroundColor Gray
Write-Host "   2. Revisa los logs en Supabase Dashboard" -ForegroundColor Gray
Write-Host "   3. Confirma que las respuestas fueron apropiadas`n" -ForegroundColor Gray

if ($failed -gt 0) {
    exit 1
}

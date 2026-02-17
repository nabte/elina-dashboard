# ELINA V5 - Test Execution Script
# Voy a usar supabase-ELINA
# Confirmo: project_ref = mytvwfbijlgbihlegmfg

$SUPABASE_URL = "https://mytvwfbijlgbihlegmfg.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/elina-v5"
$NABTE_NUMBER = "5219995169313"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ELINA V5 - Test Execution" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Target: nabte $NABTE_NUMBER" -ForegroundColor Yellow
Write-Host "Function: $FUNCTION_URL`n" -ForegroundColor Gray

$results = @()

# Test 1: Mensaje Simple
Write-Host "`n[TEST 1] Mensaje simple a nabte..." -ForegroundColor Cyan

$body1 = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
            id        = "test_$(Get-Date -Format 'yyyyMMddHHmmss')_001"
            fromMe    = $false
        }
        message  = @{
            conversation = "Hola, esto es una prueba del sistema ELINA V5"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type"  = "application/json"
    } -Body $body1
    
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Intent: $($response1.intent)" -ForegroundColor Gray
    $results += @{ test = "Mensaje simple"; passed = $true }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Mensaje simple"; passed = $false; error = $_.Exception.Message }
}

Start-Sleep -Seconds 3

# Test 2: Consulta de Productos
Write-Host "`n[TEST 2] Consulta de productos..." -ForegroundColor Cyan

$body2 = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
            id        = "test_$(Get-Date -Format 'yyyyMMddHHmmss')_002"
            fromMe    = $false
        }
        message  = @{
            conversation = "Que productos tienes disponibles?"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type"  = "application/json"
    } -Body $body2
    
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Intent: $($response2.intent)" -ForegroundColor Gray
    $results += @{ test = "Consulta productos"; passed = $true }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Consulta productos"; passed = $false; error = $_.Exception.Message }
}

Start-Sleep -Seconds 3

# Test 3: Intencion Critica
Write-Host "`n[TEST 3] Intencion critica (queja)..." -ForegroundColor Cyan

$body3 = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
            id        = "test_$(Get-Date -Format 'yyyyMMddHHmmss')_003"
            fromMe    = $false
        }
        message  = @{
            conversation = "Tengo una queja grave sobre el servicio"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type"  = "application/json"
    } -Body $body3
    
    Write-Host "  PASSED" -ForegroundColor Green
    if ($response3.critical_detected) {
        Write-Host "  Critical detected: YES" -ForegroundColor Yellow
        Write-Host "  Paused: $($response3.paused)" -ForegroundColor Gray
        Write-Host "  Label added: $($response3.label_added)" -ForegroundColor Gray
    }
    $results += @{ test = "Intencion critica"; passed = $true }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Intencion critica"; passed = $false; error = $_.Exception.Message }
}

Start-Sleep -Seconds 3

# Test 4: Solicitud de Cita
Write-Host "`n[TEST 4] Solicitud de cita..." -ForegroundColor Cyan

$body4 = @{
    instance     = "Nabte"
    data         = @{
        key      = @{
            remoteJid = "${NABTE_NUMBER}@s.whatsapp.net"
            id        = "test_$(Get-Date -Format 'yyyyMMddHHmmss')_004"
            fromMe    = $false
        }
        message  = @{
            conversation = "Quiero agendar una cita"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

try {
    $response4 = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type"  = "application/json"
    } -Body $body4
    
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Intent: $($response4.intent)" -ForegroundColor Gray
    $results += @{ test = "Solicitud cita"; passed = $true }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Solicitud cita"; passed = $false; error = $_.Exception.Message }
}

# Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE RESULTADOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.passed }).Count
$total = $results.Count

Write-Host "Total: $total tests" -ForegroundColor White
Write-Host "Exitosos: $passed" -ForegroundColor Green
Write-Host "Fallidos: $($total - $passed)" -ForegroundColor Red

if ($passed -eq $total) {
    Write-Host "`nTODOS LOS TESTS PASARON!" -ForegroundColor Green
}
else {
    Write-Host "`nALGUNOS TESTS FALLARON" -ForegroundColor Yellow
}

Write-Host "`nVerifica que nabte $NABTE_NUMBER recibio los mensajes en WhatsApp`n" -ForegroundColor Yellow

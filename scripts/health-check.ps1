#!/usr/bin/env pwsh

Write-Host "🔍 InspectX Health Check" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Check 1: Node modules
Write-Host "✓ Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  ✅ node_modules found" -ForegroundColor Green
} else {
    Write-Host "  ❌ node_modules not found. Run: npm install" -ForegroundColor Red
    exit 1
}

# Check 2: Firebase config
Write-Host "`n✓ Checking Firebase configuration..." -ForegroundColor Yellow
if (Test-Path ".firebaserc") {
    $content = Get-Content ".firebaserc" -Raw
    if ($content -match "inspectx-325dc") {
        Write-Host "  ✅ Firebase project configured" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Wrong Firebase project" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ .firebaserc not found" -ForegroundColor Red
}

# Check 3: Firestore rules
Write-Host "`n✓ Checking Firestore rules..." -ForegroundColor Yellow
if (Test-Path "firestore-dev.rules") {
    Write-Host "  ✅ firestore-dev.rules found" -ForegroundColor Green
} else {
    Write-Host "  ❌ firestore-dev.rules not found" -ForegroundColor Red
}

# Check 4: Test scripts
Write-Host "`n✓ Checking test scripts..." -ForegroundColor Yellow
$scripts = @("setup-auth-users.ts", "test-auth.ts", "seed-authenticated.ts")
foreach ($script in $scripts) {
    if (Test-Path "scripts/$script") {
        Write-Host "  ✅ $script" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $script missing" -ForegroundColor Red
    }
}

# Run authentication test
Write-Host "`n✓ Testing authentication..." -ForegroundColor Yellow
Write-Host "  Running: npm run test-auth`n" -ForegroundColor Gray

$output = npm run test-auth 2>&1 | Out-String

if ($output -match "All tests completed") {
    Write-Host "  ✅ Authentication tests passed!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Authentication tests failed" -ForegroundColor Red
    Write-Host "`n  Run: npm run setup-users" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================" -ForegroundColor Cyan
Write-Host "📋 Summary" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

Write-Host "✅ All checks completed!" -ForegroundColor Green
Write-Host "`nTo start the app:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nTest credentials:" -ForegroundColor White
Write-Host "  Admin:     admin@inspectx.com / admin123" -ForegroundColor Cyan
Write-Host "  Inspector: inspector@inspectx.com / inspector123" -ForegroundColor Cyan
Write-Host "  Client:    client@inspectx.com / client123" -ForegroundColor Cyan
Write-Host "`nApp will be available at: http://localhost:9002`n" -ForegroundColor White

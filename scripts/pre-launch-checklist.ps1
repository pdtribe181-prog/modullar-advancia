#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete pre-launch verification for Advancia PayLedger
.DESCRIPTION
    Runs all automated tests and generates go/no-go launch report
.EXAMPLE
    .\scripts\pre-launch-checklist.ps1
#>

$ErrorActionPreference = "Stop"

$prodUrl = "https://api.advanciapayledger.com"
$stagingUrl = "https://api-staging.advanciapayledger.com"
$results = @{
    Security = @{}
    API      = @{}
    Staging  = @{}
    Manual   = @{}
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ADVANCIA PAYLEDGER PRE-LAUNCH CHECK" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ==========================================
# 1. SECURITY VERIFICATION
# ==========================================
Write-Host "1️⃣  Security Verification..." -ForegroundColor Yellow
Write-Host "   Running automated security tests...`n" -ForegroundColor Gray

try {
    $verifyScript = Join-Path -Path $PSScriptRoot -ChildPath "verify-production-security.ps1"
    & $verifyScript -Quiet 2>&1 | Out-Null

    # Re-run to capture output for analysis
    $secOutput = & $verifyScript 2>&1 | Out-String
    
    # Parse results
    $passedCount = ([regex]::Matches($secOutput, "✓")).Count
    $failedCount = ([regex]::Matches($secOutput, "✗")).Count
    $warningCount = ([regex]::Matches($secOutput, "⚠")).Count
    
    $results.Security = @{
        Passed   = $passedCount
        Failed   = $failedCount
        Warnings = $warningCount
        Status   = if ($failedCount -eq 0) { "PASS" } else { "FAIL" }
    }
    
    Write-Host "   ✓ Passed: $passedCount" -ForegroundColor Green
    if ($warningCount -gt 0) { Write-Host "   ⚠ Warnings: $warningCount" -ForegroundColor Yellow }
    if ($failedCount -gt 0) { Write-Host "   ✗ Failed: $failedCount" -ForegroundColor Red }
}
catch {
    $results.Security.Status = "ERROR"
    Write-Host "   ✗ Security verification error: $_" -ForegroundColor Red
}

# ==========================================
# 2. API ENDPOINT TESTS
# ==========================================
Write-Host "`n2️⃣  API Endpoint Verification..." -ForegroundColor Yellow
Write-Host "   Testing production API structure...`n" -ForegroundColor Gray

try {
    $apiScript = Join-Path -Path $PSScriptRoot -ChildPath "test-production-api.ps1"
    $apiOutput = & $apiScript 2>&1 | Out-String
    
    $passedCount = ([regex]::Matches($apiOutput, "✓")).Count
    $failedCount = ([regex]::Matches($apiOutput, "✗")).Count
    $warningCount = ([regex]::Matches($apiOutput, "⚠")).Count
    
    $results.API = @{
        Passed   = $passedCount
        Failed   = $failedCount
        Warnings = $warningCount
        Status   = if ($failedCount -le 4) { "PASS" } else { "FAIL" }  # 4 unimplemented endpoints expected
    }
    
    Write-Host "   ✓ Passed: $passedCount" -ForegroundColor Green
    if ($warningCount -gt 0) { Write-Host "   ⚠ Warnings: $warningCount" -ForegroundColor Yellow }
    if ($failedCount -gt 0) { Write-Host "   ⚠ Failed: $failedCount (4 unimplemented endpoints expected)" -ForegroundColor Yellow }
}
catch {
    $results.API.Status = "ERROR"
    Write-Host "   ✗ API verification error: $_" -ForegroundColor Red
}

# ==========================================
# 3. STAGING SMOKE TEST
# ==========================================
Write-Host "`n3️⃣  Staging Environment Check..." -ForegroundColor Yellow
Write-Host "   Testing staging deployment...`n" -ForegroundColor Gray

try {
    $stagingScript = Join-Path -Path $PSScriptRoot -ChildPath "staging-smoke-check.ps1"
    $stagingOutput = & $stagingScript 2>&1 | Out-String
    
    $passedCount = ([regex]::Matches($stagingOutput, "✓")).Count
    $failedCount = ([regex]::Matches($stagingOutput, "✗")).Count
    
    $results.Staging = @{
        Passed = $passedCount
        Failed = $failedCount
        Status = if ($failedCount -eq 0) { "PASS" } else { "FAIL" }
    }
    
    Write-Host "   ✓ Passed: $passedCount" -ForegroundColor Green
    if ($failedCount -gt 0) { Write-Host "   ✗ Failed: $failedCount" -ForegroundColor Red }
}
catch {
    $results.Staging.Status = "ERROR"
    Write-Host "   ✗ Staging check error: $_" -ForegroundColor Red
}

# ==========================================
# 4. MANUAL VERIFICATION PROMPTS
# ==========================================
Write-Host "`n4️⃣  Manual Verification Required..." -ForegroundColor Yellow
Write-Host "   Please confirm the following:`n" -ForegroundColor Gray

$manualChecks = @(
    @{
        Name     = "Cloudflare SSL/TLS"
        Question = "Is SSL/TLS mode set to 'Full (Strict)' in Cloudflare?"
        Check    = "cloudflare_ssl"
    },
    @{
        Name     = "Cloudflare Bot Fight"
        Question = "Is Bot Fight Mode enabled in Cloudflare?"
        Check    = "cloudflare_bot"
    },
    @{
        Name     = "DMARC Record"
        Question = "Is DMARC DNS record added (_dmarc TXT record)?"
        Check    = "dmarc"
    },
    @{
        Name     = "Stripe Production"
        Question = "Is Stripe account activated for production mode?"
        Check    = "stripe_prod"
    },
    @{
        Name     = "Stripe Webhooks"
        Question = "Have you tested Stripe webhook delivery?"
        Check    = "stripe_webhook"
    },
    @{
        Name     = "Email Testing"
        Question = "Have you sent test emails via Resend?"
        Check    = "email_test"
    },
    @{
        Name     = "User Registration"
        Question = "Have you tested full user registration flow?"
        Check    = "user_reg"
    },
    @{
        Name     = "Authentication"
        Question = "Have you tested login/logout flow?"
        Check    = "auth_flow"
    },
    @{
        Name     = "Secrets Audit"
        Question = "Have you verified all production secrets differ from dev?"
        Check    = "secrets"
    },
    @{
        Name     = "Backup Created"
        Question = "Have you backed up production .env file securely?"
        Check    = "backup"
    }
)

foreach ($check in $manualChecks) {
    Write-Host "   • $($check.Question)" -ForegroundColor Cyan
    $response = Read-Host "     (y/n)"
    
    $results.Manual[$check.Check] = @{
        Name   = $check.Name
        Status = if ($response -eq "y") { "YES" } else { "NO" }
    }
}

# ==========================================
# 5. GENERATE REPORT
# ==========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LAUNCH READINESS REPORT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Automated Tests Summary
Write-Host "AUTOMATED TESTS:" -ForegroundColor White
Write-Host "  Security Verification: " -NoNewline
if ($results.Security.Status -eq "PASS") {
    Write-Host "✓ PASS ($($results.Security.Passed)/$($results.Security.Passed + $results.Security.Failed))" -ForegroundColor Green
}
else {
    Write-Host "✗ FAIL ($($results.Security.Passed)/$($results.Security.Passed + $results.Security.Failed))" -ForegroundColor Red
}

Write-Host "  API Endpoints:         " -NoNewline
if ($results.API.Status -eq "PASS") {
    Write-Host "✓ PASS ($($results.API.Passed)/$($results.API.Passed + $results.API.Failed))" -ForegroundColor Green
}
else {
    Write-Host "✗ FAIL ($($results.API.Passed)/$($results.API.Passed + $results.API.Failed))" -ForegroundColor Red
}

Write-Host "  Staging Environment:   " -NoNewline
if ($results.Staging.Status -eq "PASS") {
    Write-Host "✓ PASS ($($results.Staging.Passed)/$($results.Staging.Passed + $results.Staging.Failed))" -ForegroundColor Green
}
else {
    Write-Host "✗ FAIL ($($results.Staging.Passed)/$($results.Staging.Passed + $results.Staging.Failed))" -ForegroundColor Red
}

# Manual Checks Summary
Write-Host "`nMANUAL VERIFICATIONS:" -ForegroundColor White
$manualPassed = 0
$manualFailed = 0

foreach ($check in $results.Manual.GetEnumerator()) {
    $status = $check.Value.Status
    $name = $check.Value.Name
    
    if ($status -eq "YES") {
        Write-Host "  ✓ $name" -ForegroundColor Green
        $manualPassed++
    }
    else {
        Write-Host "  ✗ $name" -ForegroundColor Red
        $manualFailed++
    }
}

# Calculate Overall Status
$automatedPass = ($results.Security.Status -eq "PASS") -and 
($results.API.Status -eq "PASS") -and 
($results.Staging.Status -eq "PASS")

$m = $results.Manual
$criticalManualPass = ($m['stripe_prod'].Status -eq "YES") -and
    ($m['auth_flow'].Status -eq "YES") -and
    ($m['secrets'].Status -eq "YES")

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "OVERALL STATUS: " -NoNewline

if ($automatedPass -and $criticalManualPass) {
    Write-Host "🟢 GO FOR LAUNCH" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "All critical checks passed. Ready for production deployment!" -ForegroundColor Green
    exit 0
}
elseif ($automatedPass) {
    Write-Host "🟡 MANUAL ITEMS PENDING" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Automated tests passed, but manual items need completion:" -ForegroundColor Yellow
    
    foreach ($check in $results.Manual.GetEnumerator()) {
        if ($check.Value.Status -eq "NO") {
            Write-Host "  • $($check.Value.Name)" -ForegroundColor Yellow
        }
    }
    exit 1
}
else {
    Write-Host "🔴 NO-GO" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Critical issues found. Review logs above for details." -ForegroundColor Red
    
    if ($results.Security.Status -ne "PASS") {
        Write-Host "`n⚠ Security verification failed - BLOCKING ISSUE" -ForegroundColor Red
    }
    if ($results.API.Status -ne "PASS" -and $results.API.Failed -gt 4) {
        Write-Host "⚠ More than expected API endpoints failing - BLOCKING ISSUE" -ForegroundColor Red
    }
    if ($results.Staging.Status -ne "PASS") {
        Write-Host "⚠ Staging environment not operational - WARNING" -ForegroundColor Yellow
    }
    
    exit 2
}

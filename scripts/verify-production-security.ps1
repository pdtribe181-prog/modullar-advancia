#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Verify production security configuration for Advancia PayLedger
.DESCRIPTION
  Tests SSL/TLS, security headers, API health, and DNS configuration
#>

param(
  [string]$ApiDomain = "api.advanciapayledger.com",
  [string]$FrontendDomain = "advanciapayledger.com"
)

$ErrorActionPreference = "Stop"

function Write-TestHeader {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Pass {
  param([string]$Message)
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

$passed = 0
$failed = 0
$warnings = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Production Security Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: API Health Endpoint
Write-TestHeader "1. API Health Check"
try {
  $health = Invoke-RestMethod -Uri "https://$ApiDomain/health" -Method Get
  if ($health.status -eq "healthy") {
    Write-Pass "API is healthy"
    Write-Host "  - Database: $($health.database)"
    Write-Host "  - Redis: $($health.redis.status) ($($health.redis.kind))"
    Write-Host "  - Monitoring: $($health.monitoring)"
    Write-Host "  - Version: $($health.version)"
    $passed++
  } else {
    Write-Fail "API health check returned: $($health.status)"
    $failed++
  }
} catch {
  Write-Fail "API health check failed: $($_.Exception.Message)"
  $failed++
}

# Test 2: SSL/TLS Configuration
Write-TestHeader "2. SSL/TLS & HTTPS"
try {
  $response = Invoke-WebRequest -Uri "https://$ApiDomain/health" -Method Head -SkipHttpErrorCheck
  $statusCode = [int]$response.StatusCode
  
  if ($statusCode -eq 200) {
    Write-Pass "HTTPS accessible (Status: $statusCode)"
    $passed++
  } else {
    Write-Warn "HTTPS returned status: $statusCode"
    $warnings++
  }
  
  # Check if using Cloudflare (Server header can be string or array; -match works for both)
  $server = $response.Headers['Server']
  if ($server -and ($server -match 'cloudflare')) {
    Write-Pass "Cloudflare proxy active"
    $passed++
  } else {
    Write-Warn "Cloudflare proxy not detected (Server: $server)"
    $warnings++
  }
  
} catch {
  Write-Fail "HTTPS test failed: $($_.Exception.Message)"
  $failed++
}

# Test 3: Security Headers
Write-TestHeader "3. Security Headers"
try {
  $response = Invoke-WebRequest -Uri "https://$ApiDomain/health" -Method Head -SkipHttpErrorCheck
  
  # HSTS
  $hsts = $response.Headers['Strict-Transport-Security']
  if ($hsts -and $hsts -match 'max-age=\d+') {
    Write-Pass "HSTS enabled: $hsts"
    $passed++
  } else {
    Write-Fail "HSTS not configured or improper"
    $failed++
  }
  
  # CSP
  $csp = $response.Headers['Content-Security-Policy']
  if ($csp) {
    Write-Pass "Content-Security-Policy present"
    $passed++
  } else {
    Write-Warn "Content-Security-Policy missing"
    $warnings++
  }
  
  # X-Frame-Options
  $xframe = $response.Headers['X-Frame-Options']
  if ($xframe -eq 'DENY' -or $xframe -eq 'SAMEORIGIN') {
    Write-Pass "X-Frame-Options: $xframe"
    $passed++
  } else {
    Write-Warn "X-Frame-Options not set or weak"
    $warnings++
  }
  
  # X-Content-Type-Options
  $xcontent = $response.Headers['X-Content-Type-Options']
  if ($xcontent -eq 'nosniff') {
    Write-Pass "X-Content-Type-Options: nosniff"
    $passed++
  } else {
    Write-Warn "X-Content-Type-Options not set"
    $warnings++
  }
  
} catch {
  Write-Fail "Security header check failed: $($_.Exception.Message)"
  $failed++
}

# Test 4: DNS Resolution
Write-TestHeader "4. DNS Configuration"
try {
  $apiDns = Resolve-DnsName -Name $ApiDomain -Type A -ErrorAction Stop
  if ($apiDns) {
    $ips = $apiDns | Where-Object { $_.Type -eq 'A' } | Select-Object -ExpandProperty IPAddress
    Write-Pass "API DNS resolves: $($ips -join ', ')"
    $passed++
  }
} catch {
  Write-Fail "API DNS resolution failed"
  $failed++
}

try {
  $frontendDns = Resolve-DnsName -Name $FrontendDomain -Type A -ErrorAction Stop
  if ($frontendDns) {
    $ips = $frontendDns | Where-Object { $_.Type -eq 'A' } | Select-Object -ExpandProperty IPAddress
    Write-Pass "Frontend DNS resolves: $($ips -join ', ')"
    $passed++
  }
} catch {
  Write-Fail "Frontend DNS resolution failed"
  $failed++
}

# Test 5: Email DNS Records
Write-TestHeader "5. Email DNS Records (SPF, DKIM, DMARC)"
try {
  $spf = Resolve-DnsName -Name $FrontendDomain -Type TXT -ErrorAction SilentlyContinue | 
    Where-Object { $_.Strings -like '*v=spf1*' }
  if ($spf) {
    Write-Pass "SPF record found: $($spf.Strings)"
    $passed++
  } else {
    Write-Warn "SPF record not found - email delivery may fail"
    $warnings++
  }
  
  $dkim = Resolve-DnsName -Name "resend._domainkey.$FrontendDomain" -Type TXT -ErrorAction SilentlyContinue
  if ($dkim) {
    Write-Pass "DKIM record found (resend._domainkey)"
    $passed++
  } else {
    Write-Warn "DKIM record not found - configure in Resend dashboard"
    $warnings++
  }
  
  $dmarc = Resolve-DnsName -Name "_dmarc.$FrontendDomain" -Type TXT -ErrorAction SilentlyContinue | 
    Where-Object { $_.Strings -like '*v=DMARC1*' }
  if ($dmarc) {
    Write-Pass "DMARC record found: $($dmarc.Strings)"
    $passed++
  } else {
    Write-Warn "DMARC record not found - add to improve email deliverability"
    $warnings++
  }
} catch {
  Write-Warn "Email DNS check encountered errors"
  $warnings++
}

# Test 6: Rate Limiting (Basic)
Write-TestHeader "6. Rate Limiting Check"
Write-Host "[INFO] Sending 5 rapid requests to test rate limiting..."
$rateLimitHit = $false
for ($i = 1; $i -le 5; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "https://$ApiDomain/health" -Method Get -SkipHttpErrorCheck
    $statusCode = [int]$response.StatusCode
    if ($statusCode -eq 429) {
      $rateLimitHit = $true
      break
    }
    Start-Sleep -Milliseconds 100
  } catch {}
}

if ($rateLimitHit) {
  Write-Pass "Rate limiting is active (429 received)"
  $passed++
} else {
  Write-Warn "Rate limiting not detected (may need configuration in Cloudflare)"
  $warnings++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed:   $passed" -ForegroundColor Green
Write-Host "Warnings: $warnings" -ForegroundColor Yellow
Write-Host "Failed:   $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0 -and $warnings -eq 0) {
  Write-Host "All checks passed! Production is secure." -ForegroundColor Green
  exit 0
} elseif ($failed -eq 0) {
  Write-Host "All critical checks passed. Review warnings." -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "Production has security issues. Fix failed checks." -ForegroundColor Red
  exit 1
}

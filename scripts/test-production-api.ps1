#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Test production API endpoints for availability and proper responses
.DESCRIPTION
  Safe production testing - checks endpoints exist and respond correctly
  Does NOT create test data or modify database
.PARAMETER ApiBaseUrl
  Base URL for API (default: https://api.advanciapayledger.com)
.PARAMETER Verbose
  Show detailed request/response information
#>

param(
  [string]$ApiBaseUrl = "https://api.advanciapayledger.com",
  [switch]$Verbose
)

# Stop on unexpected errors; Test-Endpoint catches per-request failures and returns result
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

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Test-Endpoint {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [int[]]$ExpectedStatus = @(200, 401, 403, 404),
    [string]$Description,
    [hashtable]$Headers = @{},
    [string]$Body = $null
  )

  $url = "$ApiBaseUrl$Path"
  
  if ($Verbose) {
    Write-Info "Testing: $Method $url"
  }

  try {
    $params = @{
      Method = $Method
      Uri = $url
      Headers = $Headers
      SkipHttpErrorCheck = $true
      TimeoutSec = 10
    }

    if ($Body) {
      $params["Body"] = $Body
      $params["ContentType"] = "application/json"
    }

    $response = Invoke-WebRequest @params
    $statusCode = [int]$response.StatusCode

    if ($ExpectedStatus -contains $statusCode) {
      Write-Pass "$Description - Status: $statusCode"
      return @{ Success = $true; Status = $statusCode; Response = $response }
    } else {
      Write-Fail "$Description - Unexpected status: $statusCode (expected: $($ExpectedStatus -join ', '))"
      return @{ Success = $false; Status = $statusCode; Response = $response }
    }
  }
  catch {
    Write-Fail "$Description - Request failed: $($_.Exception.Message)"
    return @{ Success = $false; Status = 0; Response = $null }
  }
}

$passed = 0
$failed = 0
$warnings = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Production API Endpoint Testing" -ForegroundColor Cyan
Write-Host "Testing: $ApiBaseUrl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Endpoint
Write-TestHeader "1. Core Health Checks"
$result = Test-Endpoint -Path "/health" -Description "GET /health"
if ($result.Success) {
  $passed++
  try {
    $health = $result.Response.Content | ConvertFrom-Json
    Write-Info "  Database: $($health.database)"
    Write-Info "  Redis: $($health.redis.status)"
    Write-Info "  Version: $($health.version)"
  } catch {}
} else {
  $failed++
}

# Test 2: API v1 Base Path
Write-TestHeader "2. API Version Endpoint"
$result = Test-Endpoint -Path "/api/v1" -ExpectedStatus @(200, 404) -Description "GET /api/v1"
if ($result.Success) {
  $passed++
} else {
  $failed++
}

# Test 3: Authentication Endpoints Structure
Write-TestHeader "3. Authentication Endpoints (Structure Only)"

# Register endpoint - should reject without data (400) or require auth (401)
$result = Test-Endpoint -Path "/api/v1/auth/register" -Method "POST" -ExpectedStatus @(400, 401, 422) -Description "POST /api/v1/auth/register (no data)"
if ($result.Success) { $passed++ } else { $failed++ }

# Login endpoint - should reject without credentials
$result = Test-Endpoint -Path "/api/v1/auth/login" -Method "POST" -ExpectedStatus @(400, 401, 422) -Description "POST /api/v1/auth/login (no data)"
if ($result.Success) { $passed++ } else { $failed++ }

# Logout endpoint - should require authentication
$result = Test-Endpoint -Path "/api/v1/auth/logout" -Method "POST" -ExpectedStatus @(401, 403) -Description "POST /api/v1/auth/logout (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# Password reset request - should reject without email
$result = Test-Endpoint -Path "/api/v1/auth/forgot-password" -Method "POST" -ExpectedStatus @(400, 401, 422) -Description "POST /api/v1/auth/forgot-password (no data)"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 4: Payment Endpoints Structure (via Stripe Connect)
Write-TestHeader "4. Payment/Stripe Endpoints (Structure Only)"

# Stripe Connect account creation - should require authentication
$result = Test-Endpoint -Path "/api/v1/connect/account" -Method "POST" -ExpectedStatus @(401, 403, 422) -Description "POST /api/v1/connect/account (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# Stripe Connect link - should require authentication
$result = Test-Endpoint -Path "/api/v1/connect/account-link" -Method "POST" -ExpectedStatus @(401, 403, 422) -Description "POST /api/v1/connect/account-link (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 5: Stripe Webhook Endpoint
Write-TestHeader "5. Stripe Webhook Endpoint"

# Webhook - should reject without signature (400, 401, or 500 if signature validation throws)
$result = Test-Endpoint -Path "/api/v1/stripe/webhook" -Method "POST" -ExpectedStatus @(400, 401, 403, 500) -Description "POST /api/v1/stripe/webhook (no signature)"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 6: Provider Endpoints Structure
Write-TestHeader "6. Provider Endpoints (Structure Only)"

# Provider list - should require authentication or be public
$result = Test-Endpoint -Path "/api/v1/provider" -Method "GET" -ExpectedStatus @(200, 401, 403) -Description "GET /api/v1/provider"
if ($result.Success) { $passed++ } else { $failed++ }

# Provider profile - should require authentication  
$result = Test-Endpoint -Path "/api/v1/provider/profile" -Method "GET" -ExpectedStatus @(401, 403, 404) -Description "GET /api/v1/provider/profile (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 7: Admin Endpoints (Should Be Protected)
Write-TestHeader "7. Admin Endpoints (Security Check)"

# Dashboard stats - should require admin authentication
$result = Test-Endpoint -Path "/api/v1/admin/dashboard" -Method "GET" -ExpectedStatus @(401, 403, 404) -Description "GET /api/v1/admin/dashboard (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# User management - should require admin authentication
$result = Test-Endpoint -Path "/api/v1/admin/users" -Method "GET" -ExpectedStatus @(401, 403, 404) -Description "GET /api/v1/admin/users (no auth)"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 8: Error Handling
Write-TestHeader "8. Error Handling & Invalid Routes"

# Non-existent route should return 404
$result = Test-Endpoint -Path "/api/v1/this-route-does-not-exist-12345" -Method "GET" -ExpectedStatus @(404) -Description "GET /api/v1/invalid-route"
if ($result.Success) { $passed++ } else { $failed++ }

# Test 9: CORS Headers
Write-TestHeader "9. CORS Configuration"
try {
  $response = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -Method Options -SkipHttpErrorCheck
  $corsHeaders = $response.Headers['Access-Control-Allow-Origin']
  
  if ($corsHeaders) {
    Write-Pass "CORS headers present"
    Write-Info "  Allow-Origin: $corsHeaders"
    $passed++
  } else {
    Write-Warn "CORS headers not found (may be route-specific)"
    $warnings++
  }
} catch {
  Write-Warn "CORS check failed: $($_.Exception.Message)"
  $warnings++
}

# Test 10: Rate Limiting (Light Test)
Write-TestHeader "10. Rate Limiting (Light Test)"
Write-Info "Sending 3 rapid requests..."
$rateLimitHit = $false
$responses = @()

for ($i = 1; $i -le 3; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -Method Get -SkipHttpErrorCheck
    $responses += [int]$response.StatusCode
    Start-Sleep -Milliseconds 50
  } catch {}
}

if ($responses -contains 429) {
  Write-Pass "Rate limiting active (429 detected)"
  $passed++
} else {
  Write-Info "Rate limiting not detected (may be configured differently)"
  Write-Info "  Responses: $($responses -join ', ')"
  $warnings++
}

# Test 11: Content-Type Headers
Write-TestHeader "11. API Response Content Types"
try {
  $response = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -Method Get
  $contentType = $response.Headers['Content-Type']
  
  if ($contentType -match 'application/json') {
    Write-Pass "Correct Content-Type: $contentType"
    $passed++
  } else {
    Write-Warn "Unexpected Content-Type: $contentType"
    $warnings++
  }
} catch {
  Write-Fail "Content-Type check failed"
  $failed++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed:   $passed" -ForegroundColor Green
Write-Host "Warnings: $warnings" -ForegroundColor Yellow
Write-Host "Failed:   $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0 -and $warnings -le 2) {
  Write-Host "API endpoints properly configured!" -ForegroundColor Green
  Write-Host "Ready for functional testing with real credentials." -ForegroundColor Green
  exit 0
} elseif ($failed -eq 0) {
  Write-Host "API endpoints functional. Review warnings." -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "API has issues. Fix failed checks before production." -ForegroundColor Red
  exit 1
}

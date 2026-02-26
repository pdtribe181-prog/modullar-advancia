param(
  [ValidateSet("Check", "Apply")]
  [string]$Mode = "Check",
  [string]$ZoneId = $env:CF_ZONE_ID,
  [string]$ApiToken = $env:CF_API_TOKEN,
  [string]$HostName = "api-staging.advanciapayledger.com",
  [string]$PathPrefix = "/health",
  [string]$RuleDescription = "Allow staging health checks"
)

$ErrorActionPreference = "Stop"

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Pass {
  param([string]$Message)
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Invoke-CloudflareApi {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("Get", "Post", "Put")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][hashtable]$Headers,
    [string]$Body
  )

  $requestParams = @{
    Method  = $Method
    Uri     = $Uri
    Headers = $Headers
  }

  if ($Method -eq "Post") {
    $requestParams["Body"] = $Body
  }
  elseif ($Method -eq "Put") {
    $requestParams["Body"] = $Body
  }

  if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey("SkipHttpErrorCheck")) {
    $requestParams["SkipHttpErrorCheck"] = $true
  }

  try {
    $rawResponse = Invoke-WebRequest @requestParams
  }
  catch {
    return @{
      Ok            = $false
      StatusCode    = 0
      Data          = $null
      ErrorCodes    = @()
      ErrorMessages = @("$($_.Exception.Message)")
    }
  }

  $statusCode = [int]$rawResponse.StatusCode
  $responseBody = $rawResponse.Content
  $parsedBody = $null

  if (-not [string]::IsNullOrWhiteSpace($responseBody)) {
    try {
      $parsedBody = $responseBody | ConvertFrom-Json
    }
    catch {
      if ($statusCode -ge 400) {
        Write-Fail "Cloudflare API error (HTTP $statusCode): $responseBody"
        exit 1
      }
    }
  }

  if ($statusCode -ge 400 -or ($parsedBody -and $parsedBody.success -eq $false)) {
    $errorCodes = @()
    $errorMessages = @()

    if ($parsedBody -and $parsedBody.errors) {
      $errorCodes = @($parsedBody.errors | ForEach-Object { $_.code })
      $errorMessages = @($parsedBody.errors | ForEach-Object { $_.message })
    }

    return @{
      Ok            = $false
      StatusCode    = $statusCode
      Data          = $parsedBody
      ErrorCodes    = $errorCodes
      ErrorMessages = $errorMessages
    }
  }

  return @{
    Ok            = $true
    StatusCode    = $statusCode
    Data          = $parsedBody
    ErrorCodes    = @()
    ErrorMessages = @()
  }
}

function Write-CloudflareErrorHints {
  param(
    [int[]]$ErrorCodes,
    [string[]]$ErrorMessages,
    [string]$ContextLabel
  )

  if ($ErrorMessages -and $ErrorMessages.Count -gt 0) {
    Write-Fail "$ContextLabel failed: $($ErrorMessages -join '; ')"
  }
  else {
    Write-Fail "$ContextLabel failed."
  }

  if ($ErrorCodes -contains 10000) {
    Write-Host "Token appears valid but lacks required permissions for this endpoint." -ForegroundColor Yellow
    Write-Host "Required token scopes for this script:" -ForegroundColor Yellow
    Write-Host "- Zone:Read" -ForegroundColor Yellow
    Write-Host "- Zone WAF/Firewall edit permission (for rule creation)" -ForegroundColor Yellow
    Write-Host "Confirm token is scoped to zone: advanciapayledger.com" -ForegroundColor Yellow
  }
}

if ([string]::IsNullOrWhiteSpace($ZoneId) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
  Write-Fail "Missing Cloudflare credentials. Set CF_ZONE_ID and CF_API_TOKEN env vars, or pass -ZoneId and -ApiToken."
  Write-Host "Example:" -ForegroundColor Yellow
  Write-Host "`$env:CF_ZONE_ID='your_zone_id'" -ForegroundColor Yellow
  Write-Host "`$env:CF_API_TOKEN='your_api_token'" -ForegroundColor Yellow
  exit 1
}

$headers = @{
  Authorization  = "Bearer $ApiToken"
  "Content-Type" = "application/json"
}

$legacyBaseUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/firewall/rules"
$rulesetPhase = "http_request_firewall_custom"
$rulesetBaseUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/rulesets/phases/$rulesetPhase/entrypoint"
$expression = "(http.host eq `"$HostName`" and starts_with(http.request.uri.path, `"$PathPrefix`"))"

function Check-LegacyRule {
  Write-Info "Checking existing Cloudflare legacy firewall rules..."
  $response = Invoke-CloudflareApi -Method Get -Uri $legacyBaseUrl -Headers $headers

  if (-not $response.Ok) {
    return @{
      Ok            = $false
      Found         = $false
      Fatal         = $false
      ErrorCodes    = $response.ErrorCodes
      ErrorMessages = $response.ErrorMessages
    }
  }

  $result = @($response.Data.result)
  $existing = $result | Where-Object {
    $_.description -eq $RuleDescription -or $_.filter.expression -eq $expression
  }

  if ($existing) {
    Write-Pass "Legacy rule already exists."
    $existing | ForEach-Object {
      Write-Host "- id=$($_.id) action=$($_.action) paused=$($_.paused) description=$($_.description)"
      Write-Host "  expression=$($_.filter.expression)"
    }
    return @{ Ok = $true; Found = $true; Fatal = $false; ErrorCodes = @(); ErrorMessages = @() }
  }

  return @{ Ok = $true; Found = $false; Fatal = $false; ErrorCodes = @(); ErrorMessages = @() }
}

function Apply-LegacyRule {
  Write-Info "Creating Cloudflare legacy allow rule for staging health checks..."

  $payload = @(
    @{
      action      = "allow"
      paused      = $false
      description = $RuleDescription
      filter      = @{
        expression  = $expression
        description = "Allow health endpoint for staging smoke checks"
      }
    }
  ) | ConvertTo-Json -Depth 6

  $createResponse = Invoke-CloudflareApi -Method Post -Uri $legacyBaseUrl -Headers $headers -Body $payload
  if (-not $createResponse.Ok) {
    return @{
      Ok            = $false
      ErrorCodes    = $createResponse.ErrorCodes
      ErrorMessages = $createResponse.ErrorMessages
    }
  }

  Write-Pass "Legacy firewall rule created successfully."
  $createResponse.Data.result | ForEach-Object {
    Write-Host "- id=$($_.id) action=$($_.action) paused=$($_.paused) description=$($_.description)"
    Write-Host "  expression=$($_.filter.expression)"
  }

  return @{ Ok = $true; ErrorCodes = @(); ErrorMessages = @() }
}

function Check-RulesetRule {
  Write-Info "Checking Cloudflare Rulesets entrypoint (fallback)..."
  $response = Invoke-CloudflareApi -Method Get -Uri $rulesetBaseUrl -Headers $headers

  if (-not $response.Ok) {
    return @{
      Ok            = $false
      Found         = $false
      ErrorCodes    = $response.ErrorCodes
      ErrorMessages = $response.ErrorMessages
    }
  }

  $rules = @($response.Data.result.rules)
  $existing = $rules | Where-Object {
    $_.description -eq $RuleDescription -or $_.expression -eq $expression
  }

  if ($existing) {
    Write-Pass "Rulesets fallback rule already exists."
    $existing | ForEach-Object {
      Write-Host "- id=$($_.id) action=$($_.action) enabled=$($_.enabled) description=$($_.description)"
      Write-Host "  expression=$($_.expression)"
    }
    return @{ Ok = $true; Found = $true; ErrorCodes = @(); ErrorMessages = @() }
  }

  return @{ Ok = $true; Found = $false; ErrorCodes = @(); ErrorMessages = @() }
}

function Apply-RulesetRule {
  Write-Info "Creating Cloudflare Rulesets fallback rule for staging health checks..."

  $getResponse = Invoke-CloudflareApi -Method Get -Uri $rulesetBaseUrl -Headers $headers
  $existingRules = @()
  if ($getResponse.Ok -and $getResponse.Data.result -and $getResponse.Data.result.rules) {
    $existingRules = @($getResponse.Data.result.rules)
  }

  $newRule = @{
    action            = "skip"
    description       = $RuleDescription
    enabled           = $true
    expression        = $expression
    action_parameters = @{
      phases = @("http_request_firewall_managed", "http_ratelimit")
    }
  }

  $updatedRules = @($existingRules + $newRule)
  $putPayload = @{
    description = "Staging health rules"
    kind        = "zone"
    name        = "Staging health"
    phase       = $rulesetPhase
    rules       = $updatedRules
  } | ConvertTo-Json -Depth 10

  $putResponse = Invoke-CloudflareApi -Method Put -Uri $rulesetBaseUrl -Headers $headers -Body $putPayload
  if (-not $putResponse.Ok) {
    return @{
      Ok            = $false
      ErrorCodes    = $putResponse.ErrorCodes
      ErrorMessages = $putResponse.ErrorMessages
    }
  }

  Write-Pass "Rulesets fallback rule created successfully."
  return @{ Ok = $true; ErrorCodes = @(); ErrorMessages = @() }
}

$legacyCheck = Check-LegacyRule
if ($legacyCheck.Found) {
  exit 0
}

if (-not $legacyCheck.Ok) {
  Write-Info "Legacy firewall endpoint unavailable. Trying Rulesets API fallback."
  $rulesetCheck = Check-RulesetRule
  if ($rulesetCheck.Found) {
    exit 0
  }

  if (-not $rulesetCheck.Ok) {
    Write-CloudflareErrorHints -ErrorCodes $rulesetCheck.ErrorCodes -ErrorMessages $rulesetCheck.ErrorMessages -ContextLabel "Rulesets API check"
    exit 1
  }
}

if ($Mode -eq "Check") {
  Write-Fail "Rule not found (check mode)."
  Write-Host "Use -Mode Apply to create it." -ForegroundColor Yellow
  exit 1
}

$legacyApply = Apply-LegacyRule
if ($legacyApply.Ok) {
  exit 0
}

Write-Info "Legacy create failed. Trying Rulesets API fallback create..."
$rulesetApply = Apply-RulesetRule
if ($rulesetApply.Ok) {
  exit 0
}

Write-CloudflareErrorHints -ErrorCodes $rulesetApply.ErrorCodes -ErrorMessages $rulesetApply.ErrorMessages -ContextLabel "Rulesets API apply"
if ($legacyApply.ErrorMessages.Count -gt 0) {
  Write-Host "Legacy endpoint error: $($legacyApply.ErrorMessages -join '; ')" -ForegroundColor Yellow
}

if ($legacyApply.ErrorCodes.Count -gt 0) {
  Write-Host "Legacy endpoint error codes: $($legacyApply.ErrorCodes -join ', ')" -ForegroundColor Yellow
}

if ($legacyApply.ErrorCodes -contains 10000 -or $rulesetApply.ErrorCodes -contains 10000) {
  Write-Host "Update token scopes, then re-run in Apply mode." -ForegroundColor Yellow
}

exit 1

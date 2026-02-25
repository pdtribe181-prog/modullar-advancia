param(
    [ValidateSet("Check", "Apply")]
    [string]$Mode = "Check",
    [string]$ZoneId = $env:CF_ZONE_ID,
    [string]$ApiToken = $env:CF_API_TOKEN,
    [string]$Host = "api-staging.advanciapayledger.com",
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

if ([string]::IsNullOrWhiteSpace($ZoneId) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
    Write-Fail "Missing Cloudflare credentials. Set CF_ZONE_ID and CF_API_TOKEN env vars, or pass -ZoneId and -ApiToken."
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "`$env:CF_ZONE_ID='your_zone_id'" -ForegroundColor Yellow
    Write-Host "`$env:CF_API_TOKEN='your_api_token'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    Authorization = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

$baseUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/firewall/rules"

Write-Info "Checking existing Cloudflare firewall rules..."

$response = Invoke-RestMethod -Method Get -Uri $baseUrl -Headers $headers
if (-not $response.success) {
    Write-Fail "Failed to fetch firewall rules from Cloudflare API."
    exit 1
}

$expression = "(http.host eq `"$Host`" and starts_with(http.request.uri.path, `"$PathPrefix`"))"
$existing = $response.result | Where-Object {
    $_.description -eq $RuleDescription -or $_.filter.expression -eq $expression
}

if ($existing) {
    Write-Pass "Rule already exists."
    $existing | ForEach-Object {
        Write-Host "- id=$($_.id) action=$($_.action) paused=$($_.paused) description=$($_.description)"
        Write-Host "  expression=$($_.filter.expression)"
    }
    exit 0
}

if ($Mode -eq "Check") {
    Write-Fail "Rule not found (check mode)."
    Write-Host "Use -Mode Apply to create it." -ForegroundColor Yellow
    exit 1
}

Write-Info "Creating Cloudflare allow rule for staging health checks..."

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

$createResponse = Invoke-RestMethod -Method Post -Uri $baseUrl -Headers $headers -Body $payload
if (-not $createResponse.success) {
    Write-Fail "Failed to create firewall rule."
    exit 1
}

Write-Pass "Rule created successfully."
$createResponse.result | ForEach-Object {
    Write-Host "- id=$($_.id) action=$($_.action) paused=$($_.paused) description=$($_.description)"
    Write-Host "  expression=$($_.filter.expression)"
}

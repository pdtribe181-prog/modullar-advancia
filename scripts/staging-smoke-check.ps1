param(
    [string]$ApiBaseUrl = "https://api-staging.advanciapayledger.com",
    [string]$DnsName = "api-staging.advanciapayledger.com",
    [string]$DnsServer = "8.8.8.8"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param(
        [string]$Message
    )
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Pass {
    param(
        [string]$Message
    )
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
    param(
        [string]$Message
    )
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Hint {
    param(
        [string]$Message
    )
    Write-Host "[HINT] $Message" -ForegroundColor Yellow
}

$checks = @()

try {
    Write-Step "DNS lookup ($DnsName via $DnsServer)"
    $dnsResult = Resolve-DnsName $DnsName -Server $DnsServer -ErrorAction Stop
    $addresses = @($dnsResult | Where-Object { $_.Type -in @("A", "AAAA") } | Select-Object -ExpandProperty IPAddress)
    if ($addresses.Count -gt 0) {
        Write-Pass "DNS resolves: $($addresses -join ', ')"
        $checks += $true
    }
    else {
        Write-Fail "DNS did not return A/AAAA records"
        $checks += $false
    }
}
catch {
    Write-Fail "DNS lookup failed: $($_.Exception.Message)"
    $checks += $false
}

$healthUrl = "$($ApiBaseUrl.TrimEnd('/'))/health"

try {
    Write-Step "HTTPS header check ($healthUrl)"
    $headResponse = Invoke-WebRequest -Uri $healthUrl -Method Get -MaximumRedirection 5
    if ($headResponse.StatusCode -ge 200 -and $headResponse.StatusCode -lt 400) {
        Write-Pass "HTTP status: $($headResponse.StatusCode)"
        $checks += $true
    }
    else {
        Write-Fail "Unexpected HTTP status: $($headResponse.StatusCode)"
        $checks += $false
    }

    $serverHeader = $headResponse.Headers["Server"]
    if ($serverHeader) {
        Write-Host "[INFO] Server header: $serverHeader" -ForegroundColor Yellow
    }
}
catch {
    Write-Fail "HTTPS header check failed: $($_.Exception.Message)"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "[INFO] HTTP status: $statusCode" -ForegroundColor Yellow
        if ($statusCode -eq 403) {
            Write-Hint "Cloudflare is likely blocking staging traffic. Check WAF/Firewall rules, Bot Fight Mode, and custom rules for api-staging host."
            Write-Hint "Add an allow/skip rule for host=api-staging.advanciapayledger.com and path starts with /health for smoke tests."
        }
    }
    $checks += $false
}

try {
    Write-Step "Health payload check ($healthUrl)"
    $health = Invoke-RestMethod -Uri $healthUrl -Method Get

    $statusOk = $health.status -eq "healthy"
    $dbOk = $health.database -eq "connected"

    if ($statusOk) {
        Write-Pass "status=healthy"
        $checks += $true
    }
    else {
        Write-Fail "status is '$($health.status)'"
        $checks += $false
    }

    if ($dbOk) {
        Write-Pass "database=connected"
        $checks += $true
    }
    else {
        Write-Fail "database is '$($health.database)'"
        $checks += $false
    }

    if ($null -ne $health.monitoring) {
        Write-Pass "monitoring field present: $($health.monitoring)"
        $checks += $true
    }
    else {
        Write-Fail "monitoring field missing"
        $checks += $false
    }
}
catch {
    Write-Fail "Health payload check failed: $($_.Exception.Message)"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "[INFO] HTTP status: $statusCode" -ForegroundColor Yellow
        if ($statusCode -eq 403) {
            Write-Hint "Health endpoint is reachable through DNS but blocked by edge security policy (Cloudflare 403)."
        }
    }
    $checks += $false
}

Write-Step "Summary"
$passed = ($checks | Where-Object { $_ -eq $true }).Count
$total = $checks.Count
Write-Host "Passed $passed / $total checks"

if ($passed -eq $total) {
    Write-Host "Staging smoke check PASSED" -ForegroundColor Green
    exit 0
}

Write-Host "Staging smoke check FAILED" -ForegroundColor Red
exit 1

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Set-Location $repoRoot

if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = Read-Host 'Cloudflare Account ID'
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
    $secureToken = Read-Host 'Cloudflare API Token' -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    try {
        $env:CLOUDFLARE_API_TOKEN = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    throw 'Missing Cloudflare account ID.'
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
    throw 'Missing Cloudflare API token.'
}

Write-Host 'Cloudflare cleanup helper' -ForegroundColor Cyan
Write-Host '1. List only' -ForegroundColor Yellow
Write-Host '2. Dry-run delete selected targets' -ForegroundColor Yellow
Write-Host '3. Execute delete selected targets' -ForegroundColor Yellow

$mode = Read-Host 'Choose mode (1/2/3)'

switch ($mode) {
    '1' {
        npm run cloudflare:cleanup -- --list-only
        break
    }
    '2' {
        $pages = Read-Host 'Pages project names (comma-separated, optional)'
        $tokens = Read-Host 'Token names (comma-separated, optional)'
        $args = @('--')
        if ($pages) {
            $args += "--pages=$pages"
        }
        if ($tokens) {
            $args += "--tokens=$tokens"
        }
        npm run cloudflare:cleanup $args
        break
    }
    '3' {
        $pages = Read-Host 'Pages project names (comma-separated, optional)'
        $tokens = Read-Host 'Token names (comma-separated, optional)'
        $args = @('--')
        if ($pages) {
            $args += "--pages=$pages"
        }
        if ($tokens) {
            $args += "--tokens=$tokens"
        }
        $args += '--execute'
        npm run cloudflare:cleanup $args
        break
    }
    default {
        throw 'Invalid mode. Choose 1, 2, or 3.'
    }
}
param(
  [string]$Branch = "main",
  [string[]]$RequiredChecks = @(
    "Lint",
    "Backend Tests",
    "Frontend Tests",
    "E2E Tests (API)",
    "npm Audit",
    "Secret Detection",
    "Analyze (actions)",
    "Analyze (javascript-typescript)"
  ),
  [switch]$EnforceAdmins
)

$ErrorActionPreference = "Stop"

# GitHub Actions app id (used for required status checks "checks" format).
$GitHubActionsAppId = 15368

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "gh CLI not found. Install GitHub CLI and run 'gh auth login'."
}

$repo = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
if (-not $repo) {
  throw "Unable to determine repo. Run this script from inside the git repo folder."
}

Write-Host "Repo:   $repo"
Write-Host "Branch: $Branch"

if (-not $RequiredChecks -or $RequiredChecks.Count -eq 0) {
  throw "RequiredChecks is empty. Provide at least one check name (exact match from the checks list)."
}

$body = [ordered]@{
  required_status_checks           = @{ 
    strict = $true
    checks = @(
      $RequiredChecks | ForEach-Object { @{ context = $_; app_id = $GitHubActionsAppId } }
    )
  }
  enforce_admins                   = [bool]$EnforceAdmins
  required_pull_request_reviews    = @{
    dismiss_stale_reviews           = $true
    required_approving_review_count = 1
  }
  restrictions                     = $null
  required_conversation_resolution = $true
  allow_force_pushes               = $false
  allow_deletions                  = $false
}

$json = ($body | ConvertTo-Json -Depth 6)

Write-Host "Applying branch protection..." -ForegroundColor Cyan

# Requires admin rights on the repository.
$json | gh api "repos/$repo/branches/$Branch/protection" --method PUT --header "Accept: application/vnd.github+json" --input -
if ($LASTEXITCODE -ne 0) {
  throw "Failed to apply branch protection (gh exit code $LASTEXITCODE)."
}

Write-Host "Done." -ForegroundColor Green
Write-Host "If GitHub rejects a check name, run scripts/github-list-checks.ps1 to get the exact names for your repo." -ForegroundColor Yellow

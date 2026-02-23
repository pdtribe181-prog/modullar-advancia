param(
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI not found. Install GitHub CLI and run 'gh auth login'."
}

$repo = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
if (-not $repo) {
    throw "Unable to determine repo. Run this script from inside the git repo folder."
}

$sha = (gh api "repos/$repo/commits/$Branch" -q .sha).Trim()
if (-not $sha) {
    throw "Unable to resolve branch '$Branch'."
}

Write-Host "Repo:   $repo"
Write-Host "Branch: $Branch"
Write-Host "SHA:    $sha"
Write-Host ""

# Check runs (GitHub Actions jobs show up here)
$checkRuns = gh api "repos/$repo/commits/$sha/check-runs" -q '.check_runs[] | {name: .name, app: .app.slug, conclusion: .conclusion, status: .status}' | ConvertFrom-Json

if (-not $checkRuns) {
    Write-Host "No check-runs found on this commit yet." -ForegroundColor Yellow
    Write-Host "Tip: open a PR or push a commit to trigger workflows, then rerun." -ForegroundColor Yellow
    exit 0
}

$checkRuns |
Sort-Object app, name |
Format-Table -AutoSize app, name, status, conclusion

Write-Host ""
Write-Host "Use these exact 'name' values as required status checks." -ForegroundColor Cyan

# PowerShell scripts — conventions and fixes

Scripts in **scripts/*.ps1** follow these conventions. Changes were made to align with recommended practice.

---

## Conventions

| Item | Recommendation |
|------|----------------|
| **Shebang** | `#!/usr/bin/env pwsh` so scripts run with PowerShell 7 when available. |
| **ErrorActionPreference** | `Stop` so unexpected errors fail the script; use `try/catch` for expected failures. |
| **Paths** | Use `Join-Path -Path $PSScriptRoot -ChildPath "script.ps1"` instead of `"$PSScriptRoot\script.ps1"` for clarity and consistency. |
| **Hashtable access** | Use `$hash['key']` for keys that might be missing; avoid `.key` when the key could be absent. |
| **Header checks** | For response headers (e.g. `Server`), use `-match` for string matching; `-contains` is for "array contains element". |
| **Single vs array** | When piping to `Select-Object -ExpandProperty X`, wrap in `@(...)` if you need `.Count` (single value has no .Count). |

---

## Changes made

1. **verify-production-security.ps1**
   - **Server header:** Replaced `$server -contains 'cloudflare'` with `$server -and ($server -match 'cloudflare')` so the check works when the header is a string and is null-safe.
   - **ErrorActionPreference:** Set to `Stop` (was `Continue`).

2. **staging-smoke-check.ps1**
   - **DNS addresses:** Wrapped the pipeline in `@(...)` so `$addresses.Count -gt 0` is correct when only one A/AAAA record is returned (otherwise a single string has no `.Count`).

3. **pre-launch-checklist.ps1**
   - **Child scripts:** Call sibling scripts via `Join-Path $PSScriptRoot -ChildPath "name.ps1"` and invoke that path.
   - **Critical manual checks:** Use `$results.Manual['stripe_prod'].Status` (and same for `auth_flow`, `secrets`) so key access is explicit and consistent.

4. **test-production-api.ps1**
   - **ErrorActionPreference:** Set to `Stop` (was `Continue`) and added a short comment that `Test-Endpoint` handles per-request failures.

---

## Running scripts

From the repo root (or with correct `$PSScriptRoot` when invoked from elsewhere):

```powershell
.\scripts\pre-launch-checklist.ps1
.\scripts\verify-production-security.ps1
.\scripts\test-production-api.ps1 -ApiBaseUrl "https://api.advanciapayledger.com"
.\scripts\staging-smoke-check.ps1
.\scripts\cloudflare-allow-staging-health.ps1 -Mode Check
```

Use `pwsh` (PowerShell 7) when possible for consistent behavior and `-SkipHttpErrorCheck` support.

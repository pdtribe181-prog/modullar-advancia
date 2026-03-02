# CodeQL alerts closed as false positives

This document records CodeQL alerts that were triaged and closed as **false positive** in the Security tab, and excluded from future scans via `.github/codeql/codeql-config.yml` so they do not reappear.

## Excluded queries

| Query ID | Alert | Location(s) | Reason (false positive) |
|----------|--------|-------------|--------------------------|
| `js/incomplete-multi-character-sanitization` | Incomplete multi-character sanitization | `src/middleware/sanitize.middleware.ts:16` | Sanitization uses a **fixed-point loop** (do/while until no change): entity and tag patterns are applied repeatedly so removed multi-char sequences cannot reappear. See CWE-116 and comments in the file. |
| `js/clear-text-logging` | Clear-text logging of sensitive information | `scripts/enable-pwned-check.ts:48`, `:81` | Logs only **status messages** (e.g. "HIBP check already enabled") and generic **error.message** (no credentials or tokens). Script is for one-off Supabase Auth config; no user secrets are logged. |
| `js/sensitive-get-query` | Sensitive data read from GET request | `src/routes/admin.routes.ts:303`, `src/routes/provider.routes.ts:301,359,402,448`, `src/routes/appointments.routes.ts:415,459,562` | GET is used for **resource IDs** (e.g. appointment id from path params) and **filter parameters** (status, dates, pagination). All are validated via schema; **no passwords or secrets** are read from query or path. Query is intended to flag e.g. `?password=...`; our usage is list/detail by ID. |

## Updating this list

If you re-enable a query in `.github/codeql/codeql-config.yml`, remove its entry from the `query-filters` section. Consider adding a note here if the code was changed to satisfy the query. If a new alert is triaged as false positive, add it to the config and to this table.

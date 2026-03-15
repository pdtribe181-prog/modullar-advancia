---
description: "Use when editing deployment docs, workflows, env examples, infrastructure scripts, or hosting configuration. Prevents reintroducing Render-era references and keeps Vercel + Hostinger VPS + Supabase as the active deployment model."
name: "Infrastructure No Render Guardrails"
applyTo: "README.md,.env*.example,.github/workflows/**/*.yml,.github/workflows/**/*.yaml,docs/**/*.{md},scripts/**/*.{sh,ps1,ts,js},config/**/*.{conf,yml,yaml,cjs}"
---
# Infrastructure Guardrails

- Treat Vercel + Hostinger VPS + Supabase + Cloudflare as the current deployment model.
- Do not add or restore `Render`, `onrender.com`, `render.yaml`, or `RENDER_*` secrets in active files unless the user explicitly requests a platform reversal.
- If a hosting-related edit changes one source-of-truth file, search adjacent active docs, env templates, workflows, and scripts for stale references and update them in the same task.
- Prefer fixing the root source-of-truth files over patching derived summaries.
- Leave historical changelogs and archived reports alone unless the user asks to rewrite them.
- After hosting-related edits, run `npm run verify:no-render-hosting` and fix any matches before finishing.
- After editing infra/docs/workflows, run targeted Problems checks on the changed files and confirm the canonical repo still has no actionable errors.

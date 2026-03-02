# Advancia Repos — Map & Recommendations

Quick reference for all related GitHub repos and how they fit together.

---

## Summary Table

| Repo | Owner/Repo | Status | Role |
|------|------------|--------|------|
| **modullar-advancia** | pdtribe181-prog/modullar-advancia | ✅ **Canonical** | Production PayLedger: Node/Express API + Vite/React frontend, live at advanciapayledger.com |
| **advancia-get-together** | pdtribe181-prog/advancia-get-together | ✅ Mirror | Same code as modullar-advancia; push with `npm run push:mirror` |
| **advancia-healthcare1** | muchaeljohn739337-art/advancia-healthcare1 | ❌ 404 | Repo not found (private, renamed, or deleted) |
| **modular-saas-platform-nw** | muchaeljohn739337-art/modular-saas-platform-nw | 📦 Different stack | Microservices / Next.js / K8s / Terraform; “Advancia PayLedger” branding but separate codebase |
| **advanciapayledger-new1** | muchaeljohn739337-art/advanciapayledger-new1 | 📦 Variant | backend-clean + frontend-clean + mobile; Docker/Hostinger; different structure |
| **advanciapayledger-new** | muchaeljohn739337-art/advanciapayledger-new | 📦 Variant | Prisma, backend/frontend/contracts; many docs; older/demo variant |
| **modular-prop-1** | muchaeljohn739337-art/modular-prop-1 | 📦 Meta/props | Contains advanciapayledger-new as subfolder; deployment/pitch docs; not the running app |

---

## Recommendations

### Use as single source of truth
- **pdtribe181-prog/modullar-advancia** — All production development and deploys for advanciapayledger.com and api.advanciapayledger.com.
- Keep **advancia-get-together** in sync with: `npm run push:mirror` after commits.

### Other repos (muchaeljohn739337-art)
- **advancia-healthcare1** — If you need it, recreate or fix the repo name/visibility; currently 404.
- **modular-saas-platform-nw** — Different architecture (microservices, Next.js, K8s). Either treat as a future/alternate platform or archive; don’t mix with modullar-advancia without a clear plan.
- **advanciapayledger-new1** — Demo/variant (backend-clean, frontend-clean, mobile). Add a README line: “Canonical production repo: [pdtribe181-prog/modullar-advancia](https://github.com/pdtribe181-prog/modullar-advancia).”
- **advanciapayledger-new** — Older/demo variant (Prisma, many guides). Same: point README to modullar-advancia as canonical.
- **modular-prop-1** — Pitches/deployment/scripts; contains a copy of advanciapayledger-new. Keep for reference; do not use as the main codebase.

### Avoid
- Don’t spread production changes across multiple repos; use **modullar-advancia** only for production.
- Don’t deploy to the same domains from more than one repo (risk of overwriting or confusion).

---

## Quick links

- **Production (canonical):** [pdtribe181-prog/modullar-advancia](https://github.com/pdtribe181-prog/modullar-advancia)
- **Mirror:** [pdtribe181-prog/advancia-get-together](https://github.com/pdtribe181-prog/advancia-get-together)
- **Domain checklist:** [DOMAIN_AND_BRANDING_CHECKLIST.md](./DOMAIN_AND_BRANDING_CHECKLIST.md)

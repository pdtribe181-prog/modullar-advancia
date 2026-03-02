# Vercel & VPS config — quick reference

## Vercel (frontend)

**Production frontend is on Cloudflare Pages.** Vercel is optional (previews or alternate host).

| Item | Status |
|------|--------|
| **vercel.json** | `frontend/vercel.json` — Vite build, output `dist`, SPA rewrites |
| **Frontend host** | **Cloudflare Pages** (production); Vercel optional |
| **frontend/.gitignore** | Contains `.vercel` (local Vercel link ignored) |
| **CORS** | Add Vercel preview URLs to backend `CORS_ORIGINS` if the app calls the API from Vercel |

### Deploy frontend to Vercel

1. In Vercel: **Add Project** → import repo → set **Root Directory** to `frontend`.
2. Vercel will use `frontend/vercel.json` (build: `npm run build`, output: `dist`, framework: vite, SPA rewrites).
3. **Environment variables** (in Vercel project settings):  
   `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and any other `VITE_*` the app needs.
4. **Preview URLs:** Hostnames like `advancia-healthcare-*.vercel.app` are treated as Healthcare branding (see `frontend/src/config/domains.ts`). For 401 on previews, turn off Vercel Password Protection or open in a browser where you’re logged into Vercel.
5. **Backend CORS:** If the frontend on Vercel calls your API, add the Vercel deployment origin(s) to the API’s `CORS_ORIGINS` (e.g. `https://your-project.vercel.app`, or use a wildcard for previews if your backend allows it).

---

## VPS config (Hostinger)

Production backend and API are on a single Hostinger VPS. Frontend is built and served via **Cloudflare Pages** (or from the same VPS depending on setup); API is on the VPS.

### Quick reference

| Item | Value |
|------|--------|
| **VPS IP** | `76.13.77.8` |
| **SSH (runbook)** | `advancia-vps` or `advancia@76.13.77.8` (preferred non-root user) |
| **SSH (vps-deploy script default)** | `root@76.13.77.8` |
| **App dir on VPS** | `/var/www/advancia` |
| **PM2 process** | `advancia-api` |
| **API port** | `3000` (local); public via `api.advanciapayledger.com` |

### Repo files that define VPS behavior

| File | Purpose |
|------|--------|
| **scripts/vps-deploy.ts** | Local script: push to origin, SSH to VPS, pull, `npm ci`, build, `pm2 reload`. Env: `VPS_HOST`, `VPS_USER`, `VPS_APP_DIR`. |
| **config/ecosystem.config.cjs** | PM2: cluster mode, `dist/server.js`, `cwd: /var/www/advancia`, PORT 3000, `max_memory_restart: 1G`. |
| **nginx/advancia.conf** | Nginx: HTTPS for `api.advanciapayledger.com`, www→apex redirect, rate limits (api/auth/webhooks), proxy to `127.0.0.1:3000`. |
| **scripts/5-VPS-DEPLOY.sh** | One-time/setup: run on VPS to install Node, PM2, Nginx, certbot. |
| **scripts/setup-vps.sh** | Initial VPS setup (Ubuntu 22.04+). |

### Deploy commands

```bash
# Dry-run (show steps only)
npm run deploy:vps

# Deploy to VPS (push + pull + build + pm2 reload)
npm run deploy:vps -- --apply

# Deploy and upload .env
npm run deploy:vps -- --apply --env
```

Override from env (optional):

- `VPS_HOST` (default: `76.13.77.8`)
- `VPS_USER` (default: `root`; use `advancia` if you deploy as that user)
- `VPS_APP_DIR` (default: `/var/www/advancia`)

### Note on SSH user

- **DEPLOYMENT_RUNBOOK.md** and runbook commands use **`advancia`** (e.g. `ssh advancia-vps`).
- **scripts/vps-deploy.ts** defaults to **`root`**. To use `advancia`, set `VPS_USER=advancia` when running the script (or in env).

---

## Summary

- **Vercel:** Not used; frontend is on Cloudflare Pages. No Vercel config files in repo.
- **VPS:** Hostinger `76.13.77.8`, app in `/var/www/advancia`, PM2 `advancia-api`, Nginx for API and SSL. Use `scripts/vps-deploy.ts` and `nginx/advancia.conf` as the source of truth for deploy and server config.

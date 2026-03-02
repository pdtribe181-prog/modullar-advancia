# Vercel & VPS config — quick reference

## Vercel

**This repo does not use Vercel for production.**

| Item | Status |
|------|--------|
| **vercel.json / vercel.yaml** | None in repo |
| **Frontend host** | **Cloudflare Pages** (auto-deploys from `main`) |
| **frontend/.gitignore** | Contains `.vercel` (local Vercel link ignored) |
| **CORS** | Tests allow `https://preview.vercel.app` for previews; production allows advanciapayledger.com and advancia-healthcare.com |

If you ever connect the frontend to Vercel (e.g. previews), add a **vercel.json** in `frontend/` with build/output settings; no Vercel config is required for current Cloudflare-based deployment.

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

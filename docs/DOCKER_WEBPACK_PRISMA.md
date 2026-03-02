# Docker, containers, webpack, modules, Prisma — status

Quick reference for Docker Desktop, containers, bundling (webpack vs Vite/esbuild), and Prisma in this repo.

---

## 1. Docker & Docker Desktop

**Dockerfile:** `config/Dockerfile` (multi-stage, Node 20 Alpine)

- **Builder:** `npm ci --ignore-scripts`, `npm run build` (esbuild) → `dist/server.js`
- **Deps:** production-only `npm ci --omit=dev`
- **Production:** non-root user, healthcheck on `/health`, `CMD ["node", "dist/server.js"]`

**Build from repo root:**

```bash
npm run docker:build
# or
docker build -f config/Dockerfile -t healthcare-payment-api .
```

**Run with Docker Desktop (or CLI):**

```bash
docker run -p 3000:3000 --env-file .env healthcare-payment-api
```

**Compose:** `config/docker-compose.yml`

- **Service `api`:** builds with `context: .` and `dockerfile: config/Dockerfile`, port 3000, env from `.env`
- **Service `stripe-cli`:** optional (`docker compose --profile dev up`), forwards webhooks to `http://api:3000/api/v1/stripe/webhook`

Run from repo root:

```bash
docker compose -f config/docker-compose.yml up --build
# With Stripe CLI for local webhook testing:
docker compose -f config/docker-compose.yml --profile dev up --build
```

**CI/CD:** GitHub Actions (ci.yml, docker-publish.yml) use `context: .` and `file: config/Dockerfile` so the image builds from the repo root with the Dockerfile in `config/`.

---

## 2. Containers

| Item | Location | Purpose |
|------|----------|---------|
| **API image** | `config/Dockerfile` | Backend API (Express), single container |
| **docker-compose** | `config/docker-compose.yml` | API + optional Stripe CLI (profile `dev`) |
| **Network** | `healthcare-payment-network` | Default compose network |

No Redis/Postgres in compose — the app uses **Supabase** (and optional Upstash Redis). For local API-only runs, use `.env` with Supabase (and Stripe) credentials.

---

## 3. Webpack

**This project does not use Webpack.**

- **Backend:** **esbuild** (`config/esbuild.config.js`) — single bundle `dist/server.js`, ESM, Node 20.
- **Frontend:** **Vite** (`frontend/vite.config.ts`) — dev server, production Rollup build, code-split with `manualChunks` (vendor-react, vendor-charts, vendor-stripe, vendor-sentry).

The only “webpack” reference is in **docs/PERFORMANCE_TUNING.md**: an example comment `/* webpackChunkName: "dashboard" */` for lazy-loaded routes. That’s a documentation example; Vite/Rollup ignore it. Chunk naming is done via `manualChunks` in `vite.config.ts`.

---

## 4. Modules

- **Backend:** ESM (`"type": "module"` in package.json). Imports use `.js` extensions for compiled output. Dependencies are marked `packages: 'external'` in esbuild so they are not bundled.
- **Frontend:** ESM, Vite + React. Code-split via `React.lazy()` and Vite’s `manualChunks`.
- **Tests:** Jest with `--experimental-vm-modules` for ESM; frontend uses Vitest.

---

## 5. Prisma

**This project does not use Prisma.**

- **Database access:** **Supabase** (REST/client) and direct **Postgres** (`pg`) where needed. Migrations and schema are Supabase/SQL (see `docs/MIGRATIONS_README.md`, Supabase dashboard).
- **Prisma in repo:** No `schema.prisma`, no `@prisma/client` in package.json. The only mention is in **.vscode/settings.json** (`prisma.pinToPrisma6: true`) — a leftover editor setting; safe to remove if you don’t use Prisma elsewhere.

If you later add Prisma: add `schema.prisma`, run `prisma generate`, and use Prisma Client instead of (or alongside) Supabase client where desired.

---

## 6. Summary

| Topic | Status |
|-------|--------|
| **Docker** | ✅ `config/Dockerfile` + `config/docker-compose.yml`; build/CI use `config/Dockerfile`. |
| **Containers** | ✅ API container; optional Stripe CLI via compose profile `dev`. |
| **Webpack** | ❌ Not used; backend = esbuild, frontend = Vite. |
| **Modules** | ✅ ESM (Node + Vite); Jest with vm-modules, Vitest for frontend. |
| **Prisma** | ❌ Not used; Supabase + Postgres. |

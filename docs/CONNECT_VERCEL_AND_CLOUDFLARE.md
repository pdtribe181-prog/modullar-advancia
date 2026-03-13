# Connect Frontend to Vercel and Cloudflare

Use this so the same repo deploys to **Vercel** for the live frontend and previews, while **Cloudflare** continues handling DNS and any API-side proxy/CDN duties you keep there. Both frontend deployment flows read from the **frontend** folder.

---

## Which option: VPS deploy all vs connect to Vercel/Cloudflare?

**Recommendation: keep the frontend on Vercel and keep the API on the VPS.**

| | Connect to Vercel / Cloudflare | VPS deploy all (frontend + API on same server) |
|---|--------------------------------|-----------------------------------------------|
| **Frontend** | Vercel | Nginx on VPS serves built `frontend/dist` |
| **Backend** | Stays on VPS (current setup) | Same VPS |
| **Pros** | Global CDN, preview deploys per PR, no frontend build on VPS, frontend traffic doesn’t hit API server | One server, one bill, single place to manage |
| **Cons** | Two platforms, CORS config (already done) | No edge CDN unless Cloudflare in front; you maintain frontend build + deploy on VPS |
| **Best for** | Production, growth, previews, better performance | Very small setup, one box, strict single-provider requirement |

Use **Vercel** for the frontend unless you have a strong reason to serve everything from the VPS (e.g. one server only, no third-party frontend host). Backend stays on the VPS either way.

---

## 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your Git repo.
2. **Root Directory:** Click **Edit** and set to **`frontend`** (required).
3. **Framework Preset:** Vite (auto-detected from `frontend/vercel.json`).
4. **Build & Output:** Leave default; `frontend/vercel.json` sets:
   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA rewrites so routes like `/features` work.
5. **Environment Variables:** Add (for Production and Preview if needed):
   - `VITE_API_URL` = your API base (e.g. `https://api.advanciapayledger.com/api/v1`)
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Any other `VITE_*` your app uses.
6. Deploy. Preview URLs will look like `your-project-xxx.vercel.app`.

**Backend CORS:** If the Vercel deployment calls your API, add the Vercel origin(s) to the API env:
`CORS_ORIGINS=https://your-project.vercel.app,https://your-project-*.vercel.app` (or each preview URL you need).

---

## 2. Summary

| Platform   | Root directory | Build command   | Output | Config in repo        |
|------------|----------------|-----------------|--------|------------------------|
| **Vercel** | `frontend`     | `npm run build` | `dist` | `frontend/vercel.json` |

Use **`frontend`** as the root directory so `package.json` and `vite.config.ts` are used. Backend: add Vercel preview origins to **CORS_ORIGINS** if those frontends call the API.

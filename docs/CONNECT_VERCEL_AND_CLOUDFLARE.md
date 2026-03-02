# Connect Frontend to Vercel and Cloudflare Pages

Use this so the same repo deploys to **Vercel** (previews or production) and **Cloudflare Pages** (production). Both read from the **frontend** folder.

---

## Which option: VPS deploy all vs connect to Vercel/Cloudflare?

**Recommendation: connect to Vercel or Cloudflare Pages (frontend) and keep the API on the VPS.**

| | Connect to Vercel / Cloudflare | VPS deploy all (frontend + API on same server) |
|---|--------------------------------|-----------------------------------------------|
| **Frontend** | Vercel or Cloudflare Pages | Nginx on VPS serves built `frontend/dist` |
| **Backend** | Stays on VPS (current setup) | Same VPS |
| **Pros** | Global CDN, preview deploys per PR, no frontend build on VPS, frontend traffic doesn’t hit API server | One server, one bill, single place to manage |
| **Cons** | Two platforms, CORS config (already done) | No edge CDN unless Cloudflare in front; you maintain frontend build + deploy on VPS |
| **Best for** | Production, growth, previews, better performance | Very small setup, one box, strict single-provider requirement |

Use **Vercel or Cloudflare** for the frontend unless you have a strong reason to serve everything from the VPS (e.g. one server only, no third-party frontend host). Backend stays on the VPS either way.

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

## 2. Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your repo and branch (e.g. **main**).
3. **Build configuration:**
   - **Project name:** e.g. `advancia-payledger` or `advancia-healthcare`
   - **Production branch:** `main`
   - **Root directory (advanced):** **`frontend`**
   - **Framework preset:** None (or Vite if listed)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables:** Add the same `VITE_*` vars as above (Production and Preview).
5. **Save and Deploy.** Custom domains (e.g. advanciapayledger.com, advancia-healthcare.com) can be added under **Custom domains**.

**Backend CORS:** Production domains (advanciapayledger.com, advancia-healthcare.com) are already allowed by the API. For Cloudflare Pages preview URLs (e.g. `xxx.pages.dev`), add them to `CORS_ORIGINS` if the preview app calls the API.

---

## 3. Summary

| Platform           | Root directory | Build command   | Output | Config in repo        |
|--------------------|----------------|-----------------|--------|------------------------|
| **Vercel**         | `frontend`    | `npm run build` | `dist` | `frontend/vercel.json` |
| **Cloudflare Pages** | `frontend` | `npm run build` | `dist` | Set in dashboard       |

Both use the same build; set **Root Directory** to **`frontend`** so `package.json` and `vite.config.ts` are used. Backend: add Vercel/Cloudflare preview origins to **CORS_ORIGINS** if those frontends call the API.

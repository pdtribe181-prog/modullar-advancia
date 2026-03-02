# Router, API & navigation — how the 3 domains work

Same frontend build serves **advanciapayledger.com** and **advancia-healthcare.com**. **advanciapayroll.com** does not run the app (301 redirect to PayLedger). Behavior is consistent and responsive on both app domains.

---

## 1. Domain roles

| Domain | Serves app? | Home page | API | Notes |
|--------|-------------|-----------|-----|--------|
| **advanciapayledger.com** | Yes | PayLedger landing | Same API | Primary app + marketing. |
| **www.advanciapayledger.com** | Yes (if CNAME/redirect) | Same | Same | Alias; 301 to apex or CNAME. |
| **advancia-healthcare.com** | Yes | Healthcare Wallet landing | Same API | **Personal** (individuals/patients, personal folder); same build, host-based branding. |
| **www.advancia-healthcare.com** | Yes (optional) | Same | Same | Alias. |
| **advanciapayroll.com** | No | Hostinger | — | 301 → advanciapayledger.com (set in Hostinger). |

---

## 2. Router

- **Single React Router** in `frontend/src/App.tsx`. All routes are the same on both app domains.
- **Only difference by domain:** the **index route** (`/`):
  - **advancia-healthcare.com** (or www) → `HealthcareLanding`
  - **advanciapayledger.com** (and everything else) → `LandingPage`
- Detection: `window.location.hostname === 'advancia-healthcare.com' || hostname === 'www.advancia-healthcare.com'` (in `App.tsx` and `Layout.tsx`).
- No `basename`; router uses current origin. Works the same on both domains.

**Routes (same on both domains):**  
`/`, `/features`, `/policy`, `/subscriptions`, `/wallet-tools`, `/faq`, `/contact`, `/login`, `/signup`, `/payment`, `/payment/success`, `/checkout`, `/reset-password`, `/auth/callback`, `/dashboard`, `/history`, `/profile`, `/appointments`, `/provider`, `/security`, `/security/mfa`, `/wallet`, `/convert`, `/wallet-balance`, `/withdraw`, `/medbed`, `/notifications`, `/terms`, `/verify-email`, `/welcome`, `/invoices`, `/disputes`, `/kyc`, `/admin`, `/admin/audit-log`, `*` (NotFound).

---

## 3. API

- **Single base URL:** `frontend/src/services/api.ts` uses `import.meta.env.VITE_API_URL || '/api/v1'`.
- **Same API for both domains:** Production build should set `VITE_API_URL` to `https://api.advanciapayledger.com/api/v1` (or your API origin). No domain-specific API URL.
- **CORS:** Backend allows both origins (advanciapayledger.com, www, app, advancia-healthcare.com, www). All API calls work from either domain.
- **Auth:** Token is stored and sent per origin. Google OAuth uses `window.location.origin + '/auth/callback'`, so callback stays on the domain where the user started (Supabase Redirect URLs must list both domains).

---

## 4. Navigation

- **Layout** (`frontend/src/components/Layout.tsx`): All nav links use **relative** paths (`to="/..."`), so they work identically on both domains.
- **Healthcare landing:** “Get Started” CTAs use **absolute** URL `https://advanciapayledger.com/signup` so Healthcare visitors create/log in via PayLedger (one account system). “Talk to Our Team” → `mailto:support@advancia-healthcare.com`.
- **Footer:** Links are relative (`/features`, `/faq`, `/policy`, etc.). Contact is `mailto:${supportEmail}` where `supportEmail` is chosen by host (advancia-healthcare.com vs advanciapayledger.com).
- **No full-page reload** for in-app navigation; React Router handles it the same on both domains.

---

## 5. Responsiveness (same on both domains)

- **Layout**
  - **Desktop (width > 860px):** Horizontal nav (`.app-nav`) visible; hamburger hidden.
  - **Mobile (≤ 860px):** Nav hidden; hamburger (`.app-hamburger`) visible; tapping it opens the mobile drawer (`.app-mobile-nav`) with the same links.
  - Drawer closes on link click (`closeMenu`).
- **Breakpoints** used in `frontend/src/styles.css`:
  - **860px:** Nav ↔ hamburger + mobile drawer.
  - **640px:** Footer columns wrap; some content stacks.
  - **768px, 900px, etc.:** Page-specific (landing, policy, subscriptions, etc.) for consistent layout on small screens.
- **Touch:** Buttons and links are sized for tap; no desktop-only hover requirements for core actions.

---

## 6. Checklist (router / API / nav / responsive)

- [x] Single router; index route differs by host (Healthcare vs PayLedger landing).
- [x] All other routes and navigation behave the same on both app domains.
- [x] API base URL is one env var (`VITE_API_URL`); same backend for both domains.
- [x] CORS allows both domains; no client-side domain switch for API.
- [x] Nav and footer use relative paths except intentional cross-domain (Healthcare → PayLedger signup).
- [x] Layout is responsive: desktop nav, mobile hamburger + drawer, breakpoints in CSS.
- [x] advanciapayroll.com does not run the app (redirect only).

---

## 7. Optional: keep behavior in sync

- **New routes:** Add in `App.tsx` only; they apply to both domains.
- **New nav links:** Use `<Link to="...">` or `<NavLink to="...">` so both domains get the same behavior.
- **New API calls:** Use the shared `api` service; no domain-specific logic needed.
- **New breakpoints:** Prefer the same breakpoints (e.g. 860px for header) so both domains stay aligned.

See also: [DOMAIN_AND_BRANDING_CHECKLIST.md](./DOMAIN_AND_BRANDING_CHECKLIST.md), [DOMAINS_AND_GOOGLE_OAUTH.md](./DOMAINS_AND_GOOGLE_OAUTH.md).

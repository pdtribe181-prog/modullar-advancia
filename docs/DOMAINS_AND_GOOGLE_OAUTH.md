# Domain positioning, redirects & Google OAuth

How the three domains fit together and what to configure for redirects and Google sign-in.

---

## 1. Domain positioning and redirects

| Domain | Role | Action |
|--------|------|--------|
| **advanciapayledger.com** | Primary: PayLedger marketing + app | Live. Frontend on Cloudflare Pages; API on VPS. No redirect. |
| **www.advanciapayledger.com** | Alias | 301 → advanciapayledger.com (Nginx or Cloudflare). |
| **app.advanciapayledger.com** | Optional app subdomain | Same app as apex; add as custom domain in Cloudflare Pages if desired. |
| **api.advanciapayledger.com** | API | Served from VPS; no redirect. |
| **advancia-healthcare.com** | **Personal** (individuals/patients, personal folder); Healthcare Wallet marketing | Same frontend build as PayLedger; add as custom domain in Cloudflare Pages. Shows Healthcare landing when host matches. **No redirect.** |
| **www.advancia-healthcare.com** | Optional alias | Add in Pages if desired; or 301 → advancia-healthcare.com. |
| **advanciapayroll.com** | Legacy / unused | **301 redirect** to `https://advanciapayledger.com` (and same for www). Do not serve app here. |

### Redirect summary

- **advanciapayroll.com** → **301** → `https://advanciapayledger.com`
  (Configure in **Hostinger** → Websites → Redirects; payroll domain is on Hostinger; PayLedger is on Cloudflare.)
- **www.advanciapayledger.com** → **301** → `https://advanciapayledger.com`  
  (Already in Nginx; ensure CNAME www → apex in Cloudflare.)

---

## 2. Google OAuth and redirect URIs

The app uses **Supabase Auth** with Google (and optionally other providers). The frontend sends users to Supabase with `redirect_to = window.location.origin + '/auth/callback'`, so the **origin** (domain) where the user started sign-in is where they return after Google.

### Where OAuth is used

- **Login / sign-up:** Frontend builds the Supabase auth URL with `redirect_to: window.location.origin + '/auth/callback'`.
- So:
  - On **advanciapayledger.com** → callback is `https://advanciapayledger.com/auth/callback`.
  - On **advancia-healthcare.com** → callback is `https://advancia-healthcare.com/auth/callback`.
  - On **app.advanciapayledger.com** → callback is `https://app.advanciapayledger.com/auth/callback`.

### What to configure

#### A. Supabase Dashboard — Redirect URLs

1. Go to **Supabase** → your project → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add every URL that can receive the OAuth callback (one per line):

   ```
   https://advanciapayledger.com/auth/callback
   https://www.advanciapayledger.com/auth/callback
   https://app.advanciapayledger.com/auth/callback
   https://advancia-healthcare.com/auth/callback
   https://www.advancia-healthcare.com/auth/callback
   http://localhost:5173/auth/callback
   ```

3. **Site URL** can stay as your primary app, e.g. `https://advanciapayledger.com`.

If a domain is missing from this list, Supabase will reject the redirect after Google sign-in and the user will see an error.

#### B. Google Cloud Console — OAuth client

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials** → your **OAuth 2.0 Client ID** (the one used by Supabase).
2. Under **Authorized redirect URIs**, you typically have **Supabase’s** callback, e.g.:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`

   Google redirects to Supabase; Supabase then redirects to your app using the `redirect_to` you sent. So you usually **do not** add `https://advanciapayledger.com/auth/callback` in Google — only in Supabase. If your integration uses a different flow (e.g. direct redirect to your domain), add that exact callback URL in Google as well.

3. Under **Authorized JavaScript origins** (if used for popup/one-tap), add every origin that hosts your app:

   ```
   https://advanciapayledger.com
   https://www.advanciapayledger.com
   https://app.advanciapayledger.com
   https://advancia-healthcare.com
   https://www.advancia-healthcare.com
   http://localhost:5173
   ```

### advanciapayroll.com and OAuth

- **advanciapayroll.com** should only **301 redirect** to advanciapayledger.com. Users never land on the payroll domain to sign in, so you **do not** need to add `https://advanciapayroll.com/auth/callback` to Supabase or Google.

---

## 3. Backend FRONTEND_URL and CORS

- **FRONTEND_URL** on the API (e.g. on the VPS) is typically set to **one** primary origin, e.g. `https://advanciapayledger.com`. It is used for:
  - Password-reset links.
  - Backend-initiated OAuth link flow (`POST /auth/identities/link`) redirect URL.
- **CORS** in this repo already allows:
  - advanciapayledger.com, www, app
  - advancia-healthcare.com, www  

So both domains can call the API. If a user on **advancia-healthcare.com** uses “Link Google” from the backend flow, they will be sent to `FRONTEND_URL/auth/callback` (PayLedger). For sign-in from the Healthcare site, the frontend uses `window.location.origin + '/auth/callback'`, so callback stays on advancia-healthcare.com as long as that URL is in Supabase Redirect URLs.

---

## 4. Checklist

- [ ] **advanciapayroll.com** (and www) → 301 to `https://advanciapayledger.com`.
- [ ] **advancia-healthcare.com** added as custom domain on Cloudflare Pages (same project as PayLedger).
- [ ] **Supabase** → Redirect URLs include all app callback URLs (PayLedger, Healthcare, app subdomain, localhost).
- [ ] **Google Cloud Console** → Authorized redirect URIs include Supabase callback; Authorized JavaScript origins include all app origins (PayLedger, Healthcare, app, localhost).
- [ ] No callback URL for advanciapayroll.com (redirect-only domain).

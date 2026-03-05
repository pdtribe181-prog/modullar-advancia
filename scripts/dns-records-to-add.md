# DNS Records to Add in Cloudflare

**Domain**: advanciapayledger.com  
**Go to**: https://dash.cloudflare.com → advanciapayledger.com → DNS → Records

## 1. DMARC Record (REQUIRED for Email Deliverability)

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@advanciapayledger.com; pct=100; adkim=s; aspf=s
TTL: Auto
Proxy: DNS only (gray cloud)
```

**What this does:**

- `p=quarantine`: Suspicious emails go to spam
- `rua=mailto:...`: Send aggregate reports to this email
- `pct=100`: Apply policy to 100% of mail
- `adkim=s`: Strict DKIM alignment
- `aspf=s`: Strict SPF alignment

## 2. WWW Alias (Optional - if you want www.advanciapayledger.com)

**Option A — CNAME (recommended if you want www to resolve):**

```
Type: CNAME
Name: www
Target: advanciapayledger.com
TTL: Auto
Proxy: Proxied (orange cloud)
```

**Option B — Redirect only:** If you use a Cloudflare Redirect Rule (e.g. 301 from `www.advanciapayledger.com` to `https://advanciapayledger.com`) and do not add a CNAME, `npm run verify:dns` will still report "CNAME (www) — Record not found". That is expected; the redirect is valid and users will reach the apex. To clear the script warning, add the CNAME above.

## 3. App Subdomain (Optional - if you plan separate app hosting)

```
Type: A or CNAME
Name: app
Target: [Your VPS IP: 76.13.77.8 OR a different host]
TTL: Auto
Proxy: Proxied (orange cloud) or DNS only depending on your needs
```

## Verification Commands

After adding DMARC:

```powershell
# Check DMARC record
Resolve-DnsName -Name _dmarc.advanciapayledger.com -Type TXT

# Run full security verification
.\scripts\verify-production-security.ps1

# Should now show:
# [PASS] DMARC record found
```

## Current DNS Records (Already Configured ✓)

- A: `api.advanciapayledger.com` → `76.13.77.8` (Proxied)
- A: `advanciapayledger.com` → `76.13.77.8` (Proxied)
- CNAME: `api-staging.advanciapayledger.com` → `modullar-advancia.onrender.com` (DNS only)
- TXT: SPF record (`v=spf1 include:_spf.mx.cloudflare.net ~all`) ✓
- TXT: DKIM record (`resend._domainkey`) ✓
- MX: Email routing configured ✓

---

## Additional Domains (`advancia-healthcare.com`, `advanciapayroll.com`)

`npm run verify:domains` also checks:

- `advancia-healthcare.com`
- `advanciapayroll.com`

**Notes when reading the output:**

- For **advancia-healthcare.com**, you should eventually mirror the **email posture** of `advanciapayledger.com`:
  - Add SPF, DKIM (`resend._domainkey.advancia-healthcare.com`) and DMARC (`_dmarc.advancia-healthcare.com`) records following the same pattern as in this file and in `MANUAL_STEPS_DETAILS.md`.
  - Add `MX` records appropriate for your mail provider (Cloudflare Email Routing or Hostinger) if you want `support@advancia-healthcare.com` to receive mail.
- For **advanciapayroll.com**:
  - This domain is only intended to **301 redirect** to `https://advanciapayledger.com`.
  - It is normal for `API Health (https://api.advanciapayroll.com/health)` to **fail** if you do not host an API there.
  - You may choose **not** to configure DKIM for Resend on this domain if it never sends mail directly; you only need SPF/MX/DMARC if you plan to send or receive email for `@advanciapayroll.com`.

Use the failures printed by `npm run verify:domains` as a checklist and cross‑reference with `MANUAL_STEPS_DETAILS.md` when deciding which records to add for each secondary domain.

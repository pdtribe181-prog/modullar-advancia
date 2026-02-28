# Cloudflare Production Setup Guide

**Domain**: advanciapayledger.com  
**Zone ID**: 0bff66558872c58ed5b8b7942acc34d9

## SSL/TLS Configuration

### 1. SSL/TLS Mode (CRITICAL)

**Current**: Flexible or Full  
**Required**: Full (Strict)

**Steps**:

1. Go to: https://dash.cloudflare.com → advanciapayledger.com → SSL/TLS
2. Set encryption mode to: **Full (strict)**
3. This ensures end-to-end encryption between Cloudflare and your origin (VPS)

**Why**: Prevents MITM attacks between Cloudflare and your origin server.

### 2. HTTPS Settings

**Location**: SSL/TLS → Edge Certificates

- [x] Always Use HTTPS: **On** (already configured)
- [ ] Automatic HTTPS Rewrites: **On**
- [ ] HTTP Strict Transport Security (HSTS): **Enable** with:
  - Max Age: 12 months (31536000)
  - Include subdomains: Yes
  - Preload: Yes
- [x] Minimum TLS Version: **1.2** (already configured)
- [x] TLS 1.3: **Enabled** (already configured)

## Security Settings

**Location**: Security → Settings

### 3. Security Level

- Current: Unknown
- Recommended: **Medium**
- Adjust to High if you see attack patterns

### 4. Bot Fight Mode

- Recommended: **Enabled**
- Protects against automated bot traffic
- Free plan feature

### 5. Challenge Passage

- Recommended: **30 minutes**
- How long a passed challenge is valid

### 6. Browser Integrity Check

- Recommended: **On**
- Blocks known malicious browsers

### 7. Privacy Pass Support

- Recommended: **On**
- Reduces CAPTCHA challenges for legitimate users

## Firewall & Rate Limiting

**Location**: Security → WAF

### 8. Rate Limiting Rules

Create rules for:

**API Protection**:

- Path: `/api/v1/auth/*`
- Rate: 10 requests per minute per IP
- Action: Block

**Payment Endpoints**:

- Path: `/api/v1/payments/*`
- Rate: 20 requests per minute per IP
- Action: Challenge

**Health Checks** (already exempt for staging):

- Path: `/health`
- Action: Allow (no rate limit)

### 9. Firewall Rules (Optional)

Consider blocking:

- Known malicious IP ranges
- Countries not in your service area (if applicable)

## Performance Settings

**Location**: Speed → Optimization

### 10. Caching

- Caching Level: **Standard**
- Browser Cache TTL: **Respect Existing Headers**

### 11. Auto Minify

- HTML: **On**
- CSS: **On**
- JavaScript: **On**

### 12. Brotli Compression

- Recommended: **Enabled**

### 13. Rocket Loader

- Recommended: **Disabled** (can interfere with React/modern frameworks)

### 14. Early Hints

- Recommended: **Enabled** (improves page load)

## DNS Settings

**Location**: DNS → Records

### 15. Missing DNS Records

Add the following:

**WWW Alias** (if you want www.advanciapayledger.com):

```
Type: CNAME
Name: www
Target: advanciapayledger.com
Proxy: Yes (Orange cloud)
```

**App Subdomain** (if you have a separate app):

```
Type: A or CNAME
Name: app
Target: [Your VPS IP or hostname]
Proxy: Yes/No (depending on whether you want Cloudflare protection)
```

## Page Rules (Optional Premium Feature)

If you upgrade to Pro plan, consider:

1. **Force HTTPS Everywhere**:
   - URL: `http://*advanciapayledger.com/*`
   - Setting: Always Use HTTPS

2. **Cache API Health Endpoint** (bypass):
   - URL: `api.advanciapayledger.com/health`
   - Setting: Cache Level = Bypass

## Verification Commands

After configuration, verify:

```powershell
# Test SSL/TLS configuration
curl -I https://api.advanciapayledger.com/api/v1/health

# Check headers for HSTS
curl -I https://advanciapayledger.com | Select-String -Pattern 'strict-transport'

# Verify TLS version
openssl s_client -connect api.advanciapayledger.com:443 -tls1_2

# Test rate limiting (after configured)
for ($i=1; $i -le 15; $i++) {
  curl https://api.advanciapayledger.com/api/v1/auth/test -I
  Start-Sleep -Milliseconds 100
}
```

## Email DNS Records

**Location**: DNS → Records

These are required for Resend email delivery:

### SPF Record

```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
TTL: Auto
```

### DKIM Record (Get from Resend Dashboard)

```
Type: TXT
Name: resend._domainkey
Content: [Get from Resend dashboard after adding domain]
TTL: Auto
```

### DMARC Record

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@advanciapayledger.com; pct=100; adkim=s; aspf=s
TTL: Auto
```

## Post-Configuration Checklist

After completing the above:

- [ ] Test production API: https://api.advanciapayledger.com/api/v1/health
- [ ] Test frontend: https://advanciapayledger.com
- [ ] Verify SSL Labs score: https://www.ssllabs.com/ssltest/analyze.html?d=advanciapayledger.com
- [ ] Check security headers: https://securityheaders.com/?q=advanciapayledger.com
- [ ] Send test email via Resend
- [ ] Monitor Cloudflare Analytics for 24 hours

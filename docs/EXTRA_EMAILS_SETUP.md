# Extra email addresses (advanciapayledger.com)

The app and docs reference these addresses. Configure forwarding or mailboxes so they reach your team.

---

## Addresses and where they’re used

| Address | Where used | Purpose |
|--------|------------|--------|
| **support@** | Footer, FAQ, Contact, Withdraw | Required — see [DOMAIN_AND_BRANDING_CHECKLIST.md](./DOMAIN_AND_BRANDING_CHECKLIST.md). |
| **enterprise@** | Contact page (enterprise contact card) | Enterprise / sales inquiries. |
| **privacy@** | Policy (data rights, contact card) | Privacy requests, DSAR, opt-out. |
| **gdpr@** | Policy (EU representative) | GDPR / DPO contact. |
| **security@** | Policy (vulnerability reporting), SECURITY.md, ADMIN_MANUAL.md, PRODUCTION_CHECKLIST | Security issues, vulnerability reports. |
| **hello@** | Policy (contact card) | General contact. |
| **legal@** | Terms of Service (displayed; link goes to Contact) | Legal inquiries. |

---

## How to set them up

### Option A: Cloudflare Email Routing (if DNS is on Cloudflare)

1. Go to **Cloudflare Dashboard** → **advanciapayledger.com** → **Email** → **Email Routing**.
2. Ensure **Destination address** is set (your real inbox).
3. For each address, add a **Custom address**:
   - **Custom address**: `support`, `enterprise`, `privacy`, `gdpr`, `security`, `hello`, `legal`
   - **Action**: Forward to your destination address.
4. Add the MX (and optional DKIM/SPF) records Cloudflare shows if not already present.

You can forward all to the same inbox and use filters/labels, or create separate destinations per address.

### Option B: Registrar or host

Use your domain registrar’s or hosting provider’s “email forwarding” or “catch-all” and add the same addresses, all forwarding to one or more inboxes.

### Option C: Dedicated mailboxes

If you need separate inboxes (e.g. Google Workspace, Microsoft 365), create a mailbox for each address and configure MX for advanciapayledger.com to point to that provider.

---

## Checklist

- [ ] support@ — forwarding or mailbox
- [ ] enterprise@ — forwarding or mailbox
- [ ] privacy@ — forwarding or mailbox
- [ ] gdpr@ — forwarding or mailbox
- [ ] security@ — forwarding or mailbox
- [ ] hello@ — forwarding or mailbox
- [ ] legal@ — forwarding or mailbox

Test by sending a message to each address and confirming delivery (and checking spam).

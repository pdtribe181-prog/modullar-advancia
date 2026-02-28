# Frequently Asked Questions — Advancia PayLedger

> Healthcare Payment Platform FAQ

---

## General

### What is Advancia PayLedger?

Advancia PayLedger is a healthcare payment and compliance management platform that connects patients with healthcare providers. It enables secure payments, appointment scheduling, invoicing, and provides full HIPAA/GDPR compliance.

### Who is PayLedger for?

- **Patients** — Pay for healthcare services, manage appointments, view invoices
- **Providers** — Accept payments, manage schedules, track revenue
- **Administrators** — Monitor platform health, manage users, ensure compliance

### What devices are supported?

PayLedger works on any modern web browser:

- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (responsive design)
- No native app required — it's a web application

---

## Account & Security

### How do I create an account?

1. Go to https://advanciapayledger.com/signup
2. Enter your name, email, and password
3. Verify your email by clicking the link we send
4. Complete your profile

### How do I reset my password?

1. Go to https://advanciapayledger.com/login
2. Click **"Forgot password?"**
3. Enter your email address
4. Check your inbox for a reset link
5. Click the link and enter a new password

### What are the password requirements?

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### How do I enable two-factor authentication (MFA)?

1. Go to **Security Settings** → **Two-Factor Authentication**
2. Choose SMS verification or an authenticator app
3. Follow the setup prompts
4. Save your backup codes — you'll need these if you lose access to your phone

### What happens if I lose my MFA device?

Use one of your saved backup codes to log in, then re-configure MFA with your new device. If you don't have backup codes, contact support@advanciapayledger.com for manual identity verification.

### Is my data secure?

Yes. We employ multiple layers of security:

- **Encryption at rest**: AES-256 encryption for all stored data
- **Encryption in transit**: TLS 1.3 for all connections
- **HIPAA compliance**: Full compliance with healthcare data regulations
- **PCI DSS**: Payment card data handled by Stripe (PCI Level 1 certified)
- **Row-level security**: Database-level access controls prevent unauthorized data access
- **Audit logging**: All access to sensitive data is logged and monitored

---

## Payments

### What payment methods are accepted?

| Method             | Details                                        |
| ------------------ | ---------------------------------------------- |
| **Credit Card**    | Visa, Mastercard, American Express             |
| **Debit Card**     | Visa, Mastercard                               |
| **Cryptocurrency** | Bitcoin (BTC), Ethereum (ETH), USD Coin (USDC) |

### How long do payments take to process?

- **Card payments**: Instant confirmation, funds settle in 1-2 business days
- **Crypto payments**: Confirmation in 1-15 minutes depending on network congestion

### Are there any fees?

For patients: No additional fees beyond the provider's stated price.

For providers:
| Payment Type | Fee |
|-------------|-----|
| Card | ~5.4% + $0.30 per transaction |
| Crypto | ~1.5% + network gas fee |

### How do I get a refund?

1. Contact your provider first to request a refund
2. If unresolved, go to **Payments** → **History** → find the transaction → **Dispute**
3. Provide a reason and any supporting documentation
4. Disputes are typically resolved within 7-10 business days

### Where can I find my receipts?

Go to **Payments** → **History** → click any transaction → **Download Receipt**.

### When do providers receive payouts?

Providers receive payouts on their configured schedule:

- **Daily**, **Weekly** (default: Monday), or **Monthly**
- Minimum payout: $25
- Funds arrive in 1-2 business days after scheduled payout

---

## Appointments

### How do I book an appointment?

1. Go to **Appointments** → **Book New**
2. Search for your provider
3. Select an available time slot
4. Confirm the booking
5. You'll receive a confirmation email

### Can I cancel an appointment?

Yes. Go to **Appointments** → **Upcoming** → select the appointment → **Cancel**.

- Cancellations 24+ hours before: Free
- Cancellations within 24 hours: May incur a fee (set by provider)

### Do I get appointment reminders?

Yes. You'll receive:

- An email confirmation immediately after booking
- An SMS reminder 24 hours before
- An in-app notification 30 minutes before

---

## Invoices

### How do I view my invoices?

Go to **Invoices** to see all invoices with their status (Pending, Paid, Overdue).

### Can I pay an invoice online?

Yes. Click on any unpaid invoice and select **Pay Now**. You can pay with card or crypto.

### What if I disagree with an invoice?

Contact your provider directly using the contact information on the invoice. If unresolved, you can dispute the charge through the platform.

---

## Privacy & Data

### How can I export my data?

Go to **Profile** → **Privacy** → **Export My Data**. You'll receive a JSON file containing all your personal data stored on the platform.

### How can I delete my account?

Go to **Profile** → **Privacy** → **Delete My Account**. This will:

- Permanently delete your personal data
- Anonymize financial records (required by law for 7 years)
- Remove your authentication credentials
- Delete any uploaded files

This action cannot be undone.

### What data do you collect?

We collect only the data necessary to provide our services:

- **Account data**: Name, email, phone, password (hashed)
- **Health data**: Appointment details, provider notes (encrypted)
- **Financial data**: Transaction records, invoice data (payment cards stored by Stripe, not us)
- **Usage data**: Login times, feature usage (if analytics cookies accepted)

### What cookies do you use?

| Cookie Type     | Purpose                                  | Required?                 |
| --------------- | ---------------------------------------- | ------------------------- |
| **Necessary**   | Session, CSRF protection, authentication | Yes (cannot disable)      |
| **Analytics**   | Sentry error tracking, usage metrics     | Optional                  |
| **Preferences** | Theme, language, notification settings   | Optional                  |
| **Marketing**   | Ad conversion tracking                   | Optional (off by default) |

You can manage cookie preferences by clicking the cookie icon in the footer.

### Do you comply with GDPR?

Yes. We are fully GDPR compliant:

- Right to access (data export)
- Right to erasure (account deletion)
- Right to rectification (profile editing)
- Consent management (cookie preferences)
- Data portability (JSON export)
- Data processing is lawful and transparent

### Do you comply with HIPAA?

Yes. All protected health information (PHI) is:

- Encrypted at rest and in transit
- Accessible only through role-based permissions
- Subject to audit logging
- Retained per HIPAA's 7-year minimum requirement
- Backed by Business Associate Agreements with all vendors (Supabase, Stripe)

---

## Providers

### How do I sign up as a provider?

See our [Provider Onboarding Guide](PROVIDER_GUIDE.md) for step-by-step instructions.

### How long does provider verification take?

Typically 1-2 business days after you submit all required documents through the Stripe Connect onboarding flow.

### How do I update my bank account?

Go to **Provider Dashboard** → **Settings** → **Payout Settings** → **Update Bank Account**. You'll be redirected to Stripe's secure form.

---

## Crypto / Wallet

### Which cryptocurrencies are supported?

- Bitcoin (BTC)
- Ethereum (ETH)
- USD Coin (USDC)

### How do I connect my crypto wallet?

1. Go to **Wallet** → **Connect**
2. Select your wallet provider (MetaMask, WalletConnect, etc.)
3. Approve the connection in your wallet
4. Your balance will appear on the dashboard

### Are crypto payments refundable?

Crypto payments can be refunded at the provider's discretion. Refunds are processed as a new transaction back to your wallet.

---

## Troubleshooting

### I can't log in

1. Verify you're using the correct email address
2. Try resetting your password
3. Ensure MFA code is correct (check time sync on your device)
4. Clear your browser cache and cookies
5. Try a different browser
6. Contact support if the issue persists

### My payment failed

Common reasons:

- **Insufficient funds**: Check your card/wallet balance
- **Card declined**: Contact your bank
- **3D Secure required**: Complete the authentication in the popup
- **Network error**: Check your internet connection and try again

### I'm not receiving emails

1. Check your spam/junk folder
2. Add noreply@advanciapayledger.com to your contacts
3. Verify your email address is correct in your profile
4. Contact support if the issue persists

### The page isn't loading

1. Check your internet connection
2. Try refreshing the page (Ctrl+R / Cmd+R)
3. Clear your browser cache
4. Check https://status.advanciapayledger.com for outages
5. Try a different browser or incognito mode

---

## Contact Support

- **Email**: support@advanciapayledger.com
- **Response time**: Within 24 hours (business days)
- **Emergency**: Include "URGENT" in the subject line for priority handling

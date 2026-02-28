# Provider Onboarding Guide — Advancia PayLedger

> Healthcare Payment Platform — Provider Guide

---

## Overview

As a healthcare provider on Advancia PayLedger, you can:

- Accept payments from patients (card + crypto)
- Manage appointments and scheduling
- Track revenue, invoices, and payouts
- Handle disputes and refunds
- Access analytics and reporting

---

## 1. Registration & Verification

### Create Your Provider Account

1. Navigate to **https://advanciapayledger.com/signup**
2. Register with your professional email
3. Verify your email address
4. Select **"I'm a Healthcare Provider"** during onboarding

### Complete Provider Verification

Your account requires verification before you can accept payments:

1. **Personal Information**
   - Full legal name
   - Date of birth
   - Social Security Number (last 4 digits — for Stripe identity verification)

2. **Professional Credentials**
   - Medical license number
   - NPI (National Provider Identifier)
   - Specialty/specialties
   - Practice name and address

3. **Tax Information**
   - EIN (Employer Identification Number) or SSN
   - Tax filing entity type (individual, LLC, corporation)

4. **Bank Account for Payouts**
   - Routing number
   - Account number
   - Account holder name

### Stripe Connect Onboarding

PayLedger uses **Stripe Connect** for secure payment processing:

1. After submitting your details, you'll be redirected to Stripe's onboarding flow
2. Stripe verifies your identity and banking information
3. Verification typically takes **1-2 business days**
4. You'll receive an email when your account is activated

**Status tracking**: Go to **Provider Dashboard** → **Account Status** to see:

- ✅ Verified — Ready to accept payments
- ⏳ Pending — Stripe is reviewing your documents
- ❌ Action Required — Additional documents needed (check email for details)

---

## 2. Provider Dashboard

### Overview Panel

| Metric                    | Description                                   |
| ------------------------- | --------------------------------------------- |
| **Today's Revenue**       | Payments collected today                      |
| **Monthly Revenue**       | Current month total                           |
| **Pending Payouts**       | Amount waiting to be transferred to your bank |
| **Upcoming Appointments** | Next 7 days                                   |
| **Outstanding Invoices**  | Unpaid patient invoices                       |

### Revenue Chart

- Toggle between **Daily**, **Weekly**, **Monthly** views
- Filter by payment method (card vs. crypto)
- Export data as CSV

---

## 3. Accepting Payments

### Automatic Payment Collection

When a patient pays for an appointment:

1. Payment is processed through Stripe
2. Platform fee is deducted (see fee schedule below)
3. Net amount is added to your pending payout balance
4. Payout is deposited to your bank on the configured schedule

### Fee Schedule

| Payment Type   | Platform Fee | Processing Fee        | Total         |
| -------------- | ------------ | --------------------- | ------------- |
| Card Payment   | 2.5%         | 2.9% + $0.30 (Stripe) | ~5.4% + $0.30 |
| Crypto Payment | 1.5%         | Network gas fee       | ~1.5% + gas   |

### Payout Schedule

- **Default**: Weekly (every Monday)
- **Options**: Daily, weekly, or monthly
- **Minimum payout**: $25
- **Configuration**: Provider Dashboard → Settings → Payout Schedule

---

## 4. Managing Appointments

### Set Your Availability

1. Go to **Provider Dashboard** → **Schedule**
2. Set your working hours for each day of the week
3. Block specific dates (vacations, holidays)
4. Set appointment duration (default: 30 minutes)

### Manage Bookings

1. View appointments in **Calendar** or **List** view
2. Click an appointment for details:
   - Patient name and contact
   - Reason for visit
   - Insurance information
   - Payment status
3. **Confirm**, **Reschedule**, or **Cancel** from the detail view

### Appointment Notifications

You'll receive notifications for:

- New booking (email + in-app)
- Cancellation by patient (email + in-app)
- Upcoming appointment (30 min before — in-app)
- No-show (email — triggers after 15 min)

---

## 5. Invoicing

### Create an Invoice

1. Go to **Provider Dashboard** → **Invoices** → **Create New**
2. Select the patient
3. Add line items:
   - Service description
   - CPT/procedure code (optional)
   - Amount
4. Set due date
5. Add notes (optional)
6. Click **Send Invoice**

The patient receives an email with a link to pay online.

### Invoice Statuses

| Status      | Meaning                              |
| ----------- | ------------------------------------ |
| **Draft**   | Not yet sent to patient              |
| **Sent**    | Emailed to patient, awaiting payment |
| **Viewed**  | Patient has opened the invoice       |
| **Paid**    | Payment received                     |
| **Overdue** | Past due date, unpaid                |
| **Void**    | Cancelled by provider                |

### Auto-Invoicing

Enable auto-invoicing for appointments:

1. Go to **Settings** → **Invoicing**
2. Toggle **Auto-Generate Invoice After Appointment**
3. Set default consultation fee
4. Invoices are automatically created and sent 1 hour after appointment ends

---

## 6. Handling Disputes & Refunds

### Disputes

When a patient disputes a charge:

1. You'll receive an email notification
2. Go to **Provider Dashboard** → **Disputes**
3. Review the dispute details
4. Submit evidence (appointment records, signed consent, service proof)
5. Stripe reviews and makes a decision (typically 7-10 business days)

### Issue a Refund

1. Go to **Provider Dashboard** → **Transactions**
2. Find the payment and click **Refund**
3. Enter the refund amount (full or partial)
4. Add a reason for the refund
5. Click **Process Refund**

Refunds are typically processed within 5-7 business days back to the patient's original payment method.

---

## 7. Analytics & Reporting

### Available Reports

| Report                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| **Revenue Summary**     | Total revenue by period                       |
| **Payment Breakdown**   | Revenue by payment method                     |
| **Patient Analytics**   | New vs. returning patients                    |
| **Appointment Metrics** | Booking rate, no-show rate, cancellation rate |
| **Payout History**      | All bank transfers with dates and amounts     |

### Export Data

- Go to **Analytics** → select report → **Export**
- Available formats: CSV, PDF
- Date range: Custom, This Month, Last 3 Months, YTD, Custom

---

## 8. Settings

### Profile Settings

- Update practice name, address, phone
- Update bio and specialties (visible to patients)
- Upload profile photo and practice logo

### Payment Settings

- Update bank account for payouts
- Change payout schedule
- Set consultation fee defaults
- Configure auto-invoicing

### Notification Preferences

- Toggle notification channels (email, SMS, in-app)
- Set quiet hours

---

## 9. Compliance & Security

### HIPAA Compliance

- All patient data is encrypted at rest (AES-256) and in transit (TLS 1.3)
- Access is controlled via role-based permissions
- Audit logs track all access to patient records
- Data retention follows HIPAA 7-year requirements

### Your Responsibilities

- Keep your login credentials secure
- Enable two-factor authentication
- Do not share patient data outside the platform
- Report any security concerns to security@advanciapayledger.com

---

## Need Help?

- **Provider Support**: support@advanciapayledger.com (mention "Provider" in subject)
- **Stripe Account Issues**: Dashboard → Account Status → "Get Help"
- **FAQ**: https://advanciapayledger.com/faq

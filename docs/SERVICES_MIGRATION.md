# Services Architecture Migration

## Overview

The platform now uses a **local database table** (`services`) as the single source of truth for all medical services, procedures, and pricing.

## Why This Change?

### Before (Redundant Architecture)
```
┌─────────────────┐     ┌──────────────────┐
│ Local Database  │     │  Stripe Products │
│   (services)    │ ❌  │      API         │
└─────────────────┘     └──────────────────┘
```

**Problems:**
- 🔴 Duplicate data in two places
- 🔴 Synchronization issues
- 🔴 External API dependency
- 🔴 Higher latency (network calls)
- 🔴 Additional costs (Stripe API usage)
- 🔴 Complex mapping between local IDs and Stripe product IDs

### After (Simplified Architecture)
```
┌─────────────────┐
│ Local Database  │
│   (services)    │  ← SINGLE SOURCE OF TRUTH
└─────────────────┘
```

**Benefits:**
- ✅ Single source of truth
- ✅ No synchronization needed
- ✅ No external dependencies
- ✅ Instant query response
- ✅ Lower operational costs
- ✅ Simpler codebase

## Migration Guide

### For API Consumers

#### Old (Deprecated)
```typescript
// ❌ DON'T USE - Deprecated
const response = await fetch('/api/v1/stripe/products');
const products = await response.json();
```

#### New (Recommended)
```typescript
// ✅ USE THIS - Local catalog
const response = await fetch('/api/v1/services');
const services = await response.json();
```

### API Endpoint Changes

| Old Endpoint (Deprecated)      | New Endpoint               | Notes                          |
|--------------------------------|----------------------------|--------------------------------|
| `GET /stripe/products`         | `GET /services`            | List all services              |
| `POST /stripe/products`        | `POST /services`           | Create new service (admin)     |
| `POST /stripe/prices`          | `PUT /services/:id`        | Update `default_price` field   |
| `GET /stripe/products/:id`     | `GET /services/:id`        | Get service details            |

### Data Structure

**Old (Stripe Product):**
```json
{
  "id": "prod_abc123",
  "name": "Initial Consultation",
  "description": "First patient visit",
  "active": true
}
```

**New (Local Service):**
```json
{
  "id": "uuid-here",
  "name": "Initial Consultation",
  "description": "First patient consultation and evaluation",
  "category": "Consultation",
  "code": "99201",
  "code_type": "CPT",
  "default_price": 150.00,
  "currency": "USD",
  "duration_minutes": 30,
  "is_active": true,
  "requires_authorization": false,
  "metadata": {},
  "created_at": "2026-02-26T10:00:00Z",
  "updated_at": "2026-02-26T10:00:00Z"
}
```

### For Frontend Developers

#### Update Service Fetching

```typescript
// Before
async function getProducts() {
  const res = await apiClient.get('/stripe/products');
  return res.data;
}

// After
async function getServices(category?: string) {
  const params = category ? `?category=${category}` : '';
  const res = await apiClient.get(`/services${params}`);
  return res.data;
}
```

#### Update Payment Flow

```typescript
// Before
const product = await getProduct(productId);
const payment = await createPayment({
  productId: product.id,
  priceId: product.default_price_id
});

// After
const service = await getService(serviceId);
const payment = await createPayment({
  amount: service.default_price * 100,  // Convert to cents
  currency: service.currency,
  metadata: {
    service_id: service.id,
    service_name: service.name,
    cpt_code: service.code
  }
});
```

### For Backend Developers

#### Creating Payments

```typescript
// OLD WAY (Don't use)
const product = await stripeServices.products.create({
  name: 'Consultation',
  // ...
});

// NEW WAY
const { data: service } = await supabase
  .from('services')
  .select('*')
  .eq('id', serviceId)
  .single();

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(service.default_price * 100),
  currency: service.currency,
  metadata: {
    service_id: service.id,
    service_name: service.name,
    cpt_code: service.code,
  },
});
```

## Database Schema

The `services` table contains:

```sql
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  code text,                    -- CPT/HCPCS/ICD-10 code
  code_type text,               -- 'CPT', 'HCPCS', 'ICD-10', 'custom'
  default_price numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  duration_minutes integer,
  is_active boolean DEFAULT true,
  requires_authorization boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Example Services

The platform comes pre-seeded with common healthcare services:

- **Consultations**: Initial Consultation ($150), Follow-up ($100)
- **Laboratory**: CBC ($35), Metabolic Panel ($50), Lipid Panel ($45)
- **Imaging**: X-Ray - Chest ($120), X-Ray - Extremity ($90)
- **Procedures**: Wound Care ($85), Suture Removal ($60)
- **Therapy**: Physical Therapy Evaluation ($125), PT Session ($75)

## Timeline

- ✅ **v1.0.0** (March 2026): Services routes added, Stripe product routes deprecated (410 status)
- 🔜 **v2.0.0** (June 2026): Stripe product routes will be removed entirely

## Questions?

For support with migration, see:
- Documentation: `/docs/migration/services`
- API Reference: `/docs/api/services`
- GitHub Issues: https://github.com/pdtribe181-prog/modullar-advancia/issues

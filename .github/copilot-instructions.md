# Modullar Advancia - Healthcare Payment Platform

## Project Overview

Healthcare payment and compliance management platform built with TypeScript and Supabase.

## Tech Stack

- **Backend**: Node.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **SDK**: @supabase/supabase-js

## Project Structure

```
modullar-advancia/
├── migrations/           # SQL migration files (001-011)
├── src/
│   ├── lib/supabase.ts  # Supabase client configuration
│   ├── types/           # TypeScript type definitions
│   └── services/        # API and auth services
├── package.json
└── tsconfig.json
```

## Database Tables

80+ tables including: user_profiles, patients, providers, appointments, transactions, invoices, disputes, notifications, api_keys, webhooks, compliance_logs

## Development Commands

- `npm install` - Install dependencies
- `npx tsx test-connection.ts` - Test Supabase connection
- `npx tsc` - Compile TypeScript

## Environment Variables

Copy `.env.example` to `.env` and configure:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Row Level Security

Run `migrations/011_row_level_security.sql` in Supabase SQL Editor to enable RLS policies.

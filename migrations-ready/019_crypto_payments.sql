-- Migration: Crypto Payments Support
-- Add support for cryptocurrency payments via Coinbase Commerce

-- Crypto transaction status enum
DO $$ BEGIN
  CREATE TYPE crypto_transaction_status AS ENUM (
    'pending',
    'confirmed', 
    'failed',
    'delayed',
    'resolved',
    'canceled',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crypto transactions table
CREATE TABLE IF NOT EXISTS crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id TEXT NOT NULL,
  charge_code TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  appointment_id UUID REFERENCES appointments(id),
  amount_usd INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status crypto_transaction_status NOT NULL DEFAULT 'pending',
  hosted_url TEXT NOT NULL,
  addresses JSONB, -- Crypto addresses (BTC, ETH, etc.)
  payment_details JSONB, -- Transaction details after payment
  metadata JSONB, -- Full charge object from Coinbase
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_patient_id ON crypto_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_provider_id ON crypto_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_charge_code ON crypto_transactions(charge_code);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_created_at ON crypto_transactions(created_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_crypto_transactions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_crypto_transactions_updated_at ON crypto_transactions;
CREATE TRIGGER trigger_crypto_transactions_updated_at
  BEFORE UPDATE ON crypto_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_crypto_transactions_updated_at();

-- Row Level Security
ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Patients can view their own crypto transactions
CREATE POLICY crypto_transactions_patient_select ON crypto_transactions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Providers can view transactions for their practice
CREATE POLICY crypto_transactions_provider_select ON crypto_transactions
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY crypto_transactions_service_all ON crypto_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE crypto_transactions IS 'Cryptocurrency payment transactions via Coinbase Commerce';
COMMENT ON COLUMN crypto_transactions.charge_id IS 'Coinbase Commerce charge ID';
COMMENT ON COLUMN crypto_transactions.charge_code IS 'Unique charge code for lookups';
COMMENT ON COLUMN crypto_transactions.addresses IS 'Crypto wallet addresses for payment (BTC, ETH, USDC, etc.)';
COMMENT ON COLUMN crypto_transactions.hosted_url IS 'Coinbase Commerce hosted checkout URL';
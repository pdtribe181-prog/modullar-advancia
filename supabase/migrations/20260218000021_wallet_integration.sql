-- Migration: Web3 Wallet Integration for Provider Payouts
-- Enables wallet linking for providers while keeping primary auth traditional

-- 1. WALLET TYPES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blockchain_network') THEN
    CREATE TYPE blockchain_network AS ENUM ('ethereum', 'solana', 'polygon', 'base', 'arbitrum');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_verification_status') THEN
    CREATE TYPE wallet_verification_status AS ENUM ('pending', 'verified', 'failed', 'expired', 'revoked');
  END IF;
END $$;

-- 2. LINKED WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.linked_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  wallet_label text,
  verification_status wallet_verification_status DEFAULT 'pending',
  verification_message text,
  verification_signature text,
  verified_at timestamp with time zone,
  is_primary_payout boolean DEFAULT false,
  payout_enabled boolean DEFAULT false,
  min_payout_amount numeric(12,2) DEFAULT 100.00,
  payout_currency text DEFAULT 'USDC',
  wallet_metadata jsonb DEFAULT '{}'::jsonb,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT linked_wallets_unique_address_network UNIQUE (wallet_address, blockchain_network),
  CONSTRAINT linked_wallets_valid_address CHECK (
    (blockchain_network IN ('ethereum', 'polygon', 'base', 'arbitrum') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    OR (blockchain_network = 'solana' AND length(wallet_address) BETWEEN 32 AND 44)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linked_wallets_primary_payout 
  ON public.linked_wallets (provider_id) WHERE is_primary_payout = true;

-- 3. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_wallet_id uuid NOT NULL REFERENCES public.linked_wallets(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('payout', 'refund', 'adjustment')),
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  fiat_equivalent numeric(12,2),
  exchange_rate numeric(18,8),
  blockchain_network blockchain_network NOT NULL,
  tx_hash text,
  block_number bigint,
  gas_fee numeric(18,8),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
  confirmations integer DEFAULT 0,
  required_confirmations integer DEFAULT 12,
  settlement_id uuid,
  invoice_ids uuid[],
  error_message text,
  retry_count integer DEFAULT 0,
  initiated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. WALLET VERIFICATION CHALLENGES
CREATE TABLE IF NOT EXISTS public.wallet_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  challenge_message text NOT NULL,
  nonce text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  signature text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  completed_at timestamp with time zone,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. WALLET AUDIT LOG
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  linked_wallet_id uuid REFERENCES public.linked_wallets(id),
  action text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_linked_wallets_user_id ON public.linked_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_provider_id ON public.linked_wallets(provider_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_address ON public.linked_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(linked_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider ON public.wallet_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_address ON public.wallet_verification_challenges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_user ON public.wallet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_created ON public.wallet_audit_log(created_at DESC);

-- 7. ROW LEVEL SECURITY
ALTER TABLE public.linked_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_verification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_wallets" ON public.linked_wallets
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "providers_view_own_transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = wallet_transactions.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_manage_wallet_transactions" ON public.wallet_transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users_manage_own_challenges" ON public.wallet_verification_challenges
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_view_own_wallet_audit" ON public.wallet_audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "service_insert_wallet_audit" ON public.wallet_audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 8. TRIGGERS
CREATE OR REPLACE FUNCTION update_wallet_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linked_wallets_updated_at BEFORE UPDATE ON public.linked_wallets
  FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

-- 9. GRANTS
GRANT USAGE ON TYPE blockchain_network TO authenticated;
GRANT USAGE ON TYPE wallet_verification_status TO authenticated;

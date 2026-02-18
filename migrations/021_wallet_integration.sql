-- Migration 021: Web3 Wallet Integration for Provider Payouts
-- Enables wallet linking for providers while keeping primary auth traditional

-- ============================================================
-- 1. WALLET TYPES AND ENUMS
-- ============================================================

-- Blockchain networks supported
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blockchain_network') THEN
    CREATE TYPE blockchain_network AS ENUM ('ethereum', 'solana', 'polygon', 'base', 'arbitrum');
  END IF;
END $$;

-- Wallet verification status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_verification_status') THEN
    CREATE TYPE wallet_verification_status AS ENUM ('pending', 'verified', 'failed', 'expired', 'revoked');
  END IF;
END $$;

-- ============================================================
-- 2. LINKED WALLETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.linked_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  
  -- Wallet details
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  wallet_label text, -- User-friendly name: "Main Payout Wallet"
  
  -- Verification
  verification_status wallet_verification_status DEFAULT 'pending',
  verification_message text, -- Signed message for verification
  verification_signature text, -- Signature from wallet
  verified_at timestamp with time zone,
  
  -- Payout settings
  is_primary_payout boolean DEFAULT false,
  payout_enabled boolean DEFAULT false,
  min_payout_amount numeric(12,2) DEFAULT 100.00,
  payout_currency text DEFAULT 'USDC',
  
  -- Metadata
  wallet_metadata jsonb DEFAULT '{}'::jsonb, -- ENS name, NFT profile, etc.
  last_activity_at timestamp with time zone,
  
  -- Audit
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT linked_wallets_unique_address_network UNIQUE (wallet_address, blockchain_network),
  CONSTRAINT linked_wallets_valid_address CHECK (
    (blockchain_network IN ('ethereum', 'polygon', 'base', 'arbitrum') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    OR (blockchain_network = 'solana' AND length(wallet_address) BETWEEN 32 AND 44)
  )
);

-- Only one primary payout wallet per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_linked_wallets_primary_payout 
  ON public.linked_wallets (provider_id) 
  WHERE is_primary_payout = true;

-- ============================================================
-- 3. WALLET TRANSACTIONS TABLE (Crypto payouts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_wallet_id uuid NOT NULL REFERENCES public.linked_wallets(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  
  -- Transaction details
  transaction_type text NOT NULL CHECK (transaction_type IN ('payout', 'refund', 'adjustment')),
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  fiat_equivalent numeric(12,2), -- USD value at time of transaction
  exchange_rate numeric(18,8),
  
  -- Blockchain details
  blockchain_network blockchain_network NOT NULL,
  tx_hash text,
  block_number bigint,
  gas_fee numeric(18,8),
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
  confirmations integer DEFAULT 0,
  required_confirmations integer DEFAULT 12,
  
  -- Related records
  settlement_id uuid, -- Link to traditional settlement if applicable
  invoice_ids uuid[], -- Invoices being paid out
  
  -- Error handling
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Timestamps
  initiated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 4. WALLET VERIFICATION CHALLENGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  
  -- Challenge details
  challenge_message text NOT NULL, -- Message to sign
  nonce text NOT NULL, -- Random nonce for replay protection
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  signature text, -- Submitted signature
  
  -- Expiration
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  completed_at timestamp with time zone,
  
  -- Audit
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT wallet_verification_unique_pending UNIQUE (wallet_address, blockchain_network, status)
);

-- ============================================================
-- 5. WALLET AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  linked_wallet_id uuid REFERENCES public.linked_wallets(id),
  
  -- Action details
  action text NOT NULL, -- 'wallet_linked', 'wallet_verified', 'payout_initiated', etc.
  action_details jsonb DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address inet,
  user_agent text,
  
  -- Result
  success boolean NOT NULL,
  error_message text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_linked_wallets_user_id ON public.linked_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_provider_id ON public.linked_wallets(provider_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_address ON public.linked_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_verification ON public.linked_wallets(verification_status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(linked_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider ON public.wallet_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tx_hash ON public.wallet_transactions(tx_hash);

CREATE INDEX IF NOT EXISTS idx_wallet_challenges_address ON public.wallet_verification_challenges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expires ON public.wallet_verification_challenges(expires_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wallet_audit_user ON public.wallet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_provider ON public.wallet_audit_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_created ON public.wallet_audit_log(created_at DESC);

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.linked_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_verification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

-- Linked Wallets: Users manage their own, admins see all
CREATE POLICY "users_manage_own_wallets" ON public.linked_wallets
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

-- Wallet Transactions: Providers see their own, admins see all
CREATE POLICY "providers_view_own_transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = wallet_transactions.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_manage_wallet_transactions" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Verification Challenges: Users manage their own
CREATE POLICY "users_manage_own_challenges" ON public.wallet_verification_challenges
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Wallet Audit Log: Users see their own, admins see all
CREATE POLICY "users_view_own_wallet_audit" ON public.wallet_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "service_insert_wallet_audit" ON public.wallet_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 8. FUNCTIONS
-- ============================================================

-- Generate verification challenge message
CREATE OR REPLACE FUNCTION public.generate_wallet_challenge(
  p_wallet_address text,
  p_network blockchain_network
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nonce text;
  v_message text;
  v_challenge_id uuid;
  v_expires_at timestamp with time zone;
BEGIN
  -- Generate random nonce
  v_nonce := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '15 minutes';
  
  -- Create challenge message
  v_message := format(
    E'Modullar Advancia Wallet Verification\n\nI am linking wallet %s to my Modullar Advancia account.\n\nNonce: %s\nExpires: %s\n\nThis signature will not trigger any blockchain transaction.',
    p_wallet_address,
    v_nonce,
    to_char(v_expires_at, 'YYYY-MM-DD HH24:MI:SS UTC')
  );
  
  -- Expire any pending challenges for this wallet
  UPDATE public.wallet_verification_challenges
  SET status = 'expired'
  WHERE wallet_address = p_wallet_address
    AND blockchain_network = p_network
    AND status = 'pending';
  
  -- Insert new challenge
  INSERT INTO public.wallet_verification_challenges (
    user_id, wallet_address, blockchain_network, challenge_message, nonce, expires_at
  ) VALUES (
    auth.uid(), p_wallet_address, p_network, v_message, v_nonce, v_expires_at
  )
  RETURNING id INTO v_challenge_id;
  
  RETURN jsonb_build_object(
    'challenge_id', v_challenge_id,
    'message', v_message,
    'nonce', v_nonce,
    'expires_at', v_expires_at
  );
END;
$$;

-- Set primary payout wallet
CREATE OR REPLACE FUNCTION public.set_primary_payout_wallet(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  -- Get provider ID and verify ownership
  SELECT provider_id INTO v_provider_id
  FROM public.linked_wallets
  WHERE id = p_wallet_id
    AND user_id = auth.uid()
    AND verification_status = 'verified';
  
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found or not verified';
  END IF;
  
  -- Clear existing primary
  UPDATE public.linked_wallets
  SET is_primary_payout = false
  WHERE provider_id = v_provider_id AND is_primary_payout = true;
  
  -- Set new primary
  UPDATE public.linked_wallets
  SET is_primary_payout = true, payout_enabled = true
  WHERE id = p_wallet_id;
  
  -- Audit log
  INSERT INTO public.wallet_audit_log (user_id, provider_id, linked_wallet_id, action, success)
  VALUES (auth.uid(), v_provider_id, p_wallet_id, 'set_primary_payout', true);
  
  RETURN true;
END;
$$;

-- ============================================================
-- 9. TRIGGERS
-- ============================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linked_wallets_updated_at
  BEFORE UPDATE ON public.linked_wallets
  FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

-- Audit wallet changes
CREATE OR REPLACE FUNCTION audit_wallet_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.wallet_audit_log (user_id, provider_id, linked_wallet_id, action, action_details, success)
    VALUES (NEW.user_id, NEW.provider_id, NEW.id, 'wallet_linked', 
      jsonb_build_object('address', NEW.wallet_address, 'network', NEW.blockchain_network), true);
  ELSIF TG_OP = 'UPDATE' AND OLD.verification_status != NEW.verification_status THEN
    INSERT INTO public.wallet_audit_log (user_id, provider_id, linked_wallet_id, action, action_details, success)
    VALUES (NEW.user_id, NEW.provider_id, NEW.id, 'verification_status_changed',
      jsonb_build_object('old_status', OLD.verification_status, 'new_status', NEW.verification_status), true);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.wallet_audit_log (user_id, provider_id, linked_wallet_id, action, action_details, success)
    VALUES (OLD.user_id, OLD.provider_id, OLD.id, 'wallet_unlinked',
      jsonb_build_object('address', OLD.wallet_address, 'network', OLD.blockchain_network), true);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER audit_linked_wallets_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.linked_wallets
  FOR EACH ROW EXECUTE FUNCTION audit_wallet_changes();

-- ============================================================
-- 10. GRANTS
-- ============================================================

GRANT USAGE ON TYPE blockchain_network TO authenticated;
GRANT USAGE ON TYPE wallet_verification_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_wallet_challenge TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_payout_wallet TO authenticated;

-- ============================================================
-- DONE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 021 completed: Web3 Wallet Integration';
  RAISE NOTICE 'Tables: linked_wallets, wallet_transactions, wallet_verification_challenges, wallet_audit_log';
  RAISE NOTICE 'Functions: generate_wallet_challenge, set_primary_payout_wallet';
END $$;

-- ============================================================
-- Migration 037: Enable Realtime
-- ============================================================
-- This migration enables Supabase Realtime for specific tables
-- that require live updates in the frontend application.
-- ============================================================

BEGIN;

-- Enable realtime for the 'messages' table (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for the 'notifications' table (for live alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for the 'appointments' table (for live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Enable realtime for the 'transactions' table (for live payment status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

COMMIT;

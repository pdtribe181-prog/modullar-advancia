import { loadStripe } from '@stripe/stripe-js';

/**
 * Singleton Stripe instance — avoids loading Stripe.js multiple times.
 * All components should import `stripePromise` from here instead of calling loadStripe() directly.
 */
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

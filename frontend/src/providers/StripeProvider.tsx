import { Elements } from '@stripe/react-stripe-js';
import { ReactNode } from 'react';
import { stripePromise } from '../lib/stripe';

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const options = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0066cc',
        colorBackground: '#ffffff',
        colorText: '#333333',
        colorDanger: '#dc3545',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}

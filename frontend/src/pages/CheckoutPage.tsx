import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from '../components/PaymentForm';
import { api } from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface PaymentInfo {
  amount: number;
  invoiceId?: string;
  patientId?: string;
  description?: string;
}

export function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('paymentInfo');
    if (!stored) {
      navigate('/payment');
      return;
    }

    const info: PaymentInfo = JSON.parse(stored);
    setPaymentInfo(info);

    // Create payment intent
    createPaymentIntent(info);
  }, [navigate]);

  const createPaymentIntent = async (info: PaymentInfo) => {
    try {
      const response = await api.post<{ success: boolean; data: { client_secret: string } }>(
        '/stripe/payment-intents',
        {
          amount: info.amount,
          currency: 'usd',
          metadata: {
            invoice_id: info.invoiceId,
            patient_id: info.patientId,
            description: info.description,
          },
        }
      );

      if (response.success && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    sessionStorage.removeItem('paymentInfo');
    navigate('/?payment=success');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="checkout-page">
        <div className="error-state">
          <h2>Payment Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/payment')} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <h2>Complete Your Payment</h2>
        
        {clientSecret && paymentInfo && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0066cc',
                },
              },
            }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              amount={paymentInfo.amount}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Elements>
        )}
      </div>

      <div className="security-badge">
        <span>🔒 Secured by Stripe</span>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
}

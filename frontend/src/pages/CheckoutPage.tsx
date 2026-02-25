import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentForm } from '../components/PaymentForm';
import { CryptoPaymentOption } from '../components/CryptoPayment';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, ApiError } from '../services/api';
import { stripePromise } from '../lib/stripe';

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
  const { showToast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem('paymentInfo');
    if (!stored) {
      navigate('/payment');
      return;
    }

    // Decode base64-encoded payment data
    const info: PaymentInfo = JSON.parse(atob(stored));
    setPaymentInfo(info);

    // Create payment intent
    createPaymentIntent(info);
  }, [navigate]);

  const createPaymentIntent = useCallback(async (info: PaymentInfo) => {
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
    } catch (err) {
      const message = err instanceof ApiError ? err.message :
                      err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleSuccess = () => {
    sessionStorage.removeItem('paymentInfo');
    showToast('Payment completed successfully!', 'success');
    navigate('/payment/success');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    showToast(errorMessage, 'error');
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Spinner size={40} />
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

        {/* Crypto Payment Option */}
        {paymentInfo && (
          <CryptoPaymentOption
            amount={paymentInfo.amount}
            appointmentId={paymentInfo.invoiceId}
            onSuccess={(_url) => {
              showToast('Redirecting to crypto checkout...', 'info');
            }}
            onError={handleError}
          />
        )}

        <div className="payment-divider">
          <span>or pay with card</span>
        </div>

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

import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { LoadingButton } from './Spinner';
import { validateAmount } from '../utils/validation';

interface PaymentFormProps {
  clientSecret?: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  // Validate amount prop
  useEffect(() => {
    const amountError = validateAmount(amount);
    if (amountError) {
      setMessage(amountError);
    }
  }, [amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate amount before submission
    const amountError = validateAmount(amount);
    if (amountError) {
      setMessage(amountError);
      onError(amountError);
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setMessage(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Payment successful!');
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        setMessage('Additional authentication required');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setMessage(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-summary">
        <h3>Payment Summary</h3>
        <div className="amount-display">
          <span>Total:</span>
          <strong>{formatAmount(amount)}</strong>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
        onReady={() => setReady(true)}
      />

      {message && (
        <div 
          className={`message ${message.includes('successful') ? 'success' : 'error'}`}
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <LoadingButton
        type="submit"
        disabled={!stripe || !ready || processing}
        className="pay-button"
        loading={processing}
        loadingText="Processing..."
      >
        Pay {formatAmount(amount)}
      </LoadingButton>
    </form>
  );
}

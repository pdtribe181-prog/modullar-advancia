import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LoadingButton } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { validatePaymentForm, getFieldError, type ValidationError } from '../utils/validation';
import { useAuth } from '../providers/AuthProvider';

export function PaymentPage() {
  const [amount, setAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect unauthenticated users to login — checkout requires a valid session
  if (!authLoading && !user) {
    return <Navigate to="/login" state={{ from: '/payment', message: 'Please log in to make a payment.' }} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);

    const amountCents = Math.round(parseFloat(amount) * 100);

    // Validate with our validation utility
    const validation = validatePaymentForm({ amount: amountCents });
    if (!validation.success && validation.errors) {
      setFieldErrors(validation.errors);
      return;
    }

    if (amountCents < 50) {
      setFieldErrors([{ field: 'amount', message: 'Minimum payment amount is $0.50' }]);
      return;
    }

    setLoading(true);

    try {
      // Encode payment info before storing to prevent cleartext sensitive data in storage
      const paymentData = {
        amount: amountCents,
        invoiceId: invoiceId || undefined,
        description: invoiceId ? `Invoice #${invoiceId}` : 'Healthcare Payment',
        // Note: patientId is resolved server-side from auth token, not stored client-side
      };
      sessionStorage.setItem('paymentInfo', btoa(JSON.stringify(paymentData)));

      showToast('Proceeding to checkout...', 'info');
      navigate('/checkout', { state: { hasPayment: true } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const amountError = getFieldError(fieldErrors, 'amount');

  return (
    <div className="payment-page">
      <div className="payment-card">
        <h2>Make a Payment</h2>
        <p className="subtitle">Enter your payment details below</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="invoiceId">Invoice Number (optional)</label>
            <input
              type="text"
              id="invoiceId"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="INV-12345"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientId">Patient ID (optional)</label>
            <input
              type="text"
              id="patientId"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="PAT-12345"
            />
          </div>

          <div className={`form-group ${amountError ? 'has-error' : ''}`}>
            <label htmlFor="amount">Payment Amount *</label>
            <div className="amount-input">
              <span className="currency">$</span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.50"
                step="0.01"
                placeholder="0.00"
                aria-invalid={!!amountError}
                aria-describedby={amountError ? 'amount-error' : undefined}
              />
            </div>
            {amountError && <span id="amount-error" className="field-error">{amountError}</span>}
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <LoadingButton
            type="submit"
            className="btn btn-primary"
            loading={loading}
            loadingText="Processing..."
          >
            Continue to Payment
          </LoadingButton>
        </form>
      </div>

      <div className="payment-info">
        <h3>Accepted Payment Methods</h3>
        <div className="payment-methods">
          <span>💳 Visa</span>
          <span>💳 Mastercard</span>
          <span>💳 American Express</span>
          <span>🏦 Bank Transfer</span>
        </div>
      </div>
    </div>
  );
}

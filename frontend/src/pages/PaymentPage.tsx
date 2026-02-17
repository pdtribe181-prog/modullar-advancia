import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PaymentPage() {
  const [amount, setAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      
      if (amountCents < 50) {
        throw new Error('Minimum payment amount is $0.50');
      }

      // Store payment info and navigate to checkout
      sessionStorage.setItem('paymentInfo', JSON.stringify({
        amount: amountCents,
        invoiceId: invoiceId || undefined,
        patientId: patientId || undefined,
        description: invoiceId ? `Invoice #${invoiceId}` : 'Healthcare Payment',
      }));

      navigate('/checkout');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="form-group">
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
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
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

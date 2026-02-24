import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api, ApiError } from '../services/api';
import { Spinner, LoadingButton } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created: string;
  metadata: Record<string, string>;
}

interface PaymentHistoryResponse {
  payments: Payment[];
  has_more: boolean;
}

const getStatusStyle = (status: string): React.CSSProperties => {
  const map: Record<string, { background: string; color: string; border: string }> = {
    succeeded:              { background: 'rgba(16,185,129,0.15)',  color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' },
    processing:             { background: 'rgba(234,179,8,0.12)',   color: '#fde047', border: '1px solid rgba(234,179,8,0.3)' },
    requires_payment_method:{ background: 'rgba(239,68,68,0.12)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    requires_confirmation:  { background: 'rgba(99,102,241,0.12)',  color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' },
    canceled:               { background: 'rgba(148,163,184,0.1)',  color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' },
    requires_action:        { background: 'rgba(249,115,22,0.12)',  color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' },
  };
  const s = map[status] || { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' };
  return { ...s, display: 'inline-flex', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' };
};

export default function PaymentHistory() {
  useAuth(); // Ensures user is authenticated
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPayments = async (startingAfter?: string) => {
    try {
      const params = new URLSearchParams();
      if (startingAfter) params.append('starting_after', startingAfter);

      const response = await api.get<PaymentHistoryResponse>(
        `/stripe/payment-history?${params.toString()}`
      );

      if (startingAfter) {
        setPayments(prev => [...prev, ...response.payments]);
      } else {
        setPayments(response.payments);
      }
      setHasMore(response.has_more);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load payment history';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    if (payments.length > 0 && hasMore) {
      setLoadingMore(true);
      fetchPayments(payments[payments.length - 1].id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <Spinner size={48} />
        <p style={{ color: '#94a3b8' }}>Loading payment history...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>Payment History</h1>
        <p style={{ marginTop: '8px', color: '#94a3b8' }}>
          View all your past payments and transactions
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '10px' }}>
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#131625', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg
            style={{ margin: '0 auto', width: '48px', height: '48px', color: '#475569' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 style={{ marginTop: '16px', fontSize: '17px', fontWeight: '600', color: '#e2e8f0' }}>No payments yet</h3>
          <p style={{ marginTop: '8px', color: '#94a3b8' }}>
            Your payment history will appear here once you make a payment.
          </p>
        </div>
      ) : (
        <div style={{ background: '#131625', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#181b2e' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  Date
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  Description
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  Amount
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                    {formatDate(payment.created)}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {payment.description || 'Payment'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={getStatusStyle(payment.status)}>
                      {payment.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <LoadingButton
                onClick={loadMore}
                loading={loadingMore}
                loadingText="Loading..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
              >
                Load More
              </LoadingButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Transaction[] }>(
        '/api/transactions?limit=10'
      );
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (err) {
      // Handle gracefully if endpoint doesn't exist yet
      console.log('Transactions not available');
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      completed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
      refunded: 'badge-info',
    };
    return statusClasses[status] || 'badge-default';
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome, {user?.email}</h1>
        <p>Manage your payments and view transaction history</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <a href="/payment" className="action-btn">
              💳 Make Payment
            </a>
            <button className="action-btn" onClick={() => window.print()}>
              🧾 Download Statement
            </button>
          </div>
        </div>

        <div className="dashboard-card full-width">
          <h3>Recent Transactions</h3>
          
          {loading ? (
            <div className="loading">Loading transactions...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet</p>
              <a href="/payment" className="btn btn-primary">Make your first payment</a>
            </div>
          ) : (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.created_at)}</td>
                    <td className="mono">{tx.id.slice(0, 8)}...</td>
                    <td>{formatAmount(tx.amount)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

interface Dispute {
  id: string;
  transactionId: string;
  amount: number;
  type: 'refund' | 'chargeback' | 'billing_error' | 'service_issue';
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';
  reason: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  merchant: string;
  resolution?: string;
}

const mockDisputes: Dispute[] = [
  {
    id: 'dsp_001',
    transactionId: 'txn_3PK8mN2eZvKYlo2C',
    amount: 275.00,
    type: 'refund',
    status: 'under_review',
    reason: 'Service not received',
    description: 'Appointment was cancelled but I was still charged.',
    createdAt: '2026-02-20T10:30:00Z',
    updatedAt: '2026-02-21T14:00:00Z',
    merchant: 'Quantum Health Center',
  },
  {
    id: 'dsp_002',
    transactionId: 'txn_2AB9nM3fYwLZmp3D',
    amount: 150.00,
    type: 'billing_error',
    status: 'resolved',
    reason: 'Duplicate charge',
    description: 'I was charged twice for the same consultation.',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-18T16:30:00Z',
    merchant: 'Wellness Medical Group',
    resolution: 'Refund of $150.00 processed on Feb 18, 2026',
  },
];

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '32px',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(28px, 4vw, 36px)',
  fontWeight: 800,
  color: '#ffffff',
};

const subtitleStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.6)',
};

const btnStyle: CSSProperties = {
  padding: '14px 24px',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
};

const tabsStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '24px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  paddingBottom: '16px',
  flexWrap: 'wrap',
};

const tabStyle = (active: boolean): CSSProperties => ({
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  background: active ? 'rgba(96, 128, 245, 0.15)' : 'transparent',
  color: active ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
  border: 'none',
});

const disputeCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const disputeHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px',
  flexWrap: 'wrap',
  gap: '12px',
};

const disputeIdStyle: CSSProperties = {
  fontSize: '12px',
  fontFamily: 'monospace',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '4px',
};

const disputeTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#ffffff',
};

const statusBadgeStyle = (status: string): CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    open: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    under_review: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    resolved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    escalated: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  };
  const c = colors[status] || colors.open;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    background: c.bg,
    color: c.color,
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
  };
};

const typeBadgeStyle = (_type: string): CSSProperties => {
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    fontWeight: 500,
  };
};

const disputeInfoStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '16px',
  marginBottom: '16px',
  padding: '16px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '10px',
};

const infoItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const infoLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const infoValueStyle: CSSProperties = {
  fontSize: '14px',
  color: '#ffffff',
  fontWeight: 500,
};

const descriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.6,
  marginBottom: '16px',
};

const resolutionBoxStyle: CSSProperties = {
  padding: '16px',
  background: 'rgba(16, 185, 129, 0.1)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  borderRadius: '10px',
  marginBottom: '16px',
};

const resolutionTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#10b981',
  fontWeight: 500,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const actionBtnStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.8)',
};

// New Dispute Modal
const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '24px',
};

const modalStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '32px',
  maxWidth: '560px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
  border: '1px solid rgba(255,255,255,0.1)',
};

const modalTitleStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '8px',
};

const modalSubtitleStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
  marginBottom: '24px',
};

const fieldStyle: CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '8px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '120px',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '64px 32px',
  background: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const emptyIconStyle: CSSProperties = {
  fontSize: '64px',
  marginBottom: '24px',
};

type Tab = 'all' | 'open' | 'resolved';

export const Disputes: React.FC = () => {
  const [tab, setTab] = useState<Tab>('all');
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newDispute, setNewDispute] = useState({
    transactionId: '',
    type: 'refund',
    reason: '',
    description: '',
  });

  const filteredDisputes = disputes.filter(d => {
    if (tab === 'open') return ['open', 'under_review', 'escalated'].includes(d.status);
    if (tab === 'resolved') return ['resolved', 'rejected'].includes(d.status);
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newD: Dispute = {
        id: `dsp_${Date.now()}`,
        transactionId: newDispute.transactionId,
        amount: Math.random() * 500 + 50, // Mock
        type: newDispute.type as Dispute['type'],
        status: 'open',
        reason: newDispute.reason,
        description: newDispute.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        merchant: 'Healthcare Provider',
      };

      setDisputes([newD, ...disputes]);
      setShowModal(false);
      setNewDispute({ transactionId: '', type: 'refund', reason: '', description: '' });
    } catch (error) {
      console.error('Failed to submit dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleGroupStyle}>
            <h1 style={titleStyle}>Disputes & Refunds</h1>
            <p style={subtitleStyle}>Manage payment disputes and refund requests</p>
          </div>
          <button style={btnPrimaryStyle} onClick={() => setShowModal(true)}>
            + New Dispute
          </button>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabStyle(tab === 'all')} onClick={() => setTab('all')}>
            All ({disputes.length})
          </button>
          <button style={tabStyle(tab === 'open')} onClick={() => setTab('open')}>
            Open ({disputes.filter(d => ['open', 'under_review', 'escalated'].includes(d.status)).length})
          </button>
          <button style={tabStyle(tab === 'resolved')} onClick={() => setTab('resolved')}>
            Resolved ({disputes.filter(d => ['resolved', 'rejected'].includes(d.status)).length})
          </button>
        </div>

        {/* Dispute List */}
        {filteredDisputes.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>📋</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              No disputes found
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              {tab === 'all'
                ? "You haven't filed any disputes yet."
                : `No ${tab} disputes at this time.`}
            </p>
          </div>
        ) : (
          filteredDisputes.map(dispute => (
            <div key={dispute.id} style={disputeCardStyle}>
              <div style={disputeHeaderStyle}>
                <div>
                  <div style={disputeIdStyle}>#{dispute.id}</div>
                  <div style={disputeTitleStyle}>{dispute.reason}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={typeBadgeStyle(dispute.type)}>
                    {dispute.type === 'refund' && '💸 Refund'}
                    {dispute.type === 'chargeback' && '⚠️ Chargeback'}
                    {dispute.type === 'billing_error' && '🧾 Billing Error'}
                    {dispute.type === 'service_issue' && '🩺 Service Issue'}
                  </span>
                  <span style={statusBadgeStyle(dispute.status)}>
                    {dispute.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div style={disputeInfoStyle}>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Amount</span>
                  <span style={{ ...infoValueStyle, color: 'var(--primary)', fontWeight: 700 }}>
                    {formatCurrency(dispute.amount)}
                  </span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Merchant</span>
                  <span style={infoValueStyle}>{dispute.merchant}</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Transaction ID</span>
                  <span style={{ ...infoValueStyle, fontFamily: 'monospace', fontSize: '12px' }}>
                    {dispute.transactionId}
                  </span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Filed</span>
                  <span style={infoValueStyle}>{formatDate(dispute.createdAt)}</span>
                </div>
              </div>

              <p style={descriptionStyle}>{dispute.description}</p>

              {dispute.resolution && (
                <div style={resolutionBoxStyle}>
                  <p style={resolutionTextStyle}>✓ {dispute.resolution}</p>
                </div>
              )}

              <div style={actionsStyle}>
                <button style={actionBtnStyle}>View Details</button>
                {['open', 'under_review'].includes(dispute.status) && (
                  <>
                    <button style={actionBtnStyle}>Add Comment</button>
                    <button style={{ ...actionBtnStyle, color: '#ef4444' }}>Cancel Dispute</button>
                  </>
                )}
                {dispute.status === 'resolved' && (
                  <Link to={`/invoices?id=${dispute.transactionId}`} style={{ ...actionBtnStyle, textDecoration: 'none' }}>
                    View Invoice
                  </Link>
                )}
              </div>
            </div>
          ))
        )}

        {/* New Dispute Modal */}
        {showModal && (
          <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
              <h2 style={modalTitleStyle}>File a Dispute</h2>
              <p style={modalSubtitleStyle}>
                Provide details about the transaction you'd like to dispute.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Transaction ID *</label>
                  <input
                    type="text"
                    value={newDispute.transactionId}
                    onChange={e => setNewDispute({ ...newDispute, transactionId: e.target.value })}
                    placeholder="txn_xxxxx or from payment history"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Dispute Type *</label>
                  <select
                    value={newDispute.type}
                    onChange={e => setNewDispute({ ...newDispute, type: e.target.value })}
                    style={selectStyle}
                    required
                  >
                    <option value="refund">Refund Request</option>
                    <option value="billing_error">Billing Error</option>
                    <option value="service_issue">Service Issue</option>
                    <option value="chargeback">Chargeback</option>
                  </select>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Reason *</label>
                  <input
                    type="text"
                    value={newDispute.reason}
                    onChange={e => setNewDispute({ ...newDispute, reason: e.target.value })}
                    placeholder="Brief summary (e.g., Service not received)"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Description *</label>
                  <textarea
                    value={newDispute.description}
                    onChange={e => setNewDispute({ ...newDispute, description: e.target.value })}
                    placeholder="Provide detailed information about your dispute..."
                    required
                    style={textareaStyle}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    style={{ ...btnStyle, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ ...btnPrimaryStyle, flex: 1, opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Disputes;

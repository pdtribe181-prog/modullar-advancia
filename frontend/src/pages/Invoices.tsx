import React, { useState, useEffect, CSSProperties, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles.css';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  provider: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
  };
  patient: {
    name: string;
    email: string;
    address?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

// Mock invoice data - replace with real API call
const mockInvoice: Invoice = {
  id: 'inv_001',
  invoiceNumber: 'INV-2026-0142',
  date: '2026-02-23',
  dueDate: '2026-03-23',
  status: 'paid',
  provider: {
    name: 'Quantum Health Center',
    address: '456 Medical Plaza, Suite 200\nSan Francisco, CA 94102',
    phone: '+1 (415) 555-0123',
    email: 'billing@quantumhealth.com',
    taxId: 'XX-XXXXXXX',
  },
  patient: {
    name: 'John Doe',
    email: 'john.doe@email.com',
    address: '123 Main Street\nSan Francisco, CA 94101',
  },
  items: [
    { description: 'MedBed Healing Session (60 min)', quantity: 1, unitPrice: 450.00, total: 450.00 },
    { description: 'Quantum Diagnostic Scan', quantity: 1, unitPrice: 275.00, total: 275.00 },
    { description: 'Consultation - Dr. Sarah Chen', quantity: 1, unitPrice: 150.00, total: 150.00 },
  ],
  subtotal: 875.00,
  tax: 76.56,
  taxRate: 8.75,
  total: 951.56,
  paymentMethod: 'Visa ****4242',
  transactionId: 'txn_3PK8mN2eZvKYlo2C1kLmYnDf',
  notes: 'Thank you for choosing Quantum Health Center. For questions about this invoice, please contact our billing department.',
};

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '900px',
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
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const btnStyle: CSSProperties = {
  padding: '12px 20px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: 'none',
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
};

const btnSecondaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const invoiceCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  overflow: 'hidden',
};

const invoiceHeaderStyle: CSSProperties = {
  padding: '32px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '32px',
};

const logoBoxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const logoIconStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: '#ffffff',
  fontWeight: 700,
};

const providerNameStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#ffffff',
};

const invoiceNumBoxStyle: CSSProperties = {
  textAlign: 'right',
};

const invoiceNumLabelStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const invoiceNumStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--primary)',
  marginTop: '4px',
};

const statusBadgeStyle = (status: string): CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    paid: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    overdue: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    cancelled: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  };
  const c = colors[status] || colors.pending;
  return {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    background: c.bg,
    color: c.color,
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginTop: '8px',
  };
};

const partiesStyle: CSSProperties = {
  padding: '32px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '32px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const partyBoxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const partyLabelStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const partyNameStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
};

const partyDetailStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  whiteSpace: 'pre-line',
  lineHeight: 1.5,
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  background: 'rgba(255,255,255,0.02)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyle: CSSProperties = {
  padding: '20px 24px',
  fontSize: '15px',
  color: 'rgba(255,255,255,0.8)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const totalsStyle: CSSProperties = {
  padding: '24px 32px',
  display: 'flex',
  justifyContent: 'flex-end',
};

const totalsBoxStyle: CSSProperties = {
  width: '280px',
};

const totalRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const totalLabelStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
};

const totalValueStyle: CSSProperties = {
  fontSize: '14px',
  color: '#ffffff',
  fontWeight: 500,
};

const grandTotalRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '16px 0 0',
  marginTop: '8px',
};

const grandTotalLabelStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#ffffff',
};

const grandTotalValueStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
  color: 'var(--primary)',
};

const footerStyle: CSSProperties = {
  padding: '24px 32px',
  background: 'rgba(255,255,255,0.02)',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};

const paymentInfoStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '24px',
  marginBottom: '20px',
};

const paymentItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const paymentLabelStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
};

const paymentValueStyle: CSSProperties = {
  fontSize: '14px',
  color: '#ffffff',
  fontWeight: 500,
};

const notesStyle: CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.5)',
  fontStyle: 'italic',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  paddingTop: '16px',
  marginTop: '16px',
};

const invoiceListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const invoiceListItemStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '20px 24px',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  gap: '24px',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export const Invoices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // TODO: Replace with real API calls
        // If specific invoice requested, fetch it
        if (invoiceId) {
          // const response = await apiService.get(`/invoices/${invoiceId}`);
          setInvoice(mockInvoice);
        }
        // Fetch invoice list
        // const listResponse = await apiService.get('/invoices');
        setInvoiceList([
          { ...mockInvoice },
          { ...mockInvoice, id: 'inv_002', invoiceNumber: 'INV-2026-0141', status: 'pending', total: 275.00 },
          { ...mockInvoice, id: 'inv_003', invoiceNumber: 'INV-2026-0140', status: 'paid', total: 1250.00 },
        ]);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // In production, call backend to generate PDF
    alert('PDF download will be implemented with backend PDF generation');
  };

  const handleEmailInvoice = async () => {
    if (!invoice) return;
    try {
      // await apiService.post(`/invoices/${invoice.id}/email`);
      alert(`Invoice ${invoice.invoiceNumber} will be emailed to ${invoice.patient.email}`);
    } catch (error) {
      console.error('Failed to email invoice:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show single invoice view if ID is provided
  if (invoice && invoiceId) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <div style={titleGroupStyle}>
              <h1 style={titleStyle}>Invoice</h1>
              <p style={subtitleStyle}>View and download your invoice</p>
            </div>
            <div style={actionsStyle}>
              <button style={btnSecondaryStyle} onClick={handlePrint}>
                🖨️ Print
              </button>
              <button style={btnSecondaryStyle} onClick={handleDownloadPDF}>
                📄 Download PDF
              </button>
              <button style={btnPrimaryStyle} onClick={handleEmailInvoice}>
                ✉️ Email Invoice
              </button>
            </div>
          </div>

          <div style={invoiceCardStyle} ref={printRef}>
            {/* Invoice Header */}
            <div style={invoiceHeaderStyle}>
              <div style={logoBoxStyle}>
                <div style={logoIconStyle}>A</div>
                <div>
                  <div style={providerNameStyle}>{invoice.provider.name}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    Healthcare Services
                  </div>
                </div>
              </div>
              <div style={invoiceNumBoxStyle}>
                <div style={invoiceNumLabelStyle}>Invoice Number</div>
                <div style={invoiceNumStyle}>{invoice.invoiceNumber}</div>
                <span style={statusBadgeStyle(invoice.status)}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Parties */}
            <div style={partiesStyle}>
              <div style={partyBoxStyle}>
                <div style={partyLabelStyle}>From</div>
                <div style={partyNameStyle}>{invoice.provider.name}</div>
                <div style={partyDetailStyle}>{invoice.provider.address}</div>
                <div style={partyDetailStyle}>{invoice.provider.phone}</div>
                <div style={partyDetailStyle}>{invoice.provider.email}</div>
              </div>
              <div style={partyBoxStyle}>
                <div style={partyLabelStyle}>Bill To</div>
                <div style={partyNameStyle}>{invoice.patient.name}</div>
                <div style={partyDetailStyle}>{invoice.patient.email}</div>
                {invoice.patient.address && (
                  <div style={partyDetailStyle}>{invoice.patient.address}</div>
                )}
              </div>
              <div style={partyBoxStyle}>
                <div style={partyLabelStyle}>Invoice Date</div>
                <div style={partyNameStyle}>{formatDate(invoice.date)}</div>
                <div style={{ ...partyLabelStyle, marginTop: '16px' }}>Due Date</div>
                <div style={partyNameStyle}>{formatDate(invoice.dueDate)}</div>
              </div>
            </div>

            {/* Items Table */}
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={totalsStyle}>
              <div style={totalsBoxStyle}>
                <div style={totalRowStyle}>
                  <span style={totalLabelStyle}>Subtotal</span>
                  <span style={totalValueStyle}>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div style={totalRowStyle}>
                  <span style={totalLabelStyle}>Tax ({invoice.taxRate}%)</span>
                  <span style={totalValueStyle}>{formatCurrency(invoice.tax)}</span>
                </div>
                <div style={grandTotalRowStyle}>
                  <span style={grandTotalLabelStyle}>Total</span>
                  <span style={grandTotalValueStyle}>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={footerStyle}>
              {invoice.status === 'paid' && (
                <div style={paymentInfoStyle}>
                  <div style={paymentItemStyle}>
                    <span style={paymentLabelStyle}>Payment Method</span>
                    <span style={paymentValueStyle}>{invoice.paymentMethod}</span>
                  </div>
                  <div style={paymentItemStyle}>
                    <span style={paymentLabelStyle}>Transaction ID</span>
                    <span style={{ ...paymentValueStyle, fontFamily: 'monospace', fontSize: '12px' }}>
                      {invoice.transactionId}
                    </span>
                  </div>
                  <div style={paymentItemStyle}>
                    <span style={paymentLabelStyle}>Payment Date</span>
                    <span style={paymentValueStyle}>{formatDate(invoice.date)}</span>
                  </div>
                </div>
              )}
              {invoice.notes && (
                <p style={notesStyle}>{invoice.notes}</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link to="/invoices" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px' }}>
              ← Back to All Invoices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show invoice list
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleGroupStyle}>
            <h1 style={titleStyle}>Invoices & Receipts</h1>
            <p style={subtitleStyle}>View and download your payment documents</p>
          </div>
        </div>

        <div style={invoiceListStyle}>
          {invoiceList.map((inv) => (
            <Link
              key={inv.id}
              to={`/invoices?id=${inv.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={invoiceListItemStyle}>
                <div>
                  <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                    {inv.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    {inv.provider.name}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                  {formatDate(inv.date)}
                </div>
                <span style={statusBadgeStyle(inv.status)}>{inv.status}</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  {formatCurrency(inv.total)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {invoiceList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.5)' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📄</p>
            <p>No invoices found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;

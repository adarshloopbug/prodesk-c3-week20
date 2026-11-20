import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StripeCheckoutModal from './StripeCheckoutModal';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, notify, isAdmin } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInvoiceById(id);
      setInvoice(res.invoice);
    } catch (err) {
      console.error('[InvoiceDetail] Fetch error:', err);
      setError({
        status: err.status || 500,
        code: err.code,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id, user]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setDownloading(true);
      await api.downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      notify('Downloaded', `Saved ${invoice.invoiceNumber}.pdf`, 'success');
    } catch (err) {
      notify('Download Error', err.message, 'danger');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#ff7a00' }}>
        <Clock className="animate-spin" size={32} style={{ margin: '0 auto 0.75rem auto' }} />
        <div style={{ fontSize: '0.875rem', color: '#71717a' }}>Loading document...</div>
      </div>
    );
  }

  // IDOR INTERCEPTED ERROR SCREEN
  if (error && error.status === 403) {
    return (
      <div style={{
        maxWidth: '560px',
        margin: '4rem auto',
        background: 'rgba(12, 12, 12, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '14px',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          color: '#f87171'
        }}>
          <ShieldAlert size={28} />
        </div>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
          Access Denied
        </h2>
        
        <p style={{ color: '#a1a1aa', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
          Zero-Trust IDOR protection intercepted this request. Invoice <span className="mono" style={{ color: '#ff8c1a' }}>{id}</span> does not belong to your account.
        </p>

        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          <ArrowLeft size={15} /> Return
        </button>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>
        <div>Invoice not found.</div>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginTop: '1rem' }}>
          Return
        </button>
      </div>
    );
  }

  const isPaid = invoice.status === 'Paid';

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Clean Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/client/portal')}
          className="btn btn-outline btn-sm"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn btn-outline"
          >
            <Download size={15} />
            {downloading ? 'Downloading...' : 'PDF'}
          </button>

          {!isPaid && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="btn btn-primary"
            >
              <CreditCard size={15} />
              Pay ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </button>
          )}
        </div>
      </div>

      {/* Clean Minimal Invoice Card */}
      <div className="card" style={{
        padding: '2.5rem',
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        position: 'relative'
      }}>
        {/* Subtle PAID Badge */}
        {isPaid && (
          <div style={{
            position: 'absolute',
            top: '28px',
            right: '32px',
            border: '2px solid #10b981',
            borderRadius: '6px',
            padding: '0.35rem 0.85rem',
            background: 'rgba(16, 185, 129, 0.06)',
            color: '#34d399',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.1em'
          }}>
            PAID
          </div>
        )}

        {/* Invoice Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#ff8c1a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              Nexus Corporate Services
            </div>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              {invoice.invoiceNumber}
            </div>
          </div>
        </div>

        {/* Client & Date Specs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          padding: '1.75rem 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.875rem'
        }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              Billed To
            </div>
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.0625rem' }}>
              {invoice.organization}
            </div>
            <div style={{ color: '#a1a1aa', marginTop: '0.2rem' }}>{invoice.clientName}</div>
            <div style={{ color: '#71717a', fontSize: '0.8125rem' }}>{invoice.clientEmail}</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6875rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              Details
            </div>
            <div style={{ color: '#a1a1aa' }}>Issued: <span style={{ color: '#ffffff' }}>{invoice.issueDate}</span></div>
            <div style={{ color: '#a1a1aa' }}>Due: <span style={{ color: '#ffffff' }}>{invoice.dueDate}</span></div>
            {isPaid && (
              <div style={{ color: '#34d399', fontWeight: 600, marginTop: '0.2rem' }}>
                Settled on {new Date(invoice.paidAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div style={{ padding: '1.75rem 0' }}>
          <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ background: 'transparent', paddingLeft: 0 }}>Item</th>
                  <th style={{ background: 'transparent', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ background: 'transparent', textAlign: 'right', width: '120px' }}>Rate</th>
                  <th style={{ background: 'transparent', textAlign: 'right', width: '120px', paddingRight: 0 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ paddingLeft: 0, fontWeight: 600, color: '#ffffff' }}>{item.description}</td>
                    <td style={{ textAlign: 'center', color: '#71717a' }}>{item.quantity || 1}</td>
                    <td className="mono" style={{ textAlign: 'right', color: '#a1a1aa' }}>
                      ${Number(item.unitPrice || item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#ffffff', paddingRight: 0 }}>
                      ${Number(item.amount || ((item.unitPrice || 0) * (item.quantity || 1))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ width: '280px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', marginBottom: '0.4rem' }}>
              <span>Subtotal:</span>
              <span className="mono" style={{ color: '#ffffff' }}>
                ${Number(invoice.subtotal || invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', marginBottom: '0.75rem' }}>
              <span>Tax (8.88%):</span>
              <span className="mono" style={{ color: '#ffffff' }}>
                ${Number(invoice.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>Total:</span>
              <span className="mono" style={{ fontSize: '1.375rem', fontWeight: 800, color: isPaid ? '#34d399' : '#ff9933' }}>
                ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {isPayModalOpen && (
        <StripeCheckoutModal
          invoice={invoice}
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          onSuccess={() => {
            setIsPayModalOpen(false);
            fetchInvoice();
          }}
        />
      )}
    </div>
  );
}

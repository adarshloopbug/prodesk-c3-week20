import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StripeCheckoutModal from './StripeCheckoutModal';

export default function ClientDashboard() {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchClientInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices();
      setData(res);
    } catch (err) {
      console.error('[ClientDashboard] Fetch error:', err);
      notify('Error loading billing records', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientInvoices();
  }, [user]);

  const handleDownloadPdf = async (e, invoice) => {
    e.stopPropagation();
    try {
      setDownloadingId(invoice.id);
      await api.downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      notify('Download Completed', `Saved ${invoice.invoiceNumber}.pdf`, 'success');
    } catch (err) {
      notify('Download Error', err.message, 'danger');
    } finally {
      setDownloadingId(null);
    }
  };

  const outstandingInvoices = (data?.invoices || []).filter(inv => inv.status !== 'Paid');
  const paidInvoices = (data?.invoices || []).filter(inv => inv.status === 'Paid');

  return (
    <div>
      {/* Clean Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Billing</h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {user?.organization}
          </p>
        </div>
      </div>

      {/* 2 Clean KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
        <div className="stat-card" style={{ borderColor: 'rgba(255, 107, 0, 0.35)' }}>
          <div className="stat-label" style={{ color: '#ff9933' }}>Outstanding Balance</div>
          <div className="stat-value" style={{ color: '#ff9933' }}>
            ${(data?.metrics?.totalDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext" style={{ color: '#71717a' }}>
            {outstandingInvoices.length} invoice(s) due
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="stat-label" style={{ color: '#34d399' }}>Settled to Date</div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            ${(data?.metrics?.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext" style={{ color: '#71717a' }}>
            {paidInvoices.length} receipts on file
          </div>
        </div>
      </div>

      {/* Outstanding Invoices Section */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Due for Payment</h2>
        </div>

        {outstandingInvoices.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#71717a' }}>
            <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.5rem auto' }} />
            <div style={{ color: '#ffffff', fontWeight: 600 }}>No outstanding balances</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>All invoices settled in full.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Contract Deliverable</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {outstandingInvoices.map(invoice => (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono" style={{ fontWeight: 700, color: '#ff8c1a' }}>
                      {invoice.invoiceNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{invoice.description}</div>
                      <div style={{ fontSize: '0.71875rem', color: '#71717a' }}>{invoice.projectCode}</div>
                    </td>
                    <td style={{ color: '#ff9933', fontSize: '0.8125rem' }}>{invoice.dueDate}</td>
                    <td className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="badge badge-outstanding">Due</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePaymentInvoice(invoice);
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          <CreditCard size={13} />
                          Pay Now
                        </button>

                        <button
                          onClick={(e) => handleDownloadPdf(e, invoice)}
                          disabled={downloadingId === invoice.id}
                          className="btn btn-sm btn-outline"
                        >
                          <Download size={13} />
                          {downloadingId === invoice.id ? '...' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Settled Invoices */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Settled Invoices</h2>
        </div>

        {paidInvoices.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a', fontSize: '0.875rem' }}>
            No settled receipts on file yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Contract Deliverable</th>
                  <th>Settled Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paidInvoices.map(invoice => (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono" style={{ fontWeight: 700, color: '#34d399' }}>
                      {invoice.invoiceNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{invoice.description}</div>
                    </td>
                    <td style={{ color: '#71717a', fontSize: '0.8125rem' }}>
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Settled'}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="badge badge-paid">Paid</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={(e) => handleDownloadPdf(e, invoice)}
                          disabled={downloadingId === invoice.id}
                          className="btn btn-sm btn-outline"
                        >
                          <Download size={13} />
                          {downloadingId === invoice.id ? '...' : 'PDF Receipt'}
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}`); }}
                          className="btn btn-sm btn-secondary"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stripe Checkout Modal */}
      {activePaymentInvoice && (
        <StripeCheckoutModal
          invoice={activePaymentInvoice}
          isOpen={!!activePaymentInvoice}
          onClose={() => setActivePaymentInvoice(null)}
          onSuccess={() => {
            setActivePaymentInvoice(null);
            fetchClientInvoices();
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  ExternalLink,
  Search
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateInvoiceModal from './CreateInvoiceModal';

export default function AdminDashboard() {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices();
      setData(res);
    } catch (err) {
      console.error('[AdminDashboard] Fetch error:', err);
      notify('Failed to load dashboard', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadPdf = async (e, invoice) => {
    e.stopPropagation();
    try {
      setDownloadingId(invoice.id);
      await api.downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      notify('Download Started', `Saved ${invoice.invoiceNumber}.pdf`, 'success');
    } catch (err) {
      notify('Download Error', err.message, 'danger');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = (data?.invoices || []).filter(inv => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Clean Minimal Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Treasury</h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Receivables & Stripe Settlement Core
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      {/* 3 Minimal KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">
            ${(data?.metrics?.totalRevenueBilled || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="stat-label" style={{ color: '#34d399' }}>Revenue Collected</div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            ${(data?.metrics?.totalRevenueCollected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: 'rgba(255, 107, 0, 0.35)' }}>
          <div className="stat-label" style={{ color: '#ff9933' }}>Outstanding (AR)</div>
          <div className="stat-value" style={{ color: '#ff9933' }}>
            ${(data?.metrics?.totalOutstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Clean Search & Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(18, 18, 18, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '8px',
          padding: '0.5rem 0.85rem',
          maxWidth: '340px',
          width: '100%'
        }}>
          <Search size={15} style={{ color: '#71717a' }} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8125rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['ALL', 'Outstanding', 'Paid'].map(status => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`btn btn-sm ${isActive ? 'btn-outline-orange' : 'btn-outline'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  borderColor: isActive ? '#ff6b00' : undefined
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean Invoices Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td className="mono" style={{ fontWeight: 700, color: '#ff8c1a' }}>
                  {invoice.invoiceNumber}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{invoice.organization}</div>
                  <div style={{ fontSize: '0.71875rem', color: '#71717a' }}>{invoice.description}</div>
                </td>
                <td style={{ color: '#71717a', fontSize: '0.8125rem' }}>{invoice.dueDate}</td>
                <td className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                  ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <span className={`badge ${invoice.status === 'Paid' ? 'badge-paid' : 'badge-outstanding'}`}>
                    {invoice.status === 'Paid' ? 'Paid' : 'Due'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <button
                      onClick={(e) => handleDownloadPdf(e, invoice)}
                      disabled={downloadingId === invoice.id}
                      className="btn btn-sm btn-outline"
                    >
                      <Download size={13} />
                      {downloadingId === invoice.id ? '...' : 'PDF'}
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateInvoiceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchDashboardData();
          }}
          clients={data?.clients || []}
        />
      )}
    </div>
  );
}

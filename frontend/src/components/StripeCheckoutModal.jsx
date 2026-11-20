import React, { useState, useRef } from 'react';
import {
  CreditCard,
  Lock,
  CheckCircle2,
  Loader2,
  X,
  Download
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StripeCheckoutModal({ invoice, isOpen, onClose, onSuccess }) {
  const { notify } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('842');
  const [cardHolder, setCardHolder] = useState(invoice?.clientName || 'Corporate Signatory');

  const lockRef = useRef(false);

  if (!isOpen || !invoice) return null;

  const handlePayInvoice = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (lockRef.current || isProcessing) {
      return;
    }

    lockRef.current = true;
    setIsProcessing(true);
    setCurrentStep('Connecting to Stripe...');

    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      setCurrentStep('Authorizing payment...');

      await new Promise(resolve => setTimeout(resolve, 700));
      setCurrentStep('Settling invoice...');

      await api.simulatePayment(invoice.id);

      setCurrentStep('Dispatched PDF receipt.');
      await new Promise(resolve => setTimeout(resolve, 500));

      setPaymentSuccess(true);
      notify('Payment Confirmed', `Invoice ${invoice.invoiceNumber} paid in full.`, 'success');
    } catch (err) {
      console.error('[Payment Error]:', err);
      notify('Payment Failed', err.message, 'danger');
      lockRef.current = false;
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      await api.downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}_PAID_RECEIPT.pdf`);
    } catch (err) {
      notify('Download Error', err.message, 'danger');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px', border: '1px solid rgba(255, 107, 0, 0.3)' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={15} style={{ color: '#ff7a00' }} />
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff' }}>
              Checkout
            </span>
          </div>

          {!isProcessing && (
            <button
              onClick={paymentSuccess ? onSuccess : onClose}
              style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {paymentSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1.5px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                color: '#34d399'
              }}>
                <CheckCircle2 size={30} />
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#ffffff', fontWeight: 800 }}>
                Payment Settled
              </h3>

              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', margin: '0.5rem 0 1.25rem 0' }}>
                ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>

              <p style={{ color: '#a1a1aa', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                Invoice marked as <strong>PAID</strong>. Receipt emailed to {invoice.clientEmail}.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  onClick={handleDownloadReceipt}
                  className="btn btn-primary btn-sm"
                >
                  <Download size={14} />
                  Download Receipt
                </button>

                <button
                  onClick={onSuccess}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Summary Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '1.5rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div>
                  <div style={{ fontSize: '0.71875rem', color: '#71717a' }}>Invoice</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9375rem' }}>
                    {invoice.invoiceNumber}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.71875rem', color: '#71717a' }}>Amount</div>
                  <div className="mono" style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#ff9933' }}>
                    ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Minimal Card Inputs */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Cardholder</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  disabled={isProcessing}
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  disabled={isProcessing}
                  className="form-input mono"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    disabled={isProcessing}
                    className="form-input mono"
                  />
                </div>
                <div>
                  <label className="form-label">CVC</label>
                  <input
                    type="password"
                    value={cvc}
                    onChange={e => setCvc(e.target.value)}
                    disabled={isProcessing}
                    className="form-input mono"
                  />
                </div>
              </div>

              {/* Progress State */}
              {isProcessing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#ff9933',
                  fontSize: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <Loader2 className="animate-spin" size={14} />
                  <span>{currentStep}</span>
                </div>
              )}

              {/* Pay Action */}
              <button
                type="button"
                onClick={handlePayInvoice}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Pay ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

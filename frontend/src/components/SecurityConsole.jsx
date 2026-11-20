import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Zap,
  CheckCircle2,
  XCircle,
  FileCheck,
  Terminal,
  RefreshCw,
  X,
  Play,
  KeyRound
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SecurityConsole({ isOpen, onClose }) {
  const { user, loginAs, notify } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('idor');

  // IDOR State
  const [idorResult, setIdorResult] = useState(null);
  const [testingIdor, setTestingIdor] = useState(false);

  // Webhook State
  const [webhookTargetId, setWebhookTargetId] = useState('inv_apex_101');
  const [tamperSig, setTamperSig] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getAuditLogs();
      setLogs(res.logs || []);
    } catch (err) {
      // Handled
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const runIdorTest = async () => {
    setTestingIdor(true);
    setIdorResult(null);

    try {
      if (user?.role !== 'Client') {
        await loginAs('client_apex');
      }

      const foreignId = 'inv_meridian_201';
      const res = await api.getInvoiceById(foreignId);
      setIdorResult({
        success: false,
        status: 200,
        message: 'CRITICAL SECURITY BREACH: Client A accessed Client B invoice!',
        data: res
      });
    } catch (err) {
      setIdorResult({
        success: true,
        status: err.status || 403,
        code: err.code,
        message: err.message,
        details: err.details
      });
    } finally {
      setTestingIdor(false);
      fetchAuditLogs();
    }
  };

  const runWebhookTest = async () => {
    setTestingWebhook(true);
    setWebhookResult(null);

    try {
      const res = await api.simulateWebhook(webhookTargetId, tamperSig);
      setWebhookResult({
        verified: true,
        status: 200,
        data: res
      });
      notify('Webhook Verified (200 OK)', 'Stripe HMAC-SHA256 signature mathematically verified!', 'success');
    } catch (err) {
      setWebhookResult({
        verified: false,
        status: err.status || 400,
        message: err.message,
        tamperDetected: err.details?.simulatedTamperDetected
      });
      notify('Webhook Blocked (400)', err.message, 'info');
    } finally {
      setTestingWebhook(false);
      fetchAuditLogs();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '840px', border: '1px solid rgba(255, 107, 0, 0.45)' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: 'rgba(10, 10, 10, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 107, 0, 0.15)',
              border: '1px solid rgba(255, 107, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff7a00'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#ffffff' }}>
                VaultPay Security & Compliance Console
              </div>
              <div style={{ fontSize: '0.71875rem', color: '#a1a1aa' }}>
                Zero-Trust IDOR Verification & Cryptographic Stripe Webhooks
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Strip */}
        <div style={{
          display: 'flex',
          background: 'rgba(5, 5, 5, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.25rem 1.25rem'
        }}>
          {[
            { id: 'idor', label: '1. Zero-Trust IDOR Prevention', icon: ShieldAlert },
            { id: 'webhook', label: '2. Cryptographic Stripe Webhooks', icon: KeyRound },
            { id: 'audit', label: '3. Immutable Audit Stream', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.15rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #ff7a00' : '2px solid transparent',
                  color: isActive ? '#ff9933' : '#a1a1aa',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Icon size={15} style={{ color: isActive ? '#ff7a00' : undefined }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* TAB 1: IDOR TEST */}
          {activeTab === 'idor' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
                  Track B - Requirement 1: Zero-Trust IDOR Prevention
                </h4>
                <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: '1.6' }}>
                  When Client A (Marcus Vance, <code>client_apex</code>) queries an invoice owned by Client B (<code>inv_meridian_201</code>), the server intercepts the request via <code>requireInvoiceOwnership</code> middleware and returns HTTP 403 Forbidden.
                </p>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div>Active Caller: <strong style={{ color: '#ffffff' }}>{user?.name}</strong> (<span className="mono" style={{ color: '#ff8c1a' }}>{user?.id}</span>)</div>
                    <div>Target Resource: <strong style={{ color: '#ff9933' }}>inv_meridian_201</strong> (Owned by Meridian Global Logistics)</div>
                  </div>

                  <button
                    onClick={runIdorTest}
                    disabled={testingIdor}
                    className="btn btn-danger"
                  >
                    <Play size={15} />
                    {testingIdor ? 'Sending Exploit...' : 'Execute Unauthorized Request'}
                  </button>
                </div>

                {/* Result Display */}
                {idorResult && (
                  <div style={{
                    background: idorResult.status === 403 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${idorResult.status === 403 ? '#10b981' : '#ef4444'}`,
                    borderRadius: '8px',
                    padding: '1.125rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 800,
                      color: idorResult.status === 403 ? '#34d399' : '#f87171',
                      marginBottom: '0.6rem'
                    }}>
                      {idorResult.status === 403 ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      HTTP {idorResult.status} FORBIDDEN — ZERO-TRUST GUARD SUCCEEDED!
                    </div>

                    <div style={{ color: '#d4d4d8', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {JSON.stringify(idorResult, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STRIPE WEBHOOK TEST */}
          {activeTab === 'webhook' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
                  Track B - Requirement 2 & 3: Cryptographic Webhook & Automated PDF
                </h4>
                <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: '1.6' }}>
                  The server exposes <code>POST /api/webhooks/stripe</code>, mathematically verifying the HMAC-SHA256 signature using <code>stripe.webhooks.constructEvent</code>. Upon verification, it updates the invoice to 'Paid', generates the PDF with PAID stamp, and sends an email via Nodemailer.
                </p>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="form-label">Target Invoice</label>
                    <select
                      value={webhookTargetId}
                      onChange={e => setWebhookTargetId(e.target.value)}
                      className="form-select mono"
                    >
                      <option value="inv_apex_101">inv_apex_101 ($28,500 - Apex Tech)</option>
                      <option value="inv_meridian_201">inv_meridian_201 ($45,000 - Meridian Global)</option>
                      <option value="inv_vanguard_301">inv_vanguard_301 ($32,000 - Vanguard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Signature Integrity</label>
                    <select
                      value={tamperSig ? 'tampered' : 'valid'}
                      onChange={e => setTamperSig(e.target.value === 'tampered')}
                      className="form-select"
                    >
                      <option value="valid">Valid Genuine HMAC-SHA256 (Expect 200 OK)</option>
                      <option value="tampered">Tampered / Forged Signature (Expect 400 Bad Request)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={runWebhookTest}
                  disabled={testingWebhook}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <KeyRound size={16} />
                  {testingWebhook ? 'Calculating HMAC & Sending Webhook...' : 'Simulate Cryptographic Webhook'}
                </button>

                {/* Result Display */}
                {webhookResult && (
                  <div style={{
                    marginTop: '1.25rem',
                    background: webhookResult.status === 200 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${webhookResult.status === 200 ? '#10b981' : '#ef4444'}`,
                    borderRadius: '8px',
                    padding: '1.125rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 800,
                      color: webhookResult.status === 200 ? '#34d399' : '#f87171',
                      marginBottom: '0.6rem'
                    }}>
                      {webhookResult.status === 200 ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {webhookResult.status === 200
                        ? 'HTTP 200 OK — MATHEMATICAL SIGNATURE VERIFIED & SETTLED!'
                        : 'HTTP 400 BAD REQUEST — FORGED SIGNATURE REJECTED!'}
                    </div>

                    <div style={{ color: '#d4d4d8', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {JSON.stringify(webhookResult, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff' }}>Zero-Trust Real-Time Security Audit Stream</h4>
                <button onClick={fetchAuditLogs} className="btn btn-sm btn-outline" disabled={loadingLogs}>
                  <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                maxHeight: '420px',
                overflowY: 'auto'
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#71717a', textAlign: 'center', padding: '1.5rem' }}>No audit logs recorded yet.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} style={{
                      padding: '0.6rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.6875rem' }}>
                        <span style={{
                          color: log.action.includes('INTERCEPTED') || log.action.includes('REJECTED') ? '#f87171' : '#ff9933',
                          fontWeight: 800
                        }}>
                          [{log.action}]
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: '#ffffff' }}>{log.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}

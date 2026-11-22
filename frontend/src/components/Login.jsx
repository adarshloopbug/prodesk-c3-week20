import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, UserCheck, ShieldCheck, Sparkles, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginAs, demoAccounts, notify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('cfo_croft');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('usr_admin_croft');

  const from = location.state?.from?.pathname || '/';

  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = await loginAs(username);
      if (user.role === 'Admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/client/portal', { replace: true });
      }
    } catch (err) {
      notify('Login Failed', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (account) => {
    try {
      setLoading(true);
      setSelectedPersona(account.id);
      setUsername(account.username);
      const user = await loginAs(account.id);
      if (user.role === 'Admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/client/portal', { replace: true });
      }
    } catch (err) {
      notify('Login Failed', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(12, 12, 12, 0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 107, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle orange accent bar at top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #ff7a00, transparent)',
          boxShadow: '0 0 16px rgba(255, 107, 0, 0.8)'
        }} />

        {/* Logo and Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
            border: '1.5px solid rgba(255, 107, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.375rem',
            boxShadow: '0 4px 18px rgba(255, 107, 0, 0.3)'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 40%, #ff851a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              N
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            VaultPay Financial Core
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Nexus Corporate Services B2B Settlement Portal
          </p>
        </div>

        {/* One-Click Persona Selector */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.75rem'
          }}>
            Select Enterprise Persona to Sign In:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {demoAccounts.map(account => {
              const isAdminRole = account.role === 'Admin';
              const isSelected = selectedPersona === account.id;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: isSelected
                      ? 'rgba(255, 107, 0, 0.12)'
                      : 'rgba(18, 18, 18, 0.65)',
                    border: `1px solid ${isSelected ? 'rgba(255, 107, 0, 0.45)' : 'rgba(255, 255, 255, 0.06)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: '#ffffff',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: isAdminRole ? 'linear-gradient(135deg, #ff7a00, #ff4500)' : '#27272a',
                      color: isAdminRole ? '#000000' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.6875rem'
                    }}>
                      {account.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isSelected ? '#ff9933' : '#ffffff' }}>
                        {account.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#71717a' }}>
                        {account.organization}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isAdminRole ? 'badge-admin' : 'badge-client'}`} style={{ fontSize: '0.5625rem' }}>
                    {account.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.5rem 0',
          color: '#52525b',
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
          <span>Or Standard Login</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
        </div>

        {/* Manual Form */}
        <form onSubmit={handleManualLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="form-input"
              disabled={loading}
              placeholder="e.g. cfo_croft or client_apex"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <Lock size={15} />
                Sign In to Vault
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          fontSize: '0.6875rem',
          color: '#52525b',
          marginTop: '1.5rem'
        }}>
          Secured with Zero-Trust JWT Authentication & RBAC Route Guards
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, UserCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Forbidden403() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loginAs } = useAuth();

  const attemptedPath = location.state?.attemptedPath || location.pathname;
  const userRole = user?.role || 'Unauthenticated';

  const handleSwitchToAdmin = async () => {
    await loginAs('usr_admin_croft');
    navigate('/admin/dashboard');
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
        maxWidth: '640px',
        width: '100%',
        background: 'rgba(12, 12, 12, 0.85)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.15)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Danger Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444 0%, #ff6b00 50%, #ef4444 100%)',
          boxShadow: '0 0 15px rgba(255, 107, 0, 0.8)'
        }} />

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          color: '#f87171',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)'
        }}>
          <ShieldAlert size={38} />
        </div>

        <div style={{
          display: 'inline-block',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '0.25rem 0.85rem',
          borderRadius: '9999px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '1.25rem'
        }}>
          HTTP 403 • ZERO-TRUST ROUTE GUARD ENGAGED
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '0.85rem', color: '#ffffff', fontWeight: 800 }}>
          Unauthorized Access Blocked
        </h1>

        <p style={{ color: '#a1a1aa', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          Your current session role <span style={{ color: '#ff8c1a', fontWeight: 700 }}>[{userRole}]</span> lacks the required administrative privileges to view restricted route <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{attemptedPath}</span>.
        </p>

        {/* Security Incident Box */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '10px',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '2.25rem',
          fontSize: '0.8125rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff8c1a', fontWeight: 800, marginBottom: '0.6rem' }}>
            <Lock size={15} /> Security Rule Enforcement:
          </div>
          <div style={{ color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <div>Active Client: <span style={{ color: '#ffffff' }}>{user?.name || 'Anonymous'}</span> ({user?.id || 'Unknown'})</div>
            <div>Target Endpoint: <span style={{ color: '#ff9933' }}>{attemptedPath}</span></div>
            <div>Required Role: Admin (CFO Evelyn Croft Clearance)</div>
            <div>Interceptor Action: Immediate kick-out to HTTP 403 page</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(user?.role === 'Client' ? '/client/portal' : '/')}
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} />
            Return to Client Portal
          </button>

          <button
            onClick={handleSwitchToAdmin}
            className="btn btn-primary"
          >
            <UserCheck size={16} />
            Elevate to CFO Evelyn Croft (Admin)
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  LogOut,
  ChevronDown,
  Shield,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenSecurityConsole }) {
  const { user, demoAccounts, loginAs, logout, isAdmin, isClient } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleSwitch = async (account) => {
    setDropdownOpen(false);
    await loginAs(account.id);
    if (account.role === 'Admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/client/portal');
    }
  };

  const handleSignOut = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header style={{
      background: 'rgba(5, 5, 5, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        {/* Brand */}
        <Link to={user ? (isAdmin ? '/admin/dashboard' : '/client/portal') : '/login'} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
            border: '1px solid rgba(255, 107, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: '0 2px 10px rgba(255, 107, 0, 0.25)'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 30%, #ff7a00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              N
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{
              fontWeight: 800,
              fontSize: '1.0625rem',
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}>
              VaultPay
            </span>
            <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>
              Nexus
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Only shown when authenticated) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user && (
            isAdmin ? (
              <Link
                to="/admin/dashboard"
                className={`btn btn-sm ${location.pathname === '/admin/dashboard' ? 'btn-secondary' : 'btn-outline'}`}
                style={{
                  fontSize: '0.8125rem',
                  borderColor: location.pathname === '/admin/dashboard' ? 'rgba(255, 107, 0, 0.4)' : undefined,
                  color: location.pathname === '/admin/dashboard' ? '#ff9933' : undefined
                }}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/client/portal"
                className={`btn btn-sm ${location.pathname === '/client/portal' ? 'btn-secondary' : 'btn-outline'}`}
                style={{
                  fontSize: '0.8125rem',
                  borderColor: location.pathname === '/client/portal' ? 'rgba(255, 107, 0, 0.4)' : undefined,
                  color: location.pathname === '/client/portal' ? '#ff9933' : undefined
                }}
              >
                Invoices
              </Link>
            )
          )}

          <button
            onClick={onOpenSecurityConsole}
            className="btn btn-sm btn-outline"
            style={{ fontSize: '0.8125rem', color: '#a1a1aa' }}
            title="Open Zero-Trust & Webhook Auditor"
          >
            <Shield size={13} style={{ color: '#ff7a00' }} />
            Security
          </button>
        </nav>

        {/* User Account / Sign In Action */}
        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: 'rgba(18, 18, 18, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: isAdmin ? 'linear-gradient(135deg, #ff7a00, #ff4500)' : '#27272a',
                color: isAdmin ? '#000000' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.6875rem'
              }}>
                {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
              </div>

              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                {user.name}
              </span>

              <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-client'}`} style={{ fontSize: '0.5625rem', padding: '0.08rem 0.35rem' }}>
                {user.role}
              </span>

              <ChevronDown size={13} style={{ color: '#71717a' }} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'rgba(12, 12, 12, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 0, 0.05)',
                width: '260px',
                zIndex: 200,
                padding: '0.4rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  padding: '0.4rem 0.6rem',
                  letterSpacing: '0.08em'
                }}>
                  Switch Persona
                </div>

                {demoAccounts.map(account => {
                  const isSelected = user?.id === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleRoleSwitch(account)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        background: isSelected ? 'rgba(255, 107, 0, 0.12)' : 'transparent',
                        border: isSelected ? '1px solid rgba(255, 107, 0, 0.3)' : '1px solid transparent',
                        borderRadius: '6px',
                        color: isSelected ? '#ff9933' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.2rem',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{account.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#71717a' }}>{account.organization}</div>
                      </div>
                      <span className={`badge ${account.role === 'Admin' ? 'badge-admin' : 'badge-client'}`} style={{ fontSize: '0.5625rem' }}>
                        {account.role}
                      </span>
                    </button>
                  );
                })}

                {/* Quick Route Guard Test if Client */}
                {isClient && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/admin/dashboard');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#f87171',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      Test Unauthorized /admin Route
                    </button>
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.6rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#f87171',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78125rem'
                    }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="btn btn-sm btn-primary"
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
          >
            <LogIn size={14} />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

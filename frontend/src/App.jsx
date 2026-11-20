import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import RouteGuard from './components/RouteGuard';
import Forbidden403 from './components/Forbidden403';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import InvoiceDetail from './components/InvoiceDetail';
import SecurityConsole from './components/SecurityConsole';
import Login from './components/Login';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function App() {
  const { user, isAdmin, notifications, removeNotification } = useAuth();
  const [isSecurityConsoleOpen, setIsSecurityConsoleOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Navbar with Role Switcher & Security Console */}
      <Navbar onOpenSecurityConsole={() => setIsSecurityConsoleOpen(true)} />

      {/* Main Routed Content */}
      <main className="main-content">
        <Routes>
          {/* Default Route: Smart redirect based on auth state */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : isAdmin ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/client/portal" replace />
              )
            }
          />

          {/* Dedicated Login Portal */}
          <Route path="/login" element={<Login />} />

          {/* Admin Dashboard (Requirement 1: Protected by Strict Route Guard) */}
          <Route
            path="/admin/dashboard"
            element={
              <RouteGuard requiredRole="Admin">
                <AdminDashboard />
              </RouteGuard>
            }
          />

          {/* Client Portal (Requirement 1: Client View) */}
          <Route
            path="/client/portal"
            element={
              <RouteGuard>
                <ClientDashboard />
              </RouteGuard>
            }
          />

          {/* Document Vault: Invoice Detail Page (Requirement 3) */}
          <Route
            path="/invoices/:id"
            element={
              <RouteGuard>
                <InvoiceDetail />
              </RouteGuard>
            }
          />

          {/* Dedicated 403 Unauthorized / Forbidden Page (Requirement 1) */}
          <Route path="/403" element={<Forbidden403 />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Security Console Modal */}
      <SecurityConsole
        isOpen={isSecurityConsoleOpen}
        onClose={() => setIsSecurityConsoleOpen(false)}
      />

      {/* Toast Notification Container */}
      <div style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'none'
      }}>
        {notifications.map(n => (
          <div
            key={n.id}
            style={{
              background: 'rgba(14, 14, 14, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${
                n.type === 'danger'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : n.type === 'success'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(255, 107, 0, 0.4)'
              }`,
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 0, 0.08)',
              color: '#ffffff',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              animation: 'modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{
              color: n.type === 'danger' ? '#f87171' : n.type === 'success' ? '#34d399' : '#ff9933',
              marginTop: '0.1rem',
              flexShrink: 0
            }}>
              {n.type === 'danger' ? <AlertCircle size={20} /> : n.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>{n.title}</div>
              <div style={{ fontSize: '0.78125rem', color: '#a1a1aa', marginTop: '0.2rem', lineHeight: '1.4' }}>{n.message}</div>
            </div>

            <button
              onClick={() => removeNotification(n.id)}
              style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

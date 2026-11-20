import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Strict RBAC Route Guard
 * Requirement 1: If a user with Client role attempts to manually type /admin/dashboard
 * into the URL bar, the application must instantly kick them out to a 403 Unauthorized page.
 */
export default function RouteGuard({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: '#f59e0b',
        gap: '0.75rem'
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span>Verifying Security Clearance...</span>
      </div>
    );
  }

  // If no user is logged in
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If route requires specific role and user doesn't have it
  if (requiredRole && user.role !== requiredRole) {
    // Instantly kick out to 403 Forbidden page!
    return (
      <Navigate
        to="/403"
        replace
        state={{
          attemptedPath: location.pathname,
          requiredRole,
          userRole: user.role
        }}
      />
    );
  }

  return children;
}

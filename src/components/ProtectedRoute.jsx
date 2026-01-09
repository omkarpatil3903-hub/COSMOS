/**
 * Protected Route Component
 * 
 * Purpose: Guards routes based on authentication and role-based access control.
 * Also provides session security (inactivity timeout, session duration limit).
 * 
 * Responsibilities:
 * - Checks if user is authenticated
 * - Validates user role against allowed roles using hierarchy
 * - Redirects to login if not authenticated
 * - Redirects to unauthorized if role insufficient
 * - Wraps protected content with session security
 * 
 * Dependencies:
 * - Firebase Auth (via AuthContext)
 * - React Router (Navigate)
 * - SessionSecurityProvider (inactivity/session timeout)
 * - canAccessRoute (role hierarchy check)
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";
import Spinner from "./Spinner";
import { canAccessRoute } from "../config/roles";
import SessionSecurityProvider from "./SessionSecurityProvider";

/**
 * Route guard component for protecting authenticated routes.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * 
 * @returns {JSX.Element} Protected content, spinner, or redirect
 * 
 * Business Logic:
 * 1. Show loading spinner while auth state is being determined
 * 2. Redirect to /login if user is not authenticated
 * 3. If no role restrictions, allow any authenticated user
 * 4. Check if user's role can access based on role hierarchy
 * 5. Redirect to /unauthorized if role is insufficient
 * 6. Wrap authorized content with SessionSecurityProvider
 * 
 * Side Effects:
 * - May redirect user to login or unauthorized page
 * - Enables session timeout tracking for protected routes
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userData, loading } = useAuthContext();

  // Show loading spinner while checking auth
  if (loading) return <Spinner />;

  // SECURITY CHECK: Authentication
  // Redirect unauthenticated users to login page
  if (!user) return <Navigate to="/login" replace />;

  // AUTHORIZATION CHECK: If no role restriction, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) {
    return (
      <SessionSecurityProvider>
        {children}
      </SessionSecurityProvider>
    );
  }

  // Get user's effective role (normalize to lowercase)
  const effectiveRole = (userData?.role || "").trim().toLowerCase();

  // ROLE-BASED ACCESS CONTROL
  // Business Rule: Higher-ranked roles can access lower-ranked panels
  // Example: superadmin can access admin, manager, employee routes
  if (effectiveRole && canAccessRoute(effectiveRole, allowedRoles)) {
    return (
      <SessionSecurityProvider>
        {children}
      </SessionSecurityProvider>
    );
  }

  // SECURITY: Insufficient privileges
  // User is authenticated but doesn't have required role
  return <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;

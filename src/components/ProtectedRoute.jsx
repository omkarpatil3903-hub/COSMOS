import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";
import Spinner from "./Spinner";
import { canAccessRoute } from "../config/roles";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userData, loading } = useAuthContext();

  // Show loading spinner while checking auth
  if (loading) return <Spinner />;

  // If no user is logged in, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // If no role restriction, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) return children;

  // Get user's effective role
  const effectiveRole = (userData?.role || "").trim().toLowerCase();

  // Use hierarchy-based access check
  // Higher-ranked roles can access lower-ranked panels
  if (effectiveRole && canAccessRoute(effectiveRole, allowedRoles)) {
    return children;
  }

  // If user is authenticated but doesn't have sufficient role, show unauthorized
  return <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;


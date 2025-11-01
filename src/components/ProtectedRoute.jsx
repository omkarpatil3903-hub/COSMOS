import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";
import Spinner from "./Spinner";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userData, loading } = useAuthContext();

  // Show loading spinner while checking auth
  if (loading) return <Spinner />;

  // If no user is logged in, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // If no role restriction, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) return children;

  // Check if user has required role
  const role = userData?.role || null;

  // If user has the required role, allow access
  if (role && allowedRoles.includes(role)) return children;

  // If user is authenticated but doesn't have the required role, show unauthorized
  return <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;

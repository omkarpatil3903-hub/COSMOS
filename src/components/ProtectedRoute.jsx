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
  const rawRole = userData?.role || null;
  const resourceRoleType = (userData?.resourceRoleType || "").trim().toLowerCase();

  let effectiveRole = (rawRole || "").trim().toLowerCase();
  if (effectiveRole !== "client") {
    if (resourceRoleType === "admin") {
      effectiveRole = "admin";
    } else if (resourceRoleType === "member") {
      effectiveRole = "resource";
    }
  }
  if (effectiveRole === "member") {
    effectiveRole = "resource";
  }

  // If user has the required role, allow access
  if (effectiveRole && allowedRoles.includes(effectiveRole)) return children;

  // If user is authenticated but doesn't have the required role, show unauthorized
  return <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;

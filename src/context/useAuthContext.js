/**
 * useAuthContext Hook
 *
 * Purpose: Provides convenient access to the authentication context throughout the app.
 *
 * Responsibilities:
 * - Wraps useContext call for AuthContext
 * - Provides typed access to user, userData, loading, and accessiblePanels
 *
 * Dependencies:
 * - React useContext
 * - AuthContextBase (base context object)
 *
 * USAGE NOTE: This is a standalone hook file for flexibility.
 * It can be imported independently without pulling in the full AuthProvider.
 */

import { useContext } from "react";

import AuthContext from "./AuthContextBase";

/**
 * Custom hook to access authentication context.
 *
 * @returns {Object} Authentication context containing:
 *   - user: Firebase Auth user object (null if not authenticated)
 *   - userData: User profile from Firestore (role, name, email, status, etc.)
 *   - loading: Boolean indicating if auth state is being determined
 *   - accessiblePanels: Array of panel names user can access based on RBAC
 *
 * @example
 * const { user, userData, loading } = useAuthContext();
 * if (loading) return <Spinner />;
 * if (!user) return <Navigate to="/login" />;
 * console.log(userData.role); // 'admin', 'member', 'client', etc.
 */
export function useAuthContext() {
  return useContext(AuthContext);
}

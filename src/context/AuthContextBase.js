/**
 * AuthContextBase - Base authentication context object.
 *
 * Purpose: Creates and exports the raw React Context object for authentication.
 *
 * Responsibilities:
 * - Provides the base context object used by AuthProvider and useAuthContext
 *
 * Dependencies:
 * - React createContext
 *
 * ARCHITECTURE NOTE: This file is intentionally separated from AuthContext.jsx
 * Reason: Prevents circular import issues when multiple files need to access
 * the context (e.g., useAuthContext.js hook and AuthContext.jsx provider).
 * By isolating the context creation, both consumer and provider can import
 * from this single source without creating dependency cycles.
 */

import { createContext } from "react";

// Initialize with null - consumers should handle the case where context is not yet provided
const AuthContext = createContext(null);

export default AuthContext;

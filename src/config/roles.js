/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Purpose: Centralized configuration for role hierarchy, panel access,
 * and permission utilities for the entire application.
 *
 * Responsibilities:
 * - Defines role power levels (hierarchy) for access control decisions
 * - Maps roles to their accessible navigation panels
 * - Provides utility functions for route access checks
 * - Handles role normalization and fallback logic
 *
 * Dependencies:
 * - Used by AuthContext for computing accessible panels
 * - Used by ProtectedRoute components for access control
 * - Used by navigation components for menu rendering
 *
 * Role Hierarchy (highest to lowest privilege):
 * 1. superadmin (0) - Full system access
 * 2. admin (1) - Organization-level management
 * 3. manager (2) - Team-level management
 * 4. member/resource (3) - Individual contributor access
 * 5. client (99) - External user, isolated access (cannot access internal panels)
 *
 * SECURITY NOTE: All role checks use lowercase normalization to prevent
 * case-sensitivity bypass attacks (e.g., "Admin" vs "admin").
 *
 * Last Modified: 2026-01-10
 */

// ============================================================================
// ROLE POWER LEVELS (Hierarchy)
// ============================================================================
// SECURITY RULE: Lower number = higher power (more access)
// This enables hierarchical access: admins can access manager routes, etc.
// Business Decision: Power levels allow "inherited" access without explicit lists
export const ROLE_POWER = {
    superadmin: 0,  // Highest privilege - can access everything
    admin: 1,       // Organization admin - manages users, settings
    manager: 2,     // Team lead - manages team members
    member: 3,      // Standard employee - basic access
    resource: 3,    // LEGACY: Alias for member (same power level)
    client: 99,     // ISOLATED: External users - separate hierarchy, cannot access internal panels
};

// ============================================================================
// ROLE PANEL MAPPINGS
// ============================================================================
// BUSINESS RULE: Each role has a list of panels they can access
// Panels are ordered by privilege (highest first) for default navigation
// Higher roles inherit access to lower role panels (e.g., admin can access employee panel)
export const ROLE_PANELS = {
    superadmin: [
        { path: '/', label: 'Super Admin Panel', icon: 'FaShieldAlt' },
        { path: '/admin', label: 'Admin Panel', icon: 'FaUserShield' },
        { path: '/manager', label: 'Manager Panel', icon: 'FaUserTie' },
        { path: '/employee', label: 'Employee Panel', icon: 'FaUser' },
    ],
    admin: [
        { path: '/admin', label: 'Admin Panel', icon: 'FaUserShield' },
        { path: '/manager', label: 'Manager Panel', icon: 'FaUserTie' },
        { path: '/employee', label: 'Employee Panel', icon: 'FaUser' },
    ],
    manager: [
        { path: '/manager', label: 'Manager Panel', icon: 'FaUserTie' },
        { path: '/employee', label: 'Employee Panel', icon: 'FaUser' },
    ],
    member: [
        { path: '/employee', label: 'Employee Panel', icon: 'FaUser' },
    ],
    resource: [
        { path: '/employee', label: 'Employee Panel', icon: 'FaUser' },
    ],
    client: [
        // ISOLATED ACCESS: Clients only see their dedicated portal
        // Cannot access any internal employee/manager/admin panels
        { path: '/client', label: 'Client Portal', icon: 'FaBriefcase' },
    ],
};

/**
 * Checks if a user's role can access a route based on role hierarchy.
 *
 * @param {string} userRole - The user's current role
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {boolean} Whether access should be granted
 *
 * Business Logic:
 * - Uses power levels to determine hierarchical access
 * - Higher-ranked roles can access routes meant for lower-ranked roles
 * - Clients are isolated and can only access client-specific routes
 * - Unknown roles are denied access (security-first approach)
 *
 * @example
 * canAccessRoute('admin', ['manager', 'member']) // true (admin > manager)
 * canAccessRoute('member', ['admin']) // false (member < admin)
 * canAccessRoute('client', ['member']) // false (clients are isolated)
 */
export function canAccessRoute(userRole, allowedRoles) {
    // SECURITY: Deny access if no role or no allowed roles specified
    if (!userRole || !allowedRoles || allowedRoles.length === 0) {
        return false;
    }

    // NORMALIZATION: Prevent case-sensitivity bypass attacks
    const normalizedUserRole = userRole.trim().toLowerCase();
    const userPower = ROLE_POWER[normalizedUserRole];

    // SECURITY: Unknown roles are denied access
    if (userPower === undefined) {
        return false;
    }

    // Check if user can access based on hierarchy
    return allowedRoles.some((role) => {
        const normalizedRole = role.trim().toLowerCase();
        const requiredPower = ROLE_POWER[normalizedRole];

        // Skip unknown roles in the allowed list
        if (requiredPower === undefined) {
            return false;
        }

        // CLIENT ISOLATION RULE: Clients exist in a separate hierarchy
        // They cannot access internal routes and internal users cannot access client routes
        // This is a security boundary between internal and external users
        if (normalizedUserRole === 'client' || normalizedRole === 'client') {
            return normalizedUserRole === normalizedRole;
        }

        // HIERARCHICAL ACCESS: User can access if their power level is <= required
        // (lower number = higher rank = more access)
        return userPower <= requiredPower;
    });
}

/**
 * Gets the default/home panel path for a role.
 * Used for post-login redirect and navigation defaults.
 *
 * @param {string} role - The user's role
 * @returns {string} The default panel path (first panel in role's list, or '/login' as fallback)
 *
 * @example
 * getDefaultPanel('admin') // '/admin'
 * getDefaultPanel('unknown') // '/login'
 */
export function getDefaultPanel(role) {
    const normalizedRole = (role || '').trim().toLowerCase();
    const panels = ROLE_PANELS[normalizedRole];
    // Return first panel (highest privilege) or redirect to login if unknown role
    return panels && panels.length > 0 ? panels[0].path : '/login';
}

/**
 * Gets all accessible panels for a role.
 * Used by navigation components to render panel switcher.
 *
 * @param {string} role - The user's role
 * @returns {Array} Array of accessible panel objects ({ path, label, icon })
 *
 * @example
 * getAccessiblePanels('manager')
 * // [{ path: '/manager', label: 'Manager Panel', icon: 'FaUserTie' }, ...]
 */
export function getAccessiblePanels(role) {
    const normalizedRole = (role || '').trim().toLowerCase();
    // Return empty array for unknown roles (safe default)
    return ROLE_PANELS[normalizedRole] || [];
}

// src/config/roles.js
// Centralized role hierarchy configuration

/**
 * Role power levels - lower number = higher power (more access)
 * Used to determine if a user can access routes meant for lower-ranked roles
 */
export const ROLE_POWER = {
    superadmin: 0,
    admin: 1,
    manager: 2,
    member: 3,
    resource: 3, // Legacy - same power as member
    client: 99,  // External users - separate hierarchy (cannot access internal panels)
};

/**
 * Panels each role can access (includes inherited access from lower roles)
 */
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
        { path: '/client', label: 'Client Portal', icon: 'FaBriefcase' },
    ],
};

/**
 * Check if a user's role can access a route based on role hierarchy
 * @param {string} userRole - The user's current role
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {boolean} - Whether access should be granted
 */
export function canAccessRoute(userRole, allowedRoles) {
    if (!userRole || !allowedRoles || allowedRoles.length === 0) {
        return false;
    }

    const normalizedUserRole = userRole.trim().toLowerCase();
    const userPower = ROLE_POWER[normalizedUserRole];

    // If user role is unknown, deny access
    if (userPower === undefined) {
        return false;
    }

    // Check if user can access based on hierarchy
    return allowedRoles.some((role) => {
        const normalizedRole = role.trim().toLowerCase();
        const requiredPower = ROLE_POWER[normalizedRole];

        // If required role is unknown, skip it
        if (requiredPower === undefined) {
            return false;
        }

        // Special case: clients are isolated - they can only access client routes
        if (normalizedUserRole === 'client' || normalizedRole === 'client') {
            return normalizedUserRole === normalizedRole;
        }

        // User can access if their power level is <= required power level
        // (lower number = higher rank = more access)
        return userPower <= requiredPower;
    });
}

/**
 * Get the default/home panel path for a role
 * @param {string} role - The user's role
 * @returns {string} - The default panel path
 */
export function getDefaultPanel(role) {
    const normalizedRole = (role || '').trim().toLowerCase();
    const panels = ROLE_PANELS[normalizedRole];
    return panels && panels.length > 0 ? panels[0].path : '/login';
}

/**
 * Get accessible panels for a role
 * @param {string} role - The user's role
 * @returns {Array} - Array of accessible panel objects
 */
export function getAccessiblePanels(role) {
    const normalizedRole = (role || '').trim().toLowerCase();
    return ROLE_PANELS[normalizedRole] || [];
}

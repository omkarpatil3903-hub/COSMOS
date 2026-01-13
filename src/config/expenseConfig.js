/**
 * Expense Configuration
 *
 * Purpose: Centralized configuration for the expense management module,
 * defining categories, statuses, colors, and currencies.
 *
 * Responsibilities:
 * - Defines allowed expense categories (Travel, Food, Stay, Office, Other)
 * - Defines expense workflow statuses (Draft → Submitted → Approved/Rejected → Paid)
 * - Provides Tailwind CSS classes for status badge styling (light & dark mode)
 * - Defines supported currencies with symbols
 * - Provides helper functions for dynamic styling
 *
 * Dependencies:
 * - Tailwind CSS (all color classes are Tailwind utilities)
 *
 * Usage:
 * - Import constants in expense forms, tables, and filters
 * - Use getStatusColorClass() for dynamic badge styling
 *
 * Last Modified: 2026-01-10
 */

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================
// BUSINESS RULE: Limited to 5 standard categories for consistent reporting
// Adding new categories requires updating analytics/reporting dashboards
export const EXPENSE_CATEGORIES = [
    { value: "Travel", label: "Travel" },
    { value: "Food", label: "Food" },
    { value: "Stay", label: "Stay" },
    { value: "Office", label: "Office" },
    { value: "Other", label: "Other" },
];

// ============================================================================
// EXPENSE STATUSES (Workflow)
// ============================================================================
// BUSINESS RULE: Expense lifecycle follows this workflow:
// Draft → Submitted → Approved/Rejected → Paid
// "Draft" allows employees to save incomplete expenses
// "Submitted" triggers manager review
// "Paid" is the terminal state after finance completes reimbursement
export const EXPENSE_STATUSES = [
    { value: "Draft", label: "Draft" },
    { value: "Submitted", label: "Submitted" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Paid", label: "Paid" },
];

// ============================================================================
// STATUS COLOR MAPPING
// ============================================================================
// DESIGN DECISION: Color-coded statuses for quick visual identification
// - Gray: Draft (neutral, incomplete)
// - Blue: Submitted (in progress, awaiting action)
// - Green: Approved (positive outcome)
// - Red: Rejected (negative outcome, needs attention)
// - Purple: Paid (completed, distinct from approved)
export const STATUS_COLORS = {
    Draft: {
        bg: "bg-gray-100",
        text: "text-gray-700",
        darkBg: "[.dark_&]:bg-gray-500/20",
        darkText: "[.dark_&]:text-gray-300",
    },
    Submitted: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        darkBg: "[.dark_&]:bg-blue-500/20",
        darkText: "[.dark_&]:text-blue-300",
    },
    Approved: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        darkBg: "[.dark_&]:bg-emerald-500/20",
        darkText: "[.dark_&]:text-emerald-300",
    },
    Rejected: {
        bg: "bg-red-100",
        text: "text-red-700",
        darkBg: "[.dark_&]:bg-red-500/20",
        darkText: "[.dark_&]:text-red-300",
    },
    Paid: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        darkBg: "[.dark_&]:bg-purple-500/20",
        darkText: "[.dark_&]:text-purple-300",
    },
};

/**
 * Generates combined Tailwind class string for status badges.
 *
 * @param {string} status - Expense status (Draft, Submitted, Approved, Rejected, Paid)
 * @param {boolean} useDarkMode - Whether to include dark mode classes (default: true)
 * @returns {string} Combined Tailwind CSS class string
 *
 * @example
 * <span className={getStatusColorClass('Approved')}>Approved</span>
 */
export const getStatusColorClass = (status, useDarkMode = true) => {
    // FALLBACK: Default to Draft styling for unknown/null statuses
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    let classes = `${colors.bg} ${colors.text}`;
    if (useDarkMode) {
        classes += ` ${colors.darkBg} ${colors.darkText}`;
    }
    return classes;
};

// ============================================================================
// SUPPORTED CURRENCIES
// ============================================================================
// BUSINESS RULE: INR is the primary currency for domestic expenses
// USD, EUR, GBP supported for international travel/client work
export const CURRENCIES = [
    { value: "INR", label: "₹ INR", symbol: "₹" },
];

// PAGINATION: Default items per page for expense list views
export const DEFAULT_PAGE_SIZE = 10;

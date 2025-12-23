/**
 * Shared Expense Configuration
 * Centralized categories, statuses, and colors for expense management
 */

export const EXPENSE_CATEGORIES = [
    { value: "Travel", label: "Travel" },
    { value: "Food", label: "Food" },
    { value: "Stay", label: "Stay" },
    { value: "Office", label: "Office" },
    { value: "Other", label: "Other" },
];

export const EXPENSE_STATUSES = [
    { value: "Draft", label: "Draft" },
    { value: "Submitted", label: "Submitted" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Paid", label: "Paid" },
];

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

// Helper to get combined status class string
export const getStatusColorClass = (status, useDarkMode = true) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    let classes = `${colors.bg} ${colors.text}`;
    if (useDarkMode) {
        classes += ` ${colors.darkBg} ${colors.darkText}`;
    }
    return classes;
};

export const CURRENCIES = [
    { value: "INR", label: "₹ INR", symbol: "₹" },
    { value: "USD", label: "$ USD", symbol: "$" },
    { value: "EUR", label: "€ EUR", symbol: "€" },
    { value: "GBP", label: "£ GBP", symbol: "£" },
];

export const DEFAULT_PAGE_SIZE = 10;

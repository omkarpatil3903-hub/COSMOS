/**
 * ConfirmationModal Component
 *
 * Purpose: Reusable confirmation dialog for various actions.
 * Supports different visual variants (danger, success, warning, info).
 *
 * Responsibilities:
 * - Display icon with title and description
 * - Show item details if provided
 * - Cancel and Confirm buttons with loading state
 * - Theme-aware styling with variant colors
 *
 * Dependencies:
 * - react-icons (FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaSpinner)
 *
 * Props:
 * - isOpen: Whether modal is visible
 * - onClose: Cancel handler
 * - onConfirm: Confirm handler
 * - title: Modal title
 * - description: Main description text
 * - itemTitle/itemSubtitle: Item being acted upon
 * - cancelLabel/confirmLabel: Button labels
 * - variant: 'danger' | 'success' | 'warning' | 'info' (default: 'warning')
 * - isLoading: Loading state for confirm button
 * - icon: Optional custom icon component
 *
 * Variants:
 * - danger: Red theme for destructive actions
 * - success: Green theme for positive actions (approve, complete)
 * - warning: Amber/Yellow theme for caution actions
 * - info: Blue theme for informational confirmations
 *
 * Last Modified: 2026-01-21
 */

import React from "react";
import {
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaSpinner,
    FaMoneyCheckAlt
} from "react-icons/fa";

// Variant configuration for colors and default icons
const VARIANT_CONFIG = {
    danger: {
        iconBg: "bg-red-100 [.dark_&]:bg-red-500/20",
        iconColor: "text-red-600 [.dark_&]:text-red-500",
        buttonBg: "bg-red-600 hover:bg-red-700",
        DefaultIcon: FaExclamationTriangle
    },
    success: {
        iconBg: "bg-emerald-100 [.dark_&]:bg-emerald-500/20",
        iconColor: "text-emerald-600 [.dark_&]:text-emerald-500",
        buttonBg: "bg-emerald-600 hover:bg-emerald-700",
        DefaultIcon: FaCheckCircle
    },
    warning: {
        iconBg: "bg-amber-100 [.dark_&]:bg-amber-500/20",
        iconColor: "text-amber-600 [.dark_&]:text-amber-500",
        buttonBg: "bg-amber-600 hover:bg-amber-700",
        DefaultIcon: FaExclamationTriangle
    },
    info: {
        iconBg: "bg-blue-100 [.dark_&]:bg-blue-500/20",
        iconColor: "text-blue-600 [.dark_&]:text-blue-500",
        buttonBg: "bg-blue-600 hover:bg-blue-700",
        DefaultIcon: FaInfoCircle
    },
    purple: {
        iconBg: "bg-purple-100 [.dark_&]:bg-purple-500/20",
        iconColor: "text-purple-600 [.dark_&]:text-purple-500",
        buttonBg: "bg-purple-600 hover:bg-purple-700",
        DefaultIcon: FaMoneyCheckAlt
    }
};

function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    description = "Are you sure you want to proceed?",
    itemTitle,
    itemSubtitle,
    cancelLabel = "Cancel",
    confirmLabel = "Confirm",
    variant = "warning",
    isLoading = false,
    icon: CustomIcon,
    count // Optional: for bulk actions, e.g., "Approve 5 expenses"
}) {
    if (!isOpen) return null;

    const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.warning;
    const IconComponent = CustomIcon || config.DefaultIcon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white [.dark_&]:bg-[#181B2A] p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 [.dark_&]:border-white/10">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                        <IconComponent className={`${config.iconColor} text-xl`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 [.dark_&]:text-white mb-2">
                            {title}
                        </h2>
                        {itemTitle && (
                            <div className="mb-2 max-w-full">
                                <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white truncate" title={itemTitle}>
                                    {itemTitle}
                                </p>
                                {itemSubtitle && (
                                    <p className="text-xs text-gray-600 [.dark_&]:text-gray-400 mt-0.5 truncate" title={itemSubtitle}>
                                        {itemSubtitle}
                                    </p>
                                )}
                            </div>
                        )}
                        {count && (
                            <div className="mb-2 px-3 py-1.5 bg-gray-100 [.dark_&]:bg-white/10 rounded-lg inline-block">
                                <span className="text-sm font-medium text-gray-700 [.dark_&]:text-gray-300">
                                    {count} item{count !== 1 ? 's' : ''} selected
                                </span>
                            </div>
                        )}
                        <p className="text-gray-600 [.dark_&]:text-gray-300 text-sm break-words">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="py-2 px-4 bg-gray-200 [.dark_&]:bg-gray-700 text-gray-800 [.dark_&]:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 [.dark_&]:hover:bg-gray-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`py-2 px-4 ${config.buttonBg} text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2`}
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <FaSpinner className="h-4 w-4 animate-spin" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;

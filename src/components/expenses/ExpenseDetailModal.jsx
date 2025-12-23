/**
 * Expense Detail Modal Component
 * Matches project-wide modal styling patterns
 */
import React from "react";
import { HiXMark } from "react-icons/hi2";
import {
    FaCalendarAlt,
    FaUser,
    FaTag,
    FaProjectDiagram,
    FaFileInvoice,
    FaMoneyBillWave,
    FaExternalLinkAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
} from "react-icons/fa";
import Button from "../Button";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { getStatusColorClass } from "../../config/expenseConfig";

export default function ExpenseDetailModal({ expense, onClose, useDarkMode = true }) {
    const { headerIconClass, badgeClass } = useThemeStyles();

    if (!expense) return null;

    const formatDate = (dateValue) => {
        if (!dateValue) return "-";
        if (typeof dateValue === "string") return dateValue;
        if (dateValue.toDate) {
            return dateValue.toDate().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return "-";
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${headerIconClass} rounded-lg`}>
                            <FaMoneyBillWave className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                                {expense.title}
                            </h2>
                            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                                ID: {expense.id?.slice(0, 8)}...
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
                    >
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-6">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badgeClass} border`}
                            >
                                {expense.status}
                            </span>
                            {expense.description && (
                                <p className="text-sm text-gray-600 [.dark_&]:text-gray-400 max-w-md">
                                    {expense.description}
                                </p>
                            )}
                        </div>

                        {/* Top Section: Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Amount Card */}
                            <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-green-100 text-green-600 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400 rounded-md">
                                        <FaMoneyBillWave className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                                        AMOUNT
                                    </span>
                                </div>
                                <p className="text-gray-900 [.dark_&]:text-white font-semibold text-xl">
                                    ₹{expense.amount?.toFixed?.(2) || expense.amount}
                                    <span className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400 ml-1">
                                        {expense.currency || "INR"}
                                    </span>
                                </p>
                            </div>

                            {/* Date Card */}
                            <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-400 rounded-md">
                                        <FaCalendarAlt className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                                        DATE
                                    </span>
                                </div>
                                <p className="text-gray-900 [.dark_&]:text-white font-semibold text-base">
                                    {expense.date || "-"}
                                </p>
                            </div>

                            {/* Category Card */}
                            <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-purple-100 text-purple-600 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-400 rounded-md">
                                        <FaTag className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                                        CATEGORY
                                    </span>
                                </div>
                                <p className="text-gray-900 [.dark_&]:text-white font-semibold text-base">
                                    {expense.category || "Other"}
                                </p>
                            </div>
                        </div>

                        {/* Employee & Project Info */}
                        <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-semibold mb-1 flex items-center gap-1">
                                        <FaUser className="h-3 w-3 text-gray-400" />
                                        Employee
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {expense.employeeName || "Unknown"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-semibold mb-1 flex items-center gap-1">
                                        <FaProjectDiagram className="h-3 w-3 text-gray-400" />
                                        Project
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {expense.projectName || "No project"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Section */}
                        {expense.receiptUrl && (
                            <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-400 rounded-md">
                                            <FaFileInvoice className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                                            RECEIPT
                                        </span>
                                    </div>
                                    <a
                                        href={expense.receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                        Open in new tab <FaExternalLinkAlt className="text-[10px]" />
                                    </a>
                                </div>
                                {expense.receiptUrl.startsWith("data:image") ||
                                    expense.receiptUrl.includes(".jpg") ||
                                    expense.receiptUrl.includes(".png") ||
                                    expense.receiptUrl.includes(".jpeg") ||
                                    expense.receiptUrl.includes(".webp") ? (
                                    <img
                                        src={expense.receiptUrl}
                                        alt="Receipt"
                                        className="max-h-48 rounded-lg border border-gray-200 [.dark_&]:border-white/10 object-contain w-full bg-gray-100 [.dark_&]:bg-white/5"
                                    />
                                ) : (
                                    <div className="p-6 rounded-lg bg-gray-50 [.dark_&]:bg-white/5 text-center border border-dashed border-gray-300 [.dark_&]:border-white/10">
                                        <FaFileInvoice className="text-2xl text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                                            Click link above to view receipt
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rejection Reason */}
                        {expense.status === "Rejected" && expense.rejectionReason && (
                            <div className="border border-red-200 [.dark_&]:border-red-500/30 rounded-xl p-4 bg-red-50 [.dark_&]:bg-red-900/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaTimesCircle className="text-red-500" />
                                    <span className="text-sm font-semibold text-red-700 [.dark_&]:text-red-400">
                                        Rejection Reason
                                    </span>
                                </div>
                                <p className="text-sm text-red-600 [.dark_&]:text-red-300">
                                    {expense.rejectionReason}
                                </p>
                                {expense.approverName && (
                                    <p className="text-xs text-red-500 [.dark_&]:text-red-400 mt-2">
                                        Rejected by: {expense.approverName} • {formatDate(expense.rejectedAt)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Approval Info */}
                        {(expense.status === "Approved" || expense.status === "Paid") &&
                            expense.approverName && (
                                <div className="border border-green-200 [.dark_&]:border-green-500/30 rounded-xl p-4 bg-green-50 [.dark_&]:bg-green-900/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaCheckCircle className="text-green-500" />
                                        <span className="text-sm font-semibold text-green-700 [.dark_&]:text-green-400">
                                            {expense.status === "Paid" ? "Payment Info" : "Approval Info"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-600 [.dark_&]:text-green-300">
                                        Approved by: {expense.approverName}
                                    </p>
                                    {expense.approvedAt && (
                                        <p className="text-xs text-green-500 [.dark_&]:text-green-400 mt-1">
                                            {formatDate(expense.approvedAt)}
                                        </p>
                                    )}
                                    {expense.status === "Paid" && expense.paidAt && (
                                        <p className="text-xs text-green-500 [.dark_&]:text-green-400 mt-1">
                                            Paid: {formatDate(expense.paidAt)}
                                        </p>
                                    )}
                                </div>
                            )}

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-gray-400 [.dark_&]:text-gray-500 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                            <div className="flex items-center gap-1">
                                <FaClock />
                                <span>Created: {formatDate(expense.createdAt)}</span>
                            </div>
                            {expense.submittedAt && (
                                <div className="flex items-center gap-1">
                                    <span>Submitted: {formatDate(expense.submittedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex justify-end rounded-b-xl">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="px-6"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

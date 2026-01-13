/**
 * ExpenseFormModal Component
 *
 * Purpose: Modal form for creating and editing expense records.
 * Supports voice input for text fields and file upload for receipts.
 *
 * Responsibilities:
 * - Create new expense records
 * - Edit existing expense records
 * - Validate required fields (title, date, amount)
 * - Handle file upload for receipts
 * - Associate expense with project (optional)
 * - Show loading state during submission
 *
 * Dependencies:
 * - Button (UI component)
 * - VoiceInput (speech-to-text input wrapper)
 * - react-icons (form field icons)
 *
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close callback
 * - onSubmit: Async callback with form data
 * - initialData: Expense data for edit mode (null for create)
 * - projects: Array of projects for dropdown
 * - isSubmitting: Boolean for submit loading state
 * - title: Modal header text
 *
 * Form Fields:
 * - title: Expense title (required, voice input)
 * - date: Expense date (required)
 * - projectId: Associated project (optional dropdown)
 * - category: Travel, Food, Stay, Office, Other
 * - amount: Expense amount (required, positive number)
 * - currency: INR (fixed)
 * - description: Details (optional, voice input textarea)
 * - receipt: File upload (optional, image/PDF)
 *
 * Validation:
 * - Title required
 * - Date required
 * - Amount must be positive number
 *
 * Edit Mode:
 * - Prefills form with initialData
 * - Shows "Has existing receipt" indicator
 * - New receipt upload replaces existing
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useEffect } from "react";
import {
    FaTimes,
    FaTag,
    FaProjectDiagram,
    FaMoneyBill,
    FaFileUpload,
    FaSpinner
} from "react-icons/fa";
import Button from "../Button";
import VoiceInput from "../Common/VoiceInput";

export default function ExpenseFormModal({
    isOpen,
    onClose,
    onSubmit, // async (formData) => void
    initialData = null,
    projects = [],
    isSubmitting = false,
    title = "Expense Details"
}) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        date: "",
        category: "Other",
        amount: "",
        currency: "INR",
        notes: "",
        status: "Submitted",
        receipt: null,
        projectId: "",
        projectName: "",
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setForm({
                title: initialData.title || "",
                description: initialData.description || "",
                date: initialData.date || "",
                category: initialData.category || "Other",
                amount: initialData.amount || "",
                currency: initialData.currency || "INR",
                notes: initialData.notes || "",
                status: initialData.status || "Submitted",
                receipt: null, // New file not selected by default
                projectId: initialData.projectId || "",
                projectName: initialData.projectName || "",
            });
        } else {
            setForm({
                title: "",
                description: "",
                date: new Date().toISOString().split('T')[0],
                category: "Other",
                amount: "",
                currency: "INR",
                notes: "",
                status: "Submitted",
                receipt: null,
                projectId: "",
                projectName: "",
            });
        }
        setErrors({});
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        // Clear error when field is modified
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!form.title) newErrors.title = "Title is required";
        if (!form.date) newErrors.date = "Date is required";
        if (!form.amount || Number(form.amount) <= 0)
            newErrors.amount = "Enter a valid amount";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        // Find project name if project ID changed
        let selectedProjectName = form.projectName;
        if (form.projectId) {
            const proj = projects.find(p => p.id === form.projectId);
            if (proj) {
                selectedProjectName = proj.projectName || proj.name;
            }
        }

        onSubmit({
            ...form,
            amount: Number(form.amount),
            projectName: selectedProjectName
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1e1e2d] shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4 bg-white/80 dark:bg-[#1e1e2d] backdrop-blur-md">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {title}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            {initialData ? "Update details" : "Create new expense"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                Title
                            </label>
                            <div className="relative">
                                <VoiceInput
                                    value={form.title}
                                    onChange={(e) => handleChange("title", e.target.value)}
                                    placeholder="e.g. Client Lunch"
                                    className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-3 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                                />
                            </div>
                            {errors.title && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                                    {errors.title}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => handleChange("date", e.target.value)}
                                    className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 px-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                                />
                            </div>
                            {errors.date && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                                    {errors.date}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Project Dropdown */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                            Project (Optional)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <FaProjectDiagram />
                            </div>
                            <select
                                value={form.projectId}
                                onChange={(e) => handleChange("projectId", e.target.value)}
                                className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
                            >
                                <option value="">Select Project</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.projectName || project.name || "Untitled Project"}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Amount & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                Category
                            </label>
                            <div className="relative">
                                <select
                                    value={form.category}
                                    onChange={(e) => handleChange("category", e.target.value)}
                                    className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 px-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
                                >
                                    <option>Travel</option>
                                    <option>Food</option>
                                    <option>Stay</option>
                                    <option>Office</option>
                                    <option>Other</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Amount
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <FaMoneyBill />
                                    </div>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => handleChange("amount", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                                    />
                                </div>
                                {errors.amount && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                                        {errors.amount}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Currency
                                </label>
                                <div className="w-20 rounded-xl border-0 bg-gray-100 dark:bg-gray-700 py-2.5 px-3 text-sm font-bold text-gray-500 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 text-center cursor-not-allowed select-none">
                                    INR
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                            Description
                        </label>
                        <VoiceInput
                            as="textarea"
                            rows={3}
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Describe the expense details..."
                            className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-3 px-4 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                        />
                    </div>

                    {/* Receipt */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                            Receipt (Optional)
                        </label>
                        <div className="mt-1 flex justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800">
                            <div className="text-center">
                                <FaFileUpload className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-500" />
                                <div className="mt-2 flex text-sm leading-6 text-gray-600 dark:text-gray-300 justify-center">
                                    <label
                                        htmlFor="file-upload-modal"
                                        className="relative cursor-pointer rounded-md bg-white dark:bg-transparent font-semibold text-indigo-600 dark:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            id="file-upload-modal"
                                            name="file-upload-modal"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="sr-only"
                                            onChange={(e) =>
                                                handleChange("receipt", e.target.files[0])
                                            }
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                {form.receipt && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                                        Selected: {form.receipt.name}
                                    </p>
                                )}
                                {!form.receipt && initialData?.receiptUrl && (
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium truncate max-w-xs mx-auto">
                                        Has existing receipt
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[100px]">
                        {isSubmitting ? (
                            <>
                                <FaSpinner className="animate-spin mr-2" /> Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

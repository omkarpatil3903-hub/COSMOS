import React, { useState, useEffect } from "react";
import { FaUserTie, FaEdit, FaBell } from "react-icons/fa";
import { HiXMark } from "react-icons/hi2";
import Button from "../../components/Button";

/**
 * LeadFormModal - Unified modal for Add and Edit lead functionality
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {string} props.mode - 'add' or 'edit'
 * @param {Object} props.initialData - Initial form data (for edit mode)
 * @param {Function} props.onSubmit - Form submission handler
 * @param {Object} props.errors - Form validation errors
 * @param {Object} props.settings - Dynamic settings (statuses, priorities, sources, etc.)
 * @param {string} props.buttonClass - Button class from theme
 */
const LeadFormModal = ({
    isOpen,
    onClose,
    mode = "add",
    initialData = {},
    onSubmit,
    errors = {},
    settings = {},
    buttonClass = "",
    headerIconClass = "",
}) => {
    const isEditMode = mode === "edit";

    // Form state with defaults
    const [formData, setFormData] = useState({
        date: "",
        customerName: "",
        contactNumber: "",
        email: "",
        companyName: "",
        address: "",
        productOfInterest: "",
        sector: "",
        sourceOfLead: "",
        productCategory: "",
        status: "remaining",
        priority: "Medium",
        notes: "",
        followUpDate: "",
        assignedTo: "",
        potentialValue: "",
    });

    // Reset form when modal opens or mode/initialData changes
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && initialData) {
                setFormData({
                    date: initialData.date || "",
                    customerName: initialData.customerName || "",
                    contactNumber: initialData.contactNumber || "",
                    email: initialData.email || "",
                    companyName: initialData.companyName || "",
                    address: initialData.address || "",
                    productOfInterest: initialData.productOfInterest || "",
                    sector: initialData.sector || "",
                    sourceOfLead: initialData.sourceOfLead || "",
                    productCategory: initialData.productCategory || "",
                    status: initialData.status || "remaining",
                    priority: initialData.priority || "Medium",
                    notes: initialData.notes || "",
                    followUpDate: initialData.followUpDate || "",
                    assignedTo: initialData.assignedTo || "",
                    potentialValue: initialData.potentialValue || "",
                });
            } else {
                // Reset to defaults for add mode
                setFormData({
                    date: "",
                    customerName: "",
                    contactNumber: "",
                    email: "",
                    companyName: "",
                    address: "",
                    productOfInterest: "",
                    sector: "",
                    sourceOfLead: "",
                    productCategory: "",
                    status: settings.leadStatuses?.[0]?.toLowerCase() || "remaining",
                    priority: settings.leadPriorities?.[0] || "Medium",
                    notes: "",
                    followUpDate: "",
                    assignedTo: "",
                    potentialValue: "",
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode, initialData?.id, isEditMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (field, value) => {
        // Input Masking / Filtering
        if (field === "contactNumber") {
            // Allow only numbers, max 10
            if (!/^\d*$/.test(value)) return;
            if (value.length > 10) return;
        }
        if (field === "potentialValue") {
            if (value < 0) return;
        }
        if (field === "customerName") {
            // Allow only alphabets and spaces
            if (/[^a-zA-Z\s]/.test(value)) return;
        }

        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    // Destructure settings with defaults
    const {
        leadStatuses = [],
        leadPriorities = [],
        leadSources = [],
        sectors = [],
        productCategories = [],
        products = [],
    } = settings;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div
                            className={headerIconClass || "bg-indigo-50 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 p-2 rounded-lg"}
                        >
                            {isEditMode ? (
                                <FaEdit className="h-5 w-5" />
                            ) : (
                                <FaUserTie className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                                {isEditMode ? "Edit Lead" : "Add New Lead"}
                            </h2>
                            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                                {isEditMode ? "Update lead information" : "Create a new lead entry"}
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

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Row 1: Date, Customer Name, Contact Number, Email */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => handleChange("date", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.date
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                />
                                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter name"
                                    value={formData.customerName}
                                    onChange={(e) => handleChange("customerName", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.customerName
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                />
                                {errors.customerName && (
                                    <p className="text-xs text-red-500">{errors.customerName}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Contact Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Enter phone"
                                    value={formData.contactNumber}
                                    onChange={(e) => handleChange("contactNumber", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.contactNumber
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                />
                                {errors.contactNumber && (
                                    <p className="text-xs text-red-500">{errors.contactNumber}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="Enter email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.email
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>
                        </div>

                        {/* Row 2: Company Name, Potential Value, Address */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter company name"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange("companyName", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.companyName
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                />
                                {errors.companyName && (
                                    <p className="text-xs text-red-500">{errors.companyName}</p>
                                )}
                            </div>
                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Potential Value (₹)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.potentialValue}
                                    onChange={(e) => handleChange("potentialValue", e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Address
                                </label>
                                <textarea
                                    placeholder="Enter address"
                                    value={formData.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Row 3: Source of Lead */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Source of Lead <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.sourceOfLead}
                                    onChange={(e) => handleChange("sourceOfLead", e.target.value)}
                                    className={`w-full rounded-lg border ${errors.sourceOfLead
                                        ? "border-red-500"
                                        : "border-gray-200 [.dark_&]:border-white/10"
                                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                >
                                    <option value="">Select source</option>
                                    {leadSources.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                                {errors.sourceOfLead && (
                                    <p className="text-xs text-red-500">{errors.sourceOfLead}</p>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Status, Priority, Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleChange("status", e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all capitalize"
                                >
                                    {leadStatuses.map((s) => (
                                        <option key={s} value={s.toLowerCase()} className="capitalize">
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => handleChange("priority", e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                >
                                    {leadPriorities.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                    Notes
                                </label>
                                <textarea
                                    placeholder="Additional notes..."
                                    value={formData.notes}
                                    onChange={(e) => handleChange("notes", e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                            <Button variant="secondary" onClick={onClose} type="button">
                                Cancel
                            </Button>
                            <Button variant="custom" type="submit" className={buttonClass}>
                                {isEditMode ? "Update Lead" : "Add Lead"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadFormModal;

import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import {
    FaSpinner,
    FaEye,
    FaEyeSlash,
    FaUserPlus,
    FaUserEdit,
    FaBuilding,
    FaEnvelope,
    FaPhone,
    FaBriefcase,
    FaUsers,
    FaMapMarkerAlt,
    FaLock,
    FaCamera
} from "react-icons/fa";
import Button from "../Button";

const ClientFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isSubmitting,
    mode = "add", // 'add' or 'edit'
}) => {
    const [formData, setFormData] = useState({
        companyName: "",
        clientName: "",
        email: "",
        password: "",
        contactNo: "",
        typeOfBusiness: "",
        address: "",
        noOfEmployees: "",
        imageUrl: "",
        role: "client",
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    // Initialize form when opening
    useEffect(() => {
        if (isOpen) {
            if (mode === "edit" && initialData) {
                setFormData({
                    companyName: initialData.companyName || "",
                    clientName: initialData.clientName || "",
                    email: initialData.email || "",
                    contactNo: initialData.contactNo || "",
                    typeOfBusiness: initialData.typeOfBusiness || "",
                    address: initialData.address || "",
                    noOfEmployees: initialData.noOfEmployees || "",
                    imageUrl: initialData.imageUrl || "",
                    role: initialData.role || "client",
                    password: "", // Usually don't populate password on edit
                });
                setImagePreview(initialData.imageUrl || null);
            } else {
                // Reset for Add mode
                setFormData({
                    companyName: "",
                    clientName: "",
                    email: "",
                    password: "",
                    contactNo: "",
                    typeOfBusiness: "",
                    address: "",
                    noOfEmployees: "",
                    imageUrl: "",
                    role: "client",
                });
                setImagePreview(null);
            }
            setErrors({});
        }
    }, [isOpen, mode, initialData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                alert("Image size should be less than 1MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setImagePreview(base64String);
                setFormData((prev) => ({ ...prev, imageUrl: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === "email" ? value.toLowerCase() : value;
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Basic validation logic passed up or handled here
        // For brevity, assuming parent handles complex validation or we add it here
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${mode === 'add' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                            {mode === 'add' ? <FaUserPlus className="h-5 w-5" /> : <FaUserEdit className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                {mode === "add" ? "Add New Client" : "Edit Client"}
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                                {mode === "add" ? "Enter client details to create a new account" : "Update existing client information"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Column 1: Basic Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <FaBuilding className="text-indigo-500" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    Basic Information
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        Company Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="e.g. Acme Corp"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="clientName"
                                        value={formData.clientName}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="e.g. John Doe"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <FaEnvelope className="text-gray-400 text-xs" />
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <FaPhone className="text-gray-400 text-xs" />
                                        Contact Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="contactNo"
                                        value={formData.contactNo}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="Enter 10 digit Mobile No"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Business Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <FaBriefcase className="text-indigo-500" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    Business Details
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        Type of Business <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="typeOfBusiness"
                                        value={formData.typeOfBusiness}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="e.g. Software Development"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <FaUsers className="text-gray-400 text-xs" />
                                        No. of Employees
                                    </label>
                                    <input
                                        type="number"
                                        name="noOfEmployees"
                                        value={formData.noOfEmployees}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <FaMapMarkerAlt className="text-gray-400 text-xs" />
                                        Address <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows="5"
                                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200 resize-none"
                                        placeholder="Enter full business address..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Media & Security */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <FaCamera className="text-indigo-500" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    Media & Security
                                </h3>
                            </div>
                            <div className="space-y-6">
                                {/* Image Upload */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        Company Logo
                                    </label>
                                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-center">
                                        {imagePreview ? (
                                            <div className="relative group mb-4">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="h-24 w-24 object-cover rounded-full border-4 border-white shadow-md"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaCamera className="text-white h-6 w-6" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 mb-4">
                                                <FaCamera className="h-8 w-8" />
                                            </div>
                                        )}
                                        <label className="cursor-pointer">
                                            <span className="text-indigo-600 font-semibold hover:text-indigo-700">Upload a file</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 1MB</p>
                                    </div>
                                </div>

                                {/* Account Info */}
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <FaLock className="text-gray-400 text-xs" />
                                            Password {mode === "add" && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                                                placeholder={mode === "add" ? "••••••••" : "Leave blank to keep current"}
                                                required={mode === "add"}
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500">Min. 6 characters</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-xl sticky bottom-0 backdrop-blur-md">
                    <Button type="button" variant="ghost" onClick={onClose} className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} onClick={handleSubmit} className="shadow-lg shadow-indigo-200">
                        {isSubmitting && <FaSpinner className="animate-spin mr-2" />}
                        {mode === "add" ? "Create Account" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ClientFormModal;
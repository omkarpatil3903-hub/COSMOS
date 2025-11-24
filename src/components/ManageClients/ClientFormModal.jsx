import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import { FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
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
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {mode === "add" ? "Add New Client" : "Edit Client"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <HiXMark className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                Basic Info
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Company Name *
                                    <input
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Client Name *
                                    <input
                                        name="clientName"
                                        value={formData.clientName}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Email *
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Contact No *
                                    <input
                                        type="tel"
                                        name="contactNo"
                                        value={formData.contactNo}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Business Info */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                Business Info
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Type of Business *
                                    <input
                                        name="typeOfBusiness"
                                        value={formData.typeOfBusiness}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    No of Employees
                                    <input
                                        type="number"
                                        name="noOfEmployees"
                                        value={formData.noOfEmployees}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                    />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 md:col-span-2">
                                    Address *
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                        required
                                    />
                                </label>

                                {/* Image Upload */}
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 md:col-span-2">
                                    Company Logo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="w-full rounded-lg border border-gray-300 p-2"
                                    />
                                    {imagePreview && (
                                        <div className="mt-2">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="h-14 w-14 object-cover rounded-full border"
                                            />
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Account Info (Only show password for Add mode) */}
                        {mode === "add" && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                    Account Access
                                </h3>
                                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                                    Password *
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-gray-300 p-2 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <FaSpinner className="animate-spin mr-2" />}
                                {mode === "add" ? "Add Client" : "Update Client"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClientFormModal;
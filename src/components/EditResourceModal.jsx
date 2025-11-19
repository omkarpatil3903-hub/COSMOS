import React, { useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import toast from "react-hot-toast";
import Button from "./Button";

function EditResourceModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  imagePreview,
  onImageChange,
  onImageRemove = () => {},
  existingEmails = [],
  isSubmitting = false,
  hasChanges = true,
}) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const emailInUse = (val) =>
    existingEmails.includes((val || "").toLowerCase());

  const validateField = (name, value) => {
    const v = value ?? "";
    switch (name) {
      case "fullName": {
        if (!v.trim()) return "Full name is required";
        if (v.trim().length < 2)
          return "Full name must be at least 2 characters";
        return "";
      }
      case "email": {
        if (!v.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        if (!emailRegex.test(v)) return "Enter a valid email address";
        if (emailInUse(v)) return "Email is already in use";
        return "";
      }
      case "mobile": {
        const digits = String(v).replace(/\D/g, "");
        if (!digits) return "Mobile is required";
        if (digits.length !== 10) return "Enter a valid 10-digit mobile number";
        return "";
      }
      case "password": {
        if (!v) return ""; // optional; only validate if provided
        if (String(v).length < 6)
          return "Password must be at least 6 characters";
        return "";
      }
      default:
        return "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      mobile: validateField("mobile", formData.mobile),
      password: validateField("password", formData.password),
    };
    setErrors(newErrors);
    const firstError =
      Object.values(newErrors).find((message) => message) || "";
    if (firstError) {
      toast.error(firstError);
      return;
    }
    onSubmit(e);
  };

  const isSubmitDisabled = false;
  const disableSubmit = isSubmitDisabled || isSubmitting || !hasChanges;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">
              Edit Resource
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                Basic Info
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Full Name *
                  <input
                    type="text"
                    value={formData.fullName}
                    placeholder="e.g. Priya Sharma"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, fullName: v });
                      if (errors.fullName) {
                        setErrors((prev) => ({ ...prev, fullName: "" }));
                      }
                    }}
                    className={`w-full rounded-lg border ${
                      errors.fullName ? "border-red-500" : "border-subtle"
                    } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                    required
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Email *
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="Work email"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, email: v });
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    className={`w-full rounded-lg border ${
                      errors.email ? "border-red-500" : "border-subtle"
                    } bg-surface py-2 px-3 text-sm text-content-primary focus-visible;border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                  )}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Mobile *
                  <input
                    type="tel"
                    value={formData.mobile}
                    placeholder="10-digit mobile number"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, mobile: v });
                      if (errors.mobile) {
                        setErrors((prev) => ({ ...prev, mobile: "" }));
                      }
                    }}
                    className={`w-full rounded-lg border ${
                      errors.mobile ? "border-red-500" : "border-subtle"
                    } bg-surface py-2 px-3 text-sm text-content-primary focus-visible;border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                    required
                  />
                  {errors.mobile && (
                    <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>
                  )}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                  Profile Image
                  <p className="text-xs text-content-tertiary">
                    PNG/JPG, max 1MB. Update their avatar everywhere.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImageChange}
                    className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                  {imagePreview && (
                    <div className="mt-3 flex items-center gap-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-14 w-14 object-cover rounded-full border border-gray-200"
                      />
                      <button
                        type="button"
                        className="text-xs font-medium text-indigo-600 hover:underline"
                        onClick={onImageRemove}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-4 border-t border-subtle pt-4">
              <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                Role & Employment
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Employment Type
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employmentType: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Resource Type
                  <select
                    value={formData.resourceType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resourceType: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  >
                    <option value="In-house">In-house</option>
                    <option value="Outsourced">Outsourced</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Resource Role
                  <input
                    type="text"
                    value={formData.resourceRole}
                    placeholder="e.g. Project Manager"
                    onChange={(e) =>
                      setFormData({ ...formData, resourceRole: e.target.value })
                    }
                    className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                  Status
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible;border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4 border-t border-subtle pt-4">
              <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                Account & Access
              </h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary max-w-md">
                Password (leave blank to keep current)
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    placeholder="Enter a new password"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, password: v });
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: "" }));
                      }
                    }}
                    className={`w-full rounded-lg border ${
                      errors.password ? "border-red-500" : "border-subtle"
                    } bg-surface py-2 pl-3 pr-10 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-content-tertiary hover:text-content-primary"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-4 w-4" />
                    ) : (
                      <FaEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-content-tertiary">
                  Leave blank to keep their existing password.
                </p>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                )}
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {isSubmitting && <FaSpinner className="h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? "Saving..."
                  : hasChanges
                  ? "Update Resource"
                  : "No changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditResourceModal;

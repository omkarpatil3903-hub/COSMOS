import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import {
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaUser,
  FaBriefcase,
  FaLock,
  FaEnvelope,
  FaPhone,
  FaCamera,
  FaEdit,
} from "react-icons/fa";
import Button from "./Button";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

function EditResourceModal({
  showEditForm,
  setShowEditForm,
  formData,
  setFormData,
  onSubmit,
  onClose,
  imagePreview,
  onImageChange,
  onImageRemove = () => { },
  existingEmails = [],
  isSubmitting = false,
  hasChanges = true,
}) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);

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

  useEffect(() => {
    const ref = doc(db, "settings", "hierarchy");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const rolesArr = Array.isArray(d.roles) ? d.roles : [];
      let list = [];
      if (rolesArr.length > 0) {
        list = rolesArr
          .filter((r) => r && r.name && r.role)
          .map((r) => ({ type: String(r.role).toLowerCase(), name: r.name }));
      } else {
        const sup = Array.isArray(d.superior) ? d.superior : [];
        const inf = Array.isArray(d.inferior) ? d.inferior : [];
        const adminArr = Array.isArray(d.admin) ? d.admin : [];
        const memberArr = Array.isArray(d.member) ? d.member : [];
        const adminSet = new Set([...(adminArr || []), ...(sup || [])]);
        const memberSet = new Set([...(memberArr || []), ...(inf || [])]);
        list = [
          ...Array.from(adminSet).map((v) => ({ type: "admin", name: v })),
          ...Array.from(memberSet).map((v) => ({ type: "member", name: v })),
        ];
      }
      setRoleOptions(list);
    });
    return () => unsub();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      mobile: validateField("mobile", formData.mobile),
      password: validateField("password", formData.password),
    };
    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) return;
    onSubmit(e);
  };

  const isSubmitDisabled = Boolean(
    validateField("fullName", formData.fullName) ||
    validateField("email", formData.email) ||
    validateField("mobile", formData.mobile) ||
    (formData.password ? validateField("password", formData.password) : false)
  );
  const disableSubmit = isSubmitDisabled || isSubmitting || !hasChanges;

  const handleOverlayKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  if (!showEditForm) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FaEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Edit Resource
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Update team member profile details
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
                <FaUser className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Basic Info
                </h3>
              </div>

              <div className="space-y-4">
                {/* Profile Image */}
                <div className="flex flex-col items-center gap-3 pb-4">
                  <div className="relative group">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-24 w-24 object-cover rounded-full border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center border-4 border-white shadow-lg text-indigo-200">
                        <FaCamera className="h-8 w-8" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-md cursor-pointer hover:bg-indigo-700 transition-colors">
                      <FaCamera className="h-3 w-3" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={onImageRemove}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FaUser className="text-gray-400" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    placeholder="e.g. Priya Sharma"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, fullName: v });
                      setErrors((prev) => ({
                        ...prev,
                        fullName: validateField("fullName", v),
                      }));
                    }}
                    className={`w-full rounded-lg border ${errors.fullName
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                      } bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FaEnvelope className="text-gray-400" />
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="Work email"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, email: v });
                      setErrors((prev) => ({
                        ...prev,
                        email: validateField("email", v),
                      }));
                    }}
                    className={`w-full rounded-lg border ${errors.email
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                      } bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FaPhone className="text-gray-400" />
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    placeholder="10-digit mobile number"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, mobile: v });
                      setErrors((prev) => ({
                        ...prev,
                        mobile: validateField("mobile", v),
                      }));
                    }}
                    className={`w-full rounded-lg border ${errors.mobile
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                      } bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {errors.mobile && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.mobile}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Role & Employment */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <FaBriefcase className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Role & Employment
                </h3>
              </div>

              <div className="space-y-4">
                {/* Employment Type */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Employment Type
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employmentType: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>

                {/* Resource Type */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Resource Type
                  </label>
                  <select
                    value={formData.resourceType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resourceType: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                  >
                    <option value="In-house">In-house</option>
                    <option value="Outsourced">Outsourced</option>
                  </select>
                </div>

                {/* Resource Role */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Resource Role
                  </label>
                  <select
                    value={formData.resourceRole}
                    onChange={(e) => {
                      const name = e.target.value;
                      const type =
                        e.target.selectedOptions?.[0]?.getAttribute("data-type") || "";
                      setFormData({
                        ...formData,
                        resourceRole: name,
                        resourceRoleType: type,
                      });
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                  >
                    <option value="">Select role</option>
                    {roleOptions.map((opt) => (
                      <option key={`${opt.type}_${opt.name}`} value={opt.name} data-type={opt.type}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 3: Account & Access */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <FaLock className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Account & Access
                </h3>
              </div>

              <div className="space-y-4">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      placeholder="Enter a new password"
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, password: v });
                        setErrors((prev) => ({
                          ...prev,
                          password: validateField("password", v),
                        }));
                      }}
                      className={`w-full rounded-lg border ${errors.password
                          ? "border-red-500 focus:ring-red-100"
                          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                        } bg-white py-2.5 pl-4 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                  <p className="text-xs text-gray-500">
                    Leave blank to keep their existing password.
                  </p>
                  {errors.password && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-xl sticky bottom-0 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={disableSubmit}
            className="shadow-lg shadow-indigo-200"
          >
            {isSubmitting && <FaSpinner className="h-4 w-4 animate-spin mr-2" />}
            {isSubmitting
              ? "Saving..."
              : hasChanges
                ? "Update Resource"
                : "No changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EditResourceModal;

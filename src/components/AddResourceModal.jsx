import React, { useState, useEffect } from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
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
} from "react-icons/fa";
import VoiceInput from "./Common/VoiceInput";
import Button from "./Button";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

function AddResourceModal({
  showAddForm,
  setShowAddForm,
  formData,
  setFormData,
  onSubmit,
  onClose,
  imagePreview,
  onImageChange,
  onImageRemove = () => { },
  existingEmails = [],
  serverErrors = {},
  clearServerError = () => { },
  isSubmitting = false,
}) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);

  const { buttonClass, iconColor, headerIconClass } = useThemeStyles();

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
        // Allow only typical email characters and enforce a basic structure
        // Local part: letters, numbers, dot, underscore, hyphen, plus
        // Domain: letters, numbers, hyphen and dots, with 2+ char TLD
        const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
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
        if (!v) return "Password is required";
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
        if (!passwordRegex.test(v))
          return "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-).";
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
    validateField("password", formData.password)
  );
  const disableSubmit = isSubmitDisabled || isSubmitting;

  const handleOverlayKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  if (!showAddForm) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col text-gray-900 [.dark_&]:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-[#181B2A] bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${headerIconClass} rounded-lg`}>
              <FaUser className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                Add New Resource
              </h2>
              <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                Create a new team member profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-200 hover:bg-gray-100 [.dark_&]:hover:bg-white/5 rounded-full transition-all duration-200"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 bg-white [.dark_&]:bg-[#181B2A]">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {serverErrors?._general && (
              <div className="lg:col-span-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {serverErrors._general}
              </div>
            )}

            {/* Column 1: Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                <FaUser className={`${iconColor} [.dark_&]:text-opacity-80`} />
                <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
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
                        className="h-24 w-24 object-cover rounded-full border-4 border-white/90 [.dark_&]:border-surface-strong shadow-lg"
                      />
                    ) : (
                      <div className={`h-24 w-24 rounded-full flex items-center justify-center border-4 border-white/90 [.dark_&]:border-surface-strong shadow-lg ${headerIconClass.replace('p-2', '')}`}>
                        <FaCamera className="h-8 w-8" />
                      </div>
                    )}
                    <label className={`absolute bottom-0 right-0 p-2 text-white rounded-full shadow-md cursor-pointer transition-colors ${buttonClass}`}>
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
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
                    <FaUser className="text-gray-400 [.dark_&]:text-gray-300" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <VoiceInput
                    value={formData.fullName}
                    placeholder="e.g. Priya Sharma"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, fullName: v });
                      setErrors((prev) => ({
                        ...prev,
                        fullName: validateField("fullName", v),
                      }));
                      if (serverErrors?.fullName) clearServerError("fullName");
                    }}
                    className={`w-full rounded-lg border ${errors.fullName || serverErrors?.fullName
                      ? "border-red-500 focus:ring-red-100 [.dark_&]:border-red-500 [.dark_&]:focus:ring-red-500/20"
                      : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                      } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 [.dark_&]:placeholder:text-gray-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {(errors.fullName || serverErrors?.fullName) && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.fullName || serverErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
                    <FaEnvelope className="text-gray-400 [.dark_&]:text-gray-300" />
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="Work email"
                    onChange={(e) => {
                      const raw = e.target.value.toLowerCase();
                      // Allow only letters, numbers, dot, underscore, hyphen, plus, and @
                      const v = raw.replace(/[^a-z0-9._+\-@]/g, "");
                      setFormData({ ...formData, email: v });
                      setErrors((prev) => ({
                        ...prev,
                        email: validateField("email", v),
                      }));
                      if (serverErrors?.email) clearServerError("email");
                    }}
                    className={`w-full rounded-lg border ${errors.email || serverErrors?.email
                      ? "border-red-500 focus:ring-red-100 [.dark_&]:border-red-500 [.dark_&]:focus:ring-red-500/20"
                      : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                      } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 [.dark_&]:placeholder:text-gray-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {(errors.email || serverErrors?.email) && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.email || serverErrors.email}
                    </p>
                  )}
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
                    <FaPhone className="text-gray-400 [.dark_&]:text-gray-300" />
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, mobile: v });
                      setErrors((prev) => ({
                        ...prev,
                        mobile: validateField("mobile", v),
                      }));
                      if (serverErrors?.mobile) clearServerError("mobile");
                    }}
                    className={`w-full rounded-lg border ${errors.mobile || serverErrors?.mobile
                      ? "border-red-500 focus:ring-red-100 [.dark_&]:border-red-500 [.dark_&]:focus:ring-red-500/20"
                      : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                      } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 [.dark_&]:placeholder:text-gray-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                    required
                  />
                  {(errors.mobile || serverErrors?.mobile) && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.mobile || serverErrors.mobile}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Role & Employment */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/5">
                <FaBriefcase className={`${iconColor} [.dark_&]:text-opacity-80`} />
                <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
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
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>

                {/* Resource Type */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
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
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                  >
                    <option value="In-house">In-house</option>
                    <option value="Outsourced">Outsourced</option>
                  </select>
                </div>

                {/* Resource Role */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
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
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
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
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 3: Account & Access */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/5">
                <FaLock className={`${iconColor} [.dark_&]:text-opacity-80`} />
                <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                  Account & Access
                </h3>
              </div>

              <div className="space-y-4">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      placeholder="Create a password"
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, password: v });
                        setErrors((prev) => ({
                          ...prev,
                          password: validateField("password", v),
                        }));
                        if (serverErrors?.password) clearServerError("password");
                      }}
                      className={`w-full rounded-lg border ${errors.password || serverErrors?.password
                        ? "border-red-500 focus:ring-red-100 [.dark_&]:border-red-500 [.dark_&]:focus:ring-red-500/20"
                        : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 [.dark_&]:focus:border-indigo-400 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 pl-4 pr-10 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 [.dark_&]:placeholder:text-gray-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 [.dark_&]:text-gray-500 [.dark_&]:hover:text-gray-200"
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
                  <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                    Minimum 8 characters. Shared with the resource for first login.
                  </p>
                  {(errors.password || serverErrors?.password) && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.password || serverErrors.password}
                    </p>
                  )}
                </div>

                {/* Require Password Change Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mustChangePassword ?? true}
                      onChange={(e) =>
                        setFormData({ ...formData, mustChangePassword: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 [.dark_&]:peer-focus:ring-indigo-500/20 rounded-full peer [.dark_&]:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all [.dark_&]:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                  <div>
                    <span className="text-sm font-medium text-gray-700 [.dark_&]:text-gray-200">
                      Require password change on first login
                    </span>
                    <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                      User will be forced to change password before accessing the app
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 [.dark_&]:border-[#181B2A] bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex justify-end gap-3 rounded-b-xl sticky bottom-0 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 [.dark_&]:text-gray-300 hover:text-gray-800 [.dark_&]:hover:text-white hover:bg-gray-100 [.dark_&]:hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="custom"
            onClick={handleSubmit}
            disabled={disableSubmit}
            className={`shadow-lg ${buttonClass}`}
          >
            {isSubmitting && <FaSpinner className="h-4 w-4 animate-spin mr-2" />}
            {isSubmitting ? "Adding..." : "Add Resource"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddResourceModal;

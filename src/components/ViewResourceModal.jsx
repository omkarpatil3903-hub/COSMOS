import React from "react";
import { HiXMark } from "react-icons/hi2";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaCalendarAlt,
  FaLock,
  FaIdBadge,
} from "react-icons/fa";
import Button from "./Button";

function ViewResourceModal({ resource, onClose }) {
  if (!resource) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col text-gray-900 [.dark_&]:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-[#181B2A] bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-300 rounded-lg">
              <FaUser className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                Resource Details
              </h2>
              <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                View complete profile information
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
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Profile Card */}
            <div className="w-full md:w-1/3 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {resource.imageUrl ? (
                  <img
                    src={resource.imageUrl}
                    alt={resource.fullName}
                    className="h-32 w-32 object-cover rounded-full border-4 border-white shadow-xl [.dark_&]:border-[#181B2A]"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-xl [.dark_&]:border-[#181B2A]">
                    {resource.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white ${resource.status === "Active" ? "bg-green-500" : "bg-gray-400"
                    }`}
                  title={resource.status}
                ></span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 [.dark_&]:text-white">
                  {resource.fullName}
                </h3>
                <p className="text-sm text-gray-500 [.dark_&]:text-gray-400 font-medium mt-1">
                  {resource.resourceRole || "No Role Assigned"}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 [.dark_&]:bg-indigo-500/10 [.dark_&]:text-indigo-300 [.dark_&]:border-indigo-500/30">
                    {resource.resourceType}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 [.dark_&]:bg-purple-500/10 [.dark_&]:text-purple-300 [.dark_&]:border-purple-500/30">
                    {resource.employmentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Details Grid */}
            <div className="w-full md:w-2/3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Contact Info */}
                <div className="bg-gray-50 [.dark_&]:bg-[#1F2234] p-4 rounded-xl border border-gray-100 [.dark_&]:border-white/10 hover:border-indigo-100 [.dark_&]:hover:border-indigo-400 transition-colors">
                  <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <FaEnvelope className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Email</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white break-all">
                    {resource.email}
                  </p>
                </div>

                <div className="bg-gray-50 [.dark_&]:bg-[#1F2234] p-4 rounded-xl border border-gray-100 [.dark_&]:border-white/10 hover:border-indigo-100 [.dark_&]:hover:border-indigo-400 transition-colors">
                  <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <FaPhone className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Mobile</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                    {resource.mobile}
                  </p>
                </div>

                {/* Role Info */}
                <div className="bg-gray-50 [.dark_&]:bg-[#1F2234] p-4 rounded-xl border border-gray-100 [.dark_&]:border-white/10 hover:border-indigo-100 [.dark_&]:hover:border-indigo-400 transition-colors">
                  <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <FaIdBadge className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Role Type</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                    {resource.resourceRoleType || "N/A"}
                  </p>
                </div>

                <div className="bg-gray-50 [.dark_&]:bg-[#1F2234] p-4 rounded-xl border border-gray-100 [.dark_&]:border-white/10 hover:border-indigo-100 [.dark_&]:hover:border-indigo-400 transition-colors">
                  <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <FaCalendarAlt className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Join Date</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                    {resource.joinDate || "Not provided"}
                  </p>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50 [.dark_&]:bg-[#1F2234] p-4 rounded-xl border border-gray-100 [.dark_&]:border-white/10 hover:border-indigo-100 [.dark_&]:hover:border-indigo-400 transition-colors sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <FaLock className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Current Password</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono bg-white [.dark_&]:bg-[#181B2A] px-2 py-1 rounded border border-gray-200 [.dark_&]:border-white/10 text-gray-600 [.dark_&]:text-gray-200">
                      {resource.devPassword || "Not provided"}
                    </p>
                    <span className="text-xs text-gray-400 [.dark_&]:text-gray-500 italic">
                      Visible to admins only
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 [.dark_&]:border-[#181B2A] bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex justify-end gap-3 rounded-b-xl sticky bottom-0 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 [.dark_&]:text-gray-300 hover:text-gray-800 [.dark_&]:hover:text-white hover:bg-gray-100 [.dark_&]:hover:bg-white/5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ViewResourceModal;

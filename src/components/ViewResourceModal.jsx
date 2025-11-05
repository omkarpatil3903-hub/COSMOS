import React from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "./Button";

function ViewResourceModal({ resource, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">
              Resource Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-6">
            {/* Profile Image Section */}
            <div className="flex items-center justify-center pb-4 border-b border-gray-200">
              {resource.imageUrl ? (
                <img
                  src={resource.imageUrl}
                  alt="Profile"
                  className="h-24 w-24 object-cover rounded-full border-4 border-indigo-100 shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                  {resource.fullName?.charAt(0)?.toUpperCase() || "R"}
                </div>
              )}
            </div>

            {/* Resource Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 font-semibold">
                  {resource.fullName}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Email
                </label>
                <p className="text-gray-900 break-all text-sm">
                  {resource.email}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Mobile
                </label>
                <p className="text-gray-900 font-medium">{resource.mobile}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Employment Type
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    resource.employmentType === "Full-time"
                      ? "bg-green-100 text-green-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {resource.employmentType || "Full-time"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Resource Type
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    resource.resourceType === "In-house"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {resource.resourceType}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Resource Role
                </label>
                <p className="text-gray-900">
                  {resource.resourceRole || "Not specified"}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    resource.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {resource.status || "Active"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Join Date
                </label>
                <p className="text-gray-900">{resource.joinDate || "Not provided"}</p>
              </div>
            </div>

            {/* Dev Password Warning (if exists) */}
            {resource.devPassword && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
                  <span>⚠️ Password (Dev Only)</span>
                </label>
                <p className="text-gray-900 font-mono font-semibold text-sm">
                  {resource.devPassword}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Remove this field before production deployment
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewResourceModal;

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
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-content-secondary">
                  Full Name
                </label>
                <p className="text-content-primary font-medium">
                  {resource.fullName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-content-secondary">
                  Email
                </label>
                <p className="text-content-primary">{resource.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-content-secondary">
                  Mobile
                </label>
                <p className="text-content-primary">{resource.mobile}</p>
              </div>
              {resource.devPassword && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    <span>⚠️ Password (Dev Only)</span>
                  </label>
                  <p className="text-content-primary font-mono font-semibold">
                    {resource.devPassword}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Remove this field before production deployment
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-content-secondary">
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
              <div>
                <label className="text-sm font-medium text-content-secondary">
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
              <div>
                <label className="text-sm font-medium text-content-secondary">
                  Resource Role
                </label>
                <p className="text-content-primary">
                  {resource.resourceRole || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-content-secondary">
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
              <div>
                <label className="text-sm font-medium text-content-secondary">
                  Join Date
                </label>
                <p className="text-content-primary">{resource.joinDate}</p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewResourceModal;

import React from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "./Button";

function AddResourceModal({ formData, setFormData, onSubmit, onClose, imagePreview, onImageChange }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">
              Add New Resource
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Full Name *
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Email *
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Mobile *
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Password *
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  required
                />
              </label>
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
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                Profile Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit">Add Resource</Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddResourceModal;

import React from "react";
import { HiXMark } from "react-icons/hi2";
import { FaSpinner } from "react-icons/fa";
import Button from "./Button";

const EditProjectModal = ({
  showEditForm,
  setShowEditForm,
  selectedProject,
  setSelectedProject,
  formData,
  setFormData,
  clients,
  handleEditSubmit,
  errors = {},
  setErrors,
  hasChanges,
  isUpdating,
}) => {
  if (!showEditForm || !selectedProject) return null;

  const handleClose = () => {
    setShowEditForm(false);
    setSelectedProject(null);
    setFormData({
      projectName: "",
      clientName: "",
      status: "Planning",
      startDate: "",
      endDate: "",
      okrs: [{ objective: "", keyResults: [""] }],
    });
    if (setErrors) {
      setErrors({});
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">
              Edit Project
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Project Name *
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      projectName: value,
                    });
                    if (setErrors && errors.projectName) {
                      setErrors((prev) => ({ ...prev, projectName: "" }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    errors.projectName ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
                {errors.projectName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.projectName}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Company Name *
                <select
                  value={
                    formData.clientId ||
                    clients.find((c) => c.companyName === formData.clientName)
                      ?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const id = e.target.value;
                    const c = clients.find((cl) => cl.id === id);
                    setFormData({
                      ...formData,
                      clientId: id,
                      clientName: c?.companyName || "",
                    });
                    if (setErrors && errors.clientId) {
                      setErrors((prev) => ({ ...prev, clientId: "" }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    errors.clientId ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                >
                  <option value="" disabled>
                    Select a company
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-xs text-red-600 mt-1">{errors.clientId}</p>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Start Date *
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      startDate: value,
                    });
                    if (setErrors && (errors.startDate || errors.endDate)) {
                      setErrors((prev) => ({
                        ...prev,
                        startDate: "",
                        endDate:
                          prev.endDate && prev.startDate ? prev.endDate : "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    errors.startDate ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
                {errors.startDate && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.startDate}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                End Date *
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      endDate: value,
                    });
                    if (setErrors && errors.endDate) {
                      setErrors((prev) => ({ ...prev, endDate: "" }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    errors.endDate ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
                {errors.endDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
                )}
              </label>
            </div>

            {/* OKR Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-content-secondary">
                  OKRs (Objectives and Key Results) *
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      okrs: [
                        ...formData.okrs,
                        { objective: "", keyResults: [""] },
                      ],
                    });
                  }}
                  className="text-xs"
                >
                  + Add Objective
                </Button>
              </div>
              {errors.okrs && (
                <p className="text-xs text-red-600 mt-1">{errors.okrs}</p>
              )}

              {formData.okrs.map((okr, okrIndex) => (
                <div
                  key={okrIndex}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Objective {okrIndex + 1}
                    </label>
                    {formData.okrs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOkrs = formData.okrs.filter(
                            (_, i) => i !== okrIndex
                          );
                          setFormData({ ...formData, okrs: newOkrs });
                        }}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={okr.objective}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newOkrs = [...formData.okrs];
                      newOkrs[okrIndex].objective = value;
                      setFormData({ ...formData, okrs: newOkrs });
                      if (setErrors && errors.okrs) {
                        setErrors((prev) => ({ ...prev, okrs: "" }));
                      }
                    }}
                    placeholder="e.g., Launch new product feature successfully"
                    className="w-full rounded-lg border border-subtle bg-white py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100 mb-3"
                  />

                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">
                      Key Results
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOkrs = [...formData.okrs];
                        newOkrs[okrIndex].keyResults.push("");
                        setFormData({ ...formData, okrs: newOkrs });
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      + Add Key Result
                    </button>
                  </div>
                  {okr.keyResults.map((kr, krIndex) => (
                    <div key={krIndex} className="flex gap-2 mb-2">
                      <span className="text-xs text-gray-500 mt-2">
                        {krIndex + 1}.
                      </span>
                      <input
                        type="text"
                        value={kr}
                        onChange={(e) => {
                          const value = e.target.value;
                          const newOkrs = [...formData.okrs];
                          newOkrs[okrIndex].keyResults[krIndex] = value;
                          setFormData({ ...formData, okrs: newOkrs });
                          if (setErrors && errors.okrs) {
                            setErrors((prev) => ({ ...prev, okrs: "" }));
                          }
                        }}
                        placeholder={`Key result ${krIndex + 1}`}
                        className="flex-1 rounded-lg border border-subtle bg-white py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      />
                      {okr.keyResults.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOkrs = [...formData.okrs];
                            newOkrs[okrIndex].keyResults = newOkrs[
                              okrIndex
                            ].keyResults.filter((_, i) => i !== krIndex);
                            setFormData({ ...formData, okrs: newOkrs });
                          }}
                          className="text-red-600 hover:text-red-800 px-2"
                          title="Remove key result"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isUpdating || !hasChanges}>
                {isUpdating && (
                  <FaSpinner className="h-4 w-4 animate-spin mr-2" />
                )}
                {isUpdating
                  ? "Saving..."
                  : hasChanges
                  ? "Update Project"
                  : "No changes"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

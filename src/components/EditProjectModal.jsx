import React from "react";
import { FaTimes, FaPlus, FaEdit } from "react-icons/fa";
import VoiceInput from "./Common/VoiceInput";

const EditProjectModal = ({
  showEditForm,
  setShowEditForm,
  selectedProject,
  setSelectedProject,
  formData,
  setFormData,
  clients,
  managers,
  assigneesOptions = [],
  handleEditSubmit,
  editErrors,
  setEditErrors,
}) => {
  if (!showEditForm) return null;

  const handleOKRChange = (index, field, value) => {
    const newOKRs = [...formData.okrs];
    newOKRs[index][field] = value;
    setFormData({ ...formData, okrs: newOKRs });
  };

  const handleKeyResultChange = (okrIndex, krIndex, value) => {
    const newOKRs = [...formData.okrs];
    newOKRs[okrIndex].keyResults[krIndex] = value;
    setFormData({ ...formData, okrs: newOKRs });
  };

  const addKeyResult = (okrIndex) => {
    const newOKRs = [...formData.okrs];
    newOKRs[okrIndex].keyResults.push("");
    setFormData({ ...formData, okrs: newOKRs });
  };

  const removeKeyResult = (okrIndex, krIndex) => {
    const newOKRs = [...formData.okrs];
    newOKRs[okrIndex].keyResults.splice(krIndex, 1);
    setFormData({ ...formData, okrs: newOKRs });
  };

  const addOKR = () => {
    setFormData({
      ...formData,
      okrs: [...formData.okrs, { objective: "", keyResults: [""] }],
    });
  };

  const removeOKR = (index) => {
    const newOKRs = formData.okrs.filter((_, i) => i !== index);
    setFormData({ ...formData, okrs: newOKRs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 [.dark_&]:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <FaEdit className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white">Edit Project</h2>
              <p className="text-sm text-gray-500 [.dark_&]:text-gray-400 mt-1">
                Update project details and OKRs
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowEditForm(false);
              setSelectedProject(null);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleEditSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Project Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">
                    📋
                  </span>
                  PROJECT DETAILS
                </h3>

                {/* Project Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <VoiceInput
                    placeholder="e.g. Website Redesign"
                    value={formData.projectName}
                    onChange={(e) =>
                      setFormData({ ...formData, projectName: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white ${editErrors.projectName
                      ? "border-red-500"
                      : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                  />
                  {editErrors.projectName && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.projectName}
                    </p>
                  )}
                </div>

                {/* Company Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) =>
                      setFormData({ ...formData, clientId: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white ${editErrors.clientId ? "border-red-500" : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                  >
                    <option value="">Select a company</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.companyName}
                      </option>
                    ))}
                  </select>
                  {editErrors.clientId && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.clientId}
                    </p>
                  )}
                </div>

                {/* Project Manager */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                    Project Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectManagerId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        projectManagerId: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white ${editErrors.projectManagerId
                      ? "border-red-500"
                      : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                  >
                    <option value="">Select a project manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                  {editErrors.projectManagerId && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.projectManagerId}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">Assignees</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 [.dark_&]:border-white/10 rounded-lg p-3 space-y-1">
                    {assigneesOptions.map((u) => {
                      const current = Array.isArray(formData.assigneeIds)
                        ? formData.assigneeIds
                        : [];
                      const checked = current.includes(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-2 py-0.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...current, u.id]
                                : current.filter((id) => id !== u.id);
                              setFormData({ ...formData, assigneeIds: next });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 [.dark_&]:text-gray-300">{u.name}</span>
                        </label>
                      );
                    })}
                    {assigneesOptions.length === 0 && (
                      <p className="text-xs text-gray-400">No staff available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - OKRs */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 uppercase tracking-wider mb-4 mt-0 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">
                    📅
                  </span>
                  TIMELINE
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white ${editErrors.startDate
                      ? "border-red-500"
                      : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                  />
                  {editErrors.startDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.startDate}
                    </p>
                  )}
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white ${editErrors.endDate ? "border-red-500" : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                  />
                  {editErrors.endDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.endDate}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">
                      🎯
                    </span>
                    OKRS
                  </h3>
                  <button
                    type="button"
                    onClick={addOKR}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {formData.okrs.map((okr, okrIndex) => (
                    <div
                      key={okrIndex}
                      className="bg-gray-50 [.dark_&]:bg-white/5 p-4 rounded-lg border border-gray-200 [.dark_&]:border-white/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                          {okrIndex + 1}
                        </span>
                        {formData.okrs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOKR(okrIndex)}
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        OBJECTIVE
                      </label>
                      <VoiceInput
                        placeholder="Objective..."
                        value={okr.objective}
                        onChange={(e) =>
                          handleOKRChange(okrIndex, "objective", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 [.dark_&]:border-white/10 rounded-lg text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-3"
                      />

                      <label className="block text-xs font-semibold text-gray-600 [.dark_&]:text-gray-400 uppercase tracking-wider mb-2">
                        Key Results
                      </label>
                      <div className="space-y-2">
                        {okr.keyResults.map((kr, krIndex) => (
                          <div
                            key={krIndex}
                            className="flex items-center gap-2"
                          >
                            <VoiceInput
                              placeholder={`Result ${krIndex + 1}...`}
                              value={kr}
                              onChange={(e) =>
                                handleKeyResultChange(
                                  okrIndex,
                                  krIndex,
                                  e.target.value
                                )
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 [.dark_&]:border-white/10 rounded-lg text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {okr.keyResults.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeKeyResult(okrIndex, krIndex)
                                }
                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addKeyResult(okrIndex)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <FaPlus className="w-3 h-3" />
                          Add Key Result
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {editErrors.okrs && (
                  <p className="mt-2 text-sm text-red-600">{editErrors.okrs}</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-white/5">
          <button
            type="button"
            onClick={() => {
              setShowEditForm(false);
              setSelectedProject(null);
            }}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 bg-white [.dark_&]:bg-white/5 border border-gray-300 [.dark_&]:border-white/20 rounded-lg hover:bg-gray-50 [.dark_&]:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleEditSubmit}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Update Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

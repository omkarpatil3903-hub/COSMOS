import React from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
import { FaTimes, FaPlus, FaEdit, FaLayerGroup, FaBuilding, FaCalendarAlt, FaBullseye, FaTrash } from "react-icons/fa";
import VoiceInput from "./Common/VoiceInput";
import AssigneeSelector from "./AssigneeSelector";

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
  hideProjectManagerDropdown = false,
}) => {
  const { iconColor, headerIconClass, buttonClass } = useThemeStyles();

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${headerIconClass} rounded-lg`}>
              <FaEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                Edit Project
              </h2>
              <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                Update project details and OKRs
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowEditForm(false);
              setSelectedProject(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleEditSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8" noValidate>
            {/* Column 1: Project Details & Timeline */}
            <div className="space-y-8">
              {/* Project Details Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                  <FaLayerGroup className={`${iconColor} [.dark_&]:text-opacity-80`} />
                  <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                    Project Details
                  </h3>
                </div>

                <div className="space-y-4">

                  {/* Project Name */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      <FaLayerGroup className="text-gray-400" />
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <VoiceInput
                      placeholder="e.g. Website Redesign"
                      value={formData.projectName}
                      onChange={(e) =>
                        setFormData({ ...formData, projectName: e.target.value })
                      }
                      className={`w-full rounded-lg border ${editErrors.projectName
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                    {editErrors.projectName && (
                      <p className="text-xs text-red-600 font-medium">
                        {editErrors.projectName}
                      </p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      <FaBuilding className="text-gray-400" />
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.clientId}
                        onChange={(e) =>
                          setFormData({ ...formData, clientId: e.target.value })
                        }
                        className={`w-full rounded-lg border ${editErrors.clientId
                          ? "border-red-500 focus:ring-red-100"
                          : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                          } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200 appearance-none`}
                      >
                        <option value="" disabled>Select a company</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.companyName}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          ></path>
                        </svg>
                      </div>
                    </div>
                    {editErrors.clientId && (
                      <p className="text-xs text-red-600 font-medium">
                        {editErrors.clientId}
                      </p>
                    )}
                  </div>

                  {/* Project Manager */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      <FaBuilding className="text-gray-400" />
                      Project Manager <span className="text-red-500">*</span>
                    </label>
                    {hideProjectManagerDropdown ? (
                      /* Show disabled input for Manager users */
                      <>
                        <input
                          type="text"
                          value={formData.projectManagerName || "Loading..."}
                          disabled
                          className={`w-full rounded-lg border ${editErrors.projectManagerId
                            ? "border-red-500"
                            : "border-gray-200 [.dark_&]:border-white/10"
                            } bg-gray-100 [.dark_&]:bg-gray-800/50 py-2.5 px-4 text-sm text-gray-600 [.dark_&]:text-gray-400 cursor-not-allowed`}
                        />
                        {editErrors.projectManagerId && (
                          <p className="text-xs text-red-600 font-medium">
                            {editErrors.projectManagerId}
                          </p>
                        )}
                      </>
                    ) : (
                      /* Show dropdown for Admin/SuperAdmin */
                      <div className="relative">
                        <select
                          value={formData.projectManagerId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              projectManagerId: e.target.value,
                            })
                          }
                          className={`w-full rounded-lg border ${editErrors.projectManagerId
                            ? "border-red-500 focus:ring-red-100"
                            : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                            } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200 appearance-none`}
                        >
                          <option value="" disabled>Select a project manager</option>
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    )}
                    {!hideProjectManagerDropdown && editErrors.projectManagerId && (
                      <p className="text-xs text-red-600 font-medium">
                        {editErrors.projectManagerId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                  <FaCalendarAlt className={`${iconColor} [.dark_&]:text-opacity-80`} />
                  <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                    Timeline
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      <FaCalendarAlt className="text-gray-400" />
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className={`w-full rounded-lg border ${editErrors.startDate
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200`}
                      required
                    />
                    {editErrors.startDate && (
                      <p className="text-xs text-red-600 font-medium">
                        {editErrors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      <FaCalendarAlt className="text-gray-400" />
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className={`w-full rounded-lg border ${editErrors.endDate
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200`}
                      required
                    />
                    {editErrors.endDate && (
                      <p className="text-xs text-red-600 font-medium">
                        {editErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Assignees & OKRs */}
            <div className="space-y-6">
              {/* Assignees Section - Moved here */}
              <div className="space-y-1.5">
                <AssigneeSelector
                  label={<>Assignees <span className="text-red-500">*</span></>}
                  users={assigneesOptions}
                  selectedIds={formData.assigneeIds || []}
                  onChange={(newIds) => {
                    setFormData({ ...formData, assigneeIds: newIds });
                    if (editErrors.assigneeIds) {
                      setEditErrors((prev) => ({
                        ...prev,
                        assigneeIds: "",
                      }));
                    }
                  }}
                />
                {editErrors.assigneeIds && (
                  <p className="text-xs text-red-600 font-medium">
                    {editErrors.assigneeIds}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 [.dark_&]:border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <FaBullseye className={`${iconColor} [.dark_&]:text-opacity-80`} />
                  <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                    OKRs
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      okrs: [
                        ...formData.okrs,
                        { objective: "", keyResults: [""] },
                      ],
                    });
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1"
                >
                  <FaPlus className="h-3 w-3" /> Add
                </button>
              </div>
              {editErrors.okrs && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 mb-2">

                  {editErrors.okrs}
                </div>
              )}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.okrs.map((okr, okrIndex) => (
                  <div
                    key={okrIndex}
                    className="border border-gray-200 [.dark_&]:border-white/10 rounded-xl p-4 bg-gray-50/50 [.dark_&]:bg-white/5 hover:border-indigo-200 [.dark_&]:hover:border-indigo-500/30 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-400 text-[10px] font-bold">
                          {okrIndex + 1}
                        </span>
                        <label className="text-xs font-bold text-gray-700 [.dark_&]:text-gray-300 uppercase">
                          Objective <span className="text-red-500">*</span>
                        </label>
                      </div>
                      {formData.okrs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOKR(okrIndex)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remove Objective"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <VoiceInput
                      value={okr.objective}
                      onChange={(e) =>
                        handleOKRChange(okrIndex, "objective", e.target.value)
                      }
                      placeholder="Objective..."
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200 mb-3"
                    />


                    <div className="space-y-2 pl-2 border-l-2 border-indigo-100 [.dark_&]:border-indigo-500/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400">
                          Key Results <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => addKeyResult(okrIndex)}
                          className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 text-xs"
                        >
                          <FaPlus className="h-3 w-3" />
                        </button>
                      </div>
                      {okr.keyResults.map((kr, krIndex) => (
                        <div key={krIndex} className="flex gap-2 items-center">
                          <VoiceInput
                            value={kr}
                            onChange={(e) =>
                              handleKeyResultChange(
                                okrIndex,
                                krIndex,
                                e.target.value
                              )
                            }
                            placeholder={`Result ${krIndex + 1}...`}
                            className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                          />
                          {okr.keyResults.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeKeyResult(okrIndex, krIndex)
                              }
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <FaTimes className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {editErrors.okrs && (
                <p className="mt-2 text-sm text-red-600">{editErrors.okrs}</p>
              )}
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
            className={`px-6 py-2.5 text-sm font-semibold text-white ${buttonClass} rounded-lg transition-colors shadow-sm`}
          >
            Update Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

import React from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import {
  FaLayerGroup,
  FaBuilding,
  FaCalendarAlt,
  FaBullseye,
  FaPlus,
  FaTrash,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import Button from "./Button";
import VoiceInput from "./Common/VoiceInput";
import AssigneeSelector from "./AssigneeSelector";

const AddProjectModal = ({
  showAddForm,
  setShowAddForm,
  formData,
  setFormData,
  clients,
  managers = [],
  assigneesOptions = [],
  handleFormSubmit,
  addErrors,
  setAddErrors,
  hideProjectManagerDropdown = false, // New prop to hide dropdown for Managers
}) => {
  const { iconColor, headerIconClass, buttonClass, badgeClass } = useThemeStyles();

  if (!showAddForm) return null;

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
              <FaLayerGroup className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                Add New Project
              </h2>
              <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                Create a new project and assign OKRs
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            noValidate
          >
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
                      value={formData.projectName}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          projectName: e.target.value,
                        });
                        if (addErrors.projectName) {
                          setAddErrors((prev) => ({
                            ...prev,
                            projectName: "",
                          }));
                        }
                      }}
                      placeholder="e.g. Website Redesign"
                      className={`w-full rounded-lg border ${addErrors.projectName
                        ? "border-red-500 focus:ring-red-100"
                        : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                      required
                    />
                    {addErrors.projectName && (
                      <p className="text-xs text-red-600 font-medium">
                        {addErrors.projectName}
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
                        value={
                          formData.clientId ||
                          clients.find(
                            (c) => c.companyName === formData.clientName
                          )?.id ||
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
                          if (addErrors.clientId) {
                            setAddErrors((prev) => ({
                              ...prev,
                              clientId: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${addErrors.clientId
                          ? "border-red-500 focus:ring-red-100"
                          : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                          } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200 appearance-none`}
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
                    {addErrors.clientId && (
                      <p className="text-xs text-red-600 font-medium">
                        {addErrors.clientId}
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
                          className={`w-full rounded-lg border ${addErrors.projectManagerId
                            ? "border-red-500"
                            : "border-gray-200 [.dark_&]:border-white/10"
                            } bg-gray-100 [.dark_&]:bg-gray-800/50 py-2.5 px-4 text-sm text-gray-600 [.dark_&]:text-gray-400 cursor-not-allowed`}
                        />
                        {addErrors.projectManagerId && (
                          <p className="text-xs text-red-600 font-medium">
                            {addErrors.projectManagerId}
                          </p>
                        )}
                      </>
                    ) : (
                      /* Show dropdown for Admin/SuperAdmin */
                      <div className="relative">
                        <select
                          value={formData.projectManagerId}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              projectManagerId: e.target.value,
                            });
                            if (addErrors.projectManagerId) {
                              setAddErrors((prev) => ({
                                ...prev,
                                projectManagerId: "",
                              }));
                            }
                          }}
                          className={`w-full rounded-lg border ${addErrors.projectManagerId
                            ? "border-red-500 focus:ring-red-100"
                            : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                            } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200 appearance-none`}
                          required
                        >
                          <option value="" disabled>
                            Select a project manager
                          </option>
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
                    {!hideProjectManagerDropdown && addErrors.projectManagerId && (
                      <p className="text-xs text-red-600 font-medium">
                        {addErrors.projectManagerId}
                      </p>
                    )}
                  </div>

                  {/* Timeline Section - Moved here */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                      <FaCalendarAlt className={`${iconColor} [.dark_&]:text-opacity-80`} />
                      <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                        Timeline
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Start Date */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                          <FaCalendarAlt className="text-gray-400" />
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                            });
                            if (addErrors.startDate) {
                              setAddErrors((prev) => ({
                                ...prev,
                                startDate: "",
                              }));
                            }
                          }}
                          className={`w-full rounded-lg border ${addErrors.startDate
                            ? "border-red-500 focus:ring-red-100"
                            : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                            } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200`}
                          required
                        />
                      </div>

                      {/* End Date */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                          <FaCalendarAlt className="text-gray-400" />
                          End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            });
                            if (addErrors.endDate) {
                              setAddErrors((prev) => ({
                                ...prev,
                                endDate: "",
                              }));
                            }
                          }}
                          className={`w-full rounded-lg border ${addErrors.endDate
                            ? "border-red-500 focus:ring-red-100"
                            : "border-gray-200 [.dark_&]:border-white/10 focus:border-indigo-500 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20"
                            } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 transition-all duration-200`}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Column 2: Assignees & OKRs */}
            <div className="space-y-6">
              {/* Assignees Section - Moved here */}
              {/* Assignees Section - Moved here */}
              <div className="space-y-1.5">
                <AssigneeSelector
                  label={<>Assignees <span className="text-red-500">*</span></>}
                  users={assigneesOptions}
                  selectedIds={formData.assigneeIds || []}
                  onChange={(newIds) => {
                    setFormData({ ...formData, assigneeIds: newIds });
                    if (addErrors.assigneeIds) {
                      setAddErrors((prev) => ({
                        ...prev,
                        assigneeIds: "",
                      }));
                    }
                  }}
                />
                {addErrors.assigneeIds && (
                  <p className="text-xs text-red-600 font-medium">
                    {addErrors.assigneeIds}
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
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1"
                >
                  <div className="flex items-center gap-1">
                    <FaPlus className="w-3 h-3" />
                    <span>Add</span>
                  </div>
                </Button>
              </div>
              {addErrors.okrs && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 mb-2">

                  {addErrors.okrs}
                </div>
              )}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">


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
                          onClick={() => {
                            const newOkrs = formData.okrs.filter(
                              (_, i) => i !== okrIndex
                            );
                            setFormData({ ...formData, okrs: newOkrs });
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remove Objective"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <VoiceInput
                      value={okr.objective}
                      onChange={(e) => {
                        const newOkrs = [...formData.okrs];
                        newOkrs[okrIndex].objective = e.target.value;
                        setFormData({ ...formData, okrs: newOkrs });
                        if (addErrors.okrs) {
                          setAddErrors((prev) => ({
                            ...prev,
                            okrs: "",
                          }));
                        }
                      }}
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
                          onClick={() => {
                            const newOkrs = [...formData.okrs];
                            newOkrs[okrIndex].keyResults.push("");
                            setFormData({ ...formData, okrs: newOkrs });
                          }}
                          className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 text-xs"
                        >
                          <FaPlus className="h-3 w-3" />
                        </button>
                      </div>
                      {okr.keyResults.map((kr, krIndex) => (
                        <div key={krIndex} className="flex gap-2 items-center">
                          <VoiceInput
                            value={kr}
                            onChange={(e) => {
                              const newOkrs = [...formData.okrs];
                              newOkrs[okrIndex].keyResults[krIndex] =
                                e.target.value;
                              setFormData({ ...formData, okrs: newOkrs });
                            }}
                            placeholder={`Result ${krIndex + 1}...`}
                            className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                          />
                          {formData.okrs[okrIndex].keyResults.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOkrs = [...formData.okrs];
                                newOkrs[okrIndex].keyResults = newOkrs[
                                  okrIndex
                                ].keyResults.filter((_, i) => i !== krIndex);
                                setFormData({ ...formData, okrs: newOkrs });
                              }}
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
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex justify-end gap-3 rounded-b-xl sticky bottom-0 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="custom"
            onClick={handleFormSubmit}
            className={`shadow-lg ${buttonClass}`}
          >
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;

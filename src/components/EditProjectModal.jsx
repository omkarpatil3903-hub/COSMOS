import React from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "./Button";

const EditProjectModal = ({
  showEditForm,
  setShowEditForm,
  selectedProject,
  setSelectedProject,
  formData,
  setFormData,
  clients,
  managers = [],
  handleEditSubmit,
  editErrors,
  setEditErrors,
}) => {
  if (!showEditForm || !selectedProject) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
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
              onClick={() => {
                setShowEditForm(false);
                setSelectedProject(null);
                setFormData({
                  projectName: "",
                  clientName: "",
                  projectManagerId: "",
                  projectManagerName: "",
                  status: "Planning",
                  startDate: "",
                  endDate: "",
                  okrs: [{ objective: "", keyResults: [""] }],
                });
              }}
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
                    setFormData({
                      ...formData,
                      projectName: e.target.value,
                    });
                    if (editErrors.projectName) {
                      setEditErrors((prev) => ({
                        ...prev,
                        projectName: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    editErrors.projectName ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
                {editErrors.projectName && (
                  <p className="text-xs text-red-600 mt-1">
                    {editErrors.projectName}
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
                    if (editErrors.clientId) {
                      setEditErrors((prev) => ({
                        ...prev,
                        clientId: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    editErrors.clientId ? "border-red-500" : "border-subtle"
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
              </label>
              {editErrors.clientId && (
                <p className="text-xs text-red-600 mt-1">
                  {editErrors.clientId}
                </p>
              )}
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Project Manager *
                <select
                  value={
                    formData.projectManagerId ||
                    managers.find((m) => m.name === formData.projectManagerName)
                      ?.id ||
                    ""
                  }
                  title={formData.projectManagerName || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const m = managers.find((mm) => mm.id === id);
                    setFormData({
                      ...formData,
                      projectManagerId: id,
                      projectManagerName: m?.name || "",
                    });
                    if (editErrors.projectManagerId) {
                      setEditErrors((prev) => ({
                        ...prev,
                        projectManagerId: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border truncate ${
                    editErrors.projectManagerId ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                >
                  <option value="" disabled>
                    Select a project manager
                  </option>
                  {managers.map((m) => {
                    const label = (m.name || "").length > 24 ? `${(m.name || "").slice(0, 24)}…` : (m.name || "");
                    return (
                      <option key={m.id} value={m.id} title={m.name || ""}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {editErrors.projectManagerId && (
                  <p className="text-xs text-red-600 mt-1">
                    {editErrors.projectManagerId}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Start Date *
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      startDate: e.target.value,
                    });
                    if (editErrors.startDate) {
                      setEditErrors((prev) => ({
                        ...prev,
                        startDate: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    editErrors.startDate ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                End Date *
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      endDate: e.target.value,
                    });
                    if (editErrors.endDate) {
                      setEditErrors((prev) => ({
                        ...prev,
                        endDate: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-lg border ${
                    editErrors.endDate ? "border-red-500" : "border-subtle"
                  } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                  required
                />
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
              {editErrors.okrs && (
                <p className="text-xs text-red-600 mt-1">{editErrors.okrs}</p>
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
                      const newOkrs = [...formData.okrs];
                      newOkrs[okrIndex].objective = e.target.value;
                      setFormData({ ...formData, okrs: newOkrs });
                      if (editErrors.okrs) {
                        setEditErrors((prev) => ({
                          ...prev,
                          okrs: "",
                        }));
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
                          const newOkrs = [...formData.okrs];
                          newOkrs[okrIndex].keyResults[krIndex] =
                            e.target.value;
                          setFormData({ ...formData, okrs: newOkrs });
                          if (editErrors.okrs) {
                            setEditErrors((prev) => ({
                              ...prev,
                              okrs: "",
                            }));
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
              <Button type="submit">Update Project</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedProject(null);
                  setFormData({
                    projectName: "",
                    clientName: "",
                    projectManagerId: "",
                    projectManagerName: "",
                    status: "Planning",
                    startDate: "",
                    endDate: "",
                    okrs: [{ objective: "", keyResults: [""] }],
                  });
                }}
              >
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

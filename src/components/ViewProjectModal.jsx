import React from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "./Button";
import { formatDate } from "../utils/formatDate";
const ViewProjectModal = ({
  showViewModal,
  setShowViewModal,
  selectedProject,
  setSelectedProject,
}) => {
  if (!showViewModal || !selectedProject) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Project Details
            </h2>
            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedProject(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Project Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Project Name
                </label>
                <p className="text-gray-900 font-semibold">
                  {selectedProject.projectName}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Client Name
                </label>
                <p className="text-gray-900 font-semibold">
                  {selectedProject.clientName}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Start Date
                </label>
                <p className="text-gray-900 font-medium">
                  {formatDate(selectedProject.startDate)}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  End Date
                </label>
                <p className="text-gray-900 font-medium">
                  {formatDate(selectedProject.endDate)}
                </p>
              </div>
            </div>

            {/* OKR Display */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-3">
                OKRs (Objectives and Key Results)
              </label>
              {selectedProject.okrs && selectedProject.okrs.length > 0 ? (
                <div className="space-y-3">
                  {selectedProject.okrs.map((okr, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Objective {index + 1}
                        </label>
                        <p className="text-gray-900 font-semibold">
                          {okr.objective || "No objective specified"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Key Results
                        </label>
                        {okr.keyResults && okr.keyResults.some((kr) => kr) ? (
                          <ul className="space-y-2">
                            {okr.keyResults.map((kr, krIndex) =>
                              kr ? (
                                <li
                                  key={krIndex}
                                  className="flex items-start gap-2 text-sm text-gray-900"
                                >
                                  <span className="text-indigo-600 font-semibold">
                                    {krIndex + 1}.
                                  </span>
                                  <span>{kr}</span>
                                </li>
                              ) : null
                            )}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-sm italic">
                            No key results defined
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm italic">
                    No OKRs specified for this project
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowViewModal(false);
                setSelectedProject(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProjectModal;

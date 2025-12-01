import React from "react";
import { HiXMark } from "react-icons/hi2";
import {
  FaCalendarAlt,
  FaUserTie,
  FaChartLine,
  FaBullseye,
  FaCheckCircle,
  FaLayerGroup,
} from "react-icons/fa";
import Button from "./Button";
import { formatDate } from "../utils/formatDate";

const ViewProjectModal = ({
  showViewModal,
  setShowViewModal,
  selectedProject,
  setSelectedProject,
}) => {
  if (!showViewModal || !selectedProject) return null;

  const getProgressColor = (progress) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 70) return "bg-blue-500";
    if (progress >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FaLayerGroup className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {selectedProject.projectName}
              </h2>
              <p className="text-xs text-gray-500 font-medium">Project Details</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowViewModal(false);
              setSelectedProject(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Top Section: Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-md">
                  <FaUserTie className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Client
                </span>
              </div>
              <p className="text-gray-900 font-bold text-lg truncate">
                {selectedProject.clientName}
              </p>
            </div>

            {/* Timeline Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                  <FaCalendarAlt className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Timeline
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span>{formatDate(selectedProject.startDate)}</span>
                <span className="text-gray-400">→</span>
                <span>{formatDate(selectedProject.endDate)}</span>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-green-100 text-green-600 rounded-md">
                  <FaChartLine className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Progress
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                      selectedProject.progress
                    )}`}
                    style={{ width: `${selectedProject.progress}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {selectedProject.progress}%
                </span>
              </div>
            </div>
          </div>

          {/* OKRs Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FaBullseye className="text-indigo-600 h-5 w-5" />
              <h3 className="text-lg font-bold text-gray-900">
                Objectives & Key Results
              </h3>
            </div>

            {selectedProject.okrs && selectedProject.okrs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {selectedProject.okrs.map((okr, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors duration-200"
                  >
                    <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide block mb-1">
                          Objective
                        </span>
                        <p className="text-gray-900 font-semibold text-base">
                          {okr.objective || "No objective specified"}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-4 bg-white">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
                        Key Results
                      </span>
                      {okr.keyResults && okr.keyResults.some((kr) => kr) ? (
                        <div className="space-y-3">
                          {okr.keyResults.map((kr, krIndex) =>
                            kr ? (
                              <div
                                key={krIndex}
                                className="flex items-start gap-3 group"
                              >
                                <FaCheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span className="text-gray-700 text-sm leading-relaxed group-hover:text-gray-900 transition-colors">
                                  {kr}
                                </span>
                              </div>
                            ) : null
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm italic flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          No key results defined
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <FaBullseye className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  No OKRs specified for this project
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end rounded-b-xl">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowViewModal(false);
              setSelectedProject(null);
            }}
            className="px-6"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewProjectModal;

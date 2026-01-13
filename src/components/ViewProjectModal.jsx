/**
 * ViewProjectModal Component
 *
 * Purpose: Read-only modal for viewing project details.
 * Displays project info, team, and OKRs in a structured layout.
 *
 * Responsibilities:
 * - Display project name and header
 * - Show key metrics: client, timeline (start/end dates), progress bar
 * - Display team: project manager and assignees
 * - Show OKRs (Objectives and Key Results) with scrollable list
 *
 * Dependencies:
 * - useThemeStyles hook for themed styling
 * - formatDate utility
 * - Button component
 * - react-icons (FaCalendarAlt, FaUserTie, FaChartLine, FaBullseye, etc.)
 *
 * Props:
 * - showViewModal: Boolean visibility
 * - setShowViewModal: Toggle function
 * - selectedProject: Project object to display
 * - setSelectedProject: Clear function on close
 *
 * Layout:
 * - Two-column grid on large screens
 * - Left: Metrics cards (client, timeline, progress) + Team section
 * - Right: OKRs section (scrollable)
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import {
  FaCalendarAlt,
  FaUserTie,
  FaChartLine,
  FaBullseye,
  FaCheckCircle,
  FaLayerGroup,
  FaUsers,
} from "react-icons/fa";
import Button from "./Button";
import { formatDate } from "../utils/formatDate";

const ViewProjectModal = ({
  showViewModal,
  setShowViewModal,
  selectedProject,
  setSelectedProject,
}) => {
  const { headerIconClass, badgeClass, iconColor } = useThemeStyles();

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
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
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
                {selectedProject.projectName}
              </h2>
              <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">Project Details</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowViewModal(false);
              setSelectedProject(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:[grid-template-columns:9fr_4fr] gap-6">
            <div className="space-y-6">
              {/* Top Section: Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 md:[grid-template-columns:minmax(0,_1fr)_minmax(0,_2.5fr)_minmax(0,_1fr)] gap-4">
                {/* Client Card */}
                <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[92px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-purple-100 text-purple-600 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-400 rounded-md">
                      <FaUserTie className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                      CLIENT
                    </span>
                  </div>
                  <p className="text-gray-900 [.dark_&]:text-white font-semibold text-base leading-6 truncate" title={selectedProject.clientName}>
                    {selectedProject.clientName}
                  </p>
                </div>

                {/* Timeline Card */}
                <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[110px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-400 rounded-md">
                      <FaCalendarAlt className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                      TIMELINE
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wide">Assigned</span>
                      <span className="block text-base font-semibold text-gray-900 [.dark_&]:text-white" title={formatDate(selectedProject.startDate)}>
                        {formatDate(selectedProject.startDate)}
                      </span>
                    </div>
                    <div className="w-px bg-gray-200 [.dark_&]:bg-white/10 self-stretch rounded justify-self-center" aria-hidden="true"></div>
                    <div className="text-right min-w-0 ">
                      <span className="block text-[10px] font-semibold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wide">Due</span>
                      <span className="block text-base font-semibold text-gray-900 [.dark_&]:text-white" title={formatDate(selectedProject.endDate)}>
                        {formatDate(selectedProject.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Card */}
                <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[92px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-green-100 text-green-600 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400 rounded-md">
                      <FaChartLine className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">
                      PROGRESS
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 [.dark_&]:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                          selectedProject.progress
                        )}`}
                        style={{ width: `${selectedProject.progress}%` }}
                      ></div>
                    </div>
                    <span className="w-10 text-right text-base font-semibold text-gray-900 [.dark_&]:text-white">
                      {selectedProject.progress}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white [.dark_&]:bg-white/5 border border-gray-100 [.dark_&]:border-white/10 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-1.5 ${headerIconClass} rounded-md`}>
                    <FaUsers className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide">Team</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-semibold mb-1 flex items-center gap-1">
                      <FaUserTie className="h-3 w-3 text-gray-400" />
                      Project Manager
                    </div>
                    <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                      {selectedProject.projectManagerName || "—"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-semibold mb-1">Assignees</div>
                    {Array.isArray(selectedProject.assigneeNames) && selectedProject.assigneeNames.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.assigneeNames.map((name) => (
                          <span
                            key={name}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass} border`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No assignees</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* OKRs Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FaBullseye className={`${iconColor} [.dark_&]:text-opacity-80 h-5 w-5`} />
                  <h3 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                    Objectives & Key Results
                  </h3>
                </div>

                {selectedProject.okrs && selectedProject.okrs.length > 0 ? (
                  <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2">
                    {selectedProject.okrs.map((okr, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 [.dark_&]:border-white/10 rounded-xl overflow-hidden hover:border-indigo-200 [.dark_&]:hover:border-indigo-500/30 transition-colors duration-200"
                      >
                        <div className="bg-gray-50/50 [.dark_&]:bg-white/5 px-5 py-3 border-b border-gray-100 [.dark_&]:border-white/10 flex items-start gap-3">
                          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-400 text-xs font-bold mt-0.5">
                            {index + 1}
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-indigo-600 [.dark_&]:text-indigo-400 uppercase tracking-wide block mb-1">
                              Objective
                            </span>
                            <p className="text-gray-900 [.dark_&]:text-white font-semibold text-base">
                              {okr.objective || "No objective specified"}
                            </p>
                          </div>
                        </div>

                        <div className="px-5 py-4 bg-white [.dark_&]:bg-[#181B2A]">
                          <span className="text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wide block mb-3">
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
                                    <span className="text-gray-700 [.dark_&]:text-gray-300 text-sm leading-relaxed group-hover:text-gray-900 [.dark_&]:group-hover:text-white transition-colors">
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex justify-end rounded-b-xl">
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

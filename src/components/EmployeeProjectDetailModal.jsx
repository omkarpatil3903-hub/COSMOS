/**
 * EmployeeProjectDetailModal Component
 *
 * Purpose: Read-only modal for employees to view full project details.
 * Shows project info, team, OKRs, assigned tasks, and offers PDF report download.
 *
 * Props:
 *  - show: Boolean visibility
 *  - onClose: Close handler
 *  - project: Project object
 *  - projectTasks: Tasks assigned to current employee for this project
 *  - allProjectTasks: All tasks in the project (for stats)
 *  - progress: Overall project progress percentage
 *  - employeeName: Current employee's display name (for PDF)
 *
 * Last Modified: 2026-02-21
 */

import React from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import {
    FaLayerGroup,
    FaCalendarAlt,
    FaUserTie,
    FaChartLine,
    FaBullseye,
    FaCheckCircle,
    FaUsers,
    FaTasks,
    FaFlag,
} from "react-icons/fa";
import Button from "./Button";
import { getPriorityBadge } from "../utils/colorMaps";

const EmployeeProjectDetailModal = ({
    show,
    onClose,
    project,
    projectTasks = [],
    allProjectTasks = [],
    progress = 0,
    employeeName = "",
    tasksLabel = "",
}) => {
    const { headerIconClass, badgeClass, iconColor } = useThemeStyles();

    if (!show || !project) return null;

    const formatDate = (date) => {
        if (!date) return "—";
        const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
        if (isNaN(d.getTime())) return "—";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getProgressColor = (p) => {
        if (p === 100) return "bg-green-500";
        if (p >= 70) return "bg-blue-500";
        if (p >= 30) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getStatusBadge = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "done")
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        if (s === "in progress")
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        if (s === "review")
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
        if (s === "need help")
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    };



    // Stats
    const totalAll = allProjectTasks.length;
    const completedAll = allProjectTasks.filter((t) => t.status === "Done").length;
    const inProgressAll = allProjectTasks.filter((t) => {
        const s = (t.status || "").toLowerCase();
        return s === "in progress";
    }).length;
    const todoAll = totalAll - completedAll - inProgressAll;

    const myCompleted = projectTasks.filter((t) => t.status === "Done").length;



    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative z-[10000] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${headerIconClass} rounded-lg`}>
                            <FaLayerGroup className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                {project.projectName}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {project.projectId || "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all duration-200"
                    >
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Top Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Client Card */}
                        {project.clientName && (
                            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-md">
                                        <FaUserTie className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Client
                                    </span>
                                </div>
                                <p
                                    className="text-gray-900 dark:text-white font-semibold text-base truncate"
                                    title={project.clientName}
                                >
                                    {project.clientName}
                                </p>
                            </div>
                        )}

                        {/* Timeline Card */}
                        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-md">
                                    <FaCalendarAlt className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Timeline
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                                        Start
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatDate(project.startDate)}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
                                <div>
                                    <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                                        Due
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatDate(project.endDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-1.5 bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 rounded-md">
                                    <FaChartLine className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Progress
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-base font-semibold text-gray-900 dark:text-white w-10 text-right">
                                    {progress}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                Description
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {project.description}
                            </p>
                        </div>
                    )}

                    {/* Team Section */}
                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-1.5 ${headerIconClass} rounded-md`}>
                                <FaUsers className="h-4 w-4" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Team
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 flex items-center gap-1">
                                    <FaUserTie className="h-3 w-3 text-gray-400" />
                                    Project Manager
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {project.projectManagerName || "—"}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                    Assignees
                                </div>
                                {Array.isArray(project.assigneeNames) &&
                                    project.assigneeNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {project.assigneeNames.map((name) => (
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

                    {/* Two Column: OKRs + Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* OKRs Section */}
                        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <FaBullseye className={`${iconColor} h-5 w-5`} />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Objectives & Key Results
                                </h3>
                            </div>
                            {project.okrs && project.okrs.length > 0 ? (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {project.okrs.map((okr, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"
                                        >
                                            <div className="bg-gray-50/50 dark:bg-white/5 px-4 py-2 border-b border-gray-100 dark:border-white/10">
                                                <div className="flex items-start gap-2">
                                                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs font-bold mt-0.5">
                                                        {index + 1}
                                                    </span>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {okr.objective || "No objective"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-4 py-3">
                                                {okr.keyResults &&
                                                    okr.keyResults.some((kr) => kr) ? (
                                                    <div className="space-y-1.5">
                                                        {okr.keyResults.map(
                                                            (kr, krIndex) =>
                                                                kr && (
                                                                    <div
                                                                        key={krIndex}
                                                                        className="flex items-start gap-2"
                                                                    >
                                                                        <FaCheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                                                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                                                            {kr}
                                                                        </span>
                                                                    </div>
                                                                )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">
                                                        No key results defined
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                                    <FaBullseye className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No OKRs specified</p>
                                </div>
                            )}
                        </div>

                        {/* Project Stats */}
                        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <FaChartLine className={`${iconColor} h-5 w-5`} />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Project Statistics
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {totalAll}
                                    </p>
                                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                                        Total Tasks
                                    </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {completedAll}
                                    </p>
                                    <p className="text-xs text-green-600/70 dark:text-green-400/70 font-medium">
                                        Completed
                                    </p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {inProgressAll}
                                    </p>
                                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">
                                        In Progress
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                        {todoAll}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400/70 font-medium">
                                        To-Do
                                    </p>
                                </div>
                            </div>
                            {!tasksLabel && (
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            My Tasks
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {myCompleted} / {projectTasks.length} completed
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {(() => {
                        const isAllTasks = !!tasksLabel;
                        const displayTasks = isAllTasks ? allProjectTasks : projectTasks;
                        const sectionTitle = tasksLabel || "My Tasks";
                        const emptyMsg = isAllTasks
                            ? "No tasks in this project"
                            : "No tasks assigned to you in this project";
                        return (
                            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <FaTasks className={`${iconColor} h-5 w-5`} />
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {sectionTitle} ({displayTasks.length})
                                    </h3>
                                </div>
                                {displayTasks.length > 0 ? (
                                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0">
                                                <tr className="bg-gray-50 dark:bg-gray-800">
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                        Task
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                        Status
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                        Priority
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                        Due Date
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {displayTasks.map((task) => (
                                                    <tr
                                                        key={task.id}
                                                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                    >
                                                        <td className="px-3 py-2.5 text-gray-900 dark:text-white font-medium max-w-[200px] truncate">
                                                            {task.taskName || task.title || "Untitled"}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span
                                                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                                                                    task.status
                                                                )}`}
                                                            >
                                                                {task.status || "To-Do"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(
                                                                    task.priority
                                                                )}`}
                                                            >
                                                                <FaFlag className="h-2.5 w-2.5" />
                                                                {task.priority || "Medium"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                                                            {formatDate(task.dueDate || task.endDate)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <FaTasks className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            {emptyMsg}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-[#181B2A] flex items-center justify-end rounded-b-xl sticky bottom-0">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="px-6"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProjectDetailModal;

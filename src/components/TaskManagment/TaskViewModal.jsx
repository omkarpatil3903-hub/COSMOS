import React from "react";
import { FaFlag } from "react-icons/fa";
import { MdReplayCircleFilled } from "react-icons/md";
import {
    getStatusBadge,
    getPriorityBadge,
} from "../../utils/colorMaps"; // Adjust path if necessary
import Button from "../Button"; // Adjust path if necessary

const statusIcons = {
    "To-Do": "📋", // You can import FaClipboardList if you prefer the icon component
    "In Progress": "⏳",
    Done: "✅",
};

const TaskViewModal = ({
    task,
    project,
    assignee,
    users,
    clients,
    onClose,
    onEdit,
}) => {
    // Helper: Calculate if completed late
    const getLateness = () => {
        if (!task.completedAt || !task.dueDate) return null;
        const due = new Date(task.dueDate);
        const comp = new Date(task.completedAt);

        // Reset time parts for accurate day comparison
        const dueD = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const compD = new Date(comp.getFullYear(), comp.getMonth(), comp.getDate());

        if (compD <= dueD) return null;

        const diffDays = Math.ceil((compD - dueD) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    };

    const lateDays = getLateness();

    // Helper: Find who completed the task
    const completedByName = React.useMemo(() => {
        if (!task.completedBy) return null;
        const isClient = (task.completedByType || "user") === "client";
        const list = isClient ? clients : users;
        const person = list.find((p) => p.id === task.completedBy);
        return person?.name || person?.clientName || "Unknown";
    }, [task.completedBy, task.completedByType, users, clients]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Task Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Title and Badges */}
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                {task.title}
                            </h3>
                            {task.isRecurring && (
                                <div className="mb-3 flex items-center gap-1.5 text-sm text-indigo-600">
                                    <MdReplayCircleFilled className="h-4 w-4" />
                                    <span className="font-medium">Recurring Task</span>
                                    <span className="text-gray-500">
                                        • {task.recurringPattern}
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusBadge(
                                        task.status
                                    )}`}
                                >
                                    <span>{statusIcons[task.status]}</span>
                                    <span>{task.status}</span>
                                </span>
                                {task.priority && (
                                    <span
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${getPriorityBadge(
                                            task.priority
                                        )}`}
                                    >
                                        <FaFlag />
                                        <span>{task.priority}</span>
                                    </span>
                                )}
                                {task.weightage !== null && task.weightage !== undefined && (
                                    <span className="flex items-center gap-1.5 rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                                        Weightage: {task.weightage}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Description
                                </label>
                                <p className="text-gray-900 whitespace-pre-wrap">
                                    {task.description}
                                </p>
                            </div>
                        )}

                        {/* Project and Assignment Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Project
                                </label>
                                <p className="text-gray-900 font-semibold">
                                    {project?.name || "No project assigned"}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Assigned To
                                </label>
                                <p className="text-gray-900 font-semibold">
                                    {assignee?.name || assignee?.clientName || "Unassigned"}
                                </p>
                                {task.assigneeType && (
                                    <span className="inline-block mt-1 text-xs text-gray-600">
                                        ({task.assigneeType === "client" ? "Client" : "Resource"})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Assigned Date
                                </label>
                                <p className="text-gray-900 font-medium">
                                    {task.assignedDate
                                        ? new Date(task.assignedDate).toLocaleDateString()
                                        : "—"}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Due Date
                                </label>
                                <p className="text-gray-900 font-medium">
                                    {task.dueDate
                                        ? new Date(task.dueDate).toLocaleDateString()
                                        : "No due date"}
                                </p>
                                {task.dueDate &&
                                    task.status !== "Done" &&
                                    new Date(task.dueDate) < new Date() && (
                                        <p className="mt-1 text-xs font-medium text-red-600">
                                            Overdue
                                        </p>
                                    )}
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {task.completedAt && lateDays
                                        ? "Delayed Completion"
                                        : "Completed At"}
                                </label>
                                <p className="text-gray-900 font-medium">
                                    {task.completedAt
                                        ? new Date(task.completedAt).toLocaleDateString()
                                        : "—"}
                                </p>
                                {lateDays && (
                                    <p className="mt-1 text-xs font-medium text-red-600">
                                        Late by {lateDays} day(s)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Completion Comment */}
                        {(task.completionComment || task.completedBy) && (
                            <div className="bg-indigo-50 p-4 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Completion Details
                                </label>
                                {task.completionComment && (
                                    <p className="text-gray-900 mb-2">{task.completionComment}</p>
                                )}
                                {task.completedBy && (
                                    <p className="text-sm text-gray-600">
                                        Completed by: {completedByName}
                                        <span className="text-xs text-gray-500">
                                            {" "}
                                            ({task.completedByType === "client"
                                                ? "Client"
                                                : "Resource"})
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Archived Warning */}
                        {task.archived && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-gray-700">
                                    ⚠️ This task is archived
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                        <Button onClick={onClose} variant="secondary" type="button">
                            Close
                        </Button>
                        <Button onClick={onEdit} variant="primary" type="button">
                            Edit Task
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskViewModal;
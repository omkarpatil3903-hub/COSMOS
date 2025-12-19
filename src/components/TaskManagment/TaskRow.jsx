// src/components/TaskManagment/TaskRow.jsx
import React from "react";
import {
    FaCheckCircle,
    FaRegCircle,
    FaFlag,
    FaRegCalendarAlt,
    FaUserCircle,
    FaRegComment,
    FaSpinner,
    FaClipboardList,
    FaEdit,
    FaTrash,
    FaBell,
    FaUserFriends,
    FaUpload,
    FaCheck,
} from "react-icons/fa";
import { MdReplayCircleFilled } from "react-icons/md";
import { getPriorityBadge, getStatusBadge } from "../../utils/colorMaps";
import { formatDate } from "../../utils/formatDate";

const TaskRow = ({
    task,
    assigneesResolved,
    onToggleSelect,
    onView,
    isSelected,
    onEdit,
    onDelete,
    onSetReminder,
    onUpload,
    onStatusChange,
    showActions = true,
}) => {
    return (
        <div
            onClick={() => onView(task)}
            className={`group grid ${showActions
                ? "grid-cols-[30px_1fr_180px_100px_100px_80px_110px_80px]"
                : "grid-cols-[30px_1fr_180px_100px_100px_80px_110px]"
                } items-center gap-4 border-b border-gray-100 [.dark_&]:border-white/10 py-3 px-4 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors cursor-pointer text-sm ${isSelected ? "bg-indigo-50 [.dark_&]:bg-indigo-900/20" : ""
                }`}
        >
            {/* Col 1: Selection Checkbox */}
            <div onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(task.id)}
                    className="cursor-pointer accent-indigo-600"
                />
            </div>

            {/* Col 2: Title */}
            <div className="min-w-0">
                <span className="font-medium text-gray-800 [.dark_&]:text-white truncate block group-hover:text-indigo-600 [.dark_&]:group-hover:text-indigo-400">
                    {task.title || "Untitled Task"}
                </span>
            </div>

            {/* Col 3: Assignees (Avatars + Names) */}
            <div className="flex items-center gap-2">
                {assigneesResolved && assigneesResolved.length > 0 ? (
                    <>
                        <div className="flex -space-x-2">
                            {assigneesResolved.slice(0, 3).map((u, i) => (
                                <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 border border-white [.dark_&]:border-transparent flex items-center justify-center text-[10px] text-indigo-700 [.dark_&]:text-indigo-300 font-bold uppercase"
                                    title={u?.name || "Unknown"}
                                >
                                    {u?.name ? u.name[0] : "?"}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col min-w-0">
                            {assigneesResolved.slice(0, 2).map((u, i) => (
                                <span
                                    key={i}
                                    className="text-xs text-gray-600 [.dark_&]:text-gray-400 truncate"
                                    title={u?.name || "Unknown"}
                                >
                                    {u?.name || "Unknown"}
                                </span>
                            ))}
                            {assigneesResolved.length > 2 && (
                                <span className="text-xs text-gray-400">
                                    +{assigneesResolved.length - 2} more
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <FaUserCircle className="text-gray-300 text-xl" />
                )}
            </div>

            {/* Col 4: Assigned Date */}
            <div className="flex items-center gap-2 text-gray-500 [.dark_&]:text-gray-500">
                {task.assignedDate ? (
                    <>
                        <FaRegCalendarAlt className="text-gray-400 [.dark_&]:text-gray-500" />
                        <span className="text-xs [.dark_&]:text-gray-400">
                            {formatDate(
                                task.assignedDate?.toDate
                                    ? task.assignedDate.toDate().toISOString().slice(0, 10)
                                    : task.assignedDate
                            )}
                        </span>
                    </>
                ) : (
                    <span className="text-gray-300 text-xs">-</span>
                )}
            </div>

            {/* Col 5: Due Date */}
            <div className="flex items-center gap-2 text-gray-500">
                {task.dueDate ? (
                    <>
                        {/* LOGIC: If recurring, show Loop. If not, show Calendar. NEVER show both. */}
                        {task.isRecurring ? (
                            <MdReplayCircleFilled
                                className="text-indigo-500 shrink-0 text-sm"
                                title={`Recurring: ${task.recurringPattern || "Daily"}`}
                            />
                        ) : (
                            <FaRegCalendarAlt className="text-gray-400 [.dark_&]:text-gray-500 shrink-0 text-xs" />
                        )}
                        {/* Date Text */}
                        <span
                            className={
                                (task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate)) < new Date() && task.status !== "Done"
                                    ? "text-red-500 [.dark_&]:text-red-400 font-medium text-xs"
                                    : "text-xs [.dark_&]:text-gray-400"
                            }
                        >
                            {formatDate(
                                task.dueDate?.toDate
                                    ? task.dueDate.toDate().toISOString().slice(0, 10)
                                    : task.dueDate
                            )}
                        </span>
                    </>
                ) : (
                    <span className="text-gray-300 [.dark_&]:text-gray-600 text-xs"></span>
                )}
            </div>

            {/* Col 6: Priority */}
            <div className="flex justify-center">
                <span
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${getPriorityBadge(
                        task.priority
                    )}`}
                    title={task.priority}
                >
                    <FaFlag className="text-[10px]" />
                    {task.priority}
                </span>
            </div>

            {/* Col 7: Status Badge */}
            <div>
                <span
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(
                        task.status
                    )}`}
                >
                    {task.status === "Done" ? (
                        <FaCheckCircle />
                    ) : task.status === "In Progress" ? (
                        <FaSpinner className="animate-spin" />
                    ) : (
                        <FaClipboardList />
                    )}
                    {task.status}
                    {task.isDerivedStatus && (
                        <FaUserFriends className="text-[10px] opacity-70" title="Status derived from assignees" />
                    )}
                </span>
            </div>

            {/* Col 8: Actions */}
            {showActions && (
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onStatusChange && task.status !== "Done" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, "Done");
                            }}
                            className="p-1.5 text-gray-400 [.dark_&]:text-gray-500 hover:text-green-600 [.dark_&]:hover:text-green-400 hover:bg-green-50 [.dark_&]:hover:bg-green-900/20 rounded-md transition-colors"
                            title="Mark as Done"
                        >
                            <FaCheck />
                        </button>
                    )}
                    {onUpload && (
                        <div className="relative group">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpload(task);
                                }}
                                className="p-1.5 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center justify-center w-8 h-8"
                                aria-label="Upload Document"
                                onMouseEnter={(e) => {
                                    const tooltip = e.currentTarget.nextElementSibling;
                                    tooltip.classList.remove('invisible', 'opacity-0');
                                    tooltip.classList.add('opacity-100');

                                    // Clear any existing timeout
                                    if (tooltip.timeoutId) {
                                        clearTimeout(tooltip.timeoutId);
                                    }

                                    // Hide after 3 seconds
                                    tooltip.timeoutId = setTimeout(() => {
                                        tooltip.classList.add('opacity-0');
                                        tooltip.classList.remove('opacity-100');
                                    }, 3000);
                                }}
                                onMouseLeave={(e) => {
                                    const tooltip = e.currentTarget.nextElementSibling;
                                    tooltip.classList.add('opacity-0');
                                    tooltip.classList.remove('opacity-100');

                                    // Clear any existing timeout
                                    if (tooltip.timeoutId) {
                                        clearTimeout(tooltip.timeoutId);
                                    }
                                }}
                            >
                                <FaUpload className="text-sm" />
                            </button>
                            <div className="invisible absolute z-50 w-30 left-1/2 transform -translate-x-1/2 -translate-y-full top-0 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 transition-opacity duration-200 shadow-lg">
                                Upload Document
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-t-gray-800 border-l-transparent border-r-transparent"></div>
                            </div>
                        </div>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(task);
                            }}
                            className="p-1.5 text-gray-400 [.dark_&]:text-gray-500 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 rounded-md transition-colors"
                            title="Edit Task"
                        >
                            <FaEdit />
                        </button>
                    )}
                    {onSetReminder && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetReminder(task);
                            }}
                            className="p-1.5 text-gray-400 [.dark_&]:text-gray-500 hover:text-amber-600 [.dark_&]:hover:text-amber-400 hover:bg-amber-50 [.dark_&]:hover:bg-amber-900/20 rounded-md transition-colors"
                            title="Set Reminder"
                        >
                            <FaBell />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task);
                            }}
                            className="p-1.5 text-gray-400 [.dark_&]:text-gray-500 hover:text-red-600 [.dark_&]:hover:text-red-400 hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete Task"
                        >
                            <FaTrash />
                        </button>
                    )}
                </div>
            )}
        </div >
    );
};

export default TaskRow;

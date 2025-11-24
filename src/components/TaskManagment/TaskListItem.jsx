import React from "react";
import {
  FaCheckCircle,
  FaSpinner,
  FaClipboardList,
  FaFlag,
  FaCalendarAlt,
} from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { MdReplayCircleFilled } from "react-icons/md";
import { getPriorityBadge, getStatusBadge } from "../../utils/colorMaps";

const statusIcons = {
  "To-Do": <FaClipboardList />,
  "In Progress": <FaSpinner className="animate-spin" />,
  "Done": <FaCheckCircle />,
};

const TaskListItem = ({
  task,
  project,
  assignee,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onReassign,
  activeUsers,
}) => {
  const isOverdue =
    task.dueDate &&
    task.status !== "Done" &&
    task.dueDate < new Date().toISOString().slice(0, 10);

  // Helper to check if current assignee is active
  const isAssigneeActive =
    task.assigneeId && activeUsers.some((u) => u.id === task.assigneeId);

  // Construct the select value for the reassign dropdown
  const reassignValue = isAssigneeActive
    ? `${task.assigneeType || "user"}:${task.assigneeId}`
    : ":";

  return (
    <div className="rounded-lg border border-subtle p-3 hover:bg-surface-subtle transition-colors">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          title="Select task"
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-content-primary max-w-[260px]">
                <span
                  className="block truncate"
                  title={task.title || "Untitled Task"}
                >
                  {task.title || "Untitled Task"}
                </span>
              </div>
              {task.description && (
                <p
                  className="mt-1 text-sm text-content-secondary line-clamp-2"
                  title={task.description}
                >
                  {task.description}
                </p>
              )}
              {task.status === "Done" && task.completionComment && (
                <p
                  className="mt-1 text-xs italic text-indigo-700 line-clamp-1"
                  title={task.completionComment}
                >
                  💬 {task.completionComment}
                </p>
              )}
            </div>

            {/* Right Side Badges */}
            <div className="flex flex-col items-end gap-1 text-xs text-content-tertiary whitespace-nowrap">
              <div className="flex items-center gap-2">
                {task.priority && (
                  <span
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getPriorityBadge(
                      task.priority
                    )}`}
                  >
                    <FaFlag />
                    <span>{task.priority}</span>
                  </span>
                )}
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getStatusBadge(
                    task.status
                  )}`}
                >
                  {statusIcons[task.status]}
                  <span>{task.status}</span>
                </span>
              </div>

              {/* Dates & Warnings */}
              <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                {task.assignedDate && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-700">
                    <FaCalendarAlt className="text-purple-600" />
                    <span className="font-bold">Assigned:</span>
                    <span>
                      {new Date(task.assignedDate).toLocaleDateString()}
                    </span>
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${task.dueDate &&
                      task.status !== "Done" &&
                      isOverdue
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                    }`}
                >
                  <FaCalendarAlt className="text-current" />
                  <span className="font-bold">Due:</span>
                  <span>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "No due"}
                  </span>
                </span>

                {isOverdue && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                    <IoIosWarning className="text-current" size={14} />
                    Overdue
                  </span>
                )}

                {task.archived && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700">
                    📦 Archived
                  </span>
                )}

                {task.isRecurring && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700">
                    <MdReplayCircleFilled className="text-current" size={15} />
                    Recurring
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Project & Assignee info */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-content-tertiary">
            <div className="min-w-0">
              <span className="font-medium">Project:</span>{" "}
              <span
                className="inline-block max-w-[220px] align-bottom truncate"
                title={project?.name || "—"}
              >
                {project?.name || "—"}
              </span>
            </div>
            <div className="min-w-0">
              <span className="font-medium">Assigned to:</span>{" "}
              <span
                className="inline-block max-w-[260px] align-bottom truncate"
                title={assignee?.name || assignee?.clientName || "Unassigned"}
              >
                {assignee?.name || assignee?.clientName || "Unassigned"}
                {assignee?.clientName && assignee?.companyName
                  ? ` (${assignee.companyName})`
                  : ""}
                {assignee?.role
                  ? ` (${assignee.role})`
                  : assignee?.clientName
                    ? " (Client)"
                    : ""}
              </span>
            </div>
          </div>

          {/* Progress Bar (Only for In Progress) */}
          {task.status === "In Progress" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                Progress:
              </span>
              <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${task.progressPercent || 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                {task.progressPercent || 0}%
              </span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onView(task)}
              className="rounded-md bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
            >
              View
            </button>

            {/* Reassign Dropdown */}
            {(task.assigneeType || "user") !== "client" && (
              <select
                value={reassignValue}
                onChange={(e) => onReassign(task.id, e.target.value)}
                className="rounded-md border border-subtle bg-surface px-2 py-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <option value=":">Reassign...</option>
                <optgroup label="Resources">
                  {activeUsers.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}

            <button
              onClick={() => onEdit(task)}
              className="rounded-md bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 transition hover:bg-yellow-200"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(task)}
              className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskListItem;
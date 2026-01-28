/**
 * TaskListItem Component
 *
 * Purpose: Card-style task item for list view display.
 * Shows comprehensive task info with badges and actions.
 *
 * Responsibilities:
 * - Display task title, description, and completion comment
 * - Show priority and status badges
 * - Display assigned and due dates with overdue warning
 * - Render OKR badges (objective, key results)
 * - Show assignee avatars with names
 * - Display progress bar for In Progress tasks
 * - Provide View/Edit/Delete/Reassign actions
 *
 * Dependencies:
 * - colorMaps (getPriorityBadge, getStatusBadge)
 * - UserAvatar (avatar component)
 * - AuthContext (currentUser for status calculation)
 * - react-icons (status icons, date icons, warning)
 *
 * Props:
 * - task: Task object to display
 * - project: Associated project object
 * - assignee: Primary assignee (legacy)
 * - isSelected: Checkbox state
 * - onToggleSelect: Selection toggle
 * - onView/onEdit/onDelete/onReassign: Action callbacks
 * - activeUsers: Users for reassign dropdown
 *
 * Status Calculation:
 * - Uses personalized assigneeStatus if current user is assignee
 * - Falls back to global task.status otherwise
 *
 * Visual Indicators:
 * - Red badge for overdue tasks
 * - Gray badge for archived tasks
 * - Purple badge for recurring tasks
 * - Progress bar shows progressPercent
 *
 * Last Modified: 2026-01-10
 */

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
import UserAvatar from "./UserAvatar";

import { useAuthContext } from "../../context/AuthContext";
import { useThemeStyles } from "../../hooks/useThemeStyles";

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
  const { user: currentUser } = useAuthContext();
  const { barColor, selectedTextClass, selectedBgClass } = useThemeStyles();

  // Calculate personalized status
  const displayStatus = (() => {
    if (!currentUser?.uid) return task.status;
    const isAssignee = task.assigneeIds?.includes(currentUser.uid);
    if (isAssignee && task.assigneeStatus?.[currentUser.uid]) {
      return task.assigneeStatus[currentUser.uid].status || "To-Do";
    }
    return task.status;
  })();

  const isOverdue =
    task.dueDate &&
    displayStatus !== "Done" &&
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
              {displayStatus === "Done" && task.completionComment && (
                <p
                  className={`mt-1 text-xs italic ${selectedTextClass} line-clamp-1`}
                  title={task.completionComment}
                >
                  💬 {task.completionComment}
                </p>
              )}

              {/* OKR Badges */}
              {(task.okrObjective ||
                (task.okrObjectiveIndex !== undefined &&
                  task.okrObjectiveIndex !== null)) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {task.okrObjective && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                        title={`Objective: ${task.okrObjective}`}
                      >
                        🎯{" "}
                        <span className="truncate max-w-[220px]">
                          {task.okrObjective}
                        </span>
                      </span>
                    )}
                    {Array.isArray(task.okrKeyResults) &&
                      task.okrKeyResults.length > 0 &&
                      task.okrKeyResults.map((kr, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-md bg-teal-100 px-2 py-1 text-[10px] font-semibold text-teal-700"
                          title={`KR: ${kr}`}
                        >
                          ✅ <span className="truncate max-w-[200px]">{kr}</span>
                        </span>
                      ))}
                  </div>
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
                    displayStatus
                  )}`}
                >
                  {statusIcons[displayStatus]}
                  <span>{displayStatus}</span>
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
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${task.dueDate && displayStatus !== "Done" && isOverdue
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
              {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                <span className="inline-flex flex-wrap gap-2 align-bottom">
                  {(assigneesResolved || task.assignees).map((a, idx) => {
                    const label = a?.name || a?.id || "Unknown";
                    const meta = a?.company
                      ? ` (${a.company})`
                      : a?.role
                        ? ` (${a.role})`
                        : "";
                    const titleText = a?.name
                      ? `${a.name}${a.company ? ` • ${a.company}` : ""}${a.role ? ` • ${a.role}` : ""
                      }`
                      : `${a?.type || "user"}:${a?.id || "unknown"}`;
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700"
                        title={titleText}
                      >
                        <UserAvatar user={a} size="xs" />
                        {label}
                        {meta}
                      </span>
                    );
                  })}
                </span>
              ) : (
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
              )}
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
                  className={`${barColor} h-2 rounded-full transition-all`}
                  style={{ width: `${task.progressPercent || 0}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${selectedTextClass} whitespace-nowrap`}>
                {task.progressPercent || 0}%
              </span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onView(task)}
              className={`rounded-md ${selectedBgClass} px-3 py-1 text-xs font-medium ${selectedTextClass} transition hover:opacity-80`}
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

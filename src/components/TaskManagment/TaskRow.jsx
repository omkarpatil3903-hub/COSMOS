// src/components/TaskManagment/TaskRow.jsx
import React from "react";
import {
  FaCheckCircle,
  FaRegCircle,
  FaFlag,
  FaRegCalendarAlt,
  FaUserCircle,
  FaRegComment,
} from "react-icons/fa";

const TaskRow = ({
  task,
  assigneesResolved,
  onToggleSelect,
  onView,
  isSelected,
}) => {
  // 1. Helpers for colors
  const getPriorityColor = (p) => {
    switch (p) {
      case "High":
        return "text-red-500";
      case "Medium":
        return "text-yellow-500";
      case "Low":
        return "text-blue-400";
      default:
        return "text-gray-300";
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "In Progress":
        return "bg-blue-100 text-blue-700";
      case "Done":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div
      onClick={() => onView(task)}
      className={`group grid grid-cols-[30px_1fr_120px_120px_80px_110px_60px] items-center gap-4 border-b border-gray-100 py-3 px-4 hover:bg-gray-50 transition-colors cursor-pointer text-sm ${
        isSelected ? "bg-indigo-50" : ""
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
        <span className="font-medium text-gray-800 truncate block group-hover:text-indigo-600">
          {task.title || "Untitled Task"}
        </span>
      </div>

      {/* Col 3: Assignees (Avatars) */}
      <div className="flex items-center">
        {assigneesResolved && assigneesResolved.length > 0 ? (
          <div className="flex -space-x-2">
            {assigneesResolved.slice(0, 3).map((u, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[10px] text-indigo-700 font-bold uppercase"
                title={u.name}
              >
                {u.name ? u.name[0] : "?"}
              </div>
            ))}
            {assigneesResolved.length > 3 && (
              <span className="text-xs text-gray-400 pl-3">
                +{assigneesResolved.length - 3}
              </span>
            )}
          </div>
        ) : (
          <FaUserCircle className="text-gray-300 text-xl" />
        )}
      </div>

      {/* Col 4: Due Date */}
      <div className="flex items-center gap-2 text-gray-500">
        {task.dueDate ? (
          <>
            <FaRegCalendarAlt className="text-gray-400" />
            <span
              className={
                new Date(task.dueDate) < new Date() && task.status !== "Done"
                  ? "text-red-500 font-medium"
                  : ""
              }
            >
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </>
        ) : (
          <span className="text-gray-300 text-xs">-</span>
        )}
      </div>

      {/* Col 5: Priority */}
      <div className="flex justify-center">
        <FaFlag
          className={getPriorityColor(task.priority)}
          title={task.priority}
        />
      </div>

      {/* Col 6: Status Badge */}
      <div>
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
            task.status
          )}`}
        >
          {task.status}
        </span>
      </div>

      {/* Col 7: Comments/Meta */}
      <div className="text-center text-gray-400">
        {task.completionComment ? (
          <FaRegComment
            title="Has completion comment"
            className="text-indigo-400"
          />
        ) : (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-300">
            View
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskRow;

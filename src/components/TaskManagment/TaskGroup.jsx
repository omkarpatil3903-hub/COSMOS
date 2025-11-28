// src/components/TaskManagment/TaskGroup.jsx
import React, { useState } from "react";
import {
  FaCaretDown,
  FaCaretRight,
  FaPlus,
  // New Header Icons
  FaTasks,
  FaUserFriends,
  FaRegCalendarPlus, // For Assigned Date
  FaRegCalendarAlt, // For Due Date
  FaFlag,
  FaClipboardList, // For Status
} from "react-icons/fa";
import TaskRow from "./TaskRow";

const TaskGroup = ({
  title,
  tasks,
  colorClass,
  onOpenCreate,
  selectedIds,
  onToggleSelect,
  onView,
  resolveAssignees,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Group Header (Collapsible) */}
      <div
        className="flex items-center gap-2 mb-2 cursor-pointer select-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-gray-400 text-xs">
          {isOpen ? <FaCaretDown /> : <FaCaretRight />}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${colorClass}`}
        >
          {title}
        </span>
        <span className="text-gray-400 text-sm font-medium ml-2">
          {tasks.length}
        </span>
      </div>

      {/* List Body */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* --- UPDATED COLUMN HEADERS WITH ICONS --- */}
          <div
            className={`grid ${showActions
              ? "grid-cols-[30px_1fr_180px_100px_100px_80px_110px_80px]"
              : "grid-cols-[30px_1fr_180px_100px_100px_80px_110px]"
              } gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider`}
          >
            {/* 1. Checkbox Spacer */}
            <div></div>

            {/* 2. Task Name */}
            <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaTasks className="text-gray-400" />
              <span>Task Name</span>
            </div>

            {/* 3. Assignees */}
            <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaUserFriends className="text-gray-400" />
              <span>Assignees</span>
            </div>

            {/* 4. Assigned Date */}
            <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaRegCalendarPlus className="text-gray-400" />
              <span>Assigned</span>
            </div>

            {/* 5. Due Date */}
            <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaRegCalendarAlt className="text-gray-400" />
              <span>Due Date</span>
            </div>

            {/* 6. Priority (Centered) */}
            <div className="flex items-center justify-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaFlag className="text-gray-400" />
              <span>Priority</span>
            </div>

            {/* 7. Status */}
            <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
              <FaClipboardList className="text-gray-400" />
              <span>Status</span>
            </div>

            {/* 8. Actions (Centered) */}
            {showActions && (
              <div className="flex items-center justify-center text-gray-400">
                <span>Actions</span>
              </div>
            )}
          </div>

          {/* Rows */}
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              assigneesResolved={resolveAssignees(task)}
              isSelected={selectedIds.has(task.id)}
              onToggleSelect={onToggleSelect}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              showActions={showActions}
            />
          ))}

          {/* Quick Add Button */}
          <div
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-10 py-2 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors border-t border-gray-50"
          >
            <FaPlus className="text-xs" />
            <span>New Task</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskGroup;

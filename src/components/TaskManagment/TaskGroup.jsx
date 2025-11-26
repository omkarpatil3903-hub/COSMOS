// src/components/TaskManagment/TaskGroup.jsx
import React, { useState } from "react";
import { FaCaretDown, FaCaretRight, FaPlus } from "react-icons/fa";
import TaskRow from "./TaskRow";

const TaskGroup = ({
  title,
  tasks,
  colorClass,
  onOpenCreate,
  // Props to pass down to TaskRow
  selectedIds,
  onToggleSelect,
  onView,
  resolveAssignees, // Function passed from parent
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (tasks.length === 0) return null; // Don't show empty groups if you prefer

  return (
    <div className="mb-6">
      {/* Header */}
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
          {/* Optional: Column Headers (Only show once or per group) */}
          <div className="grid grid-cols-[30px_1fr_120px_120px_80px_110px_60px] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <div></div>
            <div>Task Name</div>
            <div>Assignees</div>
            <div>Due Date</div>
            <div className="text-center">Priority</div>
            <div>Status</div>
            <div className="text-center">Info</div>
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
            />
          ))}

          {/* Quick Add Button at bottom of group */}
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

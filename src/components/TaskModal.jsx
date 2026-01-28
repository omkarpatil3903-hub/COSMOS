/**
 * TaskModal Component
 *
 * Purpose: Modal for creating and editing tasks with comprehensive features.
 * Three-column layout with recurring task support, OKR linking, subtasks.
 *
 * Responsibilities:
 * - Task creation with title, description, project, priority, status
 * - Assignee selection (resource or client, multi-select for resources)
 * - Date management (assigned date, due date)
 * - Recurring task configuration (pattern, interval, end conditions)
 * - OKR linking (objective and key results from project)
 * - Subtask management with quick-add (due date, assignee, priority)
 * - Edit mode with change detection
 * - Series update prompt for recurring tasks
 *
 * Dependencies:
 * - Button, VoiceInput components
 * - validateTaskForm from formBuilders
 * - calculateNextDueDate from recurringTasks
 * - useTheme for accent styling
 * - react-hot-toast for notifications
 * - react-icons (MdReplayCircleFilled, FaTimes, etc.)
 *
 * Props:
 * - onClose: Close handler
 * - onSave: Save handler (receives task payload)
 * - taskToEdit: Task object for edit mode (or { status } for new)
 * - projects: Array of available projects
 * - assignees: Array of resource users
 * - clients: Array of client users
 * - statuses: Array of status options
 *
 * Form Layout:
 * - Column 1: Details & Classification (title, description, project, priority, status)
 * - Column 2: Assignment & Schedule (assignee type, assignees, dates)
 * - Column 3: Advanced & Subtasks (weightage, recurring, OKRs, subtasks)
 *
 * Recurring Patterns:
 * - daily: Every N days
 * - weekly: Every N weeks (with optional day selection)
 * - monthly: Every N months (same day of month)
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useEffect, useMemo } from "react";
import Button from "./Button";
import toast from "react-hot-toast";
import VoiceInput from "./Common/VoiceInput";
import { validateTaskForm } from "../utils/formBuilders";
import { MdReplayCircleFilled } from "react-icons/md";
import { FaTimes, FaRegCalendarAlt, FaArrowRight } from "react-icons/fa";
import { calculateNextDueDate } from "../utils/recurringTasks";
import { useTheme } from "../context/ThemeContext";

// Inline simple searchable multi-select component
// Inline simple searchable multi-select component
function SearchMultiSelect({ items, selected, onChange, placeholder, disabledIds = [] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      items.filter((i) => (i.label || "").toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  const toggle = (id) => {
    if (disabledIds.includes(id)) return; // Prevent toggling disabled items
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  return (
    <div className="mt-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="block w-full rounded-md border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] px-3 py-2 text-sm text-content-primary [.dark_&]:text-white"
      />
      <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A]">
        {filtered.map((i) => {
          const isDisabled = disabledIds.includes(i.id);
          return (
            <label
              key={i.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 [.dark_&]:hover:bg-white/5'} text-gray-700 [.dark_&]:text-white`}
            >
              <input
                type="checkbox"
                checked={selected.includes(i.id)}
                onChange={() => toggle(i.id)}
                disabled={isDisabled}
                className="rounded border-subtle"
              />
              <span>{i.label}</span>
              {isDisabled && <span className="ml-auto text-[10px] italic">(Locked)</span>}
            </label>
          )
        })}
        {!filtered.length && (
          <div className="px-3 py-2 text-xs text-content-tertiary">
            No matches
          </div>
        )}
      </div>
    </div>
  );
}

function TaskModal({
  onClose,
  onSave,
  taskToEdit,
  projects = [],
  assignees = [],
  clients = [],
  statuses = [],
  isManager = false, // New prop to identify manager role
}) {
  const { accent } = useTheme();

  // Calculate disabled assignee IDs (prevent removing existing assignees for managers)
  const disabledAssigneeIds = useMemo(() => {
    if (isManager && taskToEdit && taskToEdit.id) {
      // If editing an existing task as a manager, lock existing assignees
      // Check both 'assignees' array and legacy 'assigneeId'
      const existing = [];
      if (Array.isArray(taskToEdit.assignees)) {
        // Handle both strings and objects (extract .id if object)
        taskToEdit.assignees.forEach(a => {
          if (typeof a === 'object' && a?.id) existing.push(a.id);
          else if (typeof a === 'string') existing.push(a);
        });
      } else if (taskToEdit.assigneeId) {
        existing.push(taskToEdit.assigneeId);
      }
      return existing;
    }
    return [];
  }, [isManager, taskToEdit]);

  // Helper to get theme-specific styles -- (keep existing code)
  const getThemeStyles = () => {
    const styles = {
      purple: { button: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500', iconBg: 'bg-purple-50', iconText: 'text-purple-600' },
      blue: { button: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500', iconBg: 'bg-sky-50', iconText: 'text-sky-600' },
      pink: { button: 'bg-pink-600 hover:bg-pink-700 focus-visible:ring-pink-500', iconBg: 'bg-pink-50', iconText: 'text-pink-600' },
      violet: { button: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
      orange: { button: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
      teal: { button: 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
      bronze: { button: 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-600', iconBg: 'bg-amber-50', iconText: 'text-amber-700' },
      mint: { button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
      black: { button: 'bg-gray-800 hover:bg-gray-900 focus-visible:ring-gray-600', iconBg: 'bg-gray-100', iconText: 'text-gray-800' },
      indigo: { button: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
    };
    return styles[accent] || styles.indigo;
  };

  const themeStyles = getThemeStyles();

  const isEdit = !!(taskToEdit && taskToEdit.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState(
    taskToEdit?.status || (Array.isArray(statuses) && statuses[0]) || ""
  );
  const [weightage, setWeightage] = useState("");

  const [assigneeType, setAssigneeType] = useState("user"); // 'user' | 'client'
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneesSelected, setAssigneesSelected] = useState([]); // [{type,id}]

  const [assignedDate, setAssignedDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Recurring task state
  const [taskType, setTaskType] = useState("one-time");
  const isRecurring = taskType === "recurring";
  const [recurringPattern, setRecurringPattern] = useState("daily");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndType, setRecurringEndType] = useState("never");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringEndAfter, setRecurringEndAfter] = useState("");
  const [selectedWeekDays, setSelectedWeekDays] = useState([
    0, 1, 2, 3, 4, 5, 6,
  ]); // All days default
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [previewDates, setPreviewDates] = useState([]);

  // OKR state
  const [okrObjectiveIndex, setOkrObjectiveIndex] = useState(null);
  const [okrKeyResultIndices, setOkrKeyResultIndices] = useState([]);

  // Subtasks state
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);

  // Quick add subtask fields
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState(null);
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState(null);
  const [newSubtaskPriority, setNewSubtaskPriority] = useState("Medium");
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [showQuickAssigneePicker, setShowQuickAssigneePicker] = useState(false);
  const [showQuickPriorityPicker, setShowQuickPriorityPicker] = useState(false);

  const [errors, setErrors] = useState({});
  const [showSeriesPrompt, setShowSeriesPrompt] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Clear recurring fields when switching to one-time
  useEffect(() => {
    if (!isRecurring) {
      setRecurringEndType("never");
      setRecurringEndDate("");
      setRecurringEndAfter("");
      setPreviewDates([]);
    }
  }, [isRecurring]);

  useEffect(() => {
    if (!isEdit && !taskToEdit?.status && Array.isArray(statuses) && statuses.length && !status) {
      setStatus(statuses[0]);
    }
  }, [statuses, isEdit, taskToEdit, status]);

  // Generate preview dates for recurring tasks
  useEffect(() => {
    if (!isRecurring || !dueDate) {
      setPreviewDates([]);
      return;
    }

    const out = [];
    try {
      const start = new Date(dueDate);
      let count = 0;
      let current = new Date(start);
      // Start from next day for preview
      current.setDate(current.getDate() + 1);

      while (out.length < 5 && count < 365) {
        // Limit iterations to prevent infinite loop
        const d = new Date(current);
        let include = false;

        // Check if day is allowed
        const isAllowedDay =
          !isCustomDays || selectedWeekDays.includes(d.getDay());

        if (isAllowedDay) {
          if (recurringPattern === "daily") {
            // Daily: Every N days
            // Check interval from start date
            const diffTime = Math.abs(d - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays % recurringInterval === 0) {
              include = true;
            }
          } else if (recurringPattern === "weekly") {
            // Weekly: Every N weeks
            const diffTime = Math.abs(d - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7);
            if (weekNum % recurringInterval === 0) {
              include = true;
            }
          } else if (recurringPattern === "monthly") {
            if (d.getDate() === start.getDate()) {
              const monthDiff =
                (d.getFullYear() - start.getFullYear()) * 12 +
                (d.getMonth() - start.getMonth());
              if (monthDiff > 0 && monthDiff % recurringInterval === 0)
                include = true;
            }
          }
        }

        if (include) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          out.push(`${yyyy}-${mm}-${dd}`);
        }

        // Advance one day
        current.setDate(current.getDate() + 1);
        count++;
      }
    } catch {
      // Ignore date parsing errors
    }
    setPreviewDates(out);
  }, [
    isRecurring,
    dueDate,
    recurringPattern,
    recurringInterval,
    selectedWeekDays,
    isCustomDays,
  ]);

  // Initialize form when editing or when status is provided for new task
  useEffect(() => {
    if (taskToEdit) {
      // Always set status from taskToEdit if it exists (for both new and edit)
      if (taskToEdit.status) {
        setStatus(taskToEdit.status);
      }
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setProjectId(taskToEdit.projectId || "");
      setPriority(taskToEdit.priority || "Medium");
      setWeightage(String(taskToEdit.weightage || ""));

      setAssigneeType(taskToEdit.assigneeType || "user");
      setAssigneeId(taskToEdit.assigneeId || "");
      setAssigneesSelected(
        Array.isArray(taskToEdit.assignees) ? taskToEdit.assignees : []
      );

      setAssignedDate(taskToEdit.assignedDate || "");
      setDueDate(taskToEdit.dueDate || "");

      if (taskToEdit.taskType === "recurring") {
        setTaskType("recurring");
      }
      setRecurringPattern(taskToEdit.recurringPattern || "daily");
      setRecurringInterval(taskToEdit.recurringInterval || 1);
      setRecurringEndType(taskToEdit.recurringEndType || "never");
      setRecurringEndDate(taskToEdit.recurringEndDate || "");
      setRecurringEndAfter(String(taskToEdit.recurringEndAfter || ""));

      // Map legacy skipWeekends to selectedWeekDays if needed
      if (taskToEdit.selectedWeekDays) {
        setSelectedWeekDays(taskToEdit.selectedWeekDays);
        setIsCustomDays(true);
      } else if (taskToEdit.skipWeekends) {
        setSelectedWeekDays([1, 2, 3, 4, 5]);
        setIsCustomDays(true);
      } else {
        setSelectedWeekDays([0, 1, 2, 3, 4, 5, 6]);
        setIsCustomDays(false);
      }

      setOkrObjectiveIndex(
        typeof taskToEdit.okrObjectiveIndex === "number"
          ? taskToEdit.okrObjectiveIndex
          : null
      );
      setOkrKeyResultIndices(
        Array.isArray(taskToEdit.okrKeyResultIndices)
          ? taskToEdit.okrKeyResultIndices
          : []
      );

      setSubtasks(
        Array.isArray(taskToEdit.subtasks) ? taskToEdit.subtasks : []
      );
    }
  }, [taskToEdit]);

  // Detect changes for edit mode
  const hasChanges = useMemo(() => {
    if (!isEdit) return true;

    const normalize = (v) => v ?? "";
    const fields = [
      normalize(title) === normalize(taskToEdit.title),
      normalize(description) === normalize(taskToEdit.description),
      normalize(projectId) === normalize(taskToEdit.projectId),
      normalize(priority) === normalize(taskToEdit.priority),
      normalize(status) === normalize(taskToEdit.status),
      String(weightage || "") === String(taskToEdit.weightage || ""),
      normalize(assigneeType) === normalize(taskToEdit.assigneeType),
      normalize(assigneeId) === normalize(taskToEdit.assigneeId),
      JSON.stringify(assigneesSelected) ===
      JSON.stringify(taskToEdit.assignees || []),
      normalize(assignedDate) === normalize(taskToEdit.assignedDate),
      normalize(dueDate) === normalize(taskToEdit.dueDate),
      (taskToEdit.taskType || "one-time") === taskType,
      normalize(recurringPattern) === normalize(taskToEdit.recurringPattern),
      Number(recurringInterval || 1) ===
      Number(taskToEdit.recurringInterval || 1),
      normalize(recurringEndType) === normalize(taskToEdit.recurringEndType),
      normalize(recurringEndDate) === normalize(taskToEdit.recurringEndDate),
      String(recurringEndAfter || "") ===
      String(taskToEdit.recurringEndAfter || ""),
      JSON.stringify(selectedWeekDays) ===
      JSON.stringify(taskToEdit.selectedWeekDays || [0, 1, 2, 3, 4, 5, 6]),
      (typeof okrObjectiveIndex === "number" ? okrObjectiveIndex : null) ===
      (typeof taskToEdit.okrObjectiveIndex === "number"
        ? taskToEdit.okrObjectiveIndex
        : null),
      JSON.stringify(okrKeyResultIndices) ===
      JSON.stringify(taskToEdit.okrKeyResultIndices || []),
      JSON.stringify(subtasks) === JSON.stringify(taskToEdit.subtasks || []),
    ];
    return !fields.every(Boolean);
  }, [
    title,
    description,
    projectId,
    priority,
    status,
    weightage,
    assigneeType,
    assigneeId,
    assigneesSelected,
    assignedDate,
    dueDate,
    taskType,
    recurringPattern,
    recurringInterval,
    recurringEndType,
    recurringEndDate,
    recurringEndAfter,
    selectedWeekDays,
    okrObjectiveIndex,
    okrKeyResultIndices,
    subtasks,
    taskToEdit,
    isEdit,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    const validation = validateTaskForm({
      title,
      projectId,
      assignedDate,
      dueDate,

      assigneeId:
        assigneeType === "client" ? assigneeId : assigneesSelected[0]?.id || "",
    });

    if (!validation.isValid) {
      setErrors(validation.errors || {});
      return;
    }

    // Check for required project field
    if (!projectId || !projectId.trim()) {
      toast.error("Project is required");
      return;
    }

    // Build assigneeIds array for employee queries
    const assigneeIds = assigneesSelected
      .filter((a) => a.type === "user")
      .map((a) => a.id);

    const payload = {
      id: taskToEdit?.id,
      title,
      description,
      projectId,
      priority,
      status,
      weightage: weightage ? Number(weightage) : undefined,
      assigneeType,
      assigneeId, // Legacy single assignee
      assignees: assigneesSelected, // New multi-assignee array
      assigneeIds, // Array of user IDs for queries
      assignedDate,
      dueDate,
      taskType,
      isRecurring, // Critical fix: Ensure this boolean is passed
      recurringPattern: isRecurring ? recurringPattern : undefined,
      recurringInterval: isRecurring ? Number(recurringInterval) : undefined,
      recurringEndType: isRecurring ? recurringEndType : undefined,
      recurringEndDate:
        isRecurring && recurringEndType === "date"
          ? recurringEndDate
          : undefined,
      recurringEndAfter:
        isRecurring && recurringEndType === "after"
          ? Number(recurringEndAfter)
          : undefined,
      selectedWeekDays:
        isRecurring && isCustomDays ? selectedWeekDays : undefined,
      okrObjectiveIndex:
        typeof okrObjectiveIndex === "number" ? okrObjectiveIndex : undefined,
      okrKeyResultIndices: okrKeyResultIndices,
      subtasks,
    };

    // Check if we need to ask about series update
    // Only if editing an existing task that is part of a series
    const isSeries = taskToEdit && (taskToEdit.isRecurring || taskToEdit.parentRecurringTaskId);

    if (isSeries && !payload.updateSeries && !payload.updateOccurrence) {
      setPendingPayload(payload);
      setShowSeriesPrompt(true);
      return;
    }

    onSave(payload);
    onClose();
  };

  const handleSeriesChoice = (updateSeries) => {
    if (!pendingPayload) return;
    const finalPayload = { ...pendingPayload, updateSeries };
    onSave(finalPayload);
    setShowSeriesPrompt(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] flex flex-col bg-white/95 [.dark_&]:bg-[#181B2A]/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden border border-white/20 [.dark_&]:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean Style */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-100/50 [.dark_&]:border-white/10 bg-white/80 [.dark_&]:bg-[#181B2A]/80 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isEdit
                ? `${themeStyles.iconBg} ${themeStyles.iconText}`
                : "bg-gray-100 text-gray-500"
                }`}
            >
              <MdReplayCircleFilled className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 [.dark_&]:text-white tracking-tight">
                {isEdit ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {isEdit
                  ? "Update task details"
                  : "Add a new task to project"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="p-6 lg:p-8 space-y-8"
          >
            {/* 3-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1: Details & Classification */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                  Details & Classification
                </h3>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Task Title
                  </label>
                  <VoiceInput
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title)
                        setErrors((prev) => ({ ...prev, title: "" }));
                    }}
                    placeholder="Enter task title..."
                    className={`block w-full rounded-xl border-0 bg-gray-50 [.dark_&]:bg-white/5 px-4 py-3 text-sm font-semibold text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all ${errors.title
                      ? "ring-red-300 focus:ring-red-500 bg-red-50"
                      : ""
                      }`}
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <FaTimes className="text-[10px]" /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Description
                  </label>
                  <VoiceInput
                    as="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Add a detailed description..."
                    className="block w-full rounded-xl border-0 bg-gray-50 [.dark_&]:bg-white/5 px-4 py-3 text-sm text-gray-700 [.dark_&]:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Project
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        if (errors.projectId)
                          setErrors((prev) => ({ ...prev, projectId: "" }));
                        setOkrObjectiveIndex(null);
                        setOkrKeyResultIndices([]);
                      }}
                      className={`block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 ${errors.projectId ? "ring-red-300 bg-red-50" : ""
                        }`}
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.projectId && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.projectId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                      >
                        {statuses
                          .filter((s) => s !== "Done")
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </select>

                      {/* Separate Done control */}
                      {statuses.includes("Done") && (
                        <button
                          type="button"
                          onClick={() => setStatus("Done")}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap ${status === "Done"
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 opacity-70 hover:opacity-100 cursor-pointer [.dark_&]:bg-emerald-900/30 [.dark_&]:text-emerald-400 [.dark_&]:border-emerald-700 [.dark_&]:hover:bg-emerald-900/50"
                            }`}
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Assignment & Schedule */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                  Assignment & Schedule
                </h3>

                <div className="space-y-4">
                  {/* Assignee Type Toggle */}
                  {!isManager && (
                    <div className="flex bg-gray-100 [.dark_&]:bg-white/5 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAssigneeType("user");
                          setAssigneesSelected([]);
                          setAssigneeId("");
                        }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assigneeType === "user"
                          ? "bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white shadow-sm"
                          : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-gray-200"
                          }`}
                      >
                        Resource
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigneeType("client");
                          setAssigneesSelected([]);
                          setAssigneeId("");
                        }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assigneeType === "client"
                          ? "bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white shadow-sm"
                          : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-gray-200"
                          }`}
                      >
                        Client
                      </button>
                    </div>
                  )}

                  {/* Assignee Selector */}
                  <div>
                    {assigneeType === "user" ? (
                      <div>
                        {!projectId ? (
                          <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-md text-center">
                            Select a project to view team members
                          </div>
                        ) : (
                          <SearchMultiSelect
                            items={assignees
                              .filter(u => {
                                if (projectId) {
                                  const proj = projects.find(p => p.id === projectId);
                                  // Check if user is in the project's assigneeIds
                                  return proj?.assigneeIds?.includes(u.id);
                                }
                                return true;
                              })
                              .map((u) => ({
                                id: u.id,
                                label: u.name,
                              }))}
                            selected={assigneesSelected
                              .filter((a) => a.type === "user")
                              .map((a) => a.id)}
                            onChange={(ids) => {
                              const others = assigneesSelected.filter(
                                (a) => a.type !== "user"
                              );
                              const nextSame = ids.map((id) => ({
                                type: "user",
                                id,
                              }));
                              const next = [...nextSame, ...others];
                              setAssigneesSelected(next);
                              setAssigneeId(nextSame[0]?.id || "");
                              if (errors.assigneeId)
                                setErrors((p) => ({ ...p, assigneeId: "" }));
                            }}
                            placeholder="Select team members..."
                            disabledIds={disabledAssigneeIds}
                          />
                        )}
                      </div>
                    ) : (
                      <select
                        value={assigneeId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setAssigneeId(id);
                          setAssigneesSelected(
                            id ? [{ type: "client", id }] : []
                          );
                          if (errors.assigneeId)
                            setErrors((p) => ({ ...p, assigneeId: "" }));
                        }}
                        className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                      >
                        <option value="">Select Client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.assigneeId && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.assigneeId}
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Assigned Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={assignedDate}
                          onChange={(e) => setAssignedDate(e.target.value)}
                          className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Due Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => {
                            setDueDate(e.target.value);
                            if (errors.dueDate)
                              setErrors((prev) => ({ ...prev, dueDate: "" }));
                          }}
                          className={`block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 ${errors.dueDate ? "ring-red-300 bg-red-50" : ""
                            }`}
                        />
                      </div>
                      {errors.dueDate && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Advanced & Subtasks */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                  Advanced & Subtasks
                </h3>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Weightage (Points)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={weightage}
                    onChange={(e) => setWeightage(e.target.value)}
                    placeholder="e.g. 5"
                    className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                  />
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between bg-gray-50 [.dark_&]:bg-white/5 p-3 rounded-xl border border-gray-100 [.dark_&]:border-white/10">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${isRecurring
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                        }`}
                    >
                      <MdReplayCircleFilled className="text-lg" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 [.dark_&]:text-white">
                        Recurring
                      </h4>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isRecurring}
                      onChange={(e) =>
                        setTaskType(e.target.checked ? "recurring" : "one-time")
                      }
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Recurring Options Panel */}
                {isRecurring && (
                  <div className="p-4 bg-white [.dark_&]:bg-[#1F2234] rounded-xl border border-gray-200 [.dark_&]:border-white/10 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Repeat Every
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={recurringInterval}
                            onChange={(e) =>
                              setRecurringInterval(
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                          />
                          <select
                            value={recurringPattern}
                            onChange={(e) =>
                              setRecurringPattern(e.target.value)
                            }
                            className="flex-1 rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="daily">Day(s)</option>
                            <option value="weekly">Week(s)</option>
                            <option value="monthly">Month(s)</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-span-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-gray-500 [.dark_&]:text-gray-400">
                            Allowed Days
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isCustomDays}
                              onChange={(e) => {
                                setIsCustomDays(e.target.checked);
                                if (!e.target.checked) {
                                  setSelectedWeekDays([0, 1, 2, 3, 4, 5, 6]);
                                }
                              }}
                              className="rounded border-indigo-300 [.dark_&]:border-white/10 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                            />
                            <span className="text-[10px] text-indigo-600 [.dark_&]:text-indigo-400 font-medium">
                              Customize
                            </span>
                          </label>
                        </div>

                        {isCustomDays && (
                          <div className="flex gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {["S", "M", "T", "W", "T", "F", "S"].map(
                              (day, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWeekDays((prev) =>
                                      prev.includes(idx)
                                        ? prev.filter((d) => d !== idx)
                                        : [...prev, idx]
                                    );
                                  }}
                                  className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${selectedWeekDays.includes(idx)
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "bg-gray-100 [.dark_&]:bg-white/5 text-gray-500 [.dark_&]:text-gray-400 hover:bg-gray-200 [.dark_&]:hover:bg-white/10"
                                    }`}
                                >
                                  {day}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Ends
                        </label>
                        <select
                          value={recurringEndType}
                          onChange={(e) => setRecurringEndType(e.target.value)}
                          className="w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="never">Never</option>
                          <option value="date">On Date</option>
                          <option value="after">After Occurrences</option>
                        </select>
                      </div>

                      {recurringEndType === "date" && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={recurringEndDate}
                            onChange={(e) =>
                              setRecurringEndDate(e.target.value)
                            }
                            min={dueDate || undefined}
                            className="w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                          />
                        </div>
                      )}

                      {recurringEndType === "after" && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={recurringEndAfter}
                            onChange={(e) =>
                              setRecurringEndAfter(e.target.value)
                            }
                            placeholder="e.g. 10"
                            className="w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Recurrence Preview */}
                    {previewDates.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <FaRegCalendarAlt /> Next 5 Occurrences
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {previewDates.map((date, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 bg-indigo-50 [.dark_&]:bg-indigo-900/20 text-indigo-700 [.dark_&]:text-indigo-400 text-xs rounded-md border border-indigo-100 [.dark_&]:border-indigo-500/20 flex items-center gap-1"
                            >
                              <span>{date}</span>
                              {idx < previewDates.length - 1 && <FaArrowRight className="text-[8px] text-indigo-300" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* OKRs */}
                {projectId && (
                  <div className="bg-gray-50 [.dark_&]:bg-white/5 p-4 rounded-xl border border-gray-200 [.dark_&]:border-white/10">
                    <h4 className="text-xs font-bold text-gray-900 [.dark_&]:text-white mb-3">
                      OKR
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Objective
                        </label>
                        <select
                          value={
                            typeof okrObjectiveIndex === "number"
                              ? String(okrObjectiveIndex)
                              : ""
                          }
                          onChange={(e) => {
                            const idx =
                              e.target.value === ""
                                ? null
                                : Number(e.target.value);
                            setOkrObjectiveIndex(idx);
                            setOkrKeyResultIndices([]);
                          }}
                          className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-sm text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="">Select Objective</option>
                          {(
                            projects.find((p) => p.id === projectId)?.okrs || []
                          ).map((okr, idx) => (
                            <option key={idx} value={idx}>
                              {okr?.objective || `Objective ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Key Results
                        </label>
                        <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg border border-gray-200 [.dark_&]:border-white/10 p-2 max-h-24 overflow-y-auto">
                          {(() => {
                            const proj = projects.find(
                              (p) => p.id === projectId
                            );
                            const okrs = proj?.okrs || [];
                            const krs =
                              typeof okrObjectiveIndex === "number"
                                ? okrs[okrObjectiveIndex]?.keyResults || []
                                : [];

                            if (!krs.length)
                              return (
                                <p className="text-xs text-gray-400 italic">
                                  No key results available
                                </p>
                              );

                            return (
                              <div className="space-y-1">
                                {krs.map((kr, idx) => (
                                  <label
                                    key={idx}
                                    className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 rounded border-gray-300 [.dark_&]:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                      checked={okrKeyResultIndices.includes(
                                        idx
                                      )}
                                      onChange={(e) => {
                                        setOkrKeyResultIndices((prev) => {
                                          const set = new Set(prev);
                                          if (e.target.checked) set.add(idx);
                                          else set.delete(idx);
                                          return Array.from(set);
                                        });
                                      }}
                                    />
                                    <span className="text-gray-700 text-xs leading-tight">
                                      {kr}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-700 [.dark_&]:text-gray-300 uppercase tracking-wider">
                      Subtasks
                    </h3>
                    <span className="text-[10px] text-gray-500">
                      {subtasks.length} items
                    </span>
                  </div>

                  <div className="space-y-2 bg-gray-50 [.dark_&]:bg-white/5 p-3 rounded-xl border border-gray-200 [.dark_&]:border-white/10">
                    {subtasks.map((st, idx) => {
                      const isExpanded = expandedSubtaskId === st.id;
                      const subtaskAssignee = assignees.find(a => a.id === st.assigneeId);
                      return (
                        <div
                          key={st.id || idx}
                          className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg border border-gray-100 [.dark_&]:border-white/10 shadow-sm overflow-hidden"
                        >
                          {/* Main Row */}
                          <div className="flex items-center gap-2 p-2 group">
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={(e) => {
                                const next = [...subtasks];
                                next[idx].completed = e.target.checked;
                                setSubtasks(next);
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <VoiceInput
                              value={st.title}
                              onChange={(e) => {
                                const next = [...subtasks];
                                next[idx].title = e.target.value;
                                setSubtasks(next);
                              }}
                              className={`flex-1 bg-transparent border-none text-xs p-0 focus:ring-0 placeholder:text-gray-400 ${st.completed ? 'text-gray-400 line-through' : 'text-gray-700 [.dark_&]:text-white'}`}
                              placeholder="Subtask title..."
                            />
                            {/* Quick indicators */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {st.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${new Date(st.dueDate) < new Date() && !st.completed ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 [.dark_&]:bg-white/10 [.dark_&]:text-gray-400'}`}>
                                  {new Date(st.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {subtaskAssignee && (
                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center" title={subtaskAssignee.name}>
                                  {subtaskAssignee.name?.charAt(0)?.toUpperCase()}
                                </span>
                              )}
                              {st.priority && st.priority !== 'Medium' && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {st.priority === 'High' ? '!' : 'L'}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedSubtaskId(isExpanded ? null : st.id)}
                              className="text-gray-400 hover:text-indigo-500 p-1 transition-all"
                              title="Expand details"
                            >
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = subtasks.filter((_, i) => i !== idx);
                                setSubtasks(next);
                              }}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-white/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                              <div className="grid grid-cols-3 gap-2">
                                {/* Due Date */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Due Date</label>
                                  <input
                                    type="date"
                                    value={st.dueDate || ''}
                                    onChange={(e) => {
                                      const next = [...subtasks];
                                      next[idx].dueDate = e.target.value || null;
                                      setSubtasks(next);
                                    }}
                                    className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1 text-[10px] text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                  />
                                </div>
                                {/* Assignee */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Assignee</label>
                                  <select
                                    value={st.assigneeId || ''}
                                    onChange={(e) => {
                                      const next = [...subtasks];
                                      next[idx].assigneeId = e.target.value || null;
                                      setSubtasks(next);
                                    }}
                                    className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1 text-[10px] text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                  >
                                    <option value="">Unassigned</option>
                                    {assignees.map((a) => (
                                      <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Priority */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Priority</label>
                                  <div className="flex gap-1">
                                    {['Low', 'Medium', 'High'].map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => {
                                          const next = [...subtasks];
                                          next[idx].priority = p;
                                          setSubtasks(next);
                                        }}
                                        className={`flex-1 py-1 text-[9px] font-medium rounded transition-all ${st.priority === p
                                          ? p === 'High' ? 'bg-red-500 text-white' : p === 'Low' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                                          : 'bg-gray-100 [.dark_&]:bg-white/10 text-gray-500 hover:bg-gray-200'
                                          }`}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {/* Description */}
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Description</label>
                                <textarea
                                  value={st.description || ''}
                                  onChange={(e) => {
                                    const next = [...subtasks];
                                    next[idx].description = e.target.value;
                                    setSubtasks(next);
                                  }}
                                  placeholder="Add details..."
                                  rows={2}
                                  className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1 text-[10px] text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600 resize-none"
                                />
                              </div>
                              {/* Dependencies */}
                              {subtasks.length > 1 && (
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                    Depends On <span className="text-gray-400">(must complete first)</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {subtasks
                                      .filter((other) => other.id !== st.id)
                                      .map((other) => {
                                        const isSelected = (st.dependsOn || []).includes(other.id);
                                        // Check for circular dependency - can't depend on something that depends on us
                                        const wouldBeCircular = (other.dependsOn || []).includes(st.id);
                                        return (
                                          <button
                                            key={other.id}
                                            type="button"
                                            disabled={wouldBeCircular}
                                            onClick={() => {
                                              const next = [...subtasks];
                                              const currentDeps = next[idx].dependsOn || [];
                                              if (isSelected) {
                                                next[idx].dependsOn = currentDeps.filter((d) => d !== other.id);
                                              } else {
                                                next[idx].dependsOn = [...currentDeps, other.id];
                                              }
                                              setSubtasks(next);
                                            }}
                                            className={`px-2 py-1 text-[9px] rounded border transition-all ${wouldBeCircular
                                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                              : isSelected
                                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400 [.dark_&]:border-indigo-500/30'
                                                : 'bg-white [.dark_&]:bg-[#181B2A] text-gray-600 [.dark_&]:text-gray-400 border-gray-200 [.dark_&]:border-white/10 hover:border-indigo-300'
                                              }`}
                                            title={wouldBeCircular ? `Circular dependency: "${other.title}" already depends on this` : ''}
                                          >
                                            {isSelected && <span className="mr-1">⛓️</span>}
                                            {other.title?.slice(0, 20)}{other.title?.length > 20 ? '...' : ''}
                                          </button>
                                        );
                                      })}
                                  </div>
                                  {(st.dependsOn || []).length > 0 && (
                                    <p className="text-[9px] text-amber-600 [.dark_&]:text-amber-400 mt-1 flex items-center gap-1">
                                      <span>⚠️</span> Cannot complete until dependencies are done
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add New Subtask - Quick Add with Inline Icons */}
                    <div className="mt-3 pt-3 border-t border-gray-200 [.dark_&]:border-white/10">
                      <div className="flex items-center gap-2">
                        <VoiceInput
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newSubtask.trim()) {
                                const newId = Math.random().toString(36).slice(2);
                                setSubtasks([
                                  ...subtasks,
                                  {
                                    id: newId,
                                    title: newSubtask.trim(),
                                    description: "",
                                    dueDate: newSubtaskDueDate,
                                    assigneeId: newSubtaskAssigneeId,
                                    priority: newSubtaskPriority,
                                    order: Date.now(),
                                    completed: false,
                                    createdAt: new Date().toISOString(),
                                    completedAt: null,
                                    completedBy: null,
                                  },
                                ]);
                                setNewSubtask("");
                                setNewSubtaskDueDate(null);
                                setNewSubtaskAssigneeId(null);
                                setNewSubtaskPriority("Medium");
                              }
                            }
                          }}
                          placeholder="Add a subtask..."
                          className="flex-1 rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600 shadow-sm"
                        />

                        {/* Quick Option Icons */}
                        <div className="flex items-center gap-1">
                          {/* Due Date Icon */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickDatePicker(!showQuickDatePicker);
                                setShowQuickAssigneePicker(false);
                                setShowQuickPriorityPicker(false);
                              }}
                              className={`p-2 rounded-lg transition-all ${newSubtaskDueDate ? 'bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400' : 'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'}`}
                              title="Set due date"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                            {showQuickDatePicker && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowQuickDatePicker(false)} />
                                <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-3 z-20 animate-in fade-in zoom-in-95 duration-100">
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Due Date</label>
                                  <input
                                    type="date"
                                    value={newSubtaskDueDate || ''}
                                    onChange={(e) => {
                                      setNewSubtaskDueDate(e.target.value || null);
                                      setShowQuickDatePicker(false);
                                    }}
                                    className="w-36 rounded border-0 bg-gray-50 [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                    autoFocus
                                  />
                                  {newSubtaskDueDate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewSubtaskDueDate(null);
                                        setShowQuickDatePicker(false);
                                      }}
                                      className="w-full mt-1 text-[10px] text-red-500 hover:text-red-600"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Assignee Icon */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickAssigneePicker(!showQuickAssigneePicker);
                                setShowQuickDatePicker(false);
                                setShowQuickPriorityPicker(false);
                              }}
                              className={`p-2 rounded-lg transition-all ${newSubtaskAssigneeId ? 'bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400' : 'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'}`}
                              title="Assign to"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </button>
                            {showQuickAssigneePicker && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowQuickAssigneePicker(false)} />
                                <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-2 z-20 w-48 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1 px-1">Assign to</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewSubtaskAssigneeId(null);
                                      setShowQuickAssigneePicker(false);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 [.dark_&]:hover:bg-white/10 ${!newSubtaskAssigneeId ? 'bg-indigo-50 text-indigo-600 [.dark_&]:bg-indigo-900/20 [.dark_&]:text-indigo-400' : 'text-gray-600 [.dark_&]:text-gray-300'}`}
                                  >
                                    Unassigned
                                  </button>
                                  {assignees.map((a) => (
                                    <button
                                      key={a.id}
                                      type="button"
                                      onClick={() => {
                                        setNewSubtaskAssigneeId(a.id);
                                        setShowQuickAssigneePicker(false);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 ${newSubtaskAssigneeId === a.id ? 'bg-indigo-50 text-indigo-600 [.dark_&]:bg-indigo-900/20 [.dark_&]:text-indigo-400' : 'text-gray-600 [.dark_&]:text-gray-300'}`}
                                    >
                                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center">
                                        {a.name?.charAt(0)?.toUpperCase()}
                                      </span>
                                      {a.name}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Priority Icon */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickPriorityPicker(!showQuickPriorityPicker);
                                setShowQuickDatePicker(false);
                                setShowQuickAssigneePicker(false);
                              }}
                              className={`p-2 rounded-lg transition-all ${newSubtaskPriority === 'High' ? 'bg-red-100 text-red-600 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400' :
                                newSubtaskPriority === 'Low' ? 'bg-blue-100 text-blue-600 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-400' :
                                  'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'
                                }`}
                              title="Set priority"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                              </svg>
                            </button>
                            {showQuickPriorityPicker && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowQuickPriorityPicker(false)} />
                                <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1 px-1">Priority</label>
                                  <div className="flex gap-1">
                                    {['Low', 'Medium', 'High'].map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => {
                                          setNewSubtaskPriority(p);
                                          setShowQuickPriorityPicker(false);
                                        }}
                                        className={`px-3 py-1.5 text-[10px] font-medium rounded transition-all ${newSubtaskPriority === p
                                          ? p === 'High' ? 'bg-red-500 text-white' : p === 'Low' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                                          : 'bg-gray-100 [.dark_&]:bg-white/10 text-gray-500 hover:bg-gray-200 [.dark_&]:hover:bg-white/20'
                                          }`}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="custom"
                          onClick={() => {
                            if (newSubtask.trim()) {
                              const newId = Math.random().toString(36).slice(2);
                              setSubtasks([
                                ...subtasks,
                                {
                                  id: newId,
                                  title: newSubtask.trim(),
                                  description: "",
                                  dueDate: newSubtaskDueDate,
                                  assigneeId: newSubtaskAssigneeId,
                                  priority: newSubtaskPriority,
                                  order: Date.now(),
                                  completed: false,
                                  createdAt: new Date().toISOString(),
                                  completedAt: null,
                                  completedBy: null,
                                },
                              ]);
                              setNewSubtask("");
                              setNewSubtaskDueDate(null);
                              setNewSubtaskAssigneeId(null);
                              setNewSubtaskPriority("Medium");
                            }
                          }}
                          className={`whitespace-nowrap text-xs px-4 py-2 text-white rounded-lg transition-colors ${themeStyles.button}`}
                        >
                          Add
                        </Button>
                      </div>

                      {/* Selected Options Preview */}
                      {(newSubtaskDueDate || newSubtaskAssigneeId || newSubtaskPriority !== 'Medium') && (
                        <div className="flex items-center gap-2 mt-2 pl-1">
                          <span className="text-[10px] text-gray-400">Options:</span>
                          {newSubtaskDueDate && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 [.dark_&]:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1">
                              📅 {new Date(newSubtaskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              <button type="button" onClick={() => setNewSubtaskDueDate(null)} className="text-gray-400 hover:text-red-500">×</button>
                            </span>
                          )}
                          {newSubtaskAssigneeId && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 [.dark_&]:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1">
                              👤 {assignees.find(a => a.id === newSubtaskAssigneeId)?.name}
                              <button type="button" onClick={() => setNewSubtaskAssigneeId(null)} className="text-gray-400 hover:text-red-500">×</button>
                            </span>
                          )}
                          {newSubtaskPriority !== 'Medium' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${newSubtaskPriority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              ⚡ {newSubtaskPriority}
                              <button type="button" onClick={() => setNewSubtaskPriority('Medium')} className="hover:text-red-500">×</button>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 bg-gray-50 [.dark_&]:bg-[#181B2A] border-t border-gray-100 [.dark_&]:border-white/10 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            {hasChanges ? "Unsaved changes" : "No changes made"}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              type="button"
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              variant="custom"
              onClick={handleSubmit}
              disabled={!!taskToEdit && !hasChanges}
              className={`px-8 text-white rounded-lg transition-colors ${themeStyles.button} ${!!taskToEdit && !hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {taskToEdit ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </div>
      {/* Series Update Prompt Modal */}
      {showSeriesPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 [.dark_&]:border-white/10">
            <div className="flex items-center gap-3 text-indigo-600 [.dark_&]:text-indigo-400">
              <MdReplayCircleFilled className="text-2xl" />
              <h3 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">Update Recurring Task</h3>
            </div>
            <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">
              This task is part of a recurring series. How would you like to apply your changes?
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleSeriesChoice(false)}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 [.dark_&]:border-white/10 hover:border-indigo-300 [.dark_&]:hover:border-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 transition-all group text-left"
              >
                <div>
                  <span className="block text-sm font-bold text-gray-900 [.dark_&]:text-white group-hover:text-indigo-700 [.dark_&]:group-hover:text-indigo-400">This Occurrence Only</span>
                  <span className="block text-xs text-gray-500 [.dark_&]:text-gray-400">Update only this specific task instance</span>
                </div>
                <div className="w-4 h-4 rounded-full border border-gray-300 [.dark_&]:border-gray-500 group-hover:border-indigo-500"></div>
              </button>
              <button
                onClick={() => handleSeriesChoice(true)}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 [.dark_&]:border-white/10 hover:border-indigo-300 [.dark_&]:hover:border-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 transition-all group text-left"
              >
                <div>
                  <span className="block text-sm font-bold text-gray-900 [.dark_&]:text-white group-hover:text-indigo-700 [.dark_&]:group-hover:text-indigo-400">Entire Series</span>
                  <span className="block text-xs text-gray-500 [.dark_&]:text-gray-400">Update this and all future occurrences</span>
                </div>
                <div className="w-4 h-4 rounded-full border border-gray-300 [.dark_&]:border-gray-500 group-hover:border-indigo-500"></div>
              </button>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowSeriesPrompt(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskModal;

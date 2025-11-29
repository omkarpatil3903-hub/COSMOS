// src/components/TaskModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import Button from "./Button";
import toast from "react-hot-toast";
import { validateTaskForm } from "../utils/formBuilders";
import { MdReplayCircleFilled } from "react-icons/md";
import { FaTimes, FaRegCalendarAlt } from "react-icons/fa";

// Inline simple searchable multi-select component
function SearchMultiSelect({ items, selected, onChange, placeholder }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  const toggle = (id) => {
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
        className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
      />
      <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-subtle bg-surface">
        {filtered.map((i) => (
          <label
            key={i.id}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(i.id)}
              onChange={() => toggle(i.id)}
              className="rounded border-subtle"
            />
            <span>{i.label}</span>
          </label>
        ))}
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
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To-Do");
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
  const [selectedWeekDays, setSelectedWeekDays] = useState([0, 1, 2, 3, 4, 5, 6]); // All days default
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [previewDates, setPreviewDates] = useState([]);

  // OKR state
  const [okrObjectiveIndex, setOkrObjectiveIndex] = useState(null);
  const [okrKeyResultIndices, setOkrKeyResultIndices] = useState([]);

  // Subtasks state
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");

  const [errors, setErrors] = useState({});

  // Clear recurring fields when switching to one-time
  useEffect(() => {
    if (!isRecurring) {
      setRecurringEndType("never");
      setRecurringEndDate("");
      setRecurringEndAfter("");
      setPreviewDates([]);
    }
  }, [isRecurring]);

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

      while (out.length < 5 && count < 365) { // Limit iterations to prevent infinite loop
        const d = new Date(current);
        let include = false;

        // Check if day is allowed
        const isAllowedDay = !isCustomDays || selectedWeekDays.includes(d.getDay());

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
              const monthDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
              if (monthDiff > 0 && monthDiff % recurringInterval === 0) include = true;
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
  }, [isRecurring, dueDate, recurringPattern, recurringInterval, selectedWeekDays, isCustomDays]);

  // Initialize form when editing
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setProjectId(taskToEdit.projectId || "");
      setPriority(taskToEdit.priority || "Medium");
      setStatus(taskToEdit.status || "To-Do");
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

      setSubtasks(Array.isArray(taskToEdit.subtasks) ? taskToEdit.subtasks : []);
    }
  }, [taskToEdit]);

  // Detect changes for edit mode
  const hasChanges = useMemo(() => {
    if (!taskToEdit) return true;

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
      JSON.stringify(selectedWeekDays) === JSON.stringify(taskToEdit.selectedWeekDays || [0, 1, 2, 3, 4, 5, 6]),
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
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    const validation = validateTaskForm({
      title,
      projectId,
      dueDate,
      assigneeId:
        assigneeType === "client" ? assigneeId : assigneesSelected[0]?.id || "",
    });

    if (!validation.isValid) {
      setErrors(validation.errors || {});
      return;
    }

    // Build assigneeIds array for employee queries
    const assigneeIds = assigneesSelected
      .filter((a) => a.type === "user")
      .map((a) => a.id);

    const payload = {
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
      selectedWeekDays: isRecurring && isCustomDays ? selectedWeekDays : undefined,
      okrObjectiveIndex:
        typeof okrObjectiveIndex === "number" ? okrObjectiveIndex : undefined,
      okrKeyResultIndices: okrKeyResultIndices,
      subtasks,
    };

    onSave(payload);
    toast.success(taskToEdit ? "Task updated" : "Task created");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean Style */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-100/50 bg-white/80 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${taskToEdit ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
              <MdReplayCircleFilled className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                {taskToEdit ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {taskToEdit ? "Update task details" : "Add a new task to project"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} noValidate className="p-6 lg:p-8 space-y-8">

            {/* 3-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Column 1: Details & Classification */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                  Details & Classification
                </h3>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Task Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                    }}
                    placeholder="Enter task title..."
                    className={`block w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all ${errors.title ? "ring-red-300 focus:ring-red-500 bg-red-50" : ""
                      }`}
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <FaTimes className="text-[10px]" /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Add a detailed description..."
                    className="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: "" }));
                        setOkrObjectiveIndex(null);
                        setOkrKeyResultIndices([]);
                      }}
                      className={`block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 ${errors.projectId ? "ring-red-300 bg-red-50" : ""
                        }`}
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {errors.projectId && (
                      <p className="mt-1 text-xs text-red-600">{errors.projectId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    >
                      <option value="To-Do">To-Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Column 2: Assignment & Schedule */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                  Assignment & Schedule
                </h3>

                <div className="space-y-4">
                  {/* Assignee Type Toggle */}
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAssigneeType("user");
                        setAssigneesSelected([]);
                        setAssigneeId("");
                      }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assigneeType === "user" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assigneeType === "client" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Client
                    </button>
                  </div>

                  {/* Assignee Selector */}
                  <div>
                    {assigneeType === "user" ? (
                      <SearchMultiSelect
                        items={assignees.map((u) => ({ id: u.id, label: u.name }))}
                        selected={assigneesSelected.filter((a) => a.type === "user").map((a) => a.id)}
                        onChange={(ids) => {
                          const others = assigneesSelected.filter((a) => a.type !== "user");
                          const nextSame = ids.map((id) => ({ type: "user", id }));
                          const next = [...nextSame, ...others];
                          setAssigneesSelected(next);
                          setAssigneeId(nextSame[0]?.id || "");
                          if (errors.assigneeId) setErrors((p) => ({ ...p, assigneeId: "" }));
                        }}
                        placeholder="Select resources..."
                      />
                    ) : (
                      <select
                        value={assigneeId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setAssigneeId(id);
                          setAssigneesSelected(id ? [{ type: "client", id }] : []);
                          if (errors.assigneeId) setErrors((p) => ({ ...p, assigneeId: "" }));
                        }}
                        className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                      >
                        <option value="">Select Client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.clientName}</option>
                        ))}
                      </select>
                    )}
                    {errors.assigneeId && (
                      <p className="mt-1 text-xs text-red-600">{errors.assigneeId}</p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Assigned Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={assignedDate}
                          onChange={(e) => setAssignedDate(e.target.value)}
                          className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => {
                            setDueDate(e.target.value);
                            if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: "" }));
                          }}
                          className={`block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 ${errors.dueDate ? "ring-red-300 bg-red-50" : ""
                            }`}
                        />
                      </div>
                      {errors.dueDate && (
                        <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Advanced & Subtasks */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                  Advanced & Subtasks
                </h3>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Weightage (Points)</label>
                  <input
                    type="number"
                    min="0"
                    value={weightage}
                    onChange={(e) => setWeightage(e.target.value)}
                    placeholder="e.g. 5"
                    className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                  />
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isRecurring ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      <MdReplayCircleFilled className="text-lg" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Recurring</h4>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isRecurring}
                      onChange={(e) => setTaskType(e.target.checked ? "recurring" : "one-time")}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Recurring Options Panel */}
                {isRecurring && (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Repeat Every</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={recurringInterval}
                            onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                            className="w-16 rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                          />
                          <select
                            value={recurringPattern}
                            onChange={(e) => setRecurringPattern(e.target.value)}
                            className="flex-1 rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="daily">Day(s)</option>
                            <option value="weekly">Week(s)</option>
                            <option value="monthly">Month(s)</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-span-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-gray-500">Allowed Days</label>
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
                              className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                            />
                            <span className="text-[10px] text-indigo-600 font-medium">Customize</span>
                          </label>
                        </div>

                        {isCustomDays && (
                          <div className="flex gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSelectedWeekDays(prev =>
                                    prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                  );
                                }}
                                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${selectedWeekDays.includes(idx)
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                  }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ends</label>
                        <select
                          value={recurringEndType}
                          onChange={(e) => setRecurringEndType(e.target.value)}
                          className="w-full rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="never">Never</option>
                          <option value="date">On Date</option>
                          <option value="after">After Occurrences</option>
                        </select>
                      </div>

                      {recurringEndType === "date" && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={recurringEndDate}
                            onChange={(e) => setRecurringEndDate(e.target.value)}
                            min={dueDate || undefined}
                            className="w-full rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                          />
                        </div>
                      )}

                      {recurringEndType === "after" && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Count</label>
                          <input
                            type="number"
                            min="1"
                            value={recurringEndAfter}
                            onChange={(e) => setRecurringEndAfter(e.target.value)}
                            placeholder="e.g. 10"
                            className="w-full rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OKRs */}
                {projectId && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-900 mb-3">OKR</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Objective</label>
                        <select
                          value={typeof okrObjectiveIndex === "number" ? String(okrObjectiveIndex) : ""}
                          onChange={(e) => {
                            const idx = e.target.value === "" ? null : Number(e.target.value);
                            setOkrObjectiveIndex(idx);
                            setOkrKeyResultIndices([]);
                          }}
                          className="block w-full rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="">Select Objective</option>
                          {(projects.find((p) => p.id === projectId)?.okrs || []).map((okr, idx) => (
                            <option key={idx} value={idx}>{okr?.objective || `Objective ${idx + 1}`}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Key Results</label>
                        <div className="bg-white rounded-lg border border-gray-200 p-2 max-h-24 overflow-y-auto">
                          {(() => {
                            const proj = projects.find((p) => p.id === projectId);
                            const okrs = proj?.okrs || [];
                            const krs = typeof okrObjectiveIndex === "number" ? okrs[okrObjectiveIndex]?.keyResults || [] : [];

                            if (!krs.length) return <p className="text-xs text-gray-400 italic">No key results available</p>;

                            return (
                              <div className="space-y-1">
                                {krs.map((kr, idx) => (
                                  <label key={idx} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={okrKeyResultIndices.includes(idx)}
                                      onChange={(e) => {
                                        setOkrKeyResultIndices((prev) => {
                                          const set = new Set(prev);
                                          if (e.target.checked) set.add(idx);
                                          else set.delete(idx);
                                          return Array.from(set);
                                        });
                                      }}
                                    />
                                    <span className="text-gray-700 text-xs leading-tight">{kr}</span>
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
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Subtasks</h3>
                    <span className="text-[10px] text-gray-500">{subtasks.length} items</span>
                  </div>

                  <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    {subtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2 group bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={(e) => {
                            const next = [...subtasks];
                            next[idx].completed = e.target.checked;
                            setSubtasks(next);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => {
                            const next = [...subtasks];
                            next[idx].title = e.target.value;
                            setSubtasks(next);
                          }}
                          className="flex-1 bg-transparent border-none text-xs p-0 focus:ring-0 text-gray-700 placeholder:text-gray-400"
                          placeholder="Subtask title..."
                        />
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
                    ))}

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newSubtask.trim()) {
                              setSubtasks([...subtasks, { id: Math.random().toString(36).slice(2), title: newSubtask.trim(), completed: false }]);
                              setNewSubtask("");
                            }
                          }
                        }}
                        placeholder="New subtask..."
                        className="flex-1 rounded-lg border-0 bg-white px-2 py-1.5 text-xs ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (newSubtask.trim()) {
                            setSubtasks([...subtasks, { id: Math.random().toString(36).slice(2), title: newSubtask.trim(), completed: false }]);
                            setNewSubtask("");
                          }
                        }}
                        className="whitespace-nowrap text-xs px-2 py-1.5"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            {hasChanges ? "Unsaved changes" : "No changes made"}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" type="button" className="px-6">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!!taskToEdit && !hasChanges}
              className="px-8 shadow-lg shadow-indigo-200"
            >
              {taskToEdit ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;

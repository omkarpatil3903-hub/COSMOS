// src/components/TaskModal.jsx
import React, { useState, useEffect, useRef } from "react";

import Card from "./Card";
import Button from "./Button";
import toast from "react-hot-toast";
import { validateTaskForm } from "../utils/formBuilders";

// Now receives projects and assignees from parent instead of local samples
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
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeType, setAssigneeType] = useState("user"); // 'user' | 'client'
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedDate, setAssignedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To-Do");
  const [weightage, setWeightage] = useState("");
  const [completionComment, setCompletionComment] = useState("");

  // Task Type Toggle
  const [taskType, setTaskType] = useState("one-time"); // 'one-time' | 'recurring'

  // Recurring task fields
  const [recurringPattern, setRecurringPattern] = useState("daily");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringEndAfter, setRecurringEndAfter] = useState("");
  const [recurringEndType, setRecurringEndType] = useState("never"); // 'never', 'date', 'after'
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [previewDates, setPreviewDates] = useState([]);
  const [errors, setErrors] = useState({});
  const [initialTaskState, setInitialTaskState] = useState(null);

  useEffect(() => {
    if (taskToEdit) {
      const initialWeightage =
        taskToEdit.weightage !== undefined && taskToEdit.weightage !== null
          ? String(taskToEdit.weightage)
          : "";

      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setAssigneeId(taskToEdit.assigneeId || "");
      setAssigneeType(taskToEdit.assigneeType || "user");
      setProjectId(taskToEdit.projectId || "");
      setDueDate(taskToEdit.dueDate || "");
      setAssignedDate(taskToEdit.assignedDate || "");
      setPriority(taskToEdit.priority || "Medium");
      setStatus(taskToEdit.status || "To-Do");
      setWeightage(initialWeightage);
      setCompletionComment(taskToEdit.completionComment || "");

      // Load recurring task data
      const isRec = taskToEdit.isRecurring || false;
      setTaskType(isRec ? "recurring" : "one-time");
      setRecurringPattern(taskToEdit.recurringPattern || "daily");
      setRecurringInterval(taskToEdit.recurringInterval || 1);
      setRecurringEndDate(taskToEdit.recurringEndDate || "");
      setRecurringEndAfter(taskToEdit.recurringEndAfter || "");
      setRecurringEndType(taskToEdit.recurringEndType || "never");
      setSkipWeekends(taskToEdit.skipWeekends || false);
      setErrors({});

      setInitialTaskState({
        title: taskToEdit.title || "",
        description: taskToEdit.description || "",
        assigneeId: taskToEdit.assigneeId || "",
        assigneeType: taskToEdit.assigneeType || "user",
        projectId: taskToEdit.projectId || "",
        dueDate: taskToEdit.dueDate || "",
        assignedDate: taskToEdit.assignedDate || "",
        priority: taskToEdit.priority || "Medium",
        status: taskToEdit.status || "To-Do",
        weightage: initialWeightage,
        completionComment: taskToEdit.completionComment || "",
        isRecurring: taskToEdit.isRecurring || false,
        recurringPattern: taskToEdit.recurringPattern || "daily",
        recurringInterval: taskToEdit.recurringInterval || 1,
        recurringEndDate: taskToEdit.recurringEndDate || "",
        recurringEndAfter: taskToEdit.recurringEndAfter || "",
        recurringEndType: taskToEdit.recurringEndType || "never",
        skipWeekends: taskToEdit.skipWeekends || false,
      });
    } else {
      setInitialTaskState(null);
      setErrors({});
    }
  }, [taskToEdit]);

  const isClientLocked =
    !!taskToEdit && (taskToEdit.assigneeType || "user") === "client";

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateTaskForm({
      title,
      dueDate,
      projectId,
      assigneeId,
      assignedDate,
    });
    setErrors(validationErrors || {});
    if (!isValid) {
      const firstError = validationErrors && Object.values(validationErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }
    onSave({
      id: taskToEdit?.id,
      title,
      description,
      assigneeId,
      assigneeType,
      projectId,
      dueDate,
      assignedDate,
      priority,
      status,
      weightage,
      completionComment,
      isRecurring: taskType === "recurring",
      recurringPattern,
      recurringInterval,
      recurringEndDate,
      recurringEndAfter,
      recurringEndType,
      skipWeekends,
    });
  };

  // Preview next occurrences (up to N) whenever recurrence settings change
  useEffect(() => {
    if (taskType !== "recurring" || !dueDate) {
      setPreviewDates([]);
      return;
    }
    try {
      const base = new Date(dueDate + "T00:00:00");
      const maxPreview = 10;
      const dates = [];
      let cursor = new Date(base);
      let occurrences = 0;
      let guard = 0; // safety to avoid infinite loops
      while (occurrences < maxPreview && guard < 1000) {
        guard++;
        // Build a lightweight task-like object for occursOnDate logic
        const simulatedTask = {
          isRecurring: true,
          dueDate: dueDate,
          recurringPattern,
          recurringInterval,
          recurringEndType,
          recurringEndDate,
          recurringEndAfter,
          skipWeekends,
        };
        // Stop if end-date reached
        if (recurringEndType === "date" && recurringEndDate) {
          const end = new Date(recurringEndDate + "T00:00:00");
          if (cursor > end) break;
        }
        // Stop if after occurrences limit reached
        if (recurringEndType === "after" && recurringEndAfter) {
          const limit = parseInt(recurringEndAfter);
          if (dates.length >= limit) break;
        }
        // Check if this cursor matches an occurrence
        if (occursOnCursor(simulatedTask, cursor)) {
          dates.push(formatYMD(cursor));
          occurrences++;
        }
        // Advance cursor according to smallest step (1 day) and rely on filter logic
        cursor.setDate(cursor.getDate() + 1);
      }
      setPreviewDates(dates);
    } catch (err) {
      console.warn("Failed to build preview dates", err);
      setPreviewDates([]);
    }
  }, [
    taskType,
    dueDate,
    recurringPattern,
    recurringInterval,
    recurringEndType,
    recurringEndDate,
    recurringEndAfter,
    skipWeekends,
  ]);

  // Helper: determine if task occurs on a given date (mirrors logic from recurringTasks.js simplified)
  const occursOnCursor = (task, dateObj) => {
    const base = new Date(task.dueDate + "T00:00:00");
    if (Number.isNaN(base.getTime())) return false;
    const d = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );
    const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (task.skipWeekends && (d.getDay() === 0 || d.getDay() === 6))
      return false;
    const diffDays = Math.floor((d - b) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return false;
    const interval = Number(task.recurringInterval || 1);
    const pattern = task.recurringPattern || "daily";
    if (pattern === "daily") return diffDays % interval === 0;
    if (pattern === "weekly") {
      if (d.getDay() !== b.getDay()) return false;
      const weeks = Math.floor(diffDays / 7);
      return weeks % interval === 0;
    }
    if (pattern === "monthly") {
      if (d.getDate() !== b.getDate()) return false;
      const months =
        (d.getFullYear() - b.getFullYear()) * 12 +
        (d.getMonth() - b.getMonth());
      return months % interval === 0;
    }
    if (pattern === "yearly") {
      if (d.getMonth() !== b.getMonth() || d.getDate() !== b.getDate())
        return false;
      const years = d.getFullYear() - b.getFullYear();
      return years % interval === 0;
    }
    return false;
  };

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const modalRef = useRef(null);
  const prevFocusedRef = useRef(null);

  useEffect(() => {
    prevFocusedRef.current = document.activeElement;
    const root = modalRef.current;
    if (root) {
      const el = root.querySelector(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      );
      if (el && typeof el.focus === "function") el.focus();
      else if (typeof root.focus === "function") root.focus();
    }
    return () => {
      if (
        prevFocusedRef.current &&
        typeof prevFocusedRef.current.focus === "function"
      ) {
        prevFocusedRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Tab") {
      const root = modalRef.current;
      if (!root) return;
      const selectors =
        'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(root.querySelectorAll(selectors)).filter(
        (el) => el instanceof HTMLElement && !el.hasAttribute("disabled")
      );
      if (nodes.length === 0) {
        e.preventDefault();
        if (typeof root.focus === "function") root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          document.activeElement === root
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const hasChanges =
    !taskToEdit || !initialTaskState
      ? true
      : title !== initialTaskState.title ||
        description !== initialTaskState.description ||
        assigneeId !== initialTaskState.assigneeId ||
        assigneeType !== initialTaskState.assigneeType ||
        projectId !== initialTaskState.projectId ||
        dueDate !== initialTaskState.dueDate ||
        assignedDate !== initialTaskState.assignedDate ||
        priority !== initialTaskState.priority ||
        status !== initialTaskState.status ||
        weightage !== initialTaskState.weightage ||
        completionComment !== initialTaskState.completionComment ||
        (taskType === "recurring") !== initialTaskState.isRecurring ||
        recurringPattern !== initialTaskState.recurringPattern ||
        recurringInterval !== initialTaskState.recurringInterval ||
        recurringEndDate !== initialTaskState.recurringEndDate ||
        recurringEndAfter !== initialTaskState.recurringEndAfter ||
        recurringEndType !== initialTaskState.recurringEndType ||
        skipWeekends !== initialTaskState.skipWeekends;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="z-10 w-full max-w-2xl mx-4 sm:mx-6">
        <Card className="w-full max-h-[90vh] overflow-y-auto overscroll-contain">
          <h2 className="text-xl font-semibold mb-4">
            {taskToEdit ? "Edit Task" : "Create Task"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Task Type Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTaskType("one-time")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  taskType === "one-time"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                One-time Task
              </button>
              <button
                type="button"
                onClick={() => setTaskType("recurring")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  taskType === "recurring"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Recurring Task
              </button>
            </div>

            {/* Recurring Settings (Only visible if Recurring) */}
            {taskType === "recurring" && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <span className="text-lg">↻</span> Recurrence Settings
                </h3>

                {/* Interval & Pattern */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      Repeat Every
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={recurringInterval}
                        onChange={(e) =>
                          setRecurringInterval(parseInt(e.target.value) || 1)
                        }
                        className="w-20 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                      />
                      <select
                        value={recurringPattern}
                        onChange={(e) => setRecurringPattern(e.target.value)}
                        className="flex-1 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="daily">Day(s)</option>
                        <option value="weekly">Week(s)</option>
                        <option value="monthly">Month(s)</option>
                        <option value="yearly">Year(s)</option>
                      </select>
                    </div>
                  </div>

                  {/* Skip Weekends */}
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipWeekends}
                        onChange={(e) => setSkipWeekends(e.target.checked)}
                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-blue-700">
                        Skip Weekends
                      </span>
                    </label>
                  </div>
                </div>

                {/* Ends Logic */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      Ends
                    </label>
                    <select
                      value={recurringEndType}
                      onChange={(e) => setRecurringEndType(e.target.value)}
                      className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="never">Never</option>
                      <option value="date">On Date</option>
                      <option value="after">After Occurrences</option>
                    </select>
                  </div>

                  {recurringEndType === "date" && (
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        min={dueDate || undefined}
                        className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {recurringEndType === "after" && (
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        Occurrences
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={recurringEndAfter}
                        onChange={(e) => setRecurringEndAfter(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                {previewDates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">
                      Next occurrences (preview):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewDates.slice(0, 5).map((d) => (
                        <span
                          key={d}
                          className="inline-block px-2 py-0.5 bg-white text-blue-600 text-[10px] rounded border border-blue-100"
                        >
                          {d}
                        </span>
                      ))}
                      {previewDates.length > 5 && (
                        <span className="text-[10px] text-blue-500 self-center">
                          ...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standard Fields */}
            <div>
              <label className="block text-sm font-medium text-content-secondary">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) {
                    setErrors((prev) => ({ ...prev, projectId: "" }));
                  }
                }}
                className={`mt-1 block w-full rounded-md border ${
                  errors.projectId ? "border-red-500" : "border-subtle"
                } bg-surface px-3 py-2 text-sm text-content-primary`}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-xs text-red-600">{errors.projectId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    setErrors((prev) => ({ ...prev, title: "" }));
                  }
                }}
                className={`mt-1 block w-full rounded-md border ${
                  errors.title ? "border-red-500" : "border-subtle"
                } bg-transparent px-3 py-2 text-sm text-content-primary`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {status === "Done" && (
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Completion Comment
                </label>
                <textarea
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  rows={3}
                  placeholder="Add details about completion..."
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
                  maxLength={300}
                />
                <div className="mt-1 text-xs text-content-tertiary text-right">
                  {(completionComment || "").length}/300
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-content-secondary">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Assigned To
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select
                    value={assigneeType}
                    onChange={(e) => {
                      setAssigneeType(e.target.value);
                      setAssigneeId(""); // reset selection when type changes
                      if (errors.assigneeId) {
                        setErrors((prev) => ({ ...prev, assigneeId: "" }));
                      }
                    }}
                    className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                    disabled={isClientLocked}
                  >
                    <option value="user">Resource</option>
                    <option value="client">Client</option>
                  </select>
                  <select
                    value={assigneeId}
                    onChange={(e) => {
                      setAssigneeId(e.target.value);
                      if (errors.assigneeId) {
                        setErrors((prev) => ({ ...prev, assigneeId: "" }));
                      }
                    }}
                    className={`block w-full rounded-md border ${
                      errors.assigneeId ? "border-red-500" : "border-subtle"
                    } bg-surface px-3 py-2 text-sm text-content-primary`}
                    disabled={isClientLocked}
                  >
                    <option value="">Unassigned</option>
                    {assigneeType === "user"
                      ? assignees.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))
                      : clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName}
                            {c.companyName ? ` (${c.companyName})` : ""}
                          </option>
                        ))}
                  </select>
                  {isClientLocked && (
                    <p className="col-span-2 text-xs text-content-tertiary">
                      Client-assigned tasks cannot be reassigned here.
                    </p>
                  )}
                  {errors.assigneeId && (
                    <p className="col-span-2 text-xs text-red-600">
                      {errors.assigneeId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Assigned Date
                </label>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  {taskType === "recurring" ? "Start Date (Due)" : "Due Date"}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) {
                      setErrors((prev) => ({ ...prev, dueDate: "" }));
                    }
                  }}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.dueDate ? "border-red-500" : "border-subtle"
                  } bg-transparent px-3 py-2 text-sm text-content-primary`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  {status === "Done" && taskToEdit?.completedAt
                    ? (() => {
                        const due = taskToEdit.dueDate
                          ? new Date(taskToEdit.dueDate)
                          : null;
                        const comp = taskToEdit.completedAt
                          ? new Date(taskToEdit.completedAt)
                          : null;
                        if (!comp) return "Completion Date";
                        const compD = new Date(
                          comp.getFullYear(),
                          comp.getMonth(),
                          comp.getDate()
                        );
                        const dueD = due
                          ? new Date(
                              due.getFullYear(),
                              due.getMonth(),
                              due.getDate()
                            )
                          : null;
                        const late = dueD
                          ? compD.getTime() > dueD.getTime()
                          : false;
                        return late ? "Delayed Completion" : "Completed At";
                      })()
                    : "Completion Date"}
                </label>
                <input
                  type="text"
                  value={
                    status === "Done" && taskToEdit?.completedAt
                      ? new Date(taskToEdit.completedAt).toLocaleDateString()
                      : "—"
                  }
                  disabled
                  className="mt-1 block w-full rounded-md border border-subtle bg-gray-100 px-3 py-2 text-sm text-content-secondary cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                >
                  <option>To-Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Weightage
                </label>
                <input
                  type="number"
                  value={weightage}
                  onChange={(e) => setWeightage(e.target.value)}
                  min="0"
                  step="1"
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button onClick={onClose} variant="secondary" type="button">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!!taskToEdit && !hasChanges}
              >
                {taskToEdit
                  ? hasChanges
                    ? "Save Changes"
                    : "No changes"
                  : "Save Task"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default TaskModal;

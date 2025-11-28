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
  const [recurringPattern, setRecurringPattern] = useState("weekly");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndType, setRecurringEndType] = useState("never");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringEndAfter, setRecurringEndAfter] = useState("");
  const [skipWeekends, setSkipWeekends] = useState(false);
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
      while (out.length < 5 && count < 60) {
        const d = new Date(start);
        if (recurringPattern === "daily") {
          d.setDate(start.getDate() + recurringInterval * (out.length + 1));
        } else if (recurringPattern === "weekly") {
          d.setDate(start.getDate() + 7 * recurringInterval * (out.length + 1));
        } else if (recurringPattern === "monthly") {
          d.setMonth(start.getMonth() + recurringInterval * (out.length + 1));
        } else if (recurringPattern === "yearly") {
          d.setFullYear(
            start.getFullYear() + recurringInterval * (out.length + 1)
          );
        }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        out.push(`${yyyy}-${mm}-${dd}`);
        count++;
      }
    } catch {
      // Ignore date parsing errors
    }
    setPreviewDates(out);
  }, [isRecurring, dueDate, recurringPattern, recurringInterval]);

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
      setRecurringPattern(taskToEdit.recurringPattern || "weekly");
      setRecurringInterval(taskToEdit.recurringInterval || 1);
      setRecurringEndType(taskToEdit.recurringEndType || "never");
      setRecurringEndDate(taskToEdit.recurringEndDate || "");
      setRecurringEndAfter(String(taskToEdit.recurringEndAfter || ""));
      setSkipWeekends(taskToEdit.skipWeekends || false);

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
      skipWeekends: isRecurring ? skipWeekends : undefined,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[1000px] h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-subtle bg-surface shrink-0">
          <div className="flex items-center gap-3 text-sm text-content-secondary">
            <span className="px-2 py-0.5 rounded border border-subtle bg-surface text-xs font-mono">
              {taskToEdit ? "EDIT" : "NEW"}
            </span>
            <span className="text-content-tertiary">/</span>
            <span
              className="truncate max-w-[220px] text-content-primary"
              title="Project"
            >
              {projects.find((p) => p.id === projectId)?.name ||
                "Select Project"}
            </span>
            {taskType === "recurring" && (
              <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">
                <MdReplayCircleFilled /> Recurring
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full text-content-tertiary transition-colors ml-2"
              type="button"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body split view */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 overflow-hidden"
        >
          {/* Left: Content */}
          <div className="flex-1 overflow-y-auto p-8 border-r border-subtle bg-surface">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: "" }));
                }}
                className={`block w-full rounded-md border ${errors.title ? "border-red-500" : "border-subtle"
                  } bg-surface px-3 py-2 text-sm text-content-primary`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-content-secondary">
                  Description
                </label>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-subtle px-3 py-2 text-sm bg-transparent text-content-primary"
              />
            </div>

            {/* Project Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-content-secondary">
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
                className={`block w-full rounded-md border ${errors.projectId ? "border-red-500" : "border-subtle"
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

              {/* OKR Selection */}
              {projectId && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
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
                          e.target.value === "" ? null : Number(e.target.value);
                        setOkrObjectiveIndex(idx);
                        setOkrKeyResultIndices([]);
                      }}
                      className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
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
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      Key Results (select multiple)
                    </label>
                    <div className="rounded-md border border-subtle bg-surface p-2 max-h-40 overflow-y-auto">
                      {(() => {
                        const proj = projects.find((p) => p.id === projectId);
                        const okrs = proj?.okrs || [];
                        const krs =
                          typeof okrObjectiveIndex === "number"
                            ? okrs[okrObjectiveIndex]?.keyResults || []
                            : [];

                        if (!krs.length) {
                          return (
                            <p className="text-xs text-content-tertiary">
                              No key results for selected objective
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            {krs.map((kr, idx) => {
                              const checked = okrKeyResultIndices.includes(idx);
                              return (
                                <label
                                  key={idx}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="rounded border-subtle"
                                    checked={checked}
                                    disabled={
                                      typeof okrObjectiveIndex !== "number"
                                    }
                                    onChange={(e) => {
                                      setOkrKeyResultIndices((prev) => {
                                        const set = new Set(prev);
                                        if (e.target.checked) set.add(idx);
                                        else set.delete(idx);
                                        return Array.from(set);
                                      });
                                    }}
                                  />
                                  <span>{kr || `Key Result ${idx + 1}`}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned To */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-content-secondary">
                Assigned To
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={assigneeType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setAssigneeType(nextType);
                    setAssigneesSelected((prev) => {
                      const filtered = prev.filter((a) => a.type === nextType);
                      const first = filtered[0] || null;
                      setAssigneeId(first?.id || "");
                      if (errors.assigneeId)
                        setErrors((p) => ({ ...p, assigneeId: "" }));
                      return filtered;
                    });
                  }}
                  className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                >
                  <option value="user">Resource</option>
                  <option value="client">Client</option>
                </select>
                <div className="text-xs text-content-tertiary self-center">
                  Type then search & select below.
                </div>
              </div>

              {assigneeType === "user" ? (
                <SearchMultiSelect
                  items={assignees.map((u) => ({ id: u.id, label: u.name }))}
                  selected={assigneesSelected
                    .filter((a) => a.type === "user")
                    .map((a) => a.id)}
                  onChange={(ids) => {
                    const others = assigneesSelected.filter(
                      (a) => a.type !== "user"
                    );
                    const nextSame = ids.map((id) => ({ type: "user", id }));
                    const next = [...nextSame, ...others];
                    setAssigneesSelected(next);
                    const first = nextSame[0] || null;
                    setAssigneeType("user");
                    setAssigneeId(first?.id || "");
                    if (errors.assigneeId)
                      setErrors((p) => ({ ...p, assigneeId: "" }));
                  }}
                  placeholder="Search resources..."
                />
              ) : (
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAssigneeId(id);
                    setAssigneeType("client");
                    setAssigneesSelected(id ? [{ type: "client", id }] : []);
                    if (errors.assigneeId)
                      setErrors((p) => ({ ...p, assigneeId: "" }));
                  }}
                  className="mt-2 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                      {c.companyName ? ` (${c.companyName})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {errors.assigneeId && (
                <p className="mt-1 text-xs text-red-600">{errors.assigneeId}</p>
              )}
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {isRecurring ? "Start Date (Due)" : "Due Date"}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate)
                      setErrors((prev) => ({ ...prev, dueDate: "" }));
                  }}
                  className={`mt-1 block w-full rounded-md border ${errors.dueDate ? "border-red-500" : "border-subtle"
                    } bg-transparent px-3 py-2 text-sm text-content-primary`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
                )}
              </div>
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  checked={isRecurring}
                  onChange={(e) =>
                    setTaskType(e.target.checked ? "recurring" : "one-time")
                  }
                />
                <span className="text-sm text-content-secondary">
                  Recurring Task
                </span>
              </label>
            </div>

            {/* Recurring Options */}
            {isRecurring && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">
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
                        className="w-20 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                      />
                      <select
                        value={recurringPattern}
                        onChange={(e) => setRecurringPattern(e.target.value)}
                        className="flex-1 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="daily">Day(s)</option>
                        <option value="weekly">Week(s)</option>
                        <option value="monthly">Month(s)</option>
                        <option value="yearly">Year(s)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipWeekends}
                        onChange={(e) => setSkipWeekends(e.target.checked)}
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-indigo-700">
                        Skip Weekends
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">
                      Ends
                    </label>
                    <select
                      value={recurringEndType}
                      onChange={(e) => setRecurringEndType(e.target.value)}
                      className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="never">Never</option>
                      <option value="date">On Date</option>
                      <option value="after">After Occurrences</option>
                    </select>
                  </div>
                  {recurringEndType === "date" && (
                    <div>
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        min={dueDate || undefined}
                        className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {recurringEndType === "after" && (
                    <div>
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        Occurrences
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={recurringEndAfter}
                        onChange={(e) => setRecurringEndAfter(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                {previewDates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-200">
                    <p className="text-xs text-indigo-600 mb-1">
                      Next occurrences (preview):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewDates.slice(0, 5).map((d) => (
                        <span
                          key={d}
                          className="inline-block px-2 py-0.5 bg-white text-indigo-600 text-[10px] rounded border border-indigo-100"
                        >
                          {d}
                        </span>
                      ))}
                      {previewDates.length > 5 && (
                        <span className="text-[10px] text-indigo-500 self-center">
                          ...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attributes Row */}
            {/* Attributes Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
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
                  <option value="To-Do">To-Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary">
                  Weightage
                </label>
                <input
                  type="number"
                  min="0"
                  value={weightage}
                  onChange={(e) => setWeightage(e.target.value)}
                  placeholder="1-10 (Story Points)"
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
                />
              </div>
            </div>

            {/* Subtasks Section */}
            <div className="mt-6 pt-6 border-t border-subtle">
              <label className="block text-sm font-medium text-content-secondary mb-3">
                Subtasks
              </label>
              <div className="space-y-2 mb-3">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={(e) => {
                        const next = [...subtasks];
                        next[idx].completed = e.target.checked;
                        setSubtasks(next);
                      }}
                      className="rounded border-subtle"
                    />
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => {
                        const next = [...subtasks];
                        next[idx].title = e.target.value;
                        setSubtasks(next);
                      }}
                      className="flex-1 bg-transparent border-none text-sm p-0 focus:ring-0"
                      placeholder="Subtask title"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = subtasks.filter((_, i) => i !== idx);
                        setSubtasks(next);
                      }}
                      className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newSubtask.trim()) {
                        setSubtasks([
                          ...subtasks,
                          {
                            id: Math.random().toString(36).slice(2),
                            title: newSubtask.trim(),
                            completed: false,
                          },
                        ]);
                        setNewSubtask("");
                      }
                    }
                  }}
                  placeholder="Add a subtask (Press Enter)"
                  className="flex-1 rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (newSubtask.trim()) {
                      setSubtasks([
                        ...subtasks,
                        {
                          id: Math.random().toString(36).slice(2),
                          title: newSubtask.trim(),
                          completed: false,
                        },
                      ]);
                      setNewSubtask("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button onClick={onClose} variant="secondary" type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!!taskToEdit && !hasChanges}
              >
                {taskToEdit ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </div>

          {/* Right: Metadata panel */}
          <div className="w-[350px] bg-surface flex flex-col shrink-0 border-l border-subtle">
            <div className="p-6 border-b border-subtle space-y-5 bg-white">
              {/* Assignee quick summary */}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-2">
                  Assignees
                </label>
                <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                  {assigneesSelected && assigneesSelected.length > 0 ? (
                    assigneesSelected
                      .filter((a) => a.type === "user")
                      .slice(0, 3)
                      .map((a, i) => {
                        const u = assignees.find((x) => x.id === a.id);
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-full shadow-sm"
                          >
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                              {u?.name?.[0] || "?"}
                            </div>
                            <span className="text-xs text-gray-700 max-w-[80px] truncate">
                              {u?.name || a.id}
                            </span>
                          </div>
                        );
                      })
                  ) : (
                    <span className="text-xs text-content-tertiary italic">
                      Empty
                    </span>
                  )}
                </div>
              </div>

              {/* Dates quick view */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-secondary">
                    Assigned
                  </label>
                  <div className="flex items-center gap-2 text-xs text-content-secondary">
                    <FaRegCalendarAlt className="text-content-tertiary" />
                    {assignedDate || "Empty"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-secondary">
                    Due
                  </label>
                  <div className="flex items-center gap-2 text-xs text-content-secondary">
                    <FaRegCalendarAlt className="text-content-tertiary" />
                    {dueDate || "Empty"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div >
    </div >
  );
}

export default TaskModal;

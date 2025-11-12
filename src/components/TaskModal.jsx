// src/components/TaskModal.jsx
import React, { useState, useEffect } from "react";
import Card from "./Card";
import Button from "./Button";
import DateRangeCalendar from "./calendar/DateRangeCalendar";

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

  // Recurring task fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState("daily");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringEndAfter, setRecurringEndAfter] = useState("");
  const [recurringEndType, setRecurringEndType] = useState("never"); // 'never', 'date', 'after'
  const [rangeDays, setRangeDays] = useState(0);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [previewDates, setPreviewDates] = useState([]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setAssigneeId(taskToEdit.assigneeId || "");
      setAssigneeType(taskToEdit.assigneeType || "user");
      setProjectId(taskToEdit.projectId || "");
      setDueDate(taskToEdit.dueDate || "");
      setAssignedDate(taskToEdit.assignedDate || "");
      setPriority(taskToEdit.priority || "Medium");
      setStatus(taskToEdit.status || "To-Do");
      setWeightage(
        taskToEdit.weightage !== undefined && taskToEdit.weightage !== null
          ? String(taskToEdit.weightage)
          : ""
      );
      setCompletionComment(taskToEdit.completionComment || "");

      // Load recurring task data
      setIsRecurring(taskToEdit.isRecurring || false);
      setRecurringPattern(taskToEdit.recurringPattern || "daily");
      setRecurringInterval(taskToEdit.recurringInterval || 1);
      setRecurringEndDate(taskToEdit.recurringEndDate || "");
      setRecurringEndAfter(taskToEdit.recurringEndAfter || "");
      setRecurringEndType(taskToEdit.recurringEndType || "never");
    }
  }, [taskToEdit]);

  const isClientLocked =
    !!taskToEdit && (taskToEdit.assigneeType || "user") === "client";

  const handleSubmit = (e) => {
    e.preventDefault();
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
      isRecurring,
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
    if (!isRecurring || !dueDate) {
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
    isRecurring,
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <Card className="z-10 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-semibold mb-2">
          {taskToEdit ? "Edit Task" : "Create Task"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-content-secondary">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
            />
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
                  }}
                  className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
                  disabled={isClientLocked}
                >
                  <option value="user">Resource</option>
                  <option value="client">Client</option>
                </select>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-content-primary"
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
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
              />
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

          {/* Recurring Task Section */}
          <div className="border-t border-subtle pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label
                htmlFor="isRecurring"
                className="text-sm font-medium text-content-secondary cursor-pointer"
              >
                Make this a recurring task
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Left: Compact Calendar */}
                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-2">
                      Set duration (drag on calendar)
                    </label>
                    <DateRangeCalendar
                      valueStart={dueDate || null}
                      valueEnd={recurringEndDate || null}
                      onChange={({ start, end, days }) => {
                        setDueDate(start);
                        setRecurringEndDate(end);
                        setRecurringEndType("date");
                        setRangeDays(days);
                      }}
                      minDate={assignedDate || null}
                      compact
                      accent="sky"
                      className="bg-sky-200/40 rounded-lg p-2 border border-sky-300"
                    />
                    {(dueDate || recurringEndDate) && (
                      <p className="mt-2 text-xs text-blue-700">
                        Start: <strong>{dueDate || "—"}</strong> • End:{" "}
                        <strong>{recurringEndDate || "—"}</strong>
                        {rangeDays > 0
                          ? ` • Duration: ${rangeDays} day${
                              rangeDays > 1 ? "s" : ""
                            }`
                          : ""}
                      </p>
                    )}
                  </div>

                  {/* Right: Manual Inputs and Controls */}
                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-1">
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
                        className="w-20 rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                      />
                      <select
                        value={recurringPattern}
                        onChange={(e) => setRecurringPattern(e.target.value)}
                        className="flex-1 rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                      >
                        <option value="daily">Day(s)</option>
                        <option value="weekly">Week(s)</option>
                        <option value="monthly">Month(s)</option>
                        <option value="yearly">Year(s)</option>
                      </select>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Due Date (start)
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Recurring End Date
                        </label>
                        <input
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => {
                            setRecurringEndDate(e.target.value);
                            setRecurringEndType("date");
                          }}
                          min={dueDate || undefined}
                          className="w-full rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                        />
                      </div>
                    </div>
                    {rangeDays > 0 && (
                      <p className="mt-2 text-xs text-content-secondary">
                        Duration from selected range:{" "}
                        <strong>
                          {rangeDays} day{rangeDays > 1 ? "s" : ""}
                        </strong>
                      </p>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-content-secondary mb-1">
                        Ends
                      </label>
                      <select
                        value={recurringEndType}
                        onChange={(e) => setRecurringEndType(e.target.value)}
                        className="w-full rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                      >
                        <option value="never">Never</option>
                        <option value="date">On Date</option>
                        <option value="after">After Occurrences</option>
                      </select>

                      {recurringEndType === "after" && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-content-secondary mb-1">
                            Number of Occurrences
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={recurringEndAfter}
                            onChange={(e) =>
                              setRecurringEndAfter(e.target.value)
                            }
                            placeholder="e.g., 10"
                            className="w-full rounded-md border border-subtle bg-white px-3 py-2 text-sm text-content-primary"
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="skipWeekends"
                          checked={skipWeekends}
                          onChange={(e) => setSkipWeekends(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label
                          htmlFor="skipWeekends"
                          className="text-xs font-medium text-content-secondary cursor-pointer"
                        >
                          Skip weekends
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  <strong>Note:</strong> Recurring tasks will automatically
                  create new instances based on your schedule.
                </div>
                {previewDates.length > 0 && (
                  <div className="mt-3 rounded-md bg-white p-3 border border-subtle">
                    <p className="text-xs font-semibold text-content-secondary mb-1">
                      Upcoming occurrences (preview):
                    </p>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {previewDates.map((d) => (
                        <span
                          key={d}
                          className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-content-tertiary">
                      Based on current pattern & interval. Actual creation
                      occurs after completion.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button onClick={onClose} variant="secondary" type="button">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Task
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default TaskModal;

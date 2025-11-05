// src/components/TaskModal.jsx
import React, { useState, useEffect } from "react";
import Card from "./Card";
import Button from "./Button";

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
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To-Do");
  const [completionComment, setCompletionComment] = useState("");

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
      setCompletionComment(taskToEdit.completionComment || "");
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
      completionComment,
    });
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

          <div className="grid grid-cols-2 gap-4">
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

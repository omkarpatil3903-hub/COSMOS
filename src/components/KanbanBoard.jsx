import React from "react";

// Simple Kanban board with 4 default columns using HTML5 drag-and-drop
// Props:
// - tasks: array of task objects already filtered
// - onMove: function(taskId, newStatus)
// - onEdit: function(task)
// - getProject: function(projectId) -> { name, color }
// - getAssignee: function(userId) -> { name, role }
export default function KanbanBoard({
  tasks,
  onMove,
  onEdit,
  getProject,
  getAssignee,
  wipLimits = {}, // { statusKey: number }
  enforceWip = false,
  onBlocked, // optional callback(status, limit, count)
  // New optional props for inline reassignment controls on each card
  showReassignOnCard = false,
  users = [], // resources only
  onReassign, // function(taskId, encodedValue)
}) {
  const columns = [
    { key: "To-Do", title: "To-Do" },
    { key: "In Progress", title: "In Progress" },
    { key: "In Review", title: "In Review" },
    { key: "Done", title: "Done" },
  ];

  const grouped = Object.fromEntries(columns.map((c) => [c.key, []]));
  tasks.forEach((t) => {
    if (!grouped[t.status]) grouped[t.status] = [];
    grouped[t.status].push(t);
  });

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (e, status) => {
    const count = (grouped[status] || []).length;
    const limit = wipLimits?.[status];
    const blocked = enforceWip && Number.isFinite(limit) && count >= limit;
    if (blocked) {
      // don't call preventDefault -> drop not allowed
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    const count = (grouped[status] || []).length;
    const limit = wipLimits?.[status];
    const blocked = enforceWip && Number.isFinite(limit) && count >= limit;
    if (blocked) {
      onBlocked?.(status, limit, count);
      return;
    }
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onMove(taskId, status);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const count = grouped[col.key]?.length || 0;
        const limit = wipLimits?.[col.key];
        const hasLimit = Number.isFinite(limit);
        const atLimit = hasLimit && count === limit;
        const overLimit = hasLimit && count > limit;
        const headerClass = overLimit
          ? "bg-red-50"
          : atLimit
          ? "bg-amber-50"
          : "";
        const countClass = overLimit
          ? "text-red-600"
          : atLimit
          ? "text-amber-600"
          : "text-content-tertiary";

        return (
          <div
            key={col.key}
            className="flex min-h-[300px] flex-col rounded-lg border border-subtle bg-surface"
          >
            <div
              className={`flex items-center justify-between border-b border-subtle p-3 ${headerClass}`}
            >
              <div className="text-sm font-semibold text-content-secondary">
                {col.title}
              </div>
              <div className={`text-xs ${countClass}`}>
                {hasLimit ? (
                  <span>
                    {count} / {limit}
                  </span>
                ) : (
                  <span>{count}</span>
                )}
              </div>
            </div>

            <div
              className="flex-1 space-y-3 p-3"
              onDragOver={(e) => allowDrop(e, col.key)}
              onDrop={(e) => onDrop(e, col.key)}
            >
              {(grouped[col.key] || []).map((t) => {
                const project = getProject?.(t.projectId);
                const assignee = getAssignee?.(t.assigneeId);
                const isClient = !!assignee?.clientName;
                const assigneeLabel = isClient
                  ? `${assignee.clientName}${
                      assignee.companyName ? ` (${assignee.companyName})` : ""
                    }`
                  : assignee?.name || "Unassigned";
                const overdue =
                  t.dueDate &&
                  t.dueDate < new Date().toISOString().slice(0, 10) &&
                  t.status !== "Done";

                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, t.id)}
                    onClick={() => onEdit?.(t)}
                    className={`cursor-move rounded-lg border p-3 hover:border-indigo-300 ${
                      overdue
                        ? "border-red-300 bg-red-50"
                        : "border-subtle bg-surface"
                    } ${t.archived ? "opacity-70" : ""}`}
                    title="Drag to another column to change status"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="font-medium text-content-primary line-clamp-2">
                        {t.title}
                      </div>
                      {overdue && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          Overdue
                        </span>
                      )}
                      {t.archived && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="mb-2 text-xs text-content-secondary line-clamp-3">
                      {t.description}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-content-tertiary">
                      <span
                        className="rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: (project?.color || "#6b7280") + "20",
                          color: project?.color || "#6b7280",
                        }}
                      >
                        {project?.name || "—"}
                      </span>
                      <span>
                        {assigneeLabel}
                        {!isClient && assignee?.role
                          ? ` (${assignee.role})`
                          : isClient
                          ? " (Client)"
                          : ""}
                      </span>
                      {t.dueDate && (
                        <span>
                          Due: {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {t.priority && (
                        <span
                          className={
                            t.priority === "High"
                              ? "rounded bg-red-100 px-1.5 py-0.5 text-red-700"
                              : t.priority === "Medium"
                              ? "rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700"
                              : "rounded bg-green-100 px-1.5 py-0.5 text-green-700"
                          }
                        >
                          {t.priority}
                        </span>
                      )}
                      {showReassignOnCard &&
                        (t.assigneeType || "user") !== "client" && (
                          <select
                            value={
                              t.assigneeType === "user" && t.assigneeId
                                ? `user:${t.assigneeId}`
                                : ":"
                            }
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onReassign?.(t.id, e.target.value)}
                            className="rounded-md border border-subtle bg-surface px-2 py-1 text-[11px]"
                            title="Reassign to resource"
                          >
                            <option value=":">Reassign...</option>
                            {users.map((u) => (
                              <option key={u.id} value={`user:${u.id}`}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { FaFlag, FaCalendarAlt, FaDownload } from "react-icons/fa";
import { getPriorityBadge } from "../utils/colorMaps";
import toast from "react-hot-toast";
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

  // Function to download all images for a task
  const handleDownloadImages = (task, e) => {
    e.stopPropagation(); // Prevent task edit modal from opening

    if (!task.images || task.images.length === 0) {
      toast.error("No images available for download");
      return;
    }

    toast.success(`📥 Downloading ${task.images.length} image(s) from "${task.title}"`);

    task.images.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = img.name || `${task.title}_image_${index + 1}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // Stagger downloads by 500ms to avoid browser blocking
    });
  };
  const columns = [
    { key: "To-Do", title: "To-Do" },
    { key: "In Progress", title: "In Progress" },
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  ? `${assignee.clientName}${assignee.companyName ? ` (${assignee.companyName})` : ""
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
                    className={`cursor-move rounded-lg border p-3 hover:border-indigo-300 ${overdue
                      ? "border-red-300 bg-red-50"
                      : "border-subtle bg-surface"
                      } ${t.archived ? "opacity-70" : ""}`}
                    title="Drag to another column to change status"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-content-primary line-clamp-2">
                          {t.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Download button - only show if task has images uploaded by client */}
                        {t.images && t.images.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={(e) => handleDownloadImages(t, e)}
                              className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                              title={`Download ${t.images.length} image(s) uploaded by client`}
                            >
                              <FaDownload className="text-xs" />
                            </button>
                            {/* Badge showing number of images */}
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {t.images.length}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          {t.priority && (
                            <span
                              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getPriorityBadge(
                                t.priority
                              )}`}
                            >
                              <FaFlag />
                              <span>{t.priority}</span>
                            </span>
                          )}
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
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-content-secondary line-clamp-3">
                      {t.description}
                    </div>
                    {t.status === "Done" && t.completionComment && (
                      <div className="mt-1 text-[11px] italic text-indigo-700 line-clamp-1">
                        💬 {t.completionComment}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {t.status === "In Progress" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${t.progressPercent || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 whitespace-nowrap">
                          {t.progressPercent || 0}%
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-content-tertiary">
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
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${t.dueDate &&
                          t.status !== "Done" &&
                          t.dueDate < new Date().toISOString().slice(0, 10)
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        <FaCalendarAlt className="text-current" />
                        <span className="font-bold">Due:</span>
                        <span>
                          {t.dueDate
                            ? new Date(t.dueDate).toLocaleDateString()
                            : "No due"}
                        </span>
                      </span>
                      {t.assignedDate && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-700">
                          <FaCalendarAlt className="text-purple-600" />
                          <span className="font-bold">Assigned:</span>
                          <span>{new Date(t.assignedDate).toLocaleDateString()}</span>
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

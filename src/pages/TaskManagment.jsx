import React, { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import KanbanBoard from "../components/KanbanBoard";
import TaskModal from "../components/TaskModal";
import {
  FaDownload,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaListAlt,
} from "react-icons/fa";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const tsToISO = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return typeof v === "string" ? v : null;
};

function TasksManagement() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [filterProject, setFilterProject] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterAssigneeType, setFilterAssigneeType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const wipLimits = useMemo(
    () => ({ "To-Do": 8, "In Progress": 5, "In Review": 4 }),
    []
  );

  useEffect(() => {
    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), orderBy("createdAt", "desc")),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: data.title || "",
            description: data.description || "",
            assigneeId: data.assigneeId || "",
            assigneeType: data.assigneeType || "user",
            projectId: data.projectId || "",
            dueDate: data.dueDate?.toDate
              ? data.dueDate.toDate().toISOString().slice(0, 10)
              : data.dueDate || "",
            priority: data.priority || "Medium",
            status: data.status || "To-Do",
            createdAt: tsToISO(data.createdAt) || new Date().toISOString(),
            completedAt: tsToISO(data.completedAt),
            archived: !!data.archived,
          };
        });
        setTasks(list);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), orderBy("projectName", "asc")),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            name: data.projectName || data.name || "",
          };
        });
        setProjects(list);
      }
    );

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubUsers();
      unsubClients();
    };
  }, []);

  useEffect(() => {
    const checkDeadlines = () => {
      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      tasks.forEach((task) => {
        if (task.status !== "Done" && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate >= today && dueDate <= threeDaysFromNow) {
            const daysUntil = Math.ceil(
              (dueDate - today) / (1000 * 60 * 60 * 24)
            );
            const assignee = users.find((u) => u.id === task.assigneeId);
            toast(
              `⚠ Task "${
                task.title
              }" due in ${daysUntil} day(s) (Assigned to: ${
                assignee?.name || "Unassigned"
              })`,
              { duration: 5000, icon: "⏰" }
            );
          }
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tasks, users]);

  const projectById = useCallback(
    (id) => projects.find((p) => p.id === id),
    [projects]
  );
  const assigneeById = useCallback(
    (id) => users.find((u) => u.id === id) || clients.find((c) => c.id === id),
    [users, clients]
  );

  // Keep Assignee filter coherent with segmented Assignee Type control
  useEffect(() => {
    setFilterAssignee("");
  }, [filterAssigneeType]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  // WIP check helper for modal save/edit (enforced outside drag and drop)
  const isWipExceeded = useCallback(
    (targetStatus, excludeTaskId) => {
      const limit = wipLimits?.[targetStatus];
      if (!Number.isFinite(limit)) return false;
      const count = tasks.filter(
        (t) =>
          !t.archived && t.status === targetStatus && t.id !== excludeTaskId
      ).length;
      return count >= limit;
    },
    [tasks, wipLimits]
  );

  const handleSave = async (taskData) => {
    try {
      if (taskData.id) {
        const ref = doc(db, "tasks", taskData.id);
        const update = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          projectId: taskData.projectId || "",
          dueDate: taskData.dueDate || "",
          priority: taskData.priority || "Medium",
          status: taskData.status || "To-Do",
        };
        const current = tasks.find((t) => t.id === taskData.id);
        // Enforce WIP on status change (only for active columns)
        if (
          update.status &&
          current &&
          update.status !== current.status &&
          update.status !== "Done" &&
          isWipExceeded(update.status, taskData.id)
        ) {
          const limit = wipLimits?.[update.status];
          toast.error(
            `WIP limit reached in ${update.status} (${limit}). Complete or move tasks out before adding more.`
          );
          return;
        }
        if (update.status === "Done" && current?.status !== "Done")
          update.completedAt = serverTimestamp();
        else if (update.status !== "Done" && current?.status === "Done")
          update.completedAt = null;
        await updateDoc(ref, update);
        toast.success("Task updated successfully!");
      } else {
        // Enforce WIP on creation
        const initialStatus = taskData.status || "To-Do";
        if (initialStatus !== "Done" && isWipExceeded(initialStatus)) {
          const limit = wipLimits?.[initialStatus];
          toast.error(
            `WIP limit reached in ${initialStatus} (${limit}). Complete or move tasks out before adding more.`
          );
          return;
        }
        const payload = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          projectId: taskData.projectId || "",
          dueDate: taskData.dueDate || "",
          priority: taskData.priority || "Medium",
          status: taskData.status || "To-Do",
          createdAt: serverTimestamp(),
          completedAt: taskData.status === "Done" ? serverTimestamp() : null,
          archived: false,
        };
        await addDoc(collection(db, "tasks"), payload);
        toast.success("Task created successfully!");
        const res = users.find((u) => u.id === payload.assigneeId);
        const cli = clients.find((c) => c.id === payload.assigneeId);
        const name = res?.name || cli?.clientName;
        if (name) toast(`📌 New task assigned to ${name}`, { duration: 4000 });
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save task", err);
      toast.error("Failed to save task");
    }
  };

  const handleEdit = (task) => {
    setEditing(task);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
      toast.success("Task deleted!");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (checked, list) => {
    if (checked) setSelectedIds(new Set(list.map((t) => t.id)));
    else setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return toast.error("No tasks selected");
    if (!window.confirm(`Delete ${selectedIds.size} selected task(s)?`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteDoc(doc(db, "tasks", id)))
      );
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} task(s)!`);
    } catch (err) {
      console.error("Bulk delete failed", err);
      toast.error("Bulk delete failed");
    }
  };

  const handleArchive = () => {
    if (selectedIds.size === 0) return toast.error("No tasks selected");
    const ids = Array.from(selectedIds);
    Promise.all(
      ids.map((id) => updateDoc(doc(db, "tasks", id), { archived: true }))
    )
      .then(() => {
        toast.success(`Archived ${ids.length} task(s)!`);
        setSelectedIds(new Set());
      })
      .catch((err) => {
        console.error("Archive failed", err);
        toast.error("Failed to archive");
      });
  };

  const handleUnarchive = () => {
    if (selectedIds.size === 0) return toast.error("No tasks selected");
    const ids = Array.from(selectedIds);
    Promise.all(
      ids.map((id) => updateDoc(doc(db, "tasks", id), { archived: false }))
    )
      .then(() => {
        toast.success(`Unarchived ${ids.length} task(s)!`);
        setSelectedIds(new Set());
      })
      .catch((err) => {
        console.error("Unarchive failed", err);
        toast.error("Failed to unarchive");
      });
  };

  const clearFilters = () => {
    setSearch("");
    setFilterProject("");
    setFilterAssignee("");
    setFilterAssigneeType("");
    setFilterPriority("");
    setFilterStatus("");
    setShowArchived(false);
  };

  const markDone = async (id) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === "Done") return;
    try {
      await updateDoc(doc(db, "tasks", id), {
        status: "Done",
        completedAt: serverTimestamp(),
      });
      toast.success(`Task "${t.title}" marked as done!`);
    } catch (err) {
      console.error("Mark done failed", err);
      toast.error("Failed to mark as done");
    }
  };

  const reassignTask = async (taskId, encoded) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if ((task.assigneeType || "user") === "client") {
      toast.error("Client tasks cannot be reassigned");
      return;
    }
    const [newType, newAssigneeId] = (encoded || ":").split(":");
    const oldRes = users.find((u) => u.id === task.assigneeId);
    const oldCli = clients.find((c) => c.id === task.assigneeId);
    const newRes = users.find((u) => u.id === newAssigneeId);
    const newCli = clients.find((c) => c.id === newAssigneeId);
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        assigneeId: newAssigneeId || "",
        assigneeType: newType || (newRes ? "user" : newCli ? "client" : "user"),
      });
      toast.success(
        `Task reassigned from ${
          oldRes?.name || oldCli?.clientName || "Unassigned"
        } to ${newRes?.name || newCli?.clientName || "Unassigned"}`
      );
    } catch (err) {
      console.error("Reassign failed", err);
      toast.error("Failed to reassign");
    }
  };

  const moveTask = async (taskId, newStatus) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const wasDone = t.status === "Done";
    const willBeDone = newStatus === "Done";
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        completedAt: willBeDone
          ? serverTimestamp()
          : wasDone
          ? null
          : t.completedAt || null,
      });
    } catch (err) {
      console.error("Move failed", err);
      toast.error("Failed to move task");
    }
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (filterProject && t.projectId !== filterProject) return false;
      if (
        filterAssigneeType &&
        (t.assigneeType || "user") !== filterAssigneeType
      )
        return false;
      if (filterAssignee) {
        const [type, id] = filterAssignee.split(":");
        if (t.assigneeType !== type || t.assigneeId !== id) return false;
      }
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        const project = projects.find((p) => p.id === t.projectId);
        const assignee =
          users.find((u) => u.id === t.assigneeId) ||
          clients.find((c) => c.id === t.assigneeId);
        const searchText = `${t.title} ${t.description} ${
          project?.name || ""
        } ${assignee?.name || assignee?.clientName || ""}`.toLowerCase();
        if (!searchText.includes(s)) return false;
      }
      return true;
    });
  }, [
    tasks,
    showArchived,
    filterProject,
    filterAssignee,
    filterAssigneeType,
    filterPriority,
    filterStatus,
    search,
    projects,
    users,
    clients,
  ]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  const counts = useMemo(() => {
    const c = { "To-Do": 0, "In Progress": 0, "In Review": 0, Done: 0 };
    activeTasks.forEach((t) => {
      if (c[t.status] !== undefined) c[t.status] += 1;
    });
    return c;
  }, [activeTasks]);

  const progressPct = useMemo(() => {
    if (activeTasks.length === 0) return 0;
    const done = activeTasks.filter((t) => t.status === "Done").length;
    return Math.round((done / activeTasks.length) * 100);
  }, [activeTasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return activeTasks.filter(
      (t) => t.dueDate && t.dueDate < today && t.status !== "Done"
    );
  }, [activeTasks]);

  const projectMetrics = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = activeTasks.filter(
        (t) => t.projectId === project.id
      );
      const completed = projectTasks.filter((t) => t.status === "Done").length;
      const pending = projectTasks.filter((t) => t.status !== "Done").length;
      const overdue = projectTasks.filter((t) => {
        const today = new Date().toISOString().slice(0, 10);
        return t.dueDate && t.dueDate < today && t.status !== "Done";
      }).length;
      const progress =
        projectTasks.length > 0
          ? Math.round((completed / projectTasks.length) * 100)
          : 0;
      return {
        projectId: project.id,
        projectName: project.name,
        total: projectTasks.length,
        completed,
        pending,
        overdue,
        progress,
      };
    });
  }, [activeTasks, projects]);

  const employeeWorkload = useMemo(() => {
    return users.map((user) => {
      const userTasks = activeTasks.filter(
        (t) => t.assigneeId === user.id && (t.assigneeType || "user") === "user"
      );
      const completed = userTasks.filter((t) => t.status === "Done").length;
      const pending = userTasks.filter((t) => t.status !== "Done").length;
      return {
        userId: user.id,
        userName: user.name,
        role: user.role,
        total: userTasks.length,
        completed,
        pending,
      };
    });
  }, [activeTasks, users]);

  const clientWorkload = useMemo(() => {
    return clients.map((client) => {
      const clientTasks = activeTasks.filter(
        (t) =>
          t.assigneeId === client.id && (t.assigneeType || "user") === "client"
      );
      const completed = clientTasks.filter((t) => t.status === "Done").length;
      const pending = clientTasks.filter((t) => t.status !== "Done").length;
      return {
        clientId: client.id,
        clientName: client.clientName,
        companyName: client.companyName,
        total: clientTasks.length,
        completed,
        pending,
      };
    });
  }, [activeTasks, clients]);

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Tasks");
      worksheet.columns = [
        { header: "Task ID", key: "id", width: 15 },
        { header: "Title", key: "title", width: 30 },
        { header: "Description", key: "description", width: 40 },
        { header: "Project", key: "project", width: 25 },
        { header: "Assigned To", key: "assignee", width: 20 },
        { header: "Assignee Type", key: "assigneeType", width: 16 },
        { header: "Status", key: "status", width: 15 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Due Date", key: "dueDate", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
        { header: "Completed At", key: "completedAt", width: 20 },
      ];
      filtered.forEach((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        const assignee =
          users.find((u) => u.id === t.assigneeId) ||
          clients.find((c) => c.id === t.assigneeId);
        worksheet.addRow({
          id: t.id,
          title: t.title,
          description: t.description,
          project: project?.name || "",
          assignee: assignee?.name || assignee?.clientName || "Unassigned",
          assigneeType:
            (t.assigneeType || "user") === "client" ? "Client" : "Resource",
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate || "",
          createdAt: new Date(t.createdAt).toLocaleString(),
          completedAt: t.completedAt
            ? new Date(t.completedAt).toLocaleString()
            : "",
        });
      });
      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" },
      };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tasks exported to Excel!");
    } catch (e) {
      console.error("Excel export failed", e);
      toast.error("Failed to export to Excel");
    }
  };

  return (
    <div>
      <PageHeader
        title="Task Management"
        description="Create, assign, track, and analyze tasks across all projects."
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">To-Do</div>
                <div className="mt-1 text-2xl font-semibold">
                  {counts["To-Do"]}
                </div>
              </div>
              <FaListAlt className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">
                  In Progress
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {counts["In Progress"]}
                </div>
              </div>
              <FaClock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">In Review</div>
                <div className="mt-1 text-2xl font-semibold">
                  {counts["In Review"]}
                </div>
              </div>
              <FaClock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">Completed</div>
                <div className="mt-1 text-2xl font-semibold">{counts.Done}</div>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">Overdue</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">
                  {overdueTasks.length}
                </div>
              </div>
              <FaExclamationTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-content-secondary">
                  Overall Progress
                </span>
                <span className="font-semibold text-content-primary">
                  {progressPct}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-subtle bg-surface">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-content-tertiary">
                {counts.Done} of {tasks.length} tasks completed
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
              />

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Assignees</option>
                {(!filterAssigneeType || filterAssigneeType === "user") && (
                  <optgroup label="Resources">
                    {users.map((u) => (
                      <option key={u.id} value={`user:${u.id}`}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {(!filterAssigneeType || filterAssigneeType === "client") && (
                  <optgroup label="Clients">
                    {clients.map((c) => (
                      <option key={c.id} value={`client:${c.id}`}>
                        {c.clientName}{" "}
                        {c.companyName ? `(${c.companyName})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Priorities</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Statuses</option>
                <option>To-Do</option>
                <option>In Progress</option>
                <option>In Review</option>
                <option>Done</option>
              </select>

              <Button
                variant="secondary"
                onClick={clearFilters}
                className="ml-auto"
              >
                Clear Filters
              </Button>
              <label className="flex items-center gap-2 text-sm text-content-primary ml-2">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show Archived
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleExportExcel}>
                  <FaDownload /> Export Excel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowReportModal(true)}
                >
                  View Reports
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="mr-2 flex items-center rounded-lg border border-subtle p-0.5">
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${
                      filterAssigneeType === ""
                        ? "bg-indigo-600 text-white"
                        : "text-content-primary"
                    }`}
                    onClick={() => setFilterAssigneeType("")}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${
                      filterAssigneeType === "user"
                        ? "bg-indigo-600 text-white"
                        : "text-content-primary"
                    }`}
                    onClick={() => setFilterAssigneeType("user")}
                    type="button"
                  >
                    Resources
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${
                      filterAssigneeType === "client"
                        ? "bg-indigo-600 text-white"
                        : "text-content-primary"
                    }`}
                    onClick={() => setFilterAssigneeType("client")}
                    type="button"
                  >
                    Clients
                  </button>
                </div>
                <div className="mr-2 flex items-center rounded-lg border border-subtle p-0.5">
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${
                      view === "list"
                        ? "bg-indigo-600 text-white"
                        : "text-content-primary"
                    }`}
                    onClick={() => setView("list")}
                    title="List view"
                  >
                    List
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${
                      view === "board"
                        ? "bg-indigo-600 text-white"
                        : "text-content-primary"
                    }`}
                    onClick={() => setView("board")}
                    title="Board view"
                  >
                    Board
                  </button>
                </div>
                <Button variant="secondary" onClick={handleArchive}>
                  Archive Selected
                </Button>
                <Button variant="secondary" onClick={handleUnarchive}>
                  Unarchive Selected
                </Button>
                <Button variant="danger" onClick={handleBulkDelete}>
                  Delete Selected
                </Button>
                <Button onClick={openCreate} variant="primary">
                  + Create Task
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          {view === "board" ? (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-content-tertiary">
                  No tasks found
                </div>
              ) : (
                <KanbanBoard
                  tasks={filtered}
                  onMove={moveTask}
                  onEdit={handleEdit}
                  getProject={projectById}
                  getAssignee={assigneeById}
                  wipLimits={wipLimits}
                  enforceWip
                  onBlocked={(status, limit) =>
                    toast.error(
                      `WIP limit reached in ${status} (${limit}). Complete or move tasks out before adding more.`
                    )
                  }
                  showReassignOnCard
                  users={users}
                  onReassign={(taskId, value) => reassignTask(taskId, value)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-content-tertiary">
                  No tasks found
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-2 py-2 border-b border-subtle">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === filtered.length
                      }
                      onChange={(e) => selectAll(e.target.checked, filtered)}
                      title="Select all visible"
                    />
                    <div className="text-sm text-content-secondary">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : `${filtered.length} tasks`}
                    </div>
                  </div>
                  {filtered.map((t) => {
                    const project = projectById(t.projectId);
                    const assignee = assigneeById(t.assigneeId);
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg border border-subtle p-3 hover:bg-surface-subtle"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            title="Select task"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-content-primary">
                                  {t.title}
                                </div>
                                {t.description && (
                                  <p className="mt-1 text-sm text-content-secondary">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-xs text-content-tertiary whitespace-nowrap">
                                {t.dueDate
                                  ? new Date(t.dueDate).toLocaleDateString()
                                  : "No due"}
                                {t.dueDate &&
                                  t.status !== "Done" &&
                                  t.dueDate <
                                    new Date().toISOString().slice(0, 10) && (
                                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                      Overdue
                                    </span>
                                  )}
                                {t.archived && (
                                  <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                    Archived
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-content-tertiary">
                              <div>
                                <span className="font-medium">Project:</span>{" "}
                                {project?.name || "—"}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Assigned to:
                                </span>{" "}
                                {assignee?.name ||
                                  assignee?.clientName ||
                                  "Unassigned"}
                                {assignee?.clientName && assignee?.companyName
                                  ? ` (${assignee.companyName})`
                                  : ""}
                                {assignee?.role
                                  ? ` (${assignee.role})`
                                  : assignee?.clientName
                                  ? " (Client)"
                                  : ""}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>{" "}
                                {t.status}
                              </div>
                              <div>
                                <span className="font-medium">Priority:</span>{" "}
                                {t.priority}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {t.status !== "Done" && (
                                <button
                                  onClick={() => markDone(t.id)}
                                  className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-200"
                                >
                                  Mark Done
                                </button>
                              )}
                              {(t.assigneeType || "user") !== "client" && (
                                <select
                                  value={`${t.assigneeType || "user"}:${
                                    t.assigneeId || ""
                                  }`}
                                  onChange={(e) =>
                                    reassignTask(t.id, e.target.value)
                                  }
                                  className="rounded-md border border-subtle bg-surface px-2 py-1 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value=":">Reassign...</option>
                                  <optgroup label="Resources">
                                    {users.map((u) => (
                                      <option key={u.id} value={`user:${u.id}`}>
                                        {u.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              )}
                              <button
                                onClick={() => handleEdit(t)}
                                className="rounded-md bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 transition hover:bg-yellow-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          taskToEdit={editing}
          projects={projects}
          assignees={users}
          clients={clients}
        />
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowReportModal(false)}
          />
          <Card className="z-10 w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Task Reports & Analytics
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
              >
                ✕
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-semibold">Summary Metrics</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-subtle bg-surface-subtle p-4">
                    <div className="text-sm text-content-secondary">
                      Total Tasks
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {tasks.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle bg-surface-subtle p-4">
                    <div className="text-sm text-content-secondary">
                      Completed
                    </div>
                    <div className="mt-1 text-2xl font-bold text-green-600">
                      {counts.Done}
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle bg-surface-subtle p-4">
                    <div className="text-sm text-content-secondary">
                      Pending
                    </div>
                    <div className="mt-1 text-2xl font-bold text-blue-600">
                      {counts["To-Do"] +
                        counts["In Progress"] +
                        counts["In Review"]}
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle bg-surface-subtle p-4">
                    <div className="text-sm text-content-secondary">
                      Overdue
                    </div>
                    <div className="mt-1 text-2xl font-bold text-red-600">
                      {overdueTasks.length}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold">
                  Project-Level Progress
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-subtle">
                        <th className="pb-2 text-left font-semibold">
                          Project
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Total
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Completed
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Pending
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Overdue
                        </th>
                        <th className="pb-2 text-left font-semibold">
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectMetrics.map((pm) => (
                        <tr
                          key={pm.projectId}
                          className="border-b border-subtle"
                        >
                          <td className="py-3">{pm.projectName}</td>
                          <td className="py-3 text-center">{pm.total}</td>
                          <td className="py-3 text-center text-green-600">
                            {pm.completed}
                          </td>
                          <td className="py-3 text-center text-blue-600">
                            {pm.pending}
                          </td>
                          <td className="py-3 text-center text-red-600">
                            {pm.overdue}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full bg-indigo-600"
                                  style={{ width: `${pm.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {pm.progress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold">
                  Employee Workload Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-subtle">
                        <th className="pb-2 text-left font-semibold">
                          Employee
                        </th>
                        <th className="pb-2 text-left font-semibold">Role</th>
                        <th className="pb-2 text-center font-semibold">
                          Total Tasks
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Completed
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Pending
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeWorkload.map((ew) => (
                        <tr key={ew.userId} className="border-b border-subtle">
                          <td className="py-3 font-medium">{ew.userName}</td>
                          <td className="py-3 text-content-secondary">
                            {ew.role}
                          </td>
                          <td className="py-3 text-center">{ew.total}</td>
                          <td className="py-3 text-center text-green-600">
                            {ew.completed}
                          </td>
                          <td className="py-3 text-center text-blue-600">
                            {ew.pending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold">
                  Client Workload Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-subtle">
                        <th className="pb-2 text-left font-semibold">Client</th>
                        <th className="pb-2 text-left font-semibold">
                          Company
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Total Tasks
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Completed
                        </th>
                        <th className="pb-2 text-center font-semibold">
                          Pending
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientWorkload.map((cw) => (
                        <tr
                          key={cw.clientId}
                          className="border-b border-subtle"
                        >
                          <td className="py-3 font-medium">{cw.clientName}</td>
                          <td className="py-3 text-content-secondary">
                            {cw.companyName}
                          </td>
                          <td className="py-3 text-center">{cw.total}</td>
                          <td className="py-3 text-center text-green-600">
                            {cw.completed}
                          </td>
                          <td className="py-3 text-center text-blue-600">
                            {cw.pending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowReportModal(false)}
              >
                Close
              </Button>
              <Button variant="primary" onClick={handleExportExcel}>
                <FaDownload /> Export Report
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default TasksManagement;

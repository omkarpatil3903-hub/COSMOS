import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import KanbanBoard from "../components/KanbanBoard";
import TaskModal from "../components/TaskModal";
import TaskListItem from "../components/TaskManagment/TaskListItem";
import TaskViewModal from "../components/TaskManagment/TaskViewModal";
import {
  shouldCreateNextInstanceAsync,
  createNextRecurringInstance,
} from "../utils/recurringTasks";
import CompletionCommentModal from "../components/CompletionCommentModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import {
  FaDownload,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaListAlt,
  FaList,
  FaTh,
  FaClipboardList,
  FaSpinner,
} from "react-icons/fa";

import { db } from "../firebase";
import { updateProjectProgress } from "../utils/projectProgress";
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

// Determine if a user/resource is active based on common fields
const isUserActive = (u) => {
  if (!u) return false;
  const status = (u.status || u.Status || "").toString().toLowerCase();
  const explicitlyInactive =
    u.active === false ||
    u.isActive === false ||
    u.disabled === true ||
    u.isDisabled === true ||
    ["inactive", "disabled", "blocked", "deactivated", "archived"].includes(
      status
    );
  if (explicitlyInactive) return false;
  // If any explicit true flags are set, treat as active
  if (u.active === true || u.isActive === true) return true;
  // Default to active when no explicit inactive indicators are present
  return true;
};

const statusIcons = {
  "To-Do": <FaClipboardList />,
  "In Progress": <FaSpinner className="animate-spin" />,
  Done: <FaCheckCircle />,
};

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
  const [showArchived, setShowArchived] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [filterProject, setFilterProject] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterAssigneeType, setFilterAssigneeType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const tasksListRef = useRef(null);

  const scrollToTasksList = useCallback(() => {
    if (tasksListRef.current) {
      tasksListRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const applyStatusQuickFilter = useCallback(
    (status) => {
      setOnlyOverdue(false);
      setSearch("");
      setFilterProject("");
      setFilterAssignee("");
      setFilterAssigneeType("");
      setFilterPriority("");
      setFilterStatus(status);
      setShowArchived(false);
      setView("list");
      setTimeout(scrollToTasksList, 0);
    },
    [scrollToTasksList]
  );

  const applyOverdueQuickFilter = useCallback(() => {
    setOnlyOverdue(true);
    setSearch("");
    setFilterProject("");
    setFilterAssignee("");
    setFilterAssigneeType("");
    setFilterPriority("");
    setFilterStatus("");
    setShowArchived(false);
    setView("list");
    setTimeout(scrollToTasksList, 0);
  }, [scrollToTasksList]);

  const wipLimits = useMemo(() => ({}), []);

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
            assignedDate: data.assignedDate?.toDate
              ? data.assignedDate.toDate().toISOString().slice(0, 10)
              : data.assignedDate || "",
            dueDate: data.dueDate?.toDate
              ? data.dueDate.toDate().toISOString().slice(0, 10)
              : data.dueDate || "",
            priority: data.priority || "Medium",
            status:
              (data.status === "In Review" ? "In Progress" : data.status) ||
              "To-Do",
            progressPercent: data.progressPercent ?? 0,
            createdAt: tsToISO(data.createdAt) || new Date().toISOString(),
            completedAt: tsToISO(data.completedAt),
            completionComment: data.completionComment || "",
            completedBy: data.completedBy || "",
            completedByType: data.completedByType || "",
            weightage:
              typeof data.weightage === "number"
                ? data.weightage
                : typeof data.weightage === "string" &&
                  data.weightage.trim() !== "" &&
                  !isNaN(Number(data.weightage))
                  ? Number(data.weightage)
                  : null,
            archived: !!data.archived,
            isRecurring: data.isRecurring || false,
            recurringPattern: data.recurringPattern || "daily",
            recurringInterval: data.recurringInterval || 1,
            recurringEndDate: data.recurringEndDate || "",
            recurringEndAfter: data.recurringEndAfter || "",
            recurringEndType: data.recurringEndType || "never",
            parentRecurringTaskId: data.parentRecurringTaskId || null,
            recurringOccurrenceCount: data.recurringOccurrenceCount || 0,
          };
        });
        setTasks(list);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), orderBy("projectName", "asc")),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              ...data,
              name: data.projectName || data.name || "",
            };
          })
          .filter((p) => !p.deleted && !p.isDeleted); // Filter out soft-deleted projects
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

  // Ref to track if we've already checked deadlines in this session to prevent spam
  const hasCheckedDeadlines = useRef(false);

  useEffect(() => {
    const checkDeadlines = () => {
      // Only run this check once per session or on long intervals, not on every render
      if (hasCheckedDeadlines.current) return;

      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      const dueSoonTasks = tasks.filter((task) => {
        if (task.status === "Done" || !task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= threeDaysFromNow;
      });

      if (dueSoonTasks.length > 0) {
        // Show a single summary toast instead of spamming for each task
        const message = dueSoonTasks.length === 1
          ? `⚠ Task "${dueSoonTasks[0].title}" is due shortly.`
          : `⚠ You have ${dueSoonTasks.length} tasks due within the next 3 days.`;

        toast(message, { duration: 6000, icon: "⏰" });
        hasCheckedDeadlines.current = true;
      }
    };

    // Small delay to ensure data is loaded
    if (tasks.length > 0) {
      const timer = setTimeout(checkDeadlines, 2000);
      return () => clearTimeout(timer);
    }
  }, [tasks]); // We still depend on tasks, but the ref prevents re-running logic repeatedly

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

  // Clear assignee selection when project filter changes to avoid stale selection
  useEffect(() => {
    setFilterAssignee("");
  }, [filterProject]);

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
        const wt =
          taskData.weightage === "" ||
            taskData.weightage === undefined ||
            taskData.weightage === null
            ? null
            : Number(taskData.weightage);
        const update = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          projectId: taskData.projectId || "",
          assignedDate: taskData.assignedDate || "",
          dueDate: taskData.dueDate || "",
          priority: taskData.priority || "Medium",
          status: taskData.status || "To-Do",
          progressPercent:
            taskData.status === "Done" ? 100 : taskData.progressPercent ?? 0,
          completionComment: taskData.completionComment || "",
          weightage: Number.isNaN(wt) ? null : wt,
          isRecurring: taskData.isRecurring || false,
          recurringPattern: taskData.recurringPattern || "daily",
          recurringInterval: taskData.recurringInterval || 1,
          recurringEndDate: taskData.recurringEndDate || "",
          recurringEndAfter: taskData.recurringEndAfter || "",
          recurringEndType: taskData.recurringEndType || "never",
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
        // If task just transitioned to Done and is recurring, create next instance immediately
        try {
          const becameDone =
            update.status === "Done" && current?.status !== "Done";
          if (becameDone && (current?.isRecurring || update.isRecurring)) {
            const taskForCheck = {
              ...(current || {}),
              ...update,
              id: taskData.id,
              // Ensure fields required by shouldCreateNextInstance
              completedAt: new Date(),
            };
            if (await shouldCreateNextInstanceAsync(taskForCheck)) {
              const newId = await createNextRecurringInstance(taskForCheck);
              if (newId && (update.projectId || current?.projectId)) {
                const pid = update.projectId || current?.projectId;
                try {
                  await updateProjectProgress(pid);
                } catch (err) {
                  console.warn(
                    "Failed to refresh project progress for new recurring instance",
                    err
                  );
                }
              }
            }
          }
        } catch (e) {
          console.warn("Recurring continuation failed (update)", e);
        }
        // Update project progress for previous and possibly new project
        const prevProjectId = current?.projectId;
        const nextProjectId = update.projectId || prevProjectId;
        const affected = new Set(
          [prevProjectId, nextProjectId].filter(Boolean)
        );
        for (const pid of affected) {
          try {
            await updateProjectProgress(pid);
          } catch {
            /* ignore */
          }
        }
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
        const wt =
          taskData.weightage === "" ||
            taskData.weightage === undefined ||
            taskData.weightage === null
            ? null
            : Number(taskData.weightage);
        const payload = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          projectId: taskData.projectId || "",
          assignedDate:
            taskData.assignedDate || new Date().toISOString().slice(0, 10),
          dueDate: taskData.dueDate || "",
          priority: taskData.priority || "Medium",
          status: taskData.status || "To-Do",
          progressPercent: taskData.status === "Done" ? 100 : 0,
          createdAt: serverTimestamp(),
          completedAt: taskData.status === "Done" ? serverTimestamp() : null,
          archived: false,
          completionComment: taskData.completionComment || "",
          weightage: Number.isNaN(wt) ? null : wt,
          isRecurring: taskData.isRecurring || false,
          recurringPattern: taskData.recurringPattern || "daily",
          recurringInterval: taskData.recurringInterval || 1,
          recurringEndDate: taskData.recurringEndDate || "",
          recurringEndAfter: taskData.recurringEndAfter || "",
          recurringEndType: taskData.recurringEndType || "never",
          parentRecurringTaskId: null, // For future instances
          recurringOccurrenceCount: 0, // Track how many instances created
        };
        const newRef = await addDoc(collection(db, "tasks"), payload);
        toast.success("Task created successfully!");
        // Update project progress for created task's project
        if (payload.projectId) {
          try {
            await updateProjectProgress(payload.projectId);
          } catch {
            /* ignore */
          }
        }
        const res = users.find((u) => u.id === payload.assigneeId);
        const cli = clients.find((c) => c.id === payload.assigneeId);
        const name = res?.name || cli?.clientName;
        if (name) toast(`📌 New task assigned to ${name}`, { duration: 4000 });
        // If created directly as Done and recurring, create next instance
        try {
          if (payload.isRecurring && payload.status === "Done") {
            const taskForCheck = {
              ...payload,
              id: newRef.id,
              completedAt: new Date(),
            };
            if (await shouldCreateNextInstanceAsync(taskForCheck)) {
              const newId = await createNextRecurringInstance(taskForCheck);
              if (newId && payload.projectId) {
                try {
                  await updateProjectProgress(payload.projectId);
                } catch (err) {
                  console.warn(
                    "Failed to refresh project progress for new recurring instance",
                    err
                  );
                }
              }
            }
          }
        } catch (e) {
          console.warn("Recurring continuation failed (create)", e);
        }
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

  const handleView = (task) => {
    setViewingTask(task);
    setShowViewModal(true);
  };

  const handleDelete = (task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, "tasks", taskToDelete.id));
      toast.success("Task deleted!");
      if (taskToDelete.projectId) {
        try {
          await updateProjectProgress(taskToDelete.projectId);
        } catch {
          /* ignore */
        }
      }
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error("Failed to delete task", err);
      toast.error("Failed to delete task");
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
      const affectedProjects = new Set();
      const selectedList = Array.from(selectedIds);
      selectedList.forEach((id) => {
        const t = tasks.find((x) => x.id === id);
        if (t?.projectId) affectedProjects.add(t.projectId);
      });
      await Promise.all(
        selectedList.map((id) => deleteDoc(doc(db, "tasks", id)))
      );
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} task(s)!`);
      // refresh project progress for affected projects
      await Promise.all(
        Array.from(affectedProjects).map((pid) =>
          updateProjectProgress(pid).catch(() => { })
        )
      );
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
        // update progress for affected projects
        const affected = new Set(
          ids
            .map((id) => tasks.find((t) => t.id === id)?.projectId)
            .filter(Boolean)
        );
        affected.forEach((pid) => {
          updateProjectProgress(pid).catch(() => { });
        });
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
        const affected = new Set(
          ids
            .map((id) => tasks.find((t) => t.id === id)?.projectId)
            .filter(Boolean)
        );
        affected.forEach((pid) => {
          updateProjectProgress(pid).catch(() => { });
        });
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
        `Task reassigned from ${oldRes?.name || oldCli?.clientName || "Unassigned"
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
      if (willBeDone) {
        setCompletionTaskId(taskId);
        setShowCompletionModal(true);
        return;
      }
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        progressPercent: willBeDone
          ? 100
          : wasDone
            ? 0
            : t.progressPercent ?? 0,
        completedAt: willBeDone
          ? serverTimestamp()
          : wasDone
            ? null
            : t.completedAt || null,
      });
      if (t.projectId) {
        try {
          await updateProjectProgress(t.projectId);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error("Move failed", err);
      toast.error("Failed to move task");
    }
  };

  const handleSubmitAdminCompletion = async (comment) => {
    if (!completionTaskId) {
      setShowCompletionModal(false);
      return;
    }
    try {
      const t = tasks.find((x) => x.id === completionTaskId);
      await updateDoc(doc(db, "tasks", completionTaskId), {
        status: "Done",
        completedAt: serverTimestamp(),
        progressPercent: 100,
        completionComment: comment,
      });
      // Create next recurring instance if applicable
      try {
        if (t?.isRecurring) {
          const checkTask = { ...t, status: "Done", completedAt: new Date() };
          if (await shouldCreateNextInstanceAsync(checkTask)) {
            const newId = await createNextRecurringInstance(checkTask);
            if (newId && t.projectId) {
              try {
                await updateProjectProgress(t.projectId);
              } catch (err) {
                console.warn(
                  "Failed to refresh project progress for new recurring instance",
                  err
                );
              }
            }
          }
        }
      } catch (e) {
        console.warn("Recurring continuation failed (admin completion)", e);
      }
      if (t?.projectId) {
        try {
          await updateProjectProgress(t.projectId);
        } catch {
          /* ignore */
        }
      }
      toast.success("Task marked as done");
    } catch (err) {
      console.error("Admin completion failed", err);
      toast.error("Failed to complete task");
    } finally {
      setShowCompletionModal(false);
      setCompletionTaskId(null);
    }
  };

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => {
      if (t.visibleFrom && t.visibleFrom > today) {
        return false;
      }
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
      if (onlyOverdue) {
        if (!(t.dueDate && t.status !== "Done" && t.dueDate < today))
          return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const project = projects.find((p) => p.id === t.projectId);
        const assignee =
          users.find((u) => u.id === t.assigneeId) ||
          clients.find((c) => c.id === t.assigneeId);
        const searchText = `${t.title} ${t.description} ${project?.name || ""
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
    onlyOverdue,
    search,
    projects,
    users,
    clients,
  ]);

  // Assignee options constrained by selected project
  const filteredAssigneeUsers = useMemo(() => {
    if (!filterProject) return users;
    const ids = new Set(
      tasks
        .filter(
          (t) =>
            t.projectId === filterProject &&
            (t.assigneeType || "user") === "user" &&
            t.assigneeId
        )
        .map((t) => t.assigneeId)
    );
    return users.filter((u) => ids.has(u.id));
  }, [filterProject, tasks, users]);

  const filteredAssigneeClients = useMemo(() => {
    if (!filterProject) return clients;
    const proj = projects.find((p) => p.id === filterProject);
    if (proj?.clientId) return clients.filter((c) => c.id === proj.clientId);
    const ids = new Set(
      tasks
        .filter(
          (t) =>
            t.projectId === filterProject &&
            (t.assigneeType || "user") === "client" &&
            t.assigneeId
        )
        .map((t) => t.assigneeId)
    );
    return clients.filter((c) => ids.has(c.id));
  }, [filterProject, projects, clients, tasks]);

  const counts = useMemo(() => {
    const c = { "To-Do": 0, "In Progress": 0, Done: 0 };
    filtered.forEach((t) => {
      if (c[t.status] !== undefined) c[t.status] += 1;
    });
    return c;
  }, [filtered]);

  const progressPct = useMemo(() => {
    if (filtered.length === 0) return 0;
    const done = filtered.filter((t) => t.status === "Done").length;
    return Math.round((done / filtered.length) * 100);
  }, [filtered]);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return filtered.filter(
      (t) => t.dueDate && t.dueDate < today && t.status !== "Done"
    );
  }, [filtered]);

  // Calculate global overdue tasks (ignoring current filters) for the persistent banner
  const globalOverdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(
      (t) => !t.archived && t.dueDate && t.dueDate < today && t.status !== "Done"
    );
  }, [tasks]);

  // Active users list for assignment/reassignment UIs
  const activeUsers = useMemo(() => users.filter(isUserActive), [users]);

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
        { header: "Weightage", key: "weightage", width: 15 },
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
          weightage: t.weightage || "",
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
        title={
          <div className="flex items-center gap-3">
            Task Management
            {globalOverdueTasks.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800 animate-pulse">
                {globalOverdueTasks.length} Overdue
              </span>
            )}
          </div>
        }
      >
        Create, assign, track, and analyze tasks across all projects.
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            onClick={() => applyStatusQuickFilter("To-Do")}
            className="cursor-pointer hover:bg-surface-subtle"
          >
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
          <Card
            onClick={() => applyStatusQuickFilter("In Progress")}
            className="cursor-pointer hover:bg-surface-subtle"
          >
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
          <Card
            onClick={() => applyStatusQuickFilter("Done")}
            className="cursor-pointer hover:bg-surface-subtle"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary">Completed</div>
                <div className="mt-1 text-2xl font-semibold">{counts.Done}</div>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card
            onClick={applyOverdueQuickFilter}
            className={`cursor-pointer transition-all duration-300 ${globalOverdueTasks.length > 0
              ? "bg-red-50 border-red-300 ring-2 ring-red-100 ring-offset-2"
              : "hover:bg-surface-subtle"
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${globalOverdueTasks.length > 0 ? "text-red-700 font-medium" : "text-content-secondary"}`}>Overdue</div>
                <div className={`mt-1 text-2xl font-bold ${globalOverdueTasks.length > 0 ? "text-red-800" : "text-red-600"}`}>
                  {globalOverdueTasks.length}
                </div>
              </div>
              <FaExclamationTriangle className={`h-8 w-8 ${globalOverdueTasks.length > 0 ? "text-red-600 animate-bounce" : "text-red-500"}`} />
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
                {counts.Done} of {filtered.length} tasks completed
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
                    {filteredAssigneeUsers.map((u) => (
                      <option key={u.id} value={`user:${u.id}`}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {(!filterAssigneeType || filterAssigneeType === "client") && (
                  <optgroup label="Clients">
                    {filteredAssigneeClients.map((c) => (
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
              </div>
              <div className="flex items-center gap-2">
                <div className="mr-2 flex items-center rounded-lg border border-subtle p-0.5">
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${filterAssigneeType === ""
                      ? "bg-indigo-600 text-white"
                      : "text-content-primary"
                      }`}
                    onClick={() => setFilterAssigneeType("")}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${filterAssigneeType === "user"
                      ? "bg-indigo-600 text-white"
                      : "text-content-primary"
                      }`}
                    onClick={() => setFilterAssigneeType("user")}
                    type="button"
                  >
                    Resources
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${filterAssigneeType === "client"
                      ? "bg-indigo-600 text-white"
                      : "text-content-primary"
                      }`}
                    onClick={() => setFilterAssigneeType("client")}
                    type="button"
                  >
                    Clients
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setView("list")}
                    className={`p-2 rounded transition-colors ${view === "list"
                      ? "bg-white text-indigo-600 shadow"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                    title="List View"
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("board")}
                    className={`p-2 rounded transition-colors ${view === "board"
                      ? "bg-white text-indigo-600 shadow"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                    title="Kanban View"
                  >
                    <FaTh className="w-4 h-4" />
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

        <div ref={tasksListRef}></div>
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
                  showReassignOnCard
                  users={activeUsers}
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
                  {/* Bulk Select Header */}
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

                  {/* The New Clean List Rendering */}
                  {filtered.map((t) => (
                    <TaskListItem
                      key={t.id}
                      task={t}
                      project={projectById(t.projectId)}
                      assignee={assigneeById(t.assigneeId)}
                      isSelected={selectedIds.has(t.id)}
                      onToggleSelect={toggleSelect}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReassign={reassignTask}
                      activeUsers={activeUsers}
                    />
                  ))}
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
          assignees={activeUsers}
          clients={clients}
        />
      )}
      {showViewModal && viewingTask && (
        <TaskViewModal
          task={viewingTask}
          project={projectById(viewingTask.projectId)}
          assignee={assigneeById(viewingTask.assigneeId)}
          users={users}
          clients={clients}
          onClose={() => setShowViewModal(false)}
          onEdit={() => {
            setShowViewModal(false);
            handleEdit(viewingTask);
          }}
        />
      )}

      <CompletionCommentModal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletionTaskId(null);
        }}
        onSubmit={handleSubmitAdminCompletion}
        title="Add Completion Comment"
        confirmLabel="Save"
        minLength={5}
        maxLength={300}
      />

      {showDeleteModal && taskToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowDeleteModal(false);
            setTaskToDelete(null);
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              onClose={() => {
                setShowDeleteModal(false);
                setTaskToDelete(null);
              }}
              onConfirm={confirmDelete}
              itemType={`task "${taskToDelete.title}"`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksManagement;

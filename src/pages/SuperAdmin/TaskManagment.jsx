import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import KanbanBoard from "../../components/KanbanBoard";
import TaskModal from "../../components/TaskModal";
import TaskGroup from "../../components/TaskManagment/TaskGroup";
import TaskViewModal from "../../components/TaskManagment/TaskViewModal";
import {
  shouldCreateNextInstanceAsync,
  createNextRecurringInstance,
} from "../../utils/recurringTasks";
import CompletionCommentModal from "../../components/CompletionCommentModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
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

import { db } from "../../firebase";
import { updateProjectProgress } from "../../utils/projectProgress";
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
  limit,
  where,
} from "firebase/firestore";
import { useAuthContext } from "../../context/AuthContext";
import { logTaskActivity } from "../../services/taskService";

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

// status icons not used in this file; removed to satisfy lint

const tsToISO = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return typeof v === "string" ? v : null;
};

function TasksManagement() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [taskLimit, setTaskLimit] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);

  const [view, setView] = useState("list");

  const [selectedIds, setSelectedIds] = useState(new Set());

  // 1. Consolidated Filter State
  const [filters, setFilters] = useState({
    project: "",
    assignee: "",
    assigneeType: "",
    priority: "",
    status: "",
    search: "",
    showArchived: false,
    onlyOverdue: false,
  });

  // Helper to update a single filter
  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset assignee if project or assigneeType changes to avoid stale selection
      if (key === "project" || key === "assigneeType") {
        next.assignee = "";
      }
      return next;
    });
  };

  // 2. Optimized Data Lookups (Maps) - creates instant access to data
  const projectMap = useMemo(() => {
    return projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [projects]);

  const userMap = useMemo(() => {
    return users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
  }, [users]);

  const clientMap = useMemo(() => {
    return clients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
  }, [clients]);

  // Fast Lookup Helpers
  const getProject = useCallback((id) => projectMap[id], [projectMap]);
  const getAssignee = useCallback(
    (id) => userMap[id] || clientMap[id],
    [userMap, clientMap]
  );
  const resolveAssignees = useCallback(
    (task) => {
      // Handle new multi-assignee format
      const list = Array.isArray(task.assignees) ? task.assignees : [];
      const resolved = list
        .map((a) => {
          if (!a || !a.id) return null;
          const person = a.type === "client" ? clientMap[a.id] : userMap[a.id];
          const name = person?.name || person?.clientName || null;
          const company = person?.companyName || null;
          const role = person?.role || null;
          return { type: a.type || "user", id: a.id, name, company, role };
        })
        .filter(Boolean);

      // Fallback to legacy single assignee if no multi-assignees
      if (resolved.length === 0 && task.assigneeId) {
        const person =
          task.assigneeType === "client"
            ? clientMap[task.assigneeId]
            : userMap[task.assigneeId];
        if (person) {
          const name = person?.name || person?.clientName || null;
          const company = person?.companyName || null;
          const role = person?.role || null;
          const fallback = [
            {
              type: task.assigneeType || "user",
              id: task.assigneeId,
              name,
              company,
              role,
            },
          ];
          console.log("Using fallback assignee:", {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            assigneeType: task.assigneeType,
            person,
            fallback,
          });
          return fallback;
        }
      }

      console.log("Resolved assignees:", {
        taskId: task.id,
        taskTitle: task.title,
        assignees: task.assignees,
        resolved,
        userMapSize: Object.keys(userMap).length,
        clientMapSize: Object.keys(clientMap).length,
      });
      return resolved;
    },
    [userMap, clientMap]
  );
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
      setFilters({
        project: "",
        assignee: "",
        assigneeType: "",
        priority: "",
        status: status,
        search: "",
        showArchived: false,
        onlyOverdue: false,
      });
      setView("list");
      setTimeout(scrollToTasksList, 0);
    },
    [scrollToTasksList]
  );

  const applyOverdueQuickFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      project: "",
      assignee: "",
      assigneeType: "",
      priority: "",
      status: "",
      search: "",
      showArchived: false,
      onlyOverdue: true,
    }));
    setView("list");
    setTimeout(scrollToTasksList, 0);
  }, [scrollToTasksList]);

  const clearFilters = () => {
    setFilters({
      project: "",
      assignee: "",
      assigneeType: "",
      priority: "",
      status: "",
      search: "",
      showArchived: false,
      onlyOverdue: false,
    });
  };

  const wipLimits = useMemo(() => ({}), []);

  useEffect(() => {
    const constraints = [orderBy("createdAt", "desc"), limit(taskLimit)];
    if (filters.project) {
      constraints.unshift(where("projectId", "==", filters.project));
    }
    if (filters.assignee) {
      const [type, id] = filters.assignee.split(":");
      if (id) {
        constraints.unshift(where("assigneeIds", "array-contains", id));
      }
    }

    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), ...constraints),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: data.title || "",
            description: data.description || "",
            assigneeId: data.assigneeId || "",
            assigneeType: data.assigneeType || "user",
            assignees: data.assignees || [],
            assigneeIds: data.assigneeIds || [],
            projectId: data.projectId || "",
            assignedDate: data.assignedDate?.toDate
              ? data.assignedDate.toDate().toISOString().slice(0, 10)
              : data.assignedDate || "",
            dueDate: data.dueDate?.toDate
              ? data.dueDate.toDate().toISOString().slice(0, 10)
              : data.dueDate || "",
            priority: data.priority || "Medium",
            status: (() => {
              // 1. Default global status
              let s = (data.status === "In Review" ? "In Progress" : data.status) || "To-Do";

              // 2. Override with derived status from assignees if available
              if (data.assigneeStatus && Object.keys(data.assigneeStatus).length > 0) {
                const values = Object.values(data.assigneeStatus);
                if (values.length > 0) {
                  const allDone = values.every((v) => v.status === "Done");
                  const anyInProgress = values.some((v) => v.status === "In Progress" || v.status === "In Review");
                  const anyDone = values.some((v) => v.status === "Done");

                  if (allDone) s = "Done";
                  else if (anyInProgress || anyDone) s = "In Progress";
                  else s = "To-Do";
                }
              }
              return s;
            })(),
            isDerivedStatus: (() => {
              if (data.assigneeStatus && Object.keys(data.assigneeStatus).length > 0) {
                const values = Object.values(data.assigneeStatus);
                return values.length > 0;
              }
              return false;
            })(),
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
            okrObjectiveIndex: data.okrObjectiveIndex,
            okrKeyResultIndices: data.okrKeyResultIndices || [],
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
  }, [taskLimit, filters.project, filters.assignee]);

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
        const message =
          dueSoonTasks.length === 1
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

        const current = tasks.find((t) => t.id === taskData.id);

        // Calculate new assignee IDs
        const newAssigneeIds = Array.isArray(taskData.assignees)
          ? taskData.assignees.map((a) => a.id).filter(Boolean)
          : taskData.assigneeId
            ? [taskData.assigneeId]
            : [];

        // Build or update assigneeStatus map
        const currentStatusMap = current?.assigneeStatus || {};
        const updatedAssigneeStatus = {};

        newAssigneeIds.forEach((id) => {
          if (currentStatusMap[id]) {
            // Preserve existing status
            updatedAssigneeStatus[id] = currentStatusMap[id];
          } else {
            // Initialize for new assignee
            updatedAssigneeStatus[id] = {
              status: "To-Do",
              progressPercent: 0,
              completedAt: null,
              completedBy: null,
            };
          }
        });

        const update = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          assignees: Array.isArray(taskData.assignees)
            ? taskData.assignees
            : [],
          assigneeIds: newAssigneeIds,
          assigneeStatus: updatedAssigneeStatus, // Save the map
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
          okrObjectiveIndex:
            taskData.okrObjectiveIndex === undefined
              ? null
              : taskData.okrObjectiveIndex,
          okrKeyResultIndices: taskData.okrKeyResultIndices || [],
          subtasks: taskData.subtasks || [],
        };

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

        // Activity Logging
        if (current) {
          if (update.status && update.status !== current.status) {
            logTaskActivity(
              taskData.id,
              "status_updated",
              `Changed status from ${current.status} to ${update.status}`,
              user
            );
          }
          if (update.priority && update.priority !== current.priority) {
            logTaskActivity(
              taskData.id,
              "priority_updated",
              `Changed priority from ${current.priority} to ${update.priority}`,
              user
            );
          }
          // Check for single assignee change (legacy) or multi-assignee change
          const oldAssignees = JSON.stringify(current.assignees || []);
          const newAssignees = JSON.stringify(update.assignees || []);
          if (
            update.assigneeId !== current.assigneeId ||
            oldAssignees !== newAssignees
          ) {
            logTaskActivity(
              taskData.id,
              "assignee_updated",
              "Updated assignees",
              user
            );
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

        const assigneeIds = Array.isArray(taskData.assignees)
          ? taskData.assignees.map((a) => a.id).filter(Boolean)
          : taskData.assigneeId
            ? [taskData.assigneeId]
            : [];

        // Initialize assigneeStatus map
        const initialAssigneeStatus = {};
        assigneeIds.forEach((id) => {
          initialAssigneeStatus[id] = {
            status: initialStatus,
            progressPercent: initialStatus === "Done" ? 100 : 0,
            completedAt: initialStatus === "Done" ? new Date() : null, // Use Date for local, serverTimestamp for DB
            completedBy: initialStatus === "Done" ? user?.uid : null,
          };
        });

        const payload = {
          title: taskData.title,
          description: taskData.description || "",
          assigneeId: taskData.assigneeId || "",
          assigneeType: taskData.assigneeType || "user",
          assignees: Array.isArray(taskData.assignees)
            ? taskData.assignees
            : [],
          assigneeIds: assigneeIds,
          assigneeStatus: initialAssigneeStatus,
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
          okrObjectiveIndex:
            taskData.okrObjectiveIndex === undefined
              ? null
              : taskData.okrObjectiveIndex,
          okrKeyResultIndices: taskData.okrKeyResultIndices || [],
          subtasks: taskData.subtasks || [],
          parentRecurringTaskId: null, // For future instances
          recurringOccurrenceCount: 0, // Track how many instances created
        };
        const newRef = await addDoc(collection(db, "tasks"), payload);

        logTaskActivity(newRef.id, "created", "Task created", user);

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

  // Add single task archive handler
  const handleTaskArchive = async (task) => {
    if (!window.confirm(`Are you sure you want to archive "${task.title}"?`))
      return;
    try {
      await updateDoc(doc(db, "tasks", task.id), { archived: true });
      toast.success("Task archived");
      if (task.projectId) {
        try {
          await updateProjectProgress(task.projectId);
        } catch (err) {
          console.error("Failed to update project progress:", err);
        }
      }
    } catch (err) {
      console.error("Archive failed", err);
      toast.error("Failed to archive");
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
        `Task reassigned from ${oldRes?.name || oldCli?.clientName || "Unassigned"
        } to ${newRes?.name || newCli?.clientName || "Unassigned"}`
      );
      logTaskActivity(
        taskId,
        "assignee_updated",
        `Reassigned to ${newRes?.name || newCli?.clientName || "Unassigned"}`,
        user
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
      logTaskActivity(taskId, "status_updated", `Moved to ${newStatus}`, user);
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

      // Log activity for completion
      logTaskActivity(
        completionTaskId,
        "completed",
        `Marked as done${comment ? `: ${comment}` : ""}`,
        user
      );

      // Attempt to create next recurring instance if applicable
      try {
        const checkTask = {
          ...(t || {}),
          id: completionTaskId,
          completedAt: new Date(),
        };
        if (await shouldCreateNextInstanceAsync(checkTask)) {
          const newId = await createNextRecurringInstance(checkTask);
          if (newId && t?.projectId) {
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
      // 1. Global Visibility Check
      if (t.visibleFrom && t.visibleFrom > today) return false;
      if (!filters.showArchived && t.archived) return false;

      // 2. Overdue Check
      if (filters.onlyOverdue) {
        if (!(t.dueDate && t.status !== "Done" && t.dueDate < today))
          return false;
      }

      // 3. Exact Match Filters
      if (filters.project && t.projectId !== filters.project) return false;
      if (
        filters.assigneeType &&
        (t.assigneeType || "user") !== filters.assigneeType
      )
        return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.status && t.status !== filters.status) return false;

      // 4. Assignee ID Check
      if (filters.assignee) {
        const [type, id] = filters.assignee.split(":");
        // Check legacy OR new array
        const matchLegacy = t.assigneeType === type && t.assigneeId === id;
        const matchArray = t.assigneeIds?.includes(id);
        if (!matchLegacy && !matchArray) return false;
      }

      // 5. Search Text
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const project = projectMap[t.projectId];
        const assignee = userMap[t.assigneeId] || clientMap[t.assigneeId];

        const searchText = `${t.title} ${t.description} ${project?.name || ""
          } ${assignee?.name || assignee?.clientName || ""}`.toLowerCase();

        if (!searchText.includes(s)) return false;
      }

      return true;
    });
  }, [tasks, filters, projectMap, userMap, clientMap]);

  // 1. Filtered Users (Resources)
  // If a project is selected in the filter, only show users involved in that project
  const filteredAssigneeUsers = useMemo(() => {
    if (!filters.project) return users;

    const ids = new Set(
      tasks
        .filter(
          (t) =>
            t.projectId === filters.project &&
            (t.assigneeType || "user") === "user" &&
            t.assigneeId
        )
        .map((t) => t.assigneeId)
    );
    return users.filter((u) => ids.has(u.id));
  }, [filters.project, tasks, users]);

  // 2. Filtered Clients
  // If a project is selected, only show the client for that project
  const filteredAssigneeClients = useMemo(() => {
    if (!filters.project) return clients;

    // Use our new Map for fast lookup, or find if map isn't ready
    const proj =
      projectMap[filters.project] ||
      projects.find((p) => p.id === filters.project);

    if (proj?.clientId) return clients.filter((c) => c.id === proj.clientId);

    const ids = new Set(
      tasks
        .filter(
          (t) =>
            t.projectId === filters.project &&
            (t.assigneeType || "user") === "client" &&
            t.assigneeId
        )
        .map((t) => t.assigneeId)
    );
    return clients.filter((c) => ids.has(c.id));
  }, [filters.project, projects, projectMap, clients, tasks]);

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

  // removed unused overdueTasks to satisfy lint

  // Calculate global overdue tasks (ignoring current filters) for the persistent banner
  const globalOverdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(
      (t) =>
        !t.archived && t.dueDate && t.dueDate < today && t.status !== "Done"
    );
  }, [tasks]);

  // Active users list for assignment/reassignment UIs
  const activeUsers = useMemo(() => users.filter(isUserActive), [users]);

  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Importing tasks...");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error("No worksheet found");

      const tasksToCreate = [];
      const errors = [];

      // Iterate over rows (assuming row 1 is header)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        // Helper to get cell value safely
        const getVal = (idx) => {
          const val = row.getCell(idx).value;
          // Handle ExcelJS rich text or other object types if necessary
          if (val && typeof val === "object" && val.text) return val.text;
          return val;
        };

        // Mapping (Adjust indices based on expected template)
        // A: Title, B: Description, C: Status, D: Priority, E: Start Date, F: Due Date, G: Project Name, H: Assignee Email
        const title = getVal(1);
        if (!title) return; // Skip empty rows

        const description = getVal(2) || "";
        const statusRaw = getVal(3);
        const priorityRaw = getVal(4);
        const startDateRaw = getVal(5);
        const dueDateRaw = getVal(6);
        const projectName = getVal(7);
        const assigneeEmail = getVal(8);

        // Validation & Resolution
        let projectId = "";
        if (projectName) {
          const proj = projects.find(
            (p) =>
              p.name?.toLowerCase() === projectName.toString().toLowerCase()
          );
          if (proj) projectId = proj.id;
        }

        let assigneeId = "";
        let assigneeType = "user"; // Default
        if (assigneeEmail) {
          const usr = users.find(
            (u) =>
              u.email?.toLowerCase() === assigneeEmail.toString().toLowerCase()
          );
          if (usr) {
            assigneeId = usr.id;
          } else {
            // Try client?
            const cli = clients.find(
              (c) =>
                c.email?.toLowerCase() ===
                assigneeEmail.toString().toLowerCase()
            );
            if (cli) {
              assigneeId = cli.id;
              assigneeType = "client";
            }
          }
        }

        // Date parsing
        const parseDate = (val) => {
          if (!val) return null;
          // ExcelJS might return Date object or string
          if (val instanceof Date) return val.toISOString();
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };

        tasksToCreate.push({
          title: title.toString(),
          description: description.toString(),
          status: ["To-Do", "In Progress", "Done"].includes(statusRaw)
            ? statusRaw
            : "To-Do",
          priority: ["Low", "Medium", "High"].includes(priorityRaw)
            ? priorityRaw
            : "Medium",
          assignedDate: parseDate(startDateRaw) || new Date().toISOString(),
          dueDate: parseDate(dueDateRaw),
          projectId,
          assigneeId,
          assigneeType,
          assignees: assigneeId ? [assigneeId] : [], // For multi-assignee compatibility
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "import",
          isRecurring: false,
          progressPercent: statusRaw === "Done" ? 100 : 0,
          archived: false,
        });
      });

      if (tasksToCreate.length === 0) {
        toast.error("No valid tasks found in file", { id: toastId });
        return;
      }

      // Batch creation (or parallel promises)
      let createdCount = 0;
      await Promise.all(
        tasksToCreate.map(async (taskData) => {
          try {
            const docRef = await addDoc(collection(db, "tasks"), taskData);
            await logTaskActivity(
              docRef.id,
              "created",
              "Imported via Excel",
              user
            );
            if (taskData.projectId) {
              updateProjectProgress(taskData.projectId).catch(() => { });
            }
            createdCount++;
          } catch (err) {
            console.error("Failed to import task", taskData.title, err);
            errors.push(taskData.title);
          }
        })
      );

      toast.success(`Imported ${createdCount} tasks successfully!`, {
        id: toastId,
      });
      if (errors.length > 0) {
        toast.error(`Failed to import ${errors.length} tasks`, {
          duration: 5000,
        });
      }

      // Reset input
      if (e.target) e.target.value = "";
    } catch (err) {
      console.error("Import failed", err);
      toast.error("Import failed: " + err.message, { id: toastId });
    }
  };

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
        // Use the Maps we created in Step 3 for instant lookup
        const project = projectMap[t.projectId];
        const assignee = userMap[t.assigneeId] || clientMap[t.assigneeId];

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
  // ... inside TasksManagement function, before return

  const todoTasks = useMemo(
    () => filtered.filter((t) => t.status === "To-Do"),
    [filtered]
  );
  const inProgressTasks = useMemo(
    () => filtered.filter((t) => t.status === "In Progress"),
    [filtered]
  );
  const doneTasks = useMemo(
    () => filtered.filter((t) => t.status === "Done"),
    [filtered]
  );

  // ...
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
                <div
                  className={`text-sm ${globalOverdueTasks.length > 0
                    ? "text-red-700 font-medium"
                    : "text-content-secondary"
                    }`}
                >
                  Overdue
                </div>
                <div
                  className={`mt-1 text-2xl font-bold ${globalOverdueTasks.length > 0
                    ? "text-red-800"
                    : "text-red-600"
                    }`}
                >
                  {globalOverdueTasks.length}
                </div>
              </div>
              <FaExclamationTriangle
                className={`h-8 w-8 ${globalOverdueTasks.length > 0
                  ? "text-red-600 animate-bounce"
                  : "text-red-500"
                  }`}
              />
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
          {/* Filters Section */}
          <div className="border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Filters
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="lg:col-span-2 rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                spellCheck="true"
              />

              <select
                value={filters.project}
                onChange={(e) => updateFilter("project", e.target.value)}
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
                value={filters.assignee}
                onChange={(e) => updateFilter("assignee", e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Assignees</option>
                {(!filters.assigneeType || filters.assigneeType === "user") && (
                  <optgroup label="Resources">
                    {filteredAssigneeUsers.map((u) => (
                      <option key={u.id} value={`user:${u.id}`}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {(!filters.assigneeType ||
                  filters.assigneeType === "client") && (
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
                value={filters.priority}
                onChange={(e) => updateFilter("priority", e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Priorities</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
              <select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
                className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
              >
                <option value="">All Statuses</option>
                <option>To-Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>

              <label className="flex items-center gap-2 px-3 py-2 text-sm text-content-primary bg-gray-50 rounded-lg border border-subtle cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.showArchived}
                  onChange={(e) =>
                    updateFilter("showArchived", e.target.checked)
                  }
                  className="accent-indigo-600"
                />
                <span className="select-none">Show Archived</span>
              </label>

              <Button
                variant="secondary"
                onClick={clearFilters}
                className="lg:col-start-5 w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Actions
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={handleImportClick}
                  className="flex items-center gap-2"
                >
                  <FaDownload className="rotate-180" /> Import
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2"
                >
                  <FaDownload /> Export
                </Button>

                <div className="h-6 w-px bg-gray-300 mx-1"></div>

                <div className="flex items-center rounded-lg border border-subtle bg-white p-0.5">
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === ""
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-content-primary hover:bg-gray-100"
                      }`}
                    onClick={() => updateFilter("assigneeType", "")}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === "user"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-content-primary hover:bg-gray-100"
                      }`}
                    onClick={() => updateFilter("assigneeType", "user")}
                    type="button"
                  >
                    Resources
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === "client"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-content-primary hover:bg-gray-100"
                      }`}
                    onClick={() => updateFilter("assigneeType", "client")}
                    type="button"
                  >
                    Clients
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-1"></div>

                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView("list")}
                    className={`p-2 rounded transition-all ${view === "list"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      }`}
                    title="List View"
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("board")}
                    className={`p-2 rounded transition-all ${view === "board"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      }`}
                    title="Kanban View"
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" onClick={handleArchive} size="sm">
                  Archive Selected
                </Button>
                <Button variant="secondary" onClick={handleUnarchive} size="sm">
                  Unarchive Selected
                </Button>
                <Button variant="danger" onClick={handleBulkDelete} size="sm">
                  Delete Selected
                </Button>
                <Button
                  onClick={openCreate}
                  variant="primary"
                  className="font-semibold"
                >
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
                  getProject={getProject}
                  getAssignee={getAssignee}
                  showReassignOnCard
                  users={activeUsers}
                  onReassign={(taskId, value) => reassignTask(taskId, value)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              {/* Bulk Select Header (Keep this if you want bulk actions) */}
              {filtered.length > 0 && (
                <div className="flex items-center gap-3 px-2 mb-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === filtered.length
                    }
                    onChange={(e) => selectAll(e.target.checked, filtered)}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">
                    {selectedIds.size} selected
                  </span>
                </div>
              )}

              {/* Render Groups */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-content-tertiary">
                  No tasks found
                </div>
              ) : (
                <>
                  {/* IN PROGRESS Group */}
                  <TaskGroup
                    title="In Progress"
                    tasks={inProgressTasks}
                    colorClass="bg-blue-500"
                    onOpenCreate={openCreate}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={handleTaskArchive}
                    resolveAssignees={resolveAssignees}
                  />

                  {/* TO DO Group */}
                  <TaskGroup
                    title="To Do"
                    tasks={todoTasks}
                    colorClass="bg-gray-500"
                    onOpenCreate={openCreate}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={handleTaskArchive}
                    resolveAssignees={resolveAssignees}
                  />

                  {/* DONE Group */}
                  <TaskGroup
                    title="Done"
                    tasks={doneTasks}
                    colorClass="bg-emerald-500"
                    onOpenCreate={openCreate}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={handleTaskArchive}
                    resolveAssignees={resolveAssignees}
                  />
                </>
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
          task={tasks.find((t) => t.id === viewingTask.id) || viewingTask}
          project={getProject(viewingTask.projectId)}
          projects={projects}
          assignee={getAssignee(viewingTask.assigneeId)}
          assigneesResolved={resolveAssignees(viewingTask)}
          users={users}
          clients={clients}
          currentUser={user}
          onClose={() => setShowViewModal(false)}
          onEdit={(updatedTask) => {
            setShowViewModal(false);
            handleEdit(updatedTask || viewingTask);
          }}
          onDelete={async (task) => {
            setShowViewModal(false);
            if (task.projectId) {
              try {
                await updateProjectProgress(task.projectId);
              } catch (err) {
                console.error("Failed to update project progress:", err);
              }
            }
          }}
          onArchive={async (task) => {
            setShowViewModal(false);
            if (task.projectId) {
              try {
                await updateProjectProgress(task.projectId);
              } catch (err) {
                console.error("Failed to update project progress:", err);
              }
            }
          }}
        />
      )}

      {/* Load More Button */}
      {tasks.length >= taskLimit && (
        <div className="flex justify-center mt-6 mb-8">
          <Button
            variant="secondary"
            onClick={() => {
              setLoadingMore(true);
              setTaskLimit((prev) => prev + 50);
              // Loading state will be cleared by the snapshot listener update
              setTimeout(() => setLoadingMore(false), 1000);
            }}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2"
          >
            {loadingMore ? (
              <>
                <FaSpinner className="animate-spin" /> Loading...
              </>
            ) : (
              "Load More Tasks"
            )}
          </Button>
        </div>
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

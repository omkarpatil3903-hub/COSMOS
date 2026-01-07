import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import TaskGroup from "../../components/TaskManagment/TaskGroup";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import KanbanBoard from "../../components/KanbanBoard";
import toast from "react-hot-toast";
import CompletionCommentModal from "../../components/CompletionCommentModal";
import {
  FaTasks,
  FaFilter,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTimes,
  FaCalendar,
  FaCalendarAlt,
  FaFlag,
  FaClipboardList,
  FaSpinner,
  FaSortAmountDown,
  FaTh,
  FaList,
  FaPlus,
} from "react-icons/fa";
import { MdReplayCircleFilled } from "react-icons/md";
import { IoIosWarning } from "react-icons/io";
import StatCard from "../../components/StatCard";
import {
  shouldCreateNextInstanceAsync,
  createNextRecurringInstance,
} from "../../utils/recurringTasks";
import { logTaskActivity } from "../../services/taskService";
import TaskViewModal from "../../components/TaskManagment/TaskViewModal";
import AddReminderModal from "../../components/Reminders/AddReminderModal";
import AddSelfTaskModal from "../../components/TaskManagment/AddSelfTaskModal";
import EditSelfTaskModal from "../../components/TaskManagment/EditSelfTaskModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { useTheme } from "../../context/ThemeContext";

const EmployeeTasks = () => {
  const { user } = useAuthContext();
  const { buttonClass, linkColor } = useThemeStyles();
  const { accent, mode } = useTheme();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const getIconColor = () => {
    const colorMap = {
      purple: mode === 'light' ? 'text-purple-500' : 'text-purple-400',
      blue: mode === 'light' ? 'text-sky-500' : 'text-sky-400',
      pink: mode === 'light' ? 'text-pink-500' : 'text-pink-400',
      violet: mode === 'light' ? 'text-violet-500' : 'text-violet-400',
      orange: mode === 'light' ? 'text-amber-500' : 'text-amber-400',
      teal: mode === 'light' ? 'text-teal-500' : 'text-teal-400',
      bronze: mode === 'light' ? 'text-amber-600' : 'text-amber-500',
      mint: mode === 'light' ? 'text-emerald-500' : 'text-emerald-400',
      black: mode === 'light' ? 'text-gray-600' : 'text-indigo-400',
      indigo: mode === 'light' ? 'text-indigo-500' : 'text-indigo-400',
    };
    return colorMap[accent] || colorMap.indigo;
  };

  const activeIconColor = getIconColor();

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isToday = (date) => {
    if (!date) return false;
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const [selfTasks, setSelfTasks] = useState([]);
  const [primaryTasks, setPrimaryTasks] = useState([]);
  const [multiTasks, setMultiTasks] = useState([]);
  const [tasks, setTasks] = useState([]); // Derived from primary + multi
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState(searchParams.get("view") || "all"); // all, overdue, today, week
  const [displayMode, setDisplayMode] = useState("list"); // list, kanban
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [progressDrafts, setProgressDrafts] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskSource, setTaskSource] = useState("admin"); // 'admin' or 'self'
  const [showAddSelfTaskModal, setShowAddSelfTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedSelfTaskIds, setSelectedSelfTaskIds] = useState(new Set());

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showSingleDeleteConfirmModal, setShowSingleDeleteConfirmModal] =
    useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [taskLimit, setTaskLimit] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTask, setReminderTask] = useState(null);

  // Dynamic statuses from settings/task-statuses
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusColorMap, setStatusColorMap] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "task-statuses"),
      (snap) => {
        const data = snap.data() || {};
        const arr = Array.isArray(data.statuses) ? data.statuses : [];
        const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const list = [];
        const colorMap = {};
        arr.forEach((item) => {
          if (typeof item === "string") {
            const n = item;
            if (n) list.push(n);
          } else if (item) {
            const n = item?.name || item?.label || item?.value || "";
            if (n) {
              list.push(n);
              const c = (item?.color || "").toString().trim();
              if (c) colorMap[norm(n)] = c;
            }
          }
        });
        setStatusOptions(list);
        setStatusColorMap(colorMap);
      },
      () => {
        setStatusOptions([]);
        setStatusColorMap({});
      }
    );
    return () => unsub();
  }, []);

  const effectiveStatuses = useMemo(() => {
    const configured = Array.isArray(statusOptions)
      ? statusOptions.filter(Boolean)
      : [];
    const present = Array.from(
      new Set(tasks.map((t) => t.status).filter(Boolean))
    );
    // Merge: keep configured order first, then add any present statuses not configured
    const has = new Set(configured.map((s) => String(s).toLowerCase()));
    const extras = present.filter(
      (s) => !has.has(String(s).toLowerCase())
    );
    return [...configured, ...extras];
  }, [statusOptions, tasks]);

  // Derived state for TaskGroups
  // Note: we no longer use these fixed To-Do/In Progress/Done buckets for grouping
  // because grouping is now fully dynamic based on configured/effective statuses.
  // The derived groups at the bottom of the file use effectiveStatuses to render.

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle navigation state for scrolling to tasks from notifications (no highlighting)
  useEffect(() => {
    if (location.state?.highlightTaskId) {
      const taskId = location.state.highlightTaskId;

      // Find and scroll to the task after tasks are loaded
      const scrollToTask = () => {
        const taskElement = document.querySelector(
          `[data-task-id="${taskId}"]`
        );
        if (taskElement) {
          // Scroll the task into view smoothly
          taskElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      };

      // Delay to ensure tasks are loaded and rendered
      setTimeout(scrollToTask, 500);

      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, tasks, selfTasks]);

  // Clear selections when not viewing self tasks
  useEffect(() => {
    if (taskSource !== "self" && selectedSelfTaskIds.size) {
      setSelectedSelfTaskIds(new Set());
    }
  }, [taskSource, selectedSelfTaskIds.size]);



  // Combine tasks whenever primary or multi change
  useEffect(() => {
    const combined = [...primaryTasks];
    const primaryIds = new Set(primaryTasks.map(t => t.id));

    multiTasks.forEach(t => {
      if (!primaryIds.has(t.id)) {
        combined.push(t);
      }
    });

    // Sort combined tasks
    combined.sort((a, b) => {
      const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
      const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
      return dateA - dateB;
    });

    setTasks(combined);
  }, [primaryTasks, multiTasks]);
  // Today's date string (YYYY-MM-DD) using local time only (no Realtime DB)
  const todayStr = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  useEffect(() => {
    if (!user?.uid) return;

    // Query tasks where user is primary assignee
    const qPrimary = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid),
      orderBy("dueDate", "asc"),
      limit(taskLimit)
    );
    // Query tasks where user is in assigneeIds array (multi-assignee)
    const qMulti = query(
      collection(db, "tasks"),
      where("assigneeIds", "array-contains", user.uid),
      orderBy("dueDate", "asc"),
      limit(taskLimit)
    );

    const unsubscribePrimary = onSnapshot(qPrimary, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const myStatus = data.assigneeStatus?.[user.uid] || {};
          const derivedStatus =
            (typeof myStatus.status === "string" && myStatus.status.trim() !== "")
              ? myStatus.status
              : "To-Do";

          return {
            id: doc.id,
            ...data,
            status: derivedStatus,
            progressPercent: myStatus.progressPercent ?? 0,
            completedAt: myStatus.completedAt || null,
            source: "admin",
            collectionName: "tasks",
          };
        })
        .filter((task) => task.assigneeType === "user");

      setPrimaryTasks(taskData);
    }, (error) => {
      console.error("Error fetching primary tasks:", error);
      toast.error("Failed to load tasks. Check console for details.");
    });

    const unsubscribeMulti = onSnapshot(qMulti, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const myStatus = data.assigneeStatus?.[user.uid] || {};
          const derivedStatus =
            (typeof myStatus.status === "string" && myStatus.status.trim() !== "")
              ? myStatus.status
              : "To-Do";

          return {
            id: doc.id,
            ...data,
            status: derivedStatus,
            progressPercent: myStatus.progressPercent ?? 0,
            completedAt: myStatus.completedAt || null,
            source: "admin",
            collectionName: "tasks",
          };
        })
        .filter((task) => task.assigneeType === "user");

      setMultiTasks(taskData);
    }, (error) => {
      console.error("Error fetching multi-assignee tasks:", error);
    });

    // Self tasks subscription
    const qSelf = query(
      collection(db, "selfTasks"),
      where("userId", "==", user.uid),
      orderBy("dueDate", "asc"),
      limit(taskLimit)
    );
    const unsubscribeSelf = onSnapshot(qSelf, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status:
            doc.data().status === "In Review"
              ? "In Progress"
              : doc.data().status || "To-Do",
          progressPercent: doc.data().progressPercent ?? 0,
          assigneeType: "user",
          source: "self",
          collectionName: "selfTasks",
        }))
        .sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
          return dateA - dateB;
        });
      setSelfTasks(taskData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching self tasks:", error);
      setLoading(false);
    });

    const unsubscribeProjects = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectsData = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            name: data.projectName || data.name || "Untitled Project",
          };
        });
        setProjects(projectsData);
      }
    );

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    const unsubscribeClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    return () => {
      unsubscribePrimary();
      unsubscribeMulti();
      unsubscribeSelf();
      unsubscribeProjects();
      unsubscribeUsers();
      unsubscribeClients();
    };
  }, [user, taskLimit]);

  // Only show projects that have admin-assigned tasks for this employee
  const adminProjectIds = useMemo(() => {
    const ids = new Set();
    tasks.forEach((t) => {
      if (t.projectId) ids.add(t.projectId);
    });
    return ids;
  }, [tasks]);

  // Data Maps & Helpers
  const projectMap = useMemo(() => {
    return projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [projects]);

  const userMap = useMemo(() => {
    return users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
  }, [users]);

  const clientMap = useMemo(() => {
    return clients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
  }, [clients]);

  const getProject = (id) => projectMap[id];
  const getAssignee = (id) => userMap[id] || clientMap[id];

  const resolveAssignees = (task) => {
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

    if (resolved.length === 0 && task.assigneeId) {
      const person =
        task.assigneeType === "client"
          ? clientMap[task.assigneeId]
          : userMap[task.assigneeId];
      if (person) {
        const name = person?.name || person?.clientName || null;
        const company = person?.companyName || null;
        const role = person?.role || null;
        return [
          {
            type: task.assigneeType || "user",
            id: task.assigneeId,
            name,
            company,
            role,
          },
        ];
      }
    }
    return resolved;
  };

  const projectOptions = useMemo(() => {
    const eligible = projects.filter((p) => adminProjectIds.has(p.id));
    return eligible.map((p) => ({
      id: p.id,
      name: p.projectName || p.name || "Untitled Project",
    }));
  }, [projects, adminProjectIds]);

  // Self-task selection helpers
  const toggleSelectSelfTask = (taskId) => {
    setSelectedSelfTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const clearSelectedSelfTasks = () => setSelectedSelfTaskIds(new Set());

  const deleteSelectedSelfTasks = async () => {
    const count = selectedSelfTaskIds.size;
    if (count === 0) return;
    try {
      const ids = Array.from(selectedSelfTaskIds);
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "selfTasks", id))));
      toast.success(
        `Deleted ${ids.length} self task${ids.length > 1 ? "s" : ""}`
      );
      clearSelectedSelfTasks();
      setShowDeleteConfirmModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete selected tasks");
    }
  };

  // Handle edit task
  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  // Handle save edited task


  // Handle delete task
  const handleDeleteTask = async (task) => {
    setTaskToDelete(task);
    setShowSingleDeleteConfirmModal(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    const collectionName =
      taskToDelete.collectionName ||
      (taskToDelete.source === "self" ? "selfTasks" : "tasks");

    try {
      await deleteDoc(doc(db, collectionName, taskToDelete.id));
      toast.success("Task deleted successfully");

      logTaskActivity(
        taskToDelete.id,
        "task_deleted",
        "Task deleted",
        user,
        collectionName
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete task");
    } finally {
      setShowSingleDeleteConfirmModal(false);
      setTaskToDelete(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      if (newStatus === "Done") {
        setCompletionTaskId(taskId);
        setShowCompletionModal(true);
        return;
      }

      const current =
        tasks.find((t) => t.id === taskId) ||
        selfTasks.find((t) => t.id === taskId);
      const col = current?.collectionName || "tasks";

      let updates = {};

      if (col === "tasks") {
        // Admin task - update individual status
        const updateKey = `assigneeStatus.${user.uid}`;
        updates[`${updateKey}.status`] = newStatus;

        // Also update root status for Admin visibility
        updates.status = newStatus;

        if (newStatus === "In Progress") {
          updates[`${updateKey}.progressPercent`] = 0;
          updates.progressPercent = 0;
        }
        if (newStatus !== "Done") {
          updates[`${updateKey}.completedAt`] = null;
          updates[`${updateKey}.completedBy`] = null;
          updates[`${updateKey}.progressPercent`] =
            newStatus === "In Progress" ? 0 : null;

          updates.completedAt = null;
          updates.completedBy = null;
          updates.progressPercent = newStatus === "In Progress" ? 0 : null;
        }
      } else {
        // Self task
        updates = { status: newStatus };
        if (newStatus === "In Progress") {
          updates.progressPercent = 0;
        }
        if (newStatus !== "Done") {
          updates.completedAt = null;
          updates.completedBy = null;
          updates.completedByType = null;
          updates.completionComment = null;
          updates.progressPercent = newStatus === "In Progress" ? 0 : null;
        }
      }

      await updateDoc(doc(db, col, taskId), updates);

      logTaskActivity(
        taskId,
        "status_updated",
        `Changed status to ${newStatus}`,
        user,
        col
      );

      toast.success("Task status updated!");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleSubmitCompletion = async (comment) => {
    if (!completionTaskId) {
      setShowCompletionModal(false);
      return;
    }
    try {
      const current =
        tasks.find((t) => t.id === completionTaskId) ||
        selfTasks.find((t) => t.id === completionTaskId);
      const col = current?.collectionName || "tasks";

      if (col === "tasks") {
        const updateKey = `assigneeStatus.${user.uid}`;
        await updateDoc(doc(db, col, completionTaskId), {
          [`${updateKey}.status`]: "Done",
          [`${updateKey}.completedAt`]: serverTimestamp(),
          [`${updateKey}.progressPercent`]: 100,
          [`${updateKey}.completedBy`]: user?.uid || "",
          [`${updateKey}.completionComment`]: comment || "",

          // Also update root status for Admin visibility
          status: "Done",
          completedAt: serverTimestamp(),
          progressPercent: 100,
          completedBy: user?.uid || "",
          completionComment: comment || "",
        });
      } else {
        await updateDoc(doc(db, col, completionTaskId), {
          status: "Done",
          completedAt: serverTimestamp(),
          progressPercent: 100,
          completedBy: user?.uid || "",
          completedByType: "user",
          ...(comment ? { completionComment: comment } : {}),
        });
      }

      // If this is an admin recurring task, create the next instance (same rules as Task Management)
      // NOTE: For multi-assignee, we might need to decide when to create next instance.
      // Assuming if ANYONE completes it, or if ALL complete it?
      // Current logic: if it's recurring and marked done.
      // For multi-assignee, maybe we only recur if ALL are done? Or if the "main" status is done?
      // For now, let's keep it simple: if the individual completes it, we don't necessarily recur the whole task unless we update the main status.
      // But we are NOT updating the main status here anymore for admin tasks.
      // So recurring logic might need to be revisited.
      // However, the requirement was "when one assignee marks it done the tasks in other assine panel also gets done".
      // We fixed that. Now, does the recurring task recur when ONE person finishes? Probably not.
      // It should probably recur when the "main" task is marked done by Admin, or if we implement logic to check if ALL are done.
      // For now, I will disable recurring trigger from individual completion to avoid spamming instances.

      /* 
      if (col === "tasks" && current?.isRecurring) {
        // ... logic disabled for individual completion to prevent premature recurrence
      }
      */

      logTaskActivity(
        completionTaskId,
        "completed",
        comment ? `Completed: ${comment}` : "Marked as complete",
        user,
        col
      );

      toast.success("Task marked as complete!");
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    } finally {
      setShowCompletionModal(false);
      setCompletionTaskId(null);
    }
  };

  const commitProgress = async (taskId) => {
    try {
      const raw = progressDrafts[taskId];
      const value = Math.max(0, Math.min(100, parseInt(raw ?? 0)));
      const current =
        tasks.find((t) => t.id === taskId) ||
        selfTasks.find((t) => t.id === taskId);
      if (current && (current.progressPercent ?? 0) === value) return;
      const col = current?.collectionName || "tasks";

      let updateData = {};

      if (col === "tasks") {
        const updateKey = `assigneeStatus.${user.uid}`;
        updateData[`${updateKey}.progressPercent`] = value;

        // Also update root progress
        updateData.progressPercent = value;

        if (value === 100) {
          updateData[`${updateKey}.status`] = "Done";
          updateData[`${updateKey}.completedAt`] = serverTimestamp();
          updateData[`${updateKey}.completedBy`] = user?.uid || "";

          updateData.status = "Done";
          updateData.completedAt = serverTimestamp();
          updateData.completedBy = user?.uid || "";
        }
      } else {
        updateData = { progressPercent: value };
        if (value === 100) {
          updateData.status = "Done";
          updateData.completedAt = serverTimestamp();
          updateData.completedBy = user?.uid || "";
          updateData.completedByType = "user";
        }
      }

      await updateDoc(doc(db, col, taskId), updateData);

      // Recurring logic disabled for individual completion
      /*
      if (value === 100 && col === "tasks" && current?.isRecurring) {
         // ...
      }
      */

      if (value === 100) {
        toast.success("Task completed automatically!");
        logTaskActivity(
          taskId,
          "completed",
          "Completed via progress update (100%)",
          user,
          col
        );
      } else {
        toast.success("Progress updated");
      }

      if (selectedTask?.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          progressPercent: value,
          ...(value === 100 ? { status: "Done", completedAt: new Date() } : {}),
        });
      }
      setProgressDrafts((prev) => {
        const { [taskId]: _omit, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  // Choose base tasks by source
  // Enhance tasks with project names
  const enhancedTasks = useMemo(() => {
    const tasksToEnhance = taskSource === "admin" ? tasks : selfTasks;
    return tasksToEnhance.map((task) => {
      if (task.projectId && !task.projectName) {
        const project = projects.find((p) => p.id === task.projectId);
        return {
          ...task,
          projectName: project?.projectName || project?.name || null,
        };
      }
      return task;
    });
  }, [taskSource, tasks, selfTasks, projects]);

  const baseTasks = enhancedTasks;

  // Debug: Log available projects for dropdown
  const availableProjects = [
    ...new Set(baseTasks.map((task) => task.projectName).filter(Boolean)),
  ];


  // Calculate task statistics
  const stats = {
    total: baseTasks.length,
    completed: baseTasks.filter((t) => t.status === "Done").length,
    inProgress: baseTasks.filter((t) => t.status === "In Progress").length,
    overdue: baseTasks.filter((t) => {
      if (t.status === "Done") return false;
      const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
      return dueDate < new Date();
    }).length,
  };

  // Advanced filtering
  const filteredTasks = baseTasks
    .filter((task) => {
      // 1. Get today's date as a string (YYYY-MM-DD)
      const todayISO = new Date().toISOString().split("T")[0];

      // 2. If task has a visibleFrom date and it is in the future, HIDE IT
      if (task.visibleFrom && task.visibleFrom > todayISO) {
        return false;
      }
      // Status filter
      let statusMatch = true;
      if (statusFilter === "all") {
        statusMatch = true;
      } else if (statusFilter === "pending") {
        statusMatch = task.status !== "Done";
      } else {
        statusMatch = task.status === statusFilter;
      }

      // Priority filter
      const priorityMatch =
        priorityFilter === "all" || task.priority === priorityFilter;

      const projectMatch =
        projectFilter === "all" ||
        (projectFilter === "no-project"
          ? !task.projectName
          : task.projectName === projectFilter);

      // Search filter
      const searchMatch =
        searchQuery === "" ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // View mode filter
      let viewModeMatch = true;
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      const today = new Date();
      const todayStr = today.toDateString();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (viewMode === "overdue") {
        viewModeMatch = dueDate < today && task.status !== "Done";
      } else if (viewMode === "today") {
        viewModeMatch = dueDate.toDateString() === todayStr;
      } else if (viewMode === "week") {
        viewModeMatch =
          dueDate >= today && dueDate <= weekFromNow && task.status !== "Done";
      }

      return (
        statusMatch &&
        priorityMatch &&
        projectMatch &&
        searchMatch &&
        viewModeMatch
      );
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
        const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
        return dateA - dateB;
      } else if (sortBy === "priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return (
          (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
        );
      } else if (sortBy === "status") {
        const statusOrder = {
          "To-Do": 0,
          "In Progress": 1,
          Done: 2,
        };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      } else if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

  // Today's tasks group (server-date based), exclude Done
  const todaysTasks = useMemo(() => {
    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return filteredTasks.filter((t) => {
      const dueStr = t?.dueDate?.toDate
        ? t.dueDate.toDate().toISOString().slice(0, 10)
        : typeof t?.dueDate === "string"
          ? t.dueDate.slice(0, 10)
          : "";
      return norm(t.status) !== "done" && dueStr && todayStr && dueStr === todayStr;
    });
  }, [filteredTasks, todayStr]);

  const activeTasks = filteredTasks.filter((t) => t.status !== "Done");
  const completedTasks = filteredTasks.filter((t) => t.status === "Done");

  const priorityColors = {
    High: "bg-red-100 text-red-800 border-red-300",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Low: "bg-green-100 text-green-800 border-green-300",
  };

  const statusColors = {
    "To-Do": "bg-gray-100 text-gray-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Done: "bg-green-100 text-green-800",
  };

  const statusIcons = {
    "To-Do": <FaClipboardList />,
    "In Progress": <FaSpinner className="animate-spin" />,
    Done: <FaCheckCircle />,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Tasks" description="Manage your assigned tasks" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  const handleSetReminder = (task) => {
    setReminderTask(task);
    setShowReminderModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="View and manage your assigned tasks"
        icon={<FaTasks />}
      />
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* To-Do Card */}
        <div
          onClick={() => {
            setStatusFilter("To-Do");
            setViewMode("all");
            setPriorityFilter("all");
            setProjectFilter("all");
            setSearchQuery("");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-500 p-4 hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To-Do</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {
                    baseTasks.filter((t) => t.status === "To-Do" || !t.status)
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <FaClipboardList className="text-gray-500 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* In Progress Card */}
        <div
          onClick={() => {
            setStatusFilter("In Progress");
            setViewMode("all");
            setPriorityFilter("all");
            setProjectFilter("all");
            setSearchQuery("");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  In Progress
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <FaClock className="text-blue-500 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div
          onClick={() => {
            setStatusFilter("Done");
            setViewMode("all");
            setPriorityFilter("all");
            setProjectFilter("all");
            setSearchQuery("");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500 p-4 hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Completed
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <FaCheckCircle className="text-green-500 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Card */}
        <div
          onClick={() => {
            setStatusFilter("all");
            setViewMode("overdue");
            setPriorityFilter("all");
            setProjectFilter("all");
            setSearchQuery("");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-500 p-4 hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Overdue
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.overdue}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <FaExclamationTriangle className="text-red-500 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* View Mode Tabs */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Toggle */}
            <div className="flex items-center gap-3 px-1">
              <button
                type="button"
                onClick={() => setTaskSource("admin")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${taskSource === "admin"
                  ? "bg-surface-strong text-content-primary border-subtle shadow-soft"
                  : "bg-transparent text-content-secondary border-transparent hover:text-content-primary hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <FaClipboardList className={`h-4 w-4 ${taskSource === "admin" ? activeIconColor : ""}`} />
                Assigned Tasks
              </button>
              <button
                type="button"
                onClick={() => setTaskSource("self")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${taskSource === "self"
                  ? "bg-surface-strong text-content-primary border-subtle shadow-soft"
                  : "bg-transparent text-content-secondary border-transparent hover:text-content-primary hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <FaTasks className={`h-4 w-4 ${taskSource === "self" ? activeIconColor : ""}`} />
                My Tasks
              </button>
            </div>

            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === "all"
                ? buttonClass
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode("today")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === "today"
                ? buttonClass
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              <FaCalendar className="inline mr-1" />
              Due Today
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === "week"
                ? buttonClass
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              This Week
            </button>
            <button
              onClick={() => setViewMode("overdue")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === "overdue"
                ? "bg-red-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              <FaExclamationTriangle className="inline mr-1" />
              Overdue
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode("list")}
              className={`p-2 rounded transition-colors ${displayMode === "list"
                ? `bg-white dark:bg-[#1e1e2d] ${linkColor} shadow`
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              title="List View"
            >
              <FaList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode("kanban")}
              className={`p-2 rounded transition-colors ${displayMode === "kanban"
                ? `bg-white dark:bg-[#1e1e2d] ${linkColor} shadow`
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              title="Kanban View"
            >
              <FaTh className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Toolbar: selected count + actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {taskSource === "self" && selectedSelfTaskIds.size > 0 && (
                <span>{selectedSelfTaskIds.size} selected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {taskSource === "self" && selectedSelfTaskIds.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                >
                  Delete Selected
                </button>
              )}
            </div>
          </div>
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAddSelfTaskModal(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${buttonClass} text-sm font-medium whitespace-nowrap`}
            >
              <FaPlus className="w-4 h-4" />
              Add Self Task
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              {effectiveStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Projects</option>
              {[
                ...new Set(
                  baseTasks.map((task) => task.projectName).filter(Boolean)
                ),
              ]
                .sort()
                .map((projectName) => (
                  <option key={projectName} value={projectName}>
                    {projectName}
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-2">
              <FaSortAmountDown className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="status">Sort by Status</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400 font-medium">
              Showing {filteredTasks.length} of {baseTasks.length} tasks
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery ||
            statusFilter !== "all" ||
            priorityFilter !== "all" ||
            projectFilter !== "all" ||
            viewMode !== "all") && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs rounded-full flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery("")}>
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")}>
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {priorityFilter !== "all" && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                    Priority: {priorityFilter}
                    <button onClick={() => setPriorityFilter("all")}>
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {projectFilter !== "all" && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                    Project:{" "}
                    {projectFilter === "no-project"
                      ? "No Project"
                      : projectFilter}
                    <button onClick={() => setProjectFilter("all")}>
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {viewMode !== "all" && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                    View: {viewMode}
                    <button onClick={() => setViewMode("all")}>
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setViewMode("all");
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium ml-2"
                >
                  Clear All
                </button>
              </div>
            )}

          {/* Add Self Task Modal (UI matched to provided screenshot) */}
          <AddSelfTaskModal
            isOpen={showAddSelfTaskModal}
            onClose={() => setShowAddSelfTaskModal(false)}
            projects={projectOptions}
            user={user}
          />

          {/* Edit Task Modal */}
          <EditSelfTaskModal
            isOpen={showEditTaskModal}
            onClose={() => {
              setShowEditTaskModal(false);
              setEditingTask(null);
            }}
            task={editingTask}
            projects={projectOptions}
            user={user}
          />

          <CompletionCommentModal
            open={showCompletionModal}
            onClose={() => {
              setShowCompletionModal(false);
              setCompletionTaskId(null);
            }}
            onSubmit={handleSubmitCompletion}
            title="Complete Task"
            placeholder="Required: Add a comment about this completion..."
            minLength={5}
          />

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <DeleteConfirmationModal
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={deleteSelectedSelfTasks}
                title="Delete Self Tasks"
                description={`Are you sure you want to delete ${selectedSelfTaskIds.size} self task${selectedSelfTaskIds.size > 1 ? "s" : ""}?`}
                permanentMessage="This action cannot be undone."
                confirmLabel={`Delete ${selectedSelfTaskIds.size} Task${selectedSelfTaskIds.size > 1 ? "s" : ""}`}
              />
            </div>
          )}

          {/* Single Task Delete Confirmation Modal */}
          {showSingleDeleteConfirmModal && taskToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <DeleteConfirmationModal
                onClose={() => {
                  setShowSingleDeleteConfirmModal(false);
                  setTaskToDelete(null);
                }}
                onConfirm={confirmDeleteTask}
                title="Delete Task"
                description={`Are you sure you want to delete "${taskToDelete.title.length > 50 ? `${taskToDelete.title.substring(0, 30)}...` : taskToDelete.title}"?`}
                permanentMessage="This action cannot be undone."
                confirmLabel="Delete Task"
              />
            </div>
          )}
        </div>
      </Card>
      {/* Tasks List or Kanban View */}
      {displayMode === "kanban" ? (
        <Card>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <FaTasks className="text-gray-300 dark:text-gray-600 text-5xl mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No tasks found matching the filters.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onMove={handleStatusChange}
              onEdit={(task) => setSelectedTask(task)}
              getProject={() => ({ name: "—", color: "#6b7280" })}
              getAssignee={() => ({ name: "You", role: "Employee" })}
            />
          )}
        </Card>
      ) : (
        <Card>
          {/* Render Groups */}
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-content-tertiary">
              No tasks found
            </div>
          ) : (
            <>
              <>
                {taskSource === "self" ? (
                  // --- SELF TASKS VIEW ---
                  <>
                    {/* TODAY'S TASKS Group (server-date based, only if non-empty; does not remove from status groups) */}
                    {todaysTasks.length > 0 && (
                      <TaskGroup
                        title="Today's Tasks"
                        tasks={todaysTasks}
                        colorClass="bg-red-600"
                        onOpenCreate={() => setShowAddSelfTaskModal(true)}
                        selectedIds={selectedSelfTaskIds}
                        onToggleSelect={toggleSelectSelfTask}
                        onView={(task) => setSelectedTask(task)}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onSetReminder={handleSetReminder}
                        onStatusChange={handleStatusChange}
                        resolveAssignees={resolveAssignees}
                        showActions={true}
                      />
                    )}

                    {/* Dynamic status groups (excluding today's tasks) */}
                    {effectiveStatuses.map((s, idx) => {
                      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const tasksForStatus = filteredTasks.filter((t) =>
                        norm(t.status) === norm(s)
                      );
                      if (!tasksForStatus.length) return null;
                      const palette = [
                        "bg-blue-500",
                        "bg-gray-500",
                        "bg-emerald-500",
                        "bg-purple-500",
                        "bg-rose-500",
                        "bg-teal-500",
                        "bg-amber-500",
                      ];
                      const colorClass = palette[idx % palette.length];
                      const hex = statusColorMap[norm(s)];
                      return (
                        <TaskGroup
                          key={`self-grp-${s}`}
                          title={s}
                          tasks={tasksForStatus}
                          colorClass={colorClass}
                          colorHex={hex || null}
                          onOpenCreate={() => setShowAddSelfTaskModal(true)}
                          selectedIds={selectedSelfTaskIds}
                          onToggleSelect={toggleSelectSelfTask}
                          onView={(task) => setSelectedTask(task)}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onSetReminder={handleSetReminder}
                          onStatusChange={handleStatusChange}
                          resolveAssignees={resolveAssignees}
                          showActions={true}
                        />
                      );
                    })}
                  </>
                ) : (
                  // --- ADMIN-ASSIGNED TASKS VIEW ---
                  <>
                    {/* TODAY'S TASKS Group (server-date based, only if non-empty) */}
                    {todaysTasks.length > 0 && (
                      <TaskGroup
                        title="Today's Tasks"
                        tasks={todaysTasks}
                        colorClass="bg-red-600"
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onView={(task) => setSelectedTask(task)}
                        onEdit={handleEditTask}
                        onSetReminder={handleSetReminder}
                        onStatusChange={handleStatusChange}
                        showActions={true}
                        canDelete={false}
                        resolveAssignees={resolveAssignees}
                      />
                    )}

                    {/* Dynamic status groups (include all tasks by status, even if due today) */}
                    {effectiveStatuses.map((s, idx) => {
                      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const tasksForStatus = filteredTasks.filter((t) =>
                        norm(t.status) === norm(s)
                      );
                      if (!tasksForStatus.length) return null;
                      const palette = [
                        "bg-blue-500",
                        "bg-gray-500",
                        "bg-emerald-500",
                        "bg-purple-500",
                        "bg-rose-500",
                        "bg-teal-500",
                        "bg-amber-500",
                      ];
                      const colorClass = palette[idx % palette.length];
                      const hex = statusColorMap[norm(s)];
                      return (
                        <TaskGroup
                          key={`admin-grp-${s}`}
                          title={s}
                          tasks={tasksForStatus}
                          colorClass={colorClass}
                          colorHex={hex || null}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                          onView={(task) => setSelectedTask(task)}
                          onEdit={handleEditTask}
                          onSetReminder={handleSetReminder}
                          onStatusChange={handleStatusChange}
                          showActions={true}
                          canDelete={false}
                          resolveAssignees={resolveAssignees}
                        />
                      );
                    })}
                  </>
                )}
              </>
            </>
          )}
        </Card>
      )}
      {/* Load More Button */}
      {(tasks.length >= taskLimit || selfTasks.length >= taskLimit) && (
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
      )}{" "}
      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskViewModal
          task={selectedTask}
          project={getProject(selectedTask.projectId)}
          projects={projects}
          assignee={getAssignee(selectedTask.assigneeId)}
          assigneesResolved={resolveAssignees(selectedTask)}
          users={users}
          clients={clients}
          statuses={effectiveStatuses}
          currentUser={user}
          onClose={() => setSelectedTask(null)}
          onEdit={(updatedTask) => {
            setSelectedTask(null);
            handleStatusChange(updatedTask.id, updatedTask.status);
          }}
          onDelete={async (task) => {
            if (
              window.confirm(`Are you sure you want to delete "${task.title}"?`)
            ) {
              try {
                await deleteDoc(doc(db, "tasks", task.id));
                toast.success("Task deleted");
                setSelectedTask(null);
              } catch (e) {
                toast.error("Failed to delete task");
              }
            }
          }}
          onArchive={async (task) => {
            try {
              await updateDoc(doc(db, "tasks", task.id), { archived: true });
              toast.success("Task archived");
              setSelectedTask(null);
            } catch (e) {
              toast.error("Failed to archive task");
            }
          }}
          canDelete={selectedTask.source === "self"}
          canArchive={selectedTask.source === "self"}
          canEdit={selectedTask.source === "self"}
        />
      )}
      <AddReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setReminderTask(null);
        }}
        initialData={{
          title: reminderTask?.title,
          relatedTaskId: reminderTask?.id,
        }}
      />
    </div>
  );
};

export default EmployeeTasks;

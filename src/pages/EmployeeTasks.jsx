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
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import KanbanBoard from "../components/KanbanBoard";
import toast from "react-hot-toast";
import CompletionCommentModal from "../components/CompletionCommentModal";
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
import StatCard from "../components/StatCard";
import {
  shouldCreateNextInstanceAsync,
  createNextRecurringInstance,
} from "../utils/recurringTasks";
import { updateProjectProgress } from "../utils/projectProgress";

const EmployeeTasks = () => {
  const { user } = useAuthContext();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const [tasks, setTasks] = useState([]);
  const [selfTasks, setSelfTasks] = useState([]);
  const [projects, setProjects] = useState([]);
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
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignedDate, setNewTaskAssignedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [newTaskStatus, setNewTaskStatus] = useState("To-Do");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [savingSelfTask, setSavingSelfTask] = useState(false);
  const [selectedSelfTaskIds, setSelectedSelfTaskIds] = useState(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

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
  }, [taskSource]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status:
            doc.data().status === "In Review"
              ? "In Progress"
              : doc.data().status || "To-Do",
          progressPercent: doc.data().progressPercent ?? 0,
          source: "admin",
          collectionName: "tasks",
        }))
        .filter((task) => task.assigneeType === "user")
        .sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
          return dateA - dateB;
        });
      console.log("🔍 Tasks loaded:", taskData.length, "tasks");
      console.log(
        "🔍 Sample task with projectId:",
        taskData.find((t) => t.projectId) || "No tasks with projectId found"
      );
      console.log("🔍 All projectIds in tasks:", [
        ...new Set(taskData.map((t) => t.projectId).filter(Boolean)),
      ]);
      setTasks(taskData);
    });

    // Self tasks subscription
    const qSelf = query(
      collection(db, "selfTasks"),
      where("userId", "==", user.uid)
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
    });

    // Projects subscription (for Project dropdown)
    const unsubscribeProjects = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        console.log("🔍 Projects loaded from Firestore:", projectsData);
        setProjects(projectsData);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeSelf();
      unsubscribeProjects();
    };
  }, [user]);

  // Only show projects that have admin-assigned tasks for this employee
  const adminProjectIds = useMemo(() => {
    const ids = new Set();
    tasks.forEach((t) => {
      if (t.projectId) ids.add(t.projectId);
    });
    return ids;
  }, [tasks]);

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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      if (newStatus === "Done") {
        setCompletionTaskId(taskId);
        setShowCompletionModal(true);
        return;
      }

      let updates = { status: newStatus };
      if (newStatus === "In Progress") {
        updates.progressPercent = 0;
      }
      // Reverting from Done
      if (newStatus !== "Done") {
        updates.completedAt = null;
        updates.completedBy = null;
        updates.completedByType = null;
        updates.completionComment = null;
        updates.progressPercent = newStatus === "In Progress" ? 0 : null;
      }

      const current =
        tasks.find((t) => t.id === taskId) ||
        selfTasks.find((t) => t.id === taskId);
      const col = current?.collectionName || "tasks";

      await updateDoc(doc(db, col, taskId), updates);

      // Note: In Employee view, "Done" usually triggers the modal via the first IF block.
      // However, if you ever allow direct "Done" without modal, put the recurring logic here too.
      // For now, the main logic sits in handleSubmitCompletion (below).

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

      await updateDoc(doc(db, col, completionTaskId), {
        status: "Done",
        completedAt: serverTimestamp(),
        progressPercent: 100,
        completedBy: user?.uid || "",
        completedByType: "user",
        ...(comment ? { completionComment: comment } : {}),
      });

      // ---------------------------------------------------------
      // RECURRING TRIGGER LOGIC (Only for assigned tasks, not self tasks usually)
      // ---------------------------------------------------------
      if (col === "tasks" && current?.isRecurring) {
        try {
          const taskForCheck = {
            ...current,
            status: "Done",
            completedAt: new Date(),
          };

          const shouldRecur = await shouldCreateNextInstanceAsync(taskForCheck);
          if (shouldRecur) {
            const newId = await createNextRecurringInstance(taskForCheck);
            if (newId) {
              toast.success("Next recurring task created! 🔄");
              if (current.projectId) {
                try {
                  await updateProjectProgress(current.projectId);
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.error("Recurring logic error", e);
        }
      }
      // ---------------------------------------------------------

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

      // Prepare update object
      let updateData = { progressPercent: value };

      // If progress is 100%, automatically set status to Done
      if (value === 100) {
        updateData.status = "Done";
        updateData.completedAt = serverTimestamp();
        updateData.completedBy = user?.uid || "";
        updateData.completedByType = "user";
      }

      await updateDoc(doc(db, col, taskId), updateData);

      // ---------------------------------------------------------
      // RECURRING TRIGGER LOGIC (For 100% Progress)
      // ---------------------------------------------------------
      if (value === 100 && col === "tasks" && current?.isRecurring) {
        try {
          const taskForCheck = {
            ...current,
            status: "Done",
            completedAt: new Date(),
          };
          const shouldRecur = await shouldCreateNextInstanceAsync(taskForCheck);
          if (shouldRecur) {
            const newId = await createNextRecurringInstance(taskForCheck);
            if (newId) {
              toast.success("Next recurring task created! 🔄");
              if (current.projectId) {
                try {
                  await updateProjectProgress(current.projectId);
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.error("Recurring logic error", e);
        }
      }
      // ---------------------------------------------------------

      if (value === 100) {
        toast.success("Task completed automatically!");
      } else {
        toast.success("Progress updated");
      }

      // Update local state
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
  console.log("🔍 Available projects for dropdown:", availableProjects);
  console.log("🔍 BaseTasks sample:", baseTasks.slice(0, 2));
  console.log("🔍 Total baseTasks:", baseTasks.length);
  console.log(
    "🔍 Tasks with projectName:",
    baseTasks.filter((t) => t.projectName).length
  );
  console.log(
    "🔍 Tasks with projectId but no projectName:",
    baseTasks.filter((t) => t.projectId && !t.projectName).length
  );

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
              className="h-32 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="View and manage your assigned tasks"
        icon={<FaTasks />}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FaTasks className="h-5 w-5" />}
          label="Total Tasks"
          value={String(stats.total)}
          color="indigo"
        />
        <StatCard
          icon={<FaCheckCircle className="h-5 w-5" />}
          label="Completed"
          value={String(stats.completed)}
          color="green"
        />
        <StatCard
          icon={<FaClock className="h-5 w-5" />}
          label="In Progress"
          value={String(stats.inProgress)}
          color="sky"
        />
        <StatCard
          icon={<FaExclamationTriangle className="h-5 w-5" />}
          label="Overdue"
          value={String(stats.overdue)}
          color="amber"
        />
      </div>

      {/* View Mode Tabs */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode("today")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "today"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaCalendar className="inline mr-1" />
              Due Today
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "week"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setViewMode("overdue")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaExclamationTriangle className="inline mr-1" />
              Overdue
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode("list")}
              className={`p-2 rounded transition-colors ${
                displayMode === "list"
                  ? "bg-white text-indigo-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="List View"
            >
              <FaList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode("kanban")}
              className={`p-2 rounded transition-colors ${
                displayMode === "kanban"
                  ? "bg-white text-indigo-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
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
            <div className="text-sm text-gray-600">
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
              <button
                onClick={() => setShowAddSelfTaskModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                <FaPlus className="w-4 h-4" />
                Add Self Task
              </button>
            </div>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}

            {/* Add Self Task Modal (UI matched to provided screenshot) */}
            {showAddSelfTaskModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setShowAddSelfTaskModal(false)}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-5">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Create Task
                    </h3>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder=""
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Description
                      </label>
                      <textarea
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm h-28 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Project */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Project
                      </label>
                      <select
                        value={newTaskProjectId}
                        onChange={(e) => setNewTaskProjectId(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Date, Due Date, Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Assigned Date
                        </label>
                        <input
                          type="date"
                          value={newTaskAssignedDate}
                          onChange={(e) =>
                            setNewTaskAssignedDate(e.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Priority
                        </label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Status
                        </label>
                        <select
                          value={newTaskStatus}
                          onChange={(e) => setNewTaskStatus(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option>To-Do</option>
                          <option>In Progress</option>
                          <option>Done</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-5 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowAddSelfTaskModal(false)}
                      className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!newTaskTitle.trim()) {
                          toast.error("Title is required");
                          return;
                        }
                        try {
                          setSavingSelfTask(true);
                          const due = newTaskDueDate
                            ? new Date(newTaskDueDate)
                            : null;
                          const assigned = newTaskAssignedDate
                            ? new Date(newTaskAssignedDate)
                            : null;
                          const selectedProject = projectOptions.find(
                            (p) => p.id === newTaskProjectId
                          );
                          await addDoc(collection(db, "selfTasks"), {
                            userId: user?.uid,
                            assigneeId: user?.uid,
                            assigneeType: "user",
                            title: newTaskTitle.trim(),
                            description: newTaskDesc.trim() || "",
                            priority: newTaskPriority,
                            status: newTaskStatus,
                            progressPercent: newTaskStatus === "Done" ? 100 : 0,
                            ...(newTaskProjectId
                              ? { projectId: newTaskProjectId }
                              : {}),
                            ...(selectedProject
                              ? { projectName: selectedProject.name }
                              : {}),
                            ...(due ? { dueDate: due } : {}),
                            ...(assigned ? { assignedDate: assigned } : {}),
                            createdAt: serverTimestamp(),
                          });
                          toast.success("Self task added");
                          setShowAddSelfTaskModal(false);
                          setNewTaskTitle("");
                          setNewTaskDesc("");
                          setNewTaskPriority("Medium");
                          setNewTaskDueDate("");
                          setNewTaskAssignedDate(() => {
                            const d = new Date();
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, "0");
                            const day = String(d.getDate()).padStart(2, "0");
                            return `${y}-${m}-${day}`;
                          });
                          setNewTaskStatus("To-Do");
                          setNewTaskProjectId("");
                        } catch (e) {
                          console.error(e);
                          toast.error("Failed to add task");
                        } finally {
                          setSavingSelfTask(false);
                        }
                      }}
                      className="px-6 py-2 rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      disabled={savingSelfTask}
                    >
                      {savingSelfTask ? "Saving..." : "Save Task"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <CompletionCommentModal
              open={showCompletionModal}
              onClose={() => {
                setShowCompletionModal(false);
                setCompletionTaskId(null);
              }}
              onSubmit={handleSubmitCompletion}
              title="Mark Task as Done"
              confirmLabel="Mark Done"
              minLength={5}
              maxLength={300}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FaTimes className="h-5 w-5 text-red-600" />
                      Delete Self Tasks
                    </h3>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-600">
                      Are you sure you want to delete {selectedSelfTaskIds.size}{" "}
                      self task{selectedSelfTaskIds.size > 1 ? "s" : ""}?
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteSelectedSelfTasks}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <FaTimes className="h-4 w-4" />
                      Delete {selectedSelfTaskIds.size} Task
                      {selectedSelfTaskIds.size > 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <span className="font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="To-Do">To-Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
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
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="status">Sort by Status</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 font-medium">
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
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchQuery && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("all")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {priorityFilter !== "all" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                  Priority: {priorityFilter}
                  <button onClick={() => setPriorityFilter("all")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {projectFilter !== "all" && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
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
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
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
        </div>
      </Card>

      {/* Tasks List or Kanban View */}
      {displayMode === "kanban" ? (
        <Card>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <FaTasks className="text-gray-300 text-5xl mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
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
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  Active Tasks ({activeTasks.length})
                </h3>
                {taskSource === "self" && selectedSelfTaskIds.size > 0 && (
                  <span className="text-xs text-gray-600 font-medium">
                    {selectedSelfTaskIds.size} selected
                  </span>
                )}
                {/* Source Toggle */}
                <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTaskSource("admin")}
                    className={`px-3 py-1 text-xs rounded ${
                      taskSource === "admin"
                        ? "bg-white text-indigo-600 shadow"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    Admin Tasks
                  </button>
                  <button
                    onClick={() => setTaskSource("self")}
                    className={`px-3 py-1 text-xs rounded ${
                      taskSource === "self"
                        ? "bg-white text-indigo-600 shadow"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    My Self Tasks
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {activeTasks.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No active tasks
                  </div>
                ) : (
                  activeTasks.map((task) => {
                    const dueDate =
                      task.dueDate?.toDate?.() || new Date(task.dueDate);
                    const isOverdue =
                      dueDate < new Date() && task.status !== "Done";
                    const daysUntilDue = Math.ceil(
                      (dueDate - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        key={task.id}
                        data-task-id={task.id}
                        className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                      >
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              {task.collectionName === "selfTasks" && (
                                <input
                                  type="checkbox"
                                  checked={selectedSelfTaskIds.has(task.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelectSelfTask(task.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              )}
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-content-primary hover:text-indigo-600 transition-colors line-clamp-1">
                                    {task.title}
                                  </h3>
                                  {task.isRecurring && (
                                    <MdReplayCircleFilled className="text-teal-600 text-lg flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-xs sm:text-sm text-content-secondary line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-2 text-[11px] sm:text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {task.projectName && (
                                <span>Project: {task.projectName}</span>
                              )}
                              {task.collectionName === "selfTasks" && (
                                <span>Assigned to: You</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold ${
                                  priorityColors[task.priority] ||
                                  priorityColors.Medium
                                }`}
                              >
                                <FaFlag className="text-xs" />
                                {task.priority}
                              </span>
                              <span
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold ${
                                  statusColors[task.status] ||
                                  statusColors["To-Do"]
                                }`}
                              >
                                {statusIcons[task.status]}
                                <span>{task.status}</span>
                              </span>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <span
                                className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-full flex items-center gap-1 ${
                                  isOverdue
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : daysUntilDue <= 3 && daysUntilDue >= 0
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                <FaCalendar className="text-xs" />
                                Due: {formatDateToDDMMYYYY(dueDate)}
                              </span>
                              {task.assignedDate && (
                                <span className="px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-full flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200">
                                  <FaCalendarAlt className="text-xs" />
                                  Assigned:{" "}
                                  {formatDateToDDMMYYYY(
                                    task.assignedDate?.toDate?.() ||
                                      new Date(task.assignedDate)
                                  )}
                                </span>
                              )}
                              {isOverdue && (
                                <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar Section - Only show for In Progress or Done tasks */}
                        {(task.status === "In Progress" ||
                          task.status === "Done") && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <div
                                className="bg-gray-200 rounded-full h-2"
                                style={{ width: "30%" }}
                              >
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${task.progressPercent || 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-indigo-600">
                                {task.progressPercent || 0}%
                              </span>
                            </div>
                            {task.status === "In Progress" && (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={
                                    progressDrafts[task.id] ??
                                    (task.progressPercent || 0)
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProgressDrafts((prev) => ({
                                      ...prev,
                                      [task.id]: val,
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      commitProgress(task.id);
                                  }}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="%"
                                />
                                <button
                                  onClick={() => commitProgress(task.id)}
                                  className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
                                >
                                  Update
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
                          >
                            View
                          </button>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleStatusChange(task.id, e.target.value)
                            }
                            className="rounded-full border border-subtle bg-surface px-2 py-1 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="To-Do">To-Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Completed ({completedTasks.length})
                </h3>
                <button
                  onClick={() => setShowCompleted((s) => !s)}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {showCompleted ? "Hide" : "Show"}
                </button>
              </div>
              {showCompleted && (
                <div className="space-y-3">
                  {completedTasks.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-4">
                      No completed tasks
                    </div>
                  ) : (
                    completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900 flex-1">
                                {task.title}
                              </h4>
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Done
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {task.description}
                              </p>
                            )}
                            {task.completionComment && (
                              <p className="text-xs italic text-indigo-700 mb-1 line-clamp-1">
                                💬 {task.completionComment}
                              </p>
                            )}
                            <div className="text-xs text-gray-500">
                              Completed on{" "}
                              {formatDateToDDMMYYYY(
                                task.completedAt?.toDate?.() ||
                                  new Date(task.completedAt)
                              )}
                            </div>
                            <div className="mt-2">
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="rounded-md bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-white/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl border border-gray-200">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTask.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                      statusColors[selectedTask.status] || statusColors["To-Do"]
                    }`}
                  >
                    {statusIcons[selectedTask.status]}
                    <span>{selectedTask.status}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                      priorityColors[selectedTask.priority] ||
                      priorityColors.Medium
                    }`}
                  >
                    <FaFlag className="text-xs" />
                    {selectedTask.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Due Date
                  </h4>
                  <p className="text-gray-900">
                    <FaCalendar className="inline mr-2 text-indigo-600" />
                    {formatDateToDDMMYYYY(
                      selectedTask.dueDate?.toDate?.() ||
                        new Date(selectedTask.dueDate)
                    )}
                  </p>
                </div>

                {selectedTask.projectName && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Project
                    </h4>
                    <p className="text-gray-900">
                      📁 {selectedTask.projectName}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress (In Modal) */}
              {selectedTask.status === "In Progress" && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Progress
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Progress:
                    </span>
                    <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${selectedTask.progressPercent || 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                      {selectedTask.progressPercent || 0}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={
                        progressDrafts[selectedTask.id] ??
                        (selectedTask.progressPercent || 0)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setProgressDrafts((prev) => ({
                          ...prev,
                          [selectedTask.id]: val,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitProgress(selectedTask.id);
                      }}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="%"
                    />
                    <button
                      onClick={() => commitProgress(selectedTask.id)}
                      className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Update
                    </button>
                  </div>
                </div>
              )}

              {/* Completion Date - Only show if task is actually Done */}
              {selectedTask.completedAt && selectedTask.status === "Done" && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Completed On
                  </h4>
                  <p className="text-gray-900">
                    <FaCheckCircle className="inline mr-2 text-green-600" />
                    {formatDateToDDMMYYYY(
                      selectedTask.completedAt?.toDate?.() ||
                        new Date(selectedTask.completedAt)
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Update Status
                </h4>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    handleStatusChange(selectedTask.id, newStatus);
                    // Update selected task state and clear completion data if not Done
                    setSelectedTask({
                      ...selectedTask,
                      status: newStatus,
                      ...(newStatus !== "Done"
                        ? {
                            completedAt: null,
                            completedBy: null,
                            completedByType: null,
                            completionComment: null,
                            progressPercent:
                              newStatus === "In Progress" ? 0 : null,
                          }
                        : {}),
                    });
                  }}
                  className="rounded-md border border-subtle bg-surface px-2 py-1 text-xs"
                >
                  <option value="To-Do">To-Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasks;

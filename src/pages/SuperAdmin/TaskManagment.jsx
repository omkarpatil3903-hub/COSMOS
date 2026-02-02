import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import toast from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import KanbanBoard from "../../components/KanbanBoard";
import TaskModal from "../../components/TaskModal";
import TaskGroup from "../../components/TaskManagment/TaskGroup";
import TaskViewModal from "../../components/TaskManagment/TaskViewModal";
import ColorSwatchPicker from "../../components/ColorSwatchPicker";
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

import { db, app, auth } from "../../firebase";
import { updateProjectProgress } from "../../utils/projectProgress";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit,
  where,
} from "firebase/firestore";
import { useAuthContext } from "../../context/AuthContext";
import { getDatabase, ref as rtdbRef, onValue as onRtdbValue } from "firebase/database";
import { deleteTaskWithRelations, logTaskActivity, completeTaskWithRecurrence } from "../../services/taskService";
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

function TasksManagement({ onlyMyManagedProjects = false }) {
  const { user } = useAuthContext();
  const { buttonClass, iconColor, barColor, gradientClass } = useThemeStyles();
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

  // Bulk delete confirmation modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [view, setView] = useState("list");

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Status definitions from settings/task-statuses-name
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusColorMap, setStatusColorMap] = useState({});

  // Group options (ClickUp-style) modal state
  const [showGroupOptionsModal, setShowGroupOptionsModal] = useState(false);
  const [groupOptionsContext, setGroupOptionsContext] = useState(null); // { title, tasks }

  // Status color change modal state
  const [showStatusColorModal, setShowStatusColorModal] = useState(false);
  const [statusColorTarget, setStatusColorTarget] = useState("");
  const [statusColorTemp, setStatusColorTemp] = useState("#6b7280");
  const [showAdvancedStatusColor, setShowAdvancedStatusColor] = useState(false);

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



  // Fetch statuses from settings
  // Fetch statuses from settings (Real-time)
  useEffect(() => {
    const ref = doc(db, "settings", "task-statuses");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const list = Array.isArray(data.statuses) ? data.statuses : [];

        const names = [];
        const colors = {};

        // Helper: Generate consistent pastel color from string
        const stringToColor = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          }
          const c = (hash & 0x00ffffff).toString(16).toUpperCase();
          return '#' + '00000'.substring(0, 6 - c.length) + c;
        };

        list.forEach(item => {
          let name, color;
          // Handle pure strings and various object shapes
          if (typeof item === 'string') {
            name = item;
          } else if (item && typeof item === 'object') {
            name = item.name || item.label || item.value;
            color = item.color || item.bg || item.background;
          }

          if (name) {
            names.push(name);
            if (color) {
              colors[name] = color;
            } else {
              // Fallback defaults
              const lower = name.toLowerCase();
              if (lower.includes('done') || lower.includes('complete')) colors[name] = '#10B981';
              else if (lower.includes('progress') || lower.includes('working')) colors[name] = '#F59E0B';
              else if (lower.includes('todo') || lower.includes('to-do') || lower.includes('backlog')) colors[name] = '#3B82F6';
              else if (lower.includes('hold') || lower.includes('block')) colors[name] = '#EF4444';
              else if (lower.includes('review') || lower.includes('qa')) colors[name] = '#8B5CF6';
              else colors[name] = stringToColor(name);
            }
          }
        });

        if (names.length > 0) {
          setStatusOptions(names);
          setStatusColorMap(colors);
        }
      }
    }, (err) => {
      console.error("Failed to fetch task statuses", err);
    });

    return () => unsub();
  }, []);

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

  // If DB has not provided statuses yet, derive them from current tasks
  const effectiveStatuses = useMemo(() => {
    if (Array.isArray(statusOptions) && statusOptions.length) return statusOptions;
    const unique = Array.from(
      new Set(tasks.map((t) => t.status).filter(Boolean))
    );
    return unique;
  }, [statusOptions, tasks]);

  // Create columns for KanbanBoard with dynamic statuses and theme colors
  const kanbanColumns = useMemo(() => {
    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    return effectiveStatuses.map((statusName) => {
      const normalizedKey = norm(statusName);
      const color = statusColorMap[normalizedKey] || "#6b7280";

      return {
        key: statusName,
        title: statusName,
        color: color
      };
    });
  }, [effectiveStatuses, statusColorMap]);

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

  // Check for overrides via URL query params (e.g. ?filter=overdue)
  // This is used by the Manager Dashboard "Overdue" card.
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterType = params.get("filter");

    if (filterType === "overdue") {
      applyOverdueQuickFilter();
    }
  }, [location.search, applyOverdueQuickFilter]);

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

  // Load task statuses from settings/task-statuses document (field: statuses[])
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
        // On error, avoid injecting static defaults here; leave empty to surface config issues clearly
        setStatusOptions([]);
        setStatusColorMap({});
      }
    );

    return () => unsub();
  }, []);

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
              // Prefer raw status from DB (mapping only legacy 'In Review').
              const raw = (data.status === "In Review" ? "In Progress" : data.status) || (effectiveStatuses[0] || "To-Do");
              // If dynamic statuses are configured, do not override with derived values.
              if (Array.isArray(statusOptions) && statusOptions.length) return raw;

              // Legacy behavior: derive coarse status if no dynamic statuses configured.
              let s = raw;
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
            selectedWeekDays: data.selectedWeekDays || null,
            skipWeekends: data.skipWeekends || false,
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
  }, [taskLimit, filters.project, filters.assignee, statusOptions]);

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
        const normStatus = (task.status || "").toString().trim().toLowerCase();
        if (normStatus === "done" || !task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= threeDaysFromNow;
      });

      if (dueSoonTasks.length > 0) {
        // Show a single summary toast instead of spamming for each task
        const message =
          dueSoonTasks.length === 1
            ? `⚠ Task "${dueSoonTasks[0].title}" is due shortly.`
            : `⚠ You have ${dueSoonTasks.length} tasks due within the next 3 days.`;

        toast(message, { duration: 3000, icon: "⏰" });
        hasCheckedDeadlines.current = true;
      }
    };

    // Small delay to ensure data is loaded
    if (tasks.length > 0) {
      const timer = setTimeout(checkDeadlines, 2000);
      return () => clearTimeout(timer);
    }
  }, [tasks]); // We still depend on tasks, but the ref prevents re-running logic repeatedly

  const openCreate = (status) => {
    // Open modal in pure create mode. React passes MouseEvent when used as onClick.
    const isString = typeof status === "string" && status.trim() !== "";
    if (isString) {
      // If invoked from a synthetic group like "Today's Tasks" or catch-all like "Other",
      // default to TO DO; otherwise use provided status.
      const synthetic = status === "TODAYS TASK" || status === "Today's Tasks" || status === "Other";
      setEditing({ status: synthetic ? "TO DO" : status });
    } else {
      setEditing({ status: "TO DO" });
    }
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
              status: current?.status || (effectiveStatuses[0] || "To-Do"),
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
          status: taskData.status || (effectiveStatuses[0] || "To-Do"),
          progressPercent: taskData.progressPercent ?? 0,
          completionComment: taskData.completionComment || "",
          weightage: Number.isNaN(wt) ? null : wt,
          isRecurring: taskData.isRecurring || false,
          recurringPattern: taskData.recurringPattern || "daily",
          recurringInterval: taskData.recurringInterval || 1,
          selectedWeekDays: taskData.selectedWeekDays || null,
          skipWeekends: taskData.skipWeekends || false,
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

        const normStatus = (v) => (v || "").toString().trim().toLowerCase();
        const isCurrentlyDone = normStatus(current?.status) === "done";
        const isUpdatingToDone = normStatus(update.status) === "done" && !isCurrentlyDone;

        // Enforce WIP on status change (only for active columns, excluding Done)
        if (
          update.status &&
          current &&
          !isUpdatingToDone &&
          update.status !== "Done" &&
          update.status !== current.status &&
          isWipExceeded(update.status, taskData.id)
        ) {
          const limit = wipLimits?.[update.status];
          toast.error(
            `WIP limit reached in ${update.status} (${limit}). Complete or move tasks out before adding more.`
          );
          return;
        }
        // If transitioning to Done via edit/save, open completion comment modal
        // and defer final Done update to handleSubmitAdminCompletion.
        if (isUpdatingToDone) {
          setCompletionTaskId(taskData.id);
          setShowCompletionModal(true);

          // Do NOT force status/progress/completedAt here; let the modal flow handle it.
          // Persist other field changes (title, description, etc.) so they aren't lost.
          const { status, progressPercent, completedAt, ...rest } = update;
          await updateDoc(ref, rest);
        } else {
          if (!isCurrentlyDone && normStatus(update.status) === "done") {
            update.completedAt = serverTimestamp();
            update.progressPercent = 100;
          } else if (isCurrentlyDone && normStatus(update.status) !== "done") {
            update.completedAt = null;
          }

          // Propagate admin status change to all assignees so Employee panel reflects it
          if (Array.isArray(newAssigneeIds) && newAssigneeIds.length > 0 && update.status) {
            const willBeDone = normStatus(update.status) === "done";
            newAssigneeIds.forEach((uid) => {
              update[`assigneeStatus.${uid}.status`] = update.status;
              if (willBeDone) {
                update[`assigneeStatus.${uid}.progressPercent`] = 100;
                update[`assigneeStatus.${uid}.completedAt`] = serverTimestamp();
                update[`assigneeStatus.${uid}.completedBy`] = user?.uid || "system";
              } else if (isCurrentlyDone) {
                update[`assigneeStatus.${uid}.progressPercent`] = 0;
                update[`assigneeStatus.${uid}.completedAt`] = null;
                update[`assigneeStatus.${uid}.completedBy`] = null;
              }
            });
          }

          await updateDoc(ref, update);
        }

        // Handle Series Update
        if (taskData.updateSeries) {
          const rootId = taskData.parentRecurringTaskId || taskData.id;
          // If we are editing a child task, update the root task with definition changes
          if (rootId !== taskData.id) {
            try {
              const rootRef = doc(db, "tasks", rootId);
              const rootUpdate = {
                title: taskData.title,
                description: taskData.description || "",
                priority: taskData.priority || "Medium",
                projectId: taskData.projectId || "",
                // Recurrence settings
                isRecurring: true,
                recurringPattern: taskData.recurringPattern || "daily",
                recurringInterval: taskData.recurringInterval || 1,
                recurringEndDate: taskData.recurringEndDate || "",
                recurringEndAfter: taskData.recurringEndAfter || "",
                recurringEndType: taskData.recurringEndType || "never",
                // OKRs
                okrObjectiveIndex:
                  taskData.okrObjectiveIndex === undefined
                    ? null
                    : taskData.okrObjectiveIndex,
                okrKeyResultIndices: taskData.okrKeyResultIndices || [],
                // Assignees
                assigneeId: taskData.assigneeId || "",
                assigneeType: taskData.assigneeType || "user",
                assignees: Array.isArray(taskData.assignees)
                  ? taskData.assignees
                  : [],
                assigneeIds: newAssigneeIds,
              };
              await updateDoc(rootRef, rootUpdate);
              // toast.success("Series definition updated"); // Optional: reduce toast spam
            } catch (err) {
              console.error("Failed to update series root task", err);
              toast.error("Failed to update series definition");
            }
          }
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

        // Only show inline success toast when we are not deferring completion
        // to the CompletionCommentModal (i.e., not transitioning into Done here).
        if (!isUpdatingToDone) {
          toast.success("Task updated successfully!");
        }
      } else {
        // Enforce WIP on creation
        const initialStatus = taskData.status || (effectiveStatuses[0] || "To-Do");
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
          status: taskData.status || (effectiveStatuses[0] || "To-Do"),
          progressPercent: taskData.status === "Done" ? 100 : 0,
          createdAt: serverTimestamp(),
          completedAt: taskData.status === "Done" ? serverTimestamp() : null,
          archived: false,
          completionComment: taskData.completionComment || "",
          weightage: Number.isNaN(wt) ? null : wt,
          isRecurring: taskData.isRecurring || false,
          recurringPattern: taskData.recurringPattern || "daily",
          recurringInterval: taskData.recurringInterval || 1,
          selectedWeekDays: taskData.selectedWeekDays || null,
          skipWeekends: taskData.skipWeekends || false,
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
        await updateDoc(newRef, { taskId: newRef.id });

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
      await deleteTaskWithRelations(taskToDelete.id, "tasks");
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

  // --- Group Options (ClickUp-style) handlers ---
  const handleHeaderMenu = (payload) => {
    // payload: { action, title, tasks }
    if (!payload) return;
    if (payload.action === "change-color") {
      const name = payload.title || "";
      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const current = statusColorMap[norm(name)] || "#6b7280";
      setStatusColorTarget(name);
      setStatusColorTemp(current);
      setShowStatusColorModal(true);
      return;
    }
    setGroupOptionsContext(payload);
    setShowGroupOptionsModal(true);
  };

  const closeGroupOptionsModal = () => {
    setShowGroupOptionsModal(false);
    setGroupOptionsContext(null);
  };

  const handleGroupAction = (action) => {
    if (!groupOptionsContext) return;

    const { title, tasks: groupTasks } = groupOptionsContext;

    switch (action) {
      case "rename":
        toast("Rename group not implemented yet", { icon: "✏️" });
        break;
      case "new-status":
        toast("New status not implemented yet", { icon: "➕" });
        break;
      case "edit-statuses":
        toast("Edit statuses not implemented yet", { icon: "⚙️" });
        break;
      case "collapse-group":
        toast("Collapse group not implemented yet", { icon: "📂" });
        break;
      case "hide-status":
        toast("Hide status not implemented yet", { icon: "🙈" });
        break;
      case "select-all": {
        const allIds = (groupTasks || []).map((t) => t.id);
        setSelectedIds(new Set(allIds));
        toast.success(`Selected ${allIds.length} task(s) in ${title}`);
        break;
      }
      case "collapse-all-groups":
        toast("Collapse all groups not implemented yet", { icon: "📚" });
        break;
      case "automate-status":
        toast("Automate status not implemented yet", { icon: "⚡" });
        break;
      default:
        break;
    }

    closeGroupOptionsModal();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return toast.error("No tasks selected");
    try {
      const affectedProjects = new Set();
      const selectedList = Array.from(selectedIds);
      selectedList.forEach((id) => {
        const t = tasks.find((x) => x.id === id);
        if (t?.projectId) affectedProjects.add(t.projectId);
      });
      await Promise.all(
        selectedList.map((id) => deleteTaskWithRelations(id, "tasks"))
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

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) {
      setShowBulkDeleteModal(false);
      return toast.error("No tasks selected");
    }
    try {
      setIsBulkDeleting(true);
      await handleBulkDelete();
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
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
      const updates = {
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
      };

      // Propagate admin status change to all assignees (multi + single fallback)
      {
        const targetUids = Array.from(
          new Set([...(Array.isArray(t.assigneeIds) ? t.assigneeIds : []), t.assigneeId].filter(Boolean))
        );
        targetUids.forEach((uid) => {
          updates[`assigneeStatus.${uid}.status`] = newStatus;
          if (willBeDone) {
            updates[`assigneeStatus.${uid}.progressPercent`] = 100;
            updates[`assigneeStatus.${uid}.completedAt`] = serverTimestamp();
            updates[`assigneeStatus.${uid}.completedBy`] = user?.uid || "system";
          } else if (wasDone) {
            updates[`assigneeStatus.${uid}.progressPercent`] = 0;
            updates[`assigneeStatus.${uid}.completedAt`] = null;
            updates[`assigneeStatus.${uid}.completedBy`] = null;
          }
        });
      }

      await updateDoc(doc(db, "tasks", taskId), updates);
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

      // Use the centralized completion handler with recurrence support
      await completeTaskWithRecurrence(t, user, comment, "tasks");

      console.log("Admin completion updated doc via service. Task:", t?.id);

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

    // Get managed project IDs if filtering for manager
    let managedProjectIds = null;
    if (onlyMyManagedProjects) {
      const currentUser = auth.currentUser;
      managedProjectIds = projects
        .filter(p => p.projectManagerId === currentUser?.uid)
        .map(p => p.id);
    }

    return tasks.filter((t) => {
      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 0. Manager Project Filter - only show tasks from managed projects
      if (managedProjectIds && !managedProjectIds.includes(t.projectId)) return false;

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
      if (filters.status && norm(t.status) !== norm(filters.status)) return false;

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
  }, [tasks, filters, projectMap, userMap, clientMap, onlyMyManagedProjects, projects]);

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

  // Separate filter logic for counts: Apply all filters EXCEPT status
  const filteredForCounts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    // Get managed project IDs if filtering for manager
    let managedProjectIds = null;
    if (onlyMyManagedProjects) {
      const currentUser = auth.currentUser;
      managedProjectIds = projects
        .filter(p => p.projectManagerId === currentUser?.uid)
        .map(p => p.id);
    }

    return tasks.filter((t) => {
      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 0. Manager Project Filter
      if (managedProjectIds && !managedProjectIds.includes(t.projectId)) return false;

      // 1. Global Visibility Check
      if (t.visibleFrom && t.visibleFrom > today) return false;
      if (!filters.showArchived && t.archived) return false;

      // 2. Overdue Check (Skipping for counts to keep main status numbers visible)
      // if (filters.onlyOverdue) {
      //   if (!(t.dueDate && t.status !== "Done" && t.dueDate < today)) return false;
      // }

      // 3. Exact Match Filters (Skipping Status)
      if (filters.project && t.projectId !== filters.project) return false;
      if (
        filters.assigneeType &&
        (t.assigneeType || "user") !== filters.assigneeType
      )
        return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      // SKIP STATUS CHECK for counts

      // 4. Assignee ID Check
      if (filters.assignee) {
        const [type, id] = filters.assignee.split(":");
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
  }, [tasks, filters, projectMap, userMap, clientMap, onlyMyManagedProjects, projects]);

  const counts = useMemo(() => {
    const c = { "To-Do": 0, "In Progress": 0, Done: 0 };
    filteredForCounts.forEach((t) => {
      const x = String(t.status || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (x === "done" || x === "completed" || x === "complete") {
        c.Done += 1;
      } else if (
        x === "inprogress" ||
        x === "inreview" ||
        x === "review" ||
        x === "qa" ||
        x === "testing" ||
        x === "verified" ||
        x.includes("progress")
      ) {
        c["In Progress"] += 1;
      } else {
        c["To-Do"] += 1;
      }
    });
    return c;
  }, [filteredForCounts]);

  const progressPct = useMemo(() => {
    if (filtered.length === 0) return 0;
    const done = filtered.filter((t) => t.status === "Done").length;
    return Math.round((done / filtered.length) * 100);
  }, [filtered]);

  // removed unused overdueTasks to satisfy lint

  // Calculate global overdue tasks (ignoring current filters) for the persistent banner
  // BUT still respects the onlyMyManagedProjects constraint for managers
  const globalOverdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Get managed project IDs if filtering for manager
    let managedProjectIds = null;
    if (onlyMyManagedProjects) {
      const currentUser = auth.currentUser;
      managedProjectIds = projects
        .filter(p => p.projectManagerId === currentUser?.uid)
        .map(p => p.id);
    }

    return tasks.filter(
      (t) => {
        // Manager Project Filter - only count tasks from managed projects
        if (managedProjectIds && !managedProjectIds.includes(t.projectId)) return false;

        return !t.archived && t.dueDate && t.dueDate < today && norm(t.status) !== "done";
      }
    );
  }, [tasks, onlyMyManagedProjects, projects]);

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
          status: (statusRaw && String(statusRaw).trim()) || (effectiveStatuses[0] || "To-Do"),
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
            await updateDoc(docRef, { taskId: docRef.id });
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

  // Server 'today' string (YYYY-MM-DD) using Realtime Database server time offset. Fallback to local if unavailable.
  const [serverTodayStr, setServerTodayStr] = useState("");
  useEffect(() => {
    let unsubscribe = null;
    try {
      const rtdb = getDatabase(app);
      const offRef = rtdbRef(rtdb, ".info/serverTimeOffset");
      unsubscribe = onRtdbValue(offRef, (snap) => {
        const offset = typeof snap.val() === "number" ? snap.val() : 0;
        const serverTime = Date.now() + offset;
        const str = new Date(serverTime).toISOString().slice(0, 10);
        setServerTodayStr(str);
      });
    } catch (e) {
      // ignore; fallback to local time
    }
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const todayStr = useMemo(() => serverTodayStr || new Date().toISOString().slice(0, 10), [serverTodayStr]);

  // Grouped task lists (Employee panel-like ordering)
  const todayTasks = useMemo(
    () => {
      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return filtered.filter(
        (t) => norm(t.status) !== "done" && t.dueDate && t.dueDate === todayStr
      );
    },
    [filtered, todayStr]
  );

  const inProgressTasks = useMemo(
    () =>
      filtered.filter((t) =>
        (t.status || "").toString().trim().toLowerCase() === "in progress"
      ),
    [filtered]
  );

  const todoTasks = useMemo(
    () =>
      filtered.filter((t) => {
        const s = (t.status || "").toString().trim().toLowerCase();
        return !s || s === "to-do";
      }),
    [filtered]
  );

  const doneTasks = useMemo(
    () =>
      filtered.filter(
        (t) => (t.status || "").toString().trim().toLowerCase() === "done"
      ),
    [filtered]
  );

  // Reorderable groups (swappable cards)
  const [groupOrder, setGroupOrder] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem("tm_group_order", JSON.stringify(groupOrder));
    } catch { }
  }, [groupOrder]);

  // Initialize and reconcile group order whenever status options change
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tm_group_order");
      const saved = raw ? JSON.parse(raw) : [];
      const base = Array.isArray(saved) ? saved : [];
      const filteredSaved = base.filter((k) => effectiveStatuses.includes(k));
      const extras = effectiveStatuses.filter((s) => !filteredSaved.includes(s));
      const merged = [...filteredSaved, ...extras];
      setGroupOrder(merged);
    } catch {
      setGroupOrder(effectiveStatuses);
    }
  }, [effectiveStatuses]);

  const groups = useMemo(() => {
    // palette for group header chips
    const palette = [
      "bg-blue-500",
      "bg-indigo-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-purple-500",
      "bg-rose-500",
      "bg-teal-500",
      "bg-sky-500",
      "bg-fuchsia-500",
      "bg-gray-500",
    ];
    const map = {};
    const normalize = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const optionNorms = new Set(effectiveStatuses.map((s) => normalize(s)));

    // Synthetic group that aggregates all tasks due today (kept in their real status as well)
    const todaysTasks = filtered.filter(
      (t) => !t.archived && t.dueDate && t.dueDate === todayStr && normalize(t.status) !== "done"
    );
    if (todaysTasks.length) {
      map["TODAYS TASK"] = {
        title: "TODAYS TASK",
        tasks: todaysTasks,
        colorClass: "bg-red-600",
      };
    }

    effectiveStatuses.forEach((s, idx) => {
      const sNorm = normalize(s);
      const tasksForStatus = filtered.filter((t) => normalize(t.status) === sNorm);
      const hex = statusColorMap[sNorm];
      map[s] = {
        title: s,
        tasks: tasksForStatus,
        colorClass: hex ? "" : palette[idx % palette.length],
        colorHex: hex || null,
      };
    });

    // Fallback: if any tasks have statuses not present in DB options, group them under a catch-all so they still render
    const orphanTasks = filtered.filter((t) => !optionNorms.has(normalize(t.status)));
    if (orphanTasks.length && !map["Other"]) {
      map["Other"] = {
        title: "Other",
        tasks: orphanTasks,
        colorClass: palette[palette.length - 1],
      };
    }

    return map;
  }, [filtered, effectiveStatuses, todayStr, statusColorMap]);



  const saveStatusColorToDB = useCallback(async (name, hex) => {
    try {
      const ref = doc(db, "settings", "task-statuses");
      const snap = await getDoc(ref);
      const data = snap.data() || {};
      const arr = Array.isArray(data.statuses) ? data.statuses : [];
      const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const currentMap = { ...statusColorMap };

      const next = [];
      let found = false;
      arr.forEach((item) => {
        if (!item) return;
        if (typeof item === "string") {
          const n = item;
          if (norm(n) === norm(name)) {
            found = true;
            next.push({ name: n, color: hex });
          } else {
            next.push({ name: n, color: currentMap[norm(n)] || "" });
          }
        } else {
          const n = item?.name || item?.label || item?.value || "";
          if (!n) return;
          if (norm(n) === norm(name)) {
            found = true;
            next.push({ name: n, color: hex });
          } else {
            next.push({ name: n, color: (item.color || currentMap[norm(n)] || "") });
          }
        }
      });
      if (!found && name) {
        next.push({ name, color: hex });
      }

      await updateDoc(ref, { statuses: next, updatedAt: serverTimestamp() });
      toast.success("Status color updated");
    } catch (e) {
      try {
        const ref = doc(db, "settings", "task-statuses");
        await setDoc(ref, { statuses: [{ name, color: hex }], updatedAt: serverTimestamp() }, { merge: true });
        toast.success("Status color set");
      } catch (err) {
        console.error(err);
        toast.error("Failed to update status color");
      }
    }
  }, [db, statusColorMap]);

  // Determine which statuses have tasks due today (excluding Done) and should be prioritized
  const dueTodayStatuses = useMemo(() => {
    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const set = new Set();
    const today = todayStr;
    filtered.forEach((t) => {
      if (t.dueDate && t.dueDate === today) {
        const s = norm(t.status);
        if (s !== "done") set.add(s);
      }
    });
    return set;
  }, [filtered, todayStr]);

  const [dragKey, setDragKey] = useState(null);
  const handleDragStart = (key) => setDragKey(key);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (key) => {
    if (!dragKey || dragKey === key) return;
    setGroupOrder((prev) => {
      const next = prev.filter((k) => k !== dragKey);
      const idx = next.indexOf(key);
      if (idx === -1) return prev;
      next.splice(idx, 0, dragKey);
      return [...next];
    });
    setDragKey(null);
  };

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
            className={`cursor-pointer transition-all duration-200 ${filters.status === "To-Do"
              ? "ring-2 ring-gray-300 border-gray-500 bg-gray-50 [.dark_&]:bg-[#1e2335] [.dark_&]:border-gray-500 [.dark_&]:ring-gray-600"
              : "hover:bg-surface-subtle [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary [.dark_&]:text-gray-400">To-Do</div>
                <div className="mt-1 text-2xl font-semibold [.dark_&]:text-white">
                  {counts["To-Do"]}
                </div>
              </div>
              <FaListAlt className="h-8 w-8 text-gray-400 [.dark_&]:text-gray-500" />
            </div>
          </Card>
          <Card
            onClick={() => applyStatusQuickFilter("In Progress")}
            className={`cursor-pointer transition-all duration-200 ${filters.status === "In Progress"
              ? "ring-2 ring-blue-200 border-blue-400 bg-blue-50 [.dark_&]:bg-blue-900/20 [.dark_&]:border-blue-500/50 [.dark_&]:ring-blue-800/30"
              : "hover:bg-surface-subtle [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary [.dark_&]:text-gray-400">
                  In Progress
                </div>
                <div className="mt-1 text-2xl font-semibold [.dark_&]:text-white">
                  {counts["In Progress"]}
                </div>
              </div>
              <FaClock className="h-8 w-8 text-blue-500 [.dark_&]:text-blue-400" />
            </div>
          </Card>
          <Card
            onClick={() => applyStatusQuickFilter("Done")}
            className={`cursor-pointer transition-all duration-200 ${filters.status === "Done"
              ? "ring-2 ring-green-200 border-green-400 bg-green-50 [.dark_&]:bg-green-900/20 [.dark_&]:border-green-500/50 [.dark_&]:ring-green-800/30"
              : "hover:bg-surface-subtle [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-content-secondary [.dark_&]:text-gray-400">Completed</div>
                <div className="mt-1 text-2xl font-semibold [.dark_&]:text-white">{counts.Done}</div>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-500 [.dark_&]:text-green-400" />
            </div>
          </Card>
          <Card
            onClick={applyOverdueQuickFilter}
            className={`cursor-pointer transition-all duration-300 ${filters.onlyOverdue
              ? "bg-red-50 border-red-400 ring-2 ring-red-200 ring-offset-2 [.dark_&]:bg-red-900/20 [.dark_&]:border-red-500/50 [.dark_&]:ring-red-800/30"
              : globalOverdueTasks.length > 0
                ? "bg-red-50 border-transparent [.dark_&]:bg-red-900/10 [.dark_&]:border-transparent"
                : "hover:bg-surface-subtle [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-sm ${globalOverdueTasks.length > 0
                    ? "text-red-700 font-medium [.dark_&]:text-red-400"
                    : "text-content-secondary [.dark_&]:text-gray-400"
                    }`}
                >
                  Overdue
                </div>
                <div
                  className={`mt-1 text-2xl font-bold ${globalOverdueTasks.length > 0
                    ? "text-red-800 [.dark_&]:text-red-300"
                    : "text-red-600 [.dark_&]:text-red-400"
                    }`}
                >
                  {globalOverdueTasks.length}
                </div>
              </div>
              <FaExclamationTriangle
                className={`h-8 w-8 ${globalOverdueTasks.length > 0
                  ? "text-red-600 animate-bounce [.dark_&]:text-red-400"
                  : "text-red-500 [.dark_&]:text-red-400"
                  }`}
              />
            </div>
          </Card>
        </div>

        <Card className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-content-secondary [.dark_&]:text-gray-400">
                  Overall Progress
                </span>
                <span className="font-semibold text-content-primary [.dark_&]:text-white">
                  {progressPct}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-subtle bg-surface [.dark_&]:bg-white/5 [.dark_&]:border-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-content-tertiary [.dark_&]:text-gray-500">
                {counts.Done} of {filtered.length} tasks completed
              </div>
            </div>
          </div>
        </Card>

        <Card className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
          {/* Filters Section */}
          <div className="border-b border-gray-100 [.dark_&]:border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-5 ${barColor} rounded-full`}></div>
              <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-white uppercase tracking-wide">
                Filters
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="lg:col-span-2 rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-content-primary [.dark_&]:text-white placeholder:text-content-tertiary [.dark_&]:placeholder:text-gray-500 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                spellCheck="true"
              />

              <select
                value={filters.project}
                onChange={(e) => updateFilter("project", e.target.value)}
                className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-content-primary [.dark_&]:text-white"
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
                className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-content-primary [.dark_&]:text-white"
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
                className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-content-primary [.dark_&]:text-white"
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
                className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-content-primary [.dark_&]:text-white"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-3 py-2 text-sm text-content-primary [.dark_&]:text-white bg-gray-50 [.dark_&]:bg-white/5 rounded-lg border border-subtle [.dark_&]:border-white/10 cursor-pointer hover:bg-gray-100 [.dark_&]:hover:bg-white/10 transition-colors">
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
              <div className={`w-1 h-5 ${barColor} rounded-full`}></div>
              <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-white uppercase tracking-wide">
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
                  <FaDownload /> Import
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2"
                >
                  <FaDownload className="rotate-180" /> Export
                </Button>

                <div className="h-6 w-px bg-gray-300 [.dark_&]:bg-gray-600 mx-1"></div>

                <div className="flex items-center rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] p-0.5">
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === ""
                      ? `${buttonClass} shadow-sm`
                      : "text-content-primary [.dark_&]:text-gray-400 hover:bg-gray-100 [.dark_&]:hover:bg-white/10"
                      }`}
                    onClick={() => updateFilter("assigneeType", "")}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === "user"
                      ? `${buttonClass} shadow-sm`
                      : "text-content-primary [.dark_&]:text-gray-400 hover:bg-gray-100 [.dark_&]:hover:bg-white/10"
                      }`}
                    onClick={() => updateFilter("assigneeType", "user")}
                    type="button"
                  >
                    Resources
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filters.assigneeType === "client"
                      ? `${buttonClass} shadow-sm`
                      : "text-content-primary [.dark_&]:text-gray-400 hover:bg-gray-100 [.dark_&]:hover:bg-white/10"
                      }`}
                    onClick={() => updateFilter("assigneeType", "client")}
                    type="button"
                  >
                    Clients
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-300 [.dark_&]:bg-gray-600 mx-1"></div>

                <div className="flex items-center gap-1 bg-gray-100 [.dark_&]:bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setView("list")}
                    className={`p-2 rounded-md transition-all ${view === "list"
                      ? `bg-white [.dark_&]:bg-[#181B2A] ${iconColor} shadow-md`
                      : "text-gray-600 [.dark_&]:text-gray-400 hover:bg-white/50 [.dark_&]:hover:bg-white/5"
                      }`}
                    title="List View"
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("board")}
                    className={`p-2 rounded-md transition-all ${view === "board"
                      ? `bg-white [.dark_&]:bg-[#181B2A] ${iconColor} shadow-md`
                      : "text-gray-600 [.dark_&]:text-gray-400 hover:bg-white/50 [.dark_&]:hover:bg-white/5"
                      }`}
                    title="Kanban View"
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedIds.size > 0 && (
                  <>
                    <Button variant="secondary" onClick={handleArchive} size="sm">
                      Archive Selected
                    </Button>
                    <Button variant="secondary" onClick={handleUnarchive} size="sm">
                      Unarchive Selected
                    </Button>
                    <Button variant="danger" onClick={() => setShowBulkDeleteModal(true)} size="sm">
                      Delete Selected
                    </Button>
                  </>
                )}
                <Button
                  onClick={openCreate}
                  variant="custom"
                  className={`font-semibold ${buttonClass}`}
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
                  columns={kanbanColumns}
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
                  {(() => {
                    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    // Primary keys from saved order with non-empty groups only
                    const primary = groupOrder.filter(
                      (k) => groups[k] && groups[k].tasks && groups[k].tasks.length > 0
                    );
                    // Extras not in saved order, non-empty only
                    const extras = Object.keys(groups).filter(
                      (k) => !groupOrder.includes(k) && groups[k] && groups[k].tasks && groups[k].tasks.length > 0
                    );
                    const todaysKey = "TODAYS TASK";
                    // Merge and sort so statuses with due-today tasks appear first, keeping today's group fixed at top
                    const restKeys = [...primary, ...extras.filter((k) => k !== todaysKey)];
                    restKeys.sort((a, b) => {
                      const aDue = dueTodayStatuses.has(norm(a));
                      const bDue = dueTodayStatuses.has(norm(b));
                      if (aDue === bDue) return 0;
                      return aDue ? -1 : 1;
                    });
                    const orderedKeys = groups[todaysKey] && groups[todaysKey].tasks && groups[todaysKey].tasks.length > 0
                      ? [todaysKey, ...restKeys]
                      : restKeys;
                    return orderedKeys.map((key) => {
                      const g = groups[key];
                      if (!g || !g.tasks || g.tasks.length === 0) return null;
                      const isTodays = key === todaysKey;
                      return (
                        <div
                          key={`grp-${key}`}
                          draggable={!isTodays}
                          onDragStart={isTodays ? undefined : () => handleDragStart(key)}
                          onDragOver={isTodays ? undefined : handleDragOver}
                          onDrop={isTodays ? undefined : () => handleDrop(key)}
                          className="rounded-lg cursor-grab active:cursor-grabbing"
                        >
                          <TaskGroup
                            title={g.title}
                            tasks={g.tasks}
                            colorClass={g.colorClass}
                            colorHex={g.colorHex}
                            onOpenCreate={() => openCreate(g.title)}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onArchive={handleTaskArchive}
                            onStatusChange={(taskId, newStatus) => moveTask(taskId, newStatus)}
                            resolveAssignees={resolveAssignees}
                            onHeaderMenu={handleHeaderMenu}
                            hideHeaderActions={isTodays}
                          />
                        </div>
                      );
                    });
                  })()}
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
          statuses={statusOptions}
          isManager={onlyMyManagedProjects} // Pass manager flag
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
          statuses={statusOptions}
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

      {showStatusColorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowStatusColorModal(false);
            setShowAdvancedStatusColor(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Color</div>
              <button
                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => {
                  setShowStatusColorModal(false);
                  setShowAdvancedStatusColor(false);
                }}
              >
                ×
              </button>
            </div>

            <div className="mb-3">
              <ColorSwatchPicker
                value={statusColorTemp}
                onSelect={(hex) => setStatusColorTemp(hex)}
                onManualPick={() => setShowAdvancedStatusColor(true)}
              />
            </div>

            {showAdvancedStatusColor && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={statusColorTemp}
                    onChange={(e) => setStatusColorTemp(e.target.value)}
                    className="h-8 w-10 p-0 border border-gray-200 rounded"
                    aria-label="Pick custom color"
                  />
                  <input
                    type="text"
                    value={statusColorTemp}
                    onChange={(e) => setStatusColorTemp(e.target.value)}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusColorModal(false);
                  setShowAdvancedStatusColor(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await saveStatusColorToDB(statusColorTarget, statusColorTemp);
                  setShowStatusColorModal(false);
                  setShowAdvancedStatusColor(false);
                }}
              >
                Save
              </Button>
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

      {showGroupOptionsModal && groupOptionsContext && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={closeGroupOptionsModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-xs py-2 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Group options
            </div>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("rename")}
            >
              <span>Rename</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("new-status")}
            >
              <span>New status</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("edit-statuses")}
            >
              <span>Edit statuses</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("collapse-group")}
            >
              <span>Collapse group</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("hide-status")}
            >
              <span>Hide status</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("select-all")}
            >
              <span>Select all</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("collapse-all-groups")}
            >
              <span>Collapse all groups</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
              onClick={() => handleGroupAction("automate-status")}
            >
              <span>Automate status</span>
            </button>
          </div>
        </div>
      )}

      {showBulkDeleteModal && selectedIds.size > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowBulkDeleteModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              onClose={() => setShowBulkDeleteModal(false)}
              onConfirm={confirmBulkDelete}
              title="Delete Selected"
              description={`Are you sure you want to delete ${selectedIds.size} selected task(s)?`}
              permanentMessage="This action cannot be undone."
              isLoading={isBulkDeleting}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksManagement;

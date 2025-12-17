// src/components/TaskManagment/TaskViewModal.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  FaTimes,
  FaRegCalendarAlt,
  FaTags,
  FaUserCircle,
  FaRegCheckCircle,
  FaEllipsisH,
  FaShareAlt,
  FaRegClock,
  FaHistory,
  FaComment,
  FaBullseye,
  FaTrash,
  FaArchive,

  FaEdit,
  FaLink,
  FaCheck,

  FaChevronDown,
  FaPlus,
  FaExchangeAlt,
  FaUserPlus,
  FaPaperPlane,
} from "react-icons/fa";
import { MdReplayCircleFilled } from "react-icons/md";
import Button from "../Button"; // Adjust path if needed
import {
  updateTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  addTaskComment,
  subscribeToTaskComments,
  subscribeToTaskActivities,
  deleteTask,
  archiveTask,
  logTaskActivity,
} from "../../services/taskService";
import { getStatusBadge, getPriorityBadge } from "../../utils/colorMaps"; // Adjust path
import { doc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import TagInput from "./TagInput";
import TimeEstimateInput from "./TimeEstimateInput";
import toast from "react-hot-toast";
import CompletionCommentModal from "../CompletionCommentModal"; // Adjust path if needed
import {
  createNextRecurringInstance,
  shouldCreateNextInstance,
} from "../../utils/recurringTasks";

const TaskViewModal = ({
  task: initialTask,
  project: initialProject,
  projects = [],
  // assignee,
  // assigneesResolved, // We'll resolve locally
  users = [],
  clients = [],
  onClose,
  onEdit,
  currentUser,
  onDelete,

  onArchive,
  canDelete = true,
  canArchive = true,
  canEdit = true,
  statuses = [],
}) => {
  const [task, setTask] = useState(initialTask);

  // Derive project from live task data to ensure consistency
  const project = useMemo(() => {
    if (projects.length > 0 && task?.projectId) {
      return projects.find((p) => p.id === task.projectId) || initialProject;
    }
    return initialProject;
  }, [projects, task?.projectId, initialProject]);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(initialTask?.description || "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState(null);
  const [visibleItems, setVisibleItems] = useState(20);

  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const statusOptions = useMemo(() => {
    if (Array.isArray(statuses) && statuses.length) return statuses;
    return ["To-Do", "In Progress", "Done"]; // fallback when settings not loaded
  }, [statuses]);

  // Resolve assignees locally to ensure real-time updates
  const localAssigneesResolved = useMemo(() => {
    let list = task.assignees || [];
    // Fallback for legacy single assignee if array is empty
    if (list.length === 0 && task.assigneeId) {
      list = [{ id: task.assigneeId, type: task.assigneeType || 'user' }];
    }

    return list.map(item => {
      let resolved = {};
      if (item.type === 'client') {
        const c = clients.find(c => c.id === item.id);
        resolved = c ? { ...c, name: c.clientName, id: c.id, type: 'client' } : { name: 'Unknown Client', id: item.id };
      } else {
        const u = users.find(u => u.id === item.id);
        resolved = u ? { ...u, type: 'user' } : { name: 'Unknown User', id: item.id };
      }

      // Attach status
      const statusData = task.assigneeStatus?.[item.id];
      if (statusData) {
        resolved.status = statusData.status;
        resolved.progressPercent = statusData.progressPercent;
      } else {
        // Fallback to global status if not found (legacy)
        resolved.status = task.status;
      }
      return resolved;
    });
  }, [task.assignees, task.assigneeId, task.assigneeType, task.assigneeStatus, task.status, users, clients]);

  const handleToggleAssignee = async (item, type) => {
    let current = [...(task.assignees || [])];
    // If legacy single assignee exists but array doesn't, initialize array
    if (current.length === 0 && task.assigneeId) {
      current = [{ id: task.assigneeId, type: task.assigneeType || 'user' }];
    }

    const existsIndex = current.findIndex(a => a.id === item.id);

    if (existsIndex >= 0) {
      current.splice(existsIndex, 1);
    } else {
      current.push({ id: item.id, type });
    }

    // Update task
    // We also update legacy fields for backward compatibility if needed, 
    // but primarily we rely on 'assignees' array now.
    // For single assignee view compatibility, we might set the first one as primary.
    const primary = current[0] || {};

    await updateTask(task.id, {
      assignees: current,
      assigneeId: primary.id || "",
      assigneeType: primary.type || "user"
    }, task.collectionName);
  };

  useEffect(() => {
    if (!initialTask?.id) return;
    const unsub = onSnapshot(doc(db, initialTask.collectionName || "tasks", initialTask.id), (doc) => {
      if (doc.exists()) {
        setTask({
          id: doc.id,
          ...doc.data(),
          collectionName: initialTask.collectionName || "tasks",
          source: initialTask.source
        });
      }
    });
    return () => unsub();
  }, [initialTask?.id]);

  useEffect(() => {
    setDescValue(task?.description || "");
  }, [task?.description]);

  useEffect(() => {
    if (!task?.id) return;
    const unsubComments = subscribeToTaskComments(task.id, setComments, visibleItems, task.collectionName);
    const unsubActivities = subscribeToTaskActivities(task.id, setActivities, visibleItems, task.collectionName);
    return () => {
      if (unsubComments) unsubComments();
      if (unsubActivities) unsubActivities();
    };
  }, [task?.id, visibleItems]);

  const timeline = useMemo(() => {
    const comms = comments.map((c) => ({ ...c, type: "comment" }));
    const acts = activities.map((a) => ({ ...a, type: "activity" }));

    // Add Creation Event
    if (task.createdAt) {
      acts.push({
        id: `created-${task.id}`,
        type: "created",
        createdAt: task.createdAt,
        userId: task.createdBy || "system",
        details: "Task created"
      });
    }

    // Add Completion Event (only if not already in activities)
    const hasCompletedActivity = activities.some(a => a.type === "completed");
    if (task.status === "Done" && task.completedAt && !hasCompletedActivity) {
      acts.push({
        id: `completed-${task.id}`,
        type: "completed",
        createdAt: task.completedAt,
        userId: task.completedBy || "system",
        details: task.completionComment ? `Completed: ${task.completionComment}` : "Task completed"
      });
    }

    return [...comms, ...acts].sort((a, b) => {
      const da = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt || 0);
      const db = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);
      return db - da; // Descending
    });
  }, [comments, activities, task.createdAt, task.completedAt, task.status, task.completionComment, task.createdBy, task.completedBy]);



  const handleCompletionSubmit = async (comment) => {
    try {
      console.log(`handleCompletionSubmit called for task ${task.id}, isRecurring=${task.isRecurring}`);
      const isAssignee = task.assigneeIds?.includes(currentUser?.uid);
      const col = task.collectionName || "tasks";

      if (col === "tasks" && isAssignee) {
        // Update individual status
        const updateKey = `assigneeStatus.${currentUser.uid}`;
        const updates = {
          [`${updateKey}.status`]: "Done",
          [`${updateKey}.completedAt`]: serverTimestamp(),
          [`${updateKey}.progressPercent`]: 100,
          [`${updateKey}.completedBy`]: currentUser?.uid || "",
          [`${updateKey}.completionComment`]: comment || ""
        };

        // Check if ALL assignees are now done (including me)
        const assigneeIds = task.assigneeIds || [];
        const allOthersDone = assigneeIds.every(uid => {
          if (uid === currentUser.uid) return true; // I am doing it now
          return task.assigneeStatus?.[uid]?.status === "Done";
        });

        if (allOthersDone) {
          // If everyone is done, mark GLOBAL status as Done
          updates.status = "Done";
          updates.completedAt = serverTimestamp();
          updates.progressPercent = 100;
          updates.completedBy = currentUser?.uid; // Last person to finish

          // Trigger Recurrence (since global task is now done)
          if (task.isRecurring) {
            console.log("All assignees done. Triggering recurrence for:", task.id);
            const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            const completedTaskState = {
              ...task,
              dueDate: dueDate,
              status: "Done",
              completedAt: new Date(),
            };

            if (shouldCreateNextInstance(completedTaskState)) {
              createNextRecurringInstance(completedTaskState)
                .then(newId => {
                  if (newId) toast.success("Next recurring task created!");
                })
                .catch(err => console.error("Recurrence error:", err));
            }
          }
        }

        await updateTask(task.id, updates, col);
      } else {
        // Update global status (Admin or Self Task)
        const updates = {
          status: "Done",
          completedAt: serverTimestamp(),
          progressPercent: 100,
          completedBy: currentUser?.uid || "",
          completedByType: "user",
          completionComment: comment,
        };

        // ADMIN OVERRIDE: If Admin marks as Done, mark ALL assignees as Done
        if (col === "tasks") {
          const assigneeIds = task.assigneeIds || [];
          assigneeIds.forEach(uid => {
            const key = `assigneeStatus.${uid}`;
            updates[`${key}.status`] = "Done";
            updates[`${key}.completedAt`] = serverTimestamp();
            updates[`${key}.progressPercent`] = 100;
            updates[`${key}.completedBy`] = currentUser?.uid;
            updates[`${key}.completionComment`] = comment || "";
          });
        }

        await updateTask(task.id, updates, col);
      }

      // Handle Recurring Task Creation
      if (task.isRecurring) {
        console.log("Attempting to create next recurring instance for:", task.id);

        // Ensure dates are valid JS Dates or strings, not Firestore Timestamps
        const dueDate = task.dueDate?.toDate
          ? task.dueDate.toDate()
          : (task.dueDate?.seconds ? new Date(task.dueDate.seconds * 1000) : new Date(task.dueDate));

        const completedTaskState = {
          ...task,
          dueDate: dueDate, // Pass converted date
          status: "Done",
          completedAt: new Date(), // Use JS Date
        };

        console.log("Completed Task State for Recurrence:", completedTaskState);

        if (shouldCreateNextInstance(completedTaskState)) {
          try {
            const newId = await createNextRecurringInstance(completedTaskState);
            if (newId) {
              toast.success("Next recurring task created!");
              console.log("Created new recurring task:", newId);
            } else {
              console.warn("createNextRecurringInstance returned null (duplicate or error)");
            }
          } catch (recError) {
            console.error("Failed to create recurring instance:", recError);
            toast.error("Failed to create next recurring task");
          }
        } else {
          console.warn("shouldCreateNextInstance returned false");
        }
      }

      await logTaskActivity(
        task.id,
        "completed",
        comment ? `Completed: ${comment}` : "Marked as complete",
        currentUser,
        col
      );

      toast.success("Task marked as complete!");
      setShowCompletionModal(false);
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    }
  };

  const handleQuickUpdate = async (field, value) => {
    console.log(`handleQuickUpdate called: taskId=${task?.id}, field=${field}, value=${value}, isRecurring=${task?.isRecurring}`);
    if (!task?.id) {
      console.error("No task ID found in handleQuickUpdate");
      return;
    }
    try {
      const isAssignee = task.assigneeIds?.includes(currentUser?.uid);
      const col = task.collectionName || "tasks";

      if (col === "tasks" && isAssignee && (field === "status" || field === "progressPercent")) {
        // Update individual status/progress
        const updateKey = `assigneeStatus.${currentUser.uid}`;
        const updates = {};

        if (field === "status") {
          updates[`${updateKey}.status`] = value;
          if (value === "Done") {
            updates[`${updateKey}.completedAt`] = serverTimestamp();
            updates[`${updateKey}.progressPercent`] = 100;
            updates[`${updateKey}.completedBy`] = currentUser?.uid;
          } else if (value === "In Progress") {
            updates[`${updateKey}.progressPercent`] = 0;
            updates[`${updateKey}.completedAt`] = null;
          } else {
            updates[`${updateKey}.completedAt`] = null;
            updates[`${updateKey}.progressPercent`] = 0;
          }
        } else if (field === "progressPercent") {
          updates[`${updateKey}.progressPercent`] = value;
          if (value === 100) {
            updates[`${updateKey}.status`] = "Done";
            updates[`${updateKey}.completedAt`] = serverTimestamp();
            updates[`${updateKey}.completedBy`] = currentUser?.uid;
          }
        }

        await updateTask(task.id, updates, col);
      } else {
        // Global update (Admin or Self Task)
        const updates = { [field]: value };

        // ADMIN OVERRIDE LOGIC:
        // If an Admin changes the status, force update ALL assignees to match.
        if (field === "status" && col === "tasks") {
          const assigneeIds = task.assigneeIds || [];
          assigneeIds.forEach(uid => {
            const key = `assigneeStatus.${uid}`;
            updates[`${key}.status`] = value;

            if (value === "Done") {
              updates[`${key}.progressPercent`] = 100;
              updates[`${key}.completedAt`] = serverTimestamp();
              // We don't set completedBy here to avoid confusion, or set it to Admin? 
              // Let's leave completedBy empty or set to Admin ID to show who forced it.
              updates[`${key}.completedBy`] = currentUser?.uid;
            } else if (value === "In Progress") {
              updates[`${key}.progressPercent`] = 0;
              updates[`${key}.completedAt`] = null;
            } else {
              updates[`${key}.progressPercent`] = 0;
              updates[`${key}.completedAt`] = null;
            }
          });
        }

        await updateTask(task.id, updates, col);
      }

      console.log("updateTask success");

      if (field === "status") {
        await logTaskActivity(
          task.id,
          "status_updated",
          `Changed status to ${value}`,
          currentUser,
          col
        );

        // Check for recurrence if status changed to Done
        if (value === "Done") {
          console.log("Status is Done. Checking recurrence condition:", {
            isRecurring: task.isRecurring,
            dueDate: task.dueDate,
            hasToDate: !!task.dueDate?.toDate
          });

          if (task.isRecurring) {
            console.log("Status changed to Done via QuickUpdate. Checking recurrence...", task.id);
            const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            const completedTaskState = {
              ...task,
              dueDate: dueDate,
              status: "Done",
              completedAt: new Date(),
            };

            const shouldCreate = shouldCreateNextInstance(completedTaskState);
            console.log("shouldCreateNextInstance result:", shouldCreate);

            if (shouldCreate) {
              try {
                console.log("Creating next recurring instance from QuickUpdate...");
                const newId = await createNextRecurringInstance(completedTaskState);
                if (newId) {
                  toast.success("Next recurring task created!");
                  console.log("Created new recurring task:", newId);
                } else {
                  console.warn("createNextRecurringInstance returned null (duplicate?)");
                }
              } catch (err) {
                console.error("Failed to create recurring instance in QuickUpdate:", err);
              }
            } else {
              console.warn("shouldCreateNextInstance returned false. Check task criteria (end date, max occurrences, etc).");
            }
          } else {
            console.log("Task is not recurring, skipping creation.");
          }
        }
      }
    } catch (err) {
      console.error("updateTask failed", err);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    if (!task?.id) return;
    try {
      await deleteTask(task.id, task.collectionName);
      toast.success("Task deleted successfully!");
      if (onDelete) onDelete(task);
      onClose();
    } catch (err) {
      console.error("Failed to delete task", err);
      toast.error("Failed to delete task");
    }
  };

  const handleArchiveTask = async () => {
    if (!task?.id) return;
    try {
      await archiveTask(task.id, task.collectionName);
      toast.success("Task archived successfully!");
      if (onArchive) onArchive(task);
      onClose();
    } catch (err) {
      console.error("Failed to archive task", err);
      toast.error("Failed to archive task");
    }
  };

  const handleAddTag = async (tag) => {
    console.log("handleAddTag", tag);
    const currentTags = task.tags || [];
    await handleQuickUpdate("tags", [...currentTags, tag]);
  };

  const handleRemoveTag = async (tag) => {
    console.log("handleRemoveTag", tag);
    const currentTags = task.tags || [];
    await handleQuickUpdate("tags", currentTags.filter((t) => t !== tag));
  };

  const handleUpdateTimeEstimate = async (hours) => {
    console.log("handleUpdateTimeEstimate", hours);
    await handleQuickUpdate("timeEstimate", hours);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await deleteSubtask(task.id, subtaskId, task.collectionName);
      setDeletingSubtaskId(null);
      toast.success("Subtask deleted");
    } catch (err) {
      console.error("Failed to delete subtask", err);
      toast.error("Failed to delete subtask");
    }
  };

  // Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "Empty";
    const d = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (val) => {
    if (!val) return "";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserDisplayName = (item) => {
    if (!item?.userId || item.userId === "system") return "System";

    // Check users prop
    const user = users.find(u => u.id === item.userId);
    if (user) return user.name || user.displayName || "Unknown User";

    // Check clients prop
    const client = clients.find(c => c.id === item.userId);
    if (client) return client.clientName || "Unknown Client";

    // Fallback to existing name or ID
    return item.userName || "Unknown";
  };

  // Determine the status to display for the current user
  const displayStatus = useMemo(() => {
    if (!currentUser?.uid) return task.status;

    // Check if user is an assignee
    const isAssignee = task.assigneeIds?.includes(currentUser.uid);

    if (isAssignee && task.assigneeStatus?.[currentUser.uid]) {
      return task.assigneeStatus[currentUser.uid].status || "To-Do";
    }

    // If not assignee (e.g. Admin), derive status from all assignees
    if (task.assigneeStatus && Object.keys(task.assigneeStatus).length > 0) {
      const values = Object.values(task.assigneeStatus);
      if (values.length > 0) {
        const allDone = values.every((v) => v.status === "Done");
        const anyInProgress = values.some((v) => v.status === "In Progress" || v.status === "In Review");
        const anyDone = values.some((v) => v.status === "Done");

        if (allDone) return "Done";
        if (anyInProgress || anyDone) return "In Progress";
      }
    }

    return task.status || "To-Do";
  }, [task, currentUser]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/20 w-full max-w-[1100px] h-[90vh] flex flex-col overflow-hidden border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-100/50 bg-white/80 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden">
            <span className="truncate font-medium text-gray-700 max-w-[150px] lg:max-w-[200px]" title={project?.name}>
              {project?.name || "No Project"}
            </span>
            <span className="text-gray-300">/</span>
            <span className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600">
              {task.id.slice(0, 6).toUpperCase()}
            </span>
            {task.isRecurring && (
              <span className="hidden sm:flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs font-medium">
                <MdReplayCircleFilled /> Recurring
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 lg:gap-2 shrink-0">
            {canEdit && task.source !== "self" && (
              <button
                onClick={() => onEdit(task)}
                className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-full text-gray-400 transition-colors"
                title="Edit task"
              >
                <FaEdit className="text-sm" />
              </button>
            )}
            {canArchive && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="p-2 hover:bg-orange-50 hover:text-orange-600 rounded-full text-gray-400 transition-colors"
                title="Archive task"
              >
                <FaArchive className="text-sm" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors"
                title="Delete task"
              >
                <FaTrash className="text-sm" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors ml-2"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* --- Main Body (Responsive Split View) --- */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
          {/* LEFT PANEL: Content */}
          <div className="flex-1 p-6 lg:p-8 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-100/50 order-2 lg:order-1">
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
              {task.title}
            </h1>

            {/* Description Section */}
            <div className="mb-8 group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Description
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingDesc(!isEditingDesc)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isEditingDesc ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add a description..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDescValue(task.description || "");
                        setIsEditingDesc(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await handleQuickUpdate("description", descValue);
                        setIsEditingDesc(false);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`prose prose-sm max-w-none text-gray-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 min-h-[60px] transition-colors ${canEdit ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={() => canEdit && setIsEditingDesc(true)}
                >
                  {task.description ? (
                    <p className="whitespace-pre-wrap break-words">{task.description}</p>
                  ) : (
                    <span className="text-gray-400 italic">
                      No description provided. Click to add one.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subtasks Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Subtasks
                </h3>
                <span className="text-xs text-gray-400">
                  {(task.subtasks || []).filter((s) => s.completed).length}/
                  {(task.subtasks || []).length} completed
                </span>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-gray-100 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${(task.subtasks || []).length > 0 ? ((task.subtasks || []).filter((s) => s.completed).length / (task.subtasks || []).length) * 100 : 0}%` }}
                />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {(task.subtasks || []).length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {task.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors group"
                      >
                        <button
                          onClick={async () => {
                            await toggleSubtask(
                              task.id,
                              sub.id,
                              !sub.completed,
                              task.collectionName
                            );
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${sub.completed
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-gray-300 hover:border-indigo-500 text-transparent"
                            }`}
                        >
                          <FaRegCheckCircle className="text-xs" />
                        </button>
                        <span
                          className={`text-sm flex-1 ${sub.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                            }`}
                        >
                          {sub.title}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => {
                              if (deletingSubtaskId === sub.id) {
                                handleDeleteSubtask(sub.id);
                              } else {
                                setDeletingSubtaskId(sub.id);
                                setTimeout(() => setDeletingSubtaskId(null), 3000);
                              }
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all ${deletingSubtaskId === sub.id
                              ? "bg-red-100 text-red-600"
                              : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                              }`}
                            title={deletingSubtaskId === sub.id ? "Click again to confirm" : "Delete subtask"}
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No subtasks yet
                  </div>
                )}
                {canEdit && (
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a subtask..."
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newSubtaskTitle.trim()) {
                            await addSubtask(task.id, newSubtaskTitle.trim(), task.collectionName);
                            setNewSubtaskTitle("");
                          }
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (newSubtaskTitle.trim()) {
                            await addSubtask(task.id, newSubtaskTitle.trim(), task.collectionName);
                            setNewSubtaskTitle("");
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OKR Display Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <FaBullseye className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Objectives & Key Results
                </h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                {(() => {
                  if (!project || !project.okrs || project.okrs.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 italic">
                        No OKRs defined for this project.
                      </p>
                    );
                  }

                  const objectiveIndex = task.okrObjectiveIndex;
                  const keyResultIndices = task.okrKeyResultIndices || [];

                  if (
                    objectiveIndex === undefined ||
                    objectiveIndex === null ||
                    objectiveIndex === ""
                  ) {
                    return (
                      <p className="text-sm text-gray-400 italic">
                        No OKR linked to this task.
                      </p>
                    );
                  }

                  const okr = project.okrs[objectiveIndex];
                  if (!okr) {
                    return (
                      <p className="text-sm text-gray-400 italic">
                        Linked Objective not found.
                      </p>
                    );
                  }

                  const selectedKRs = keyResultIndices
                    .map((idx) => okr.keyResults?.[idx])
                    .filter(Boolean);

                  return (
                    <div className="bg-gradient-to-br from-indigo-50 to-white border-l-4 border-indigo-500 rounded-r-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 shrink-0">
                          <FaBullseye className="text-lg" />
                        </div>
                        <div className="space-y-3 flex-1">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">
                              Objective
                            </span>
                            <p className="text-sm text-gray-900 font-semibold leading-snug">
                              {okr.objective}
                            </p>
                          </div>
                          {selectedKRs.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                Key Results
                              </span>
                              <ul className="space-y-1.5">
                                {selectedKRs.map((kr, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 shrink-0"></span>
                                    <span className="leading-relaxed">{kr || `Key Result ${i + 1}`}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Metadata & Activity */}
          <div className="w-full lg:w-[350px] bg-gray-50/50 flex flex-col shrink-0 lg:overflow-y-auto order-1 lg:order-2">
            {/* Metadata Grid */}
            <div className="p-6 border-b border-gray-200 space-y-5 bg-white">
              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Status
                  </label>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`w-full px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white flex items-center justify-between hover:border-indigo-300 transition-colors ${getStatusBadge(displayStatus)}`}
                  >
                    <span className="font-medium">{displayStatus}</span>
                    <FaChevronDown className="text-[10px] opacity-50" />
                  </button>

                  {showStatusDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)}></div>
                      <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {statusOptions.map(status => (
                          <button
                            key={status}
                            onClick={() => {
                              console.log(`Status dropdown clicked: ${status}`);
                              const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                              if (norm(status) === "done") {
                                console.log("Opening Completion Modal");
                                setShowCompletionModal(true);
                                setShowStatusDropdown(false);
                              } else {
                                handleQuickUpdate("status", status);
                                setShowStatusDropdown(false);
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${String(displayStatus || "").toLowerCase().replace(/[^a-z0-9]/g, "") === String(status || "").toLowerCase().replace(/[^a-z0-9]/g, "") ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                          >
                            {status}
                            {String(displayStatus || "").toLowerCase().replace(/[^a-z0-9]/g, "") === String(status || "").toLowerCase().replace(/[^a-z0-9]/g, "") && <FaCheck />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Priority
                  </label>
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className={`w-full px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white flex items-center justify-between hover:border-indigo-300 transition-colors ${getPriorityBadge(task.priority)}`}
                  >
                    <span className="font-medium">{task.priority || "Medium"}</span>
                    <FaChevronDown className="text-[10px] opacity-50" />
                  </button>

                  {showPriorityDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)}></div>
                      <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {["Low", "Medium", "High"].map(priority => (
                          <button
                            key={priority}
                            onClick={() => {
                              handleQuickUpdate("priority", priority);
                              setShowPriorityDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${task.priority === priority ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                          >
                            {priority}
                            {task.priority === priority && <FaCheck />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Assignees */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Assignees
                </label>
                <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                  {localAssigneesResolved.length > 0 ? (
                    localAssigneesResolved.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-full shadow-sm"
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                          {u.name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-700 max-w-[80px] truncate leading-none">
                            {u.name}
                          </span>
                          <span className={`text-[9px] font-medium ${u.status === 'Done' ? 'text-green-600' : 'text-gray-400'}`}>
                            {u.status || 'To-Do'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                  )}
                  {canEdit && task.source !== "self" ? (
                    <button
                      onClick={() => setShowAssigneePopover(!showAssigneePopover)}
                      className={`w-6 h-6 flex items-center justify-center rounded-full border border-dashed transition-all ${showAssigneePopover ? "border-indigo-500 text-indigo-600 bg-indigo-50" : "border-gray-300 text-gray-400 hover:text-indigo-600 hover:border-indigo-400"}`}
                    >
                      +
                    </button>
                  ) : null}
                </div>

                {/* Quick Assign Popover */}
                {showAssigneePopover && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAssigneePopover(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[300px]">
                      <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                        <input
                          type="text"
                          placeholder="Search users..."
                          className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 p-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">Resources</div>
                        {users.map(u => {
                          const isSelected = localAssigneesResolved.some(a => a.id === u.id);
                          return (
                            <button
                              key={u.id}
                              onClick={() => handleToggleAssignee(u, 'user')}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between group ${isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                                  {u.name?.[0]}
                                </div>
                                <span className="truncate max-w-[140px]">{u.name}</span>
                              </div>
                              {isSelected && <FaCheck className="text-indigo-600" />}
                            </button>
                          );
                        })}

                        {clients.length > 0 && (
                          <>
                            <div className="px-2 py-1 mt-2 text-[10px] font-bold text-gray-400 uppercase">Clients</div>
                            {clients.map(c => {
                              const isSelected = localAssigneesResolved.some(a => a.id === c.id);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => handleToggleAssignee(c, 'client')}
                                  className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between group ${isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                                      {c.clientName?.[0]}
                                    </div>
                                    <span className="truncate max-w-[140px]">{c.clientName}</span>
                                  </div>
                                  {isSelected && <FaCheck className="text-indigo-600" />}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <div className={`flex items-center gap-2 text-xs ${canEdit ? "text-gray-600 hover:text-gray-900 cursor-pointer" : "text-gray-500"}`}>
                      <FaRegCalendarAlt className="text-gray-400" />
                      {formatDate(task.assignedDate)}
                    </div>
                    {canEdit && (
                      <input
                        type="date"
                        value={task.assignedDate?.toDate ? task.assignedDate.toDate().toISOString().split('T')[0] : (task.assignedDate || "")}
                        onChange={(e) =>
                          handleQuickUpdate("assignedDate", e.target.value)
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <div
                      className={`flex items-center gap-2 text-xs ${task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== "Done"
                        ? "text-red-600 font-bold"
                        : canEdit ? "text-gray-600 hover:text-gray-900 cursor-pointer" : "text-gray-500"
                        }`}
                    >
                      <FaRegCalendarAlt
                        className={
                          task.dueDate &&
                            new Date(task.dueDate) < new Date() &&
                            task.status !== "Done"
                            ? "text-red-500"
                            : "text-gray-400"
                        }
                      />
                      {formatDate(task.dueDate)}
                    </div>
                    {canEdit && (
                      <input
                        type="date"
                        value={task.dueDate?.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : (task.dueDate || "")}
                        onChange={(e) =>
                          handleQuickUpdate("dueDate", e.target.value)
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Tags/Attributes */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Tags
                  </label>
                  <TagInput
                    tags={task.tags || []}
                    onAdd={handleAddTag}
                    onRemove={handleRemoveTag}
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Time Estimate
                  </label>
                  <TimeEstimateInput
                    value={task.timeEstimate || 0}
                    onChange={handleUpdateTimeEstimate}
                    readOnly={!canEdit}
                  />
                </div>
              </div>
            </div>

            {/* Activity Stream Area */}
            <div className="flex-1 flex flex-col bg-gray-50">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80 backdrop-blur sticky top-0">
                <h3 className="text-xs font-bold text-gray-500 uppercase">
                  Activity
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {timeline.map((item) => {
                  const isComment = item.type === "comment";
                  const isCreated = item.type === "created";
                  const isCompleted = item.type === "completed";

                  let Icon = FaHistory;
                  let iconBg = "bg-gray-100 text-gray-400";

                  if (isComment) {
                    Icon = FaComment;
                    iconBg = "bg-indigo-50 text-indigo-500";
                  } else if (isCreated) {
                    Icon = FaPlus;
                    iconBg = "bg-green-50 text-green-500";
                  } else if (isCompleted) {
                    Icon = FaCheck;
                    iconBg = "bg-green-100 text-green-600";
                  } else if (item.action === "status_updated") {
                    Icon = FaExchangeAlt;
                    iconBg = "bg-blue-50 text-blue-500";
                  } else if (item.action === "assignee_updated") {
                    Icon = FaUserPlus;
                    iconBg = "bg-purple-50 text-purple-500";
                  }

                  return (
                    <div key={item.id} className={`flex gap-3 ${isComment ? "" : "opacity-75"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}>
                        <Icon className="text-xs" />
                      </div>
                      <div className={`flex-1 ${isComment ? "bg-white p-3 rounded-lg shadow-sm border border-gray-100" : "py-1"}`}>
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-xs ${isComment ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                            {getUserDisplayName(item)}
                            <span className="font-normal text-gray-400 ml-1">
                              {isCreated ? "created this task" : isCompleted ? "completed this task" : isComment ? "commented" : ""}
                            </span>
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>

                        {isComment ? (
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            {item.details}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(comments.length === visibleItems || activities.length === visibleItems) && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setVisibleItems(prev => prev + 20)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Load more activity
                    </button>
                  </div>
                )}
              </div>

              {/* Comment Input Footer */}
              <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                <div className="flex gap-2 items-end">
                  <textarea
                    placeholder="Write a comment..."
                    className="flex-1 min-h-[40px] max-h-[120px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (commentText.trim()) {
                          await addTaskComment(
                            task.id,
                            commentText.trim(),
                            currentUser || { uid: "system", displayName: "System" },
                            task.collectionName
                          );
                          setCommentText("");
                        }
                      }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (commentText.trim()) {
                        await addTaskComment(
                          task.id,
                          commentText.trim(),
                          currentUser || { uid: "system", displayName: "System" },
                          task.collectionName
                        );
                        setCommentText("");
                      }
                    }}
                    disabled={!commentText.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <FaPaperPlane className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteTask();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Archive Task?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to archive "{task.title}"? You can unarchive it later from the archived tasks view.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowArchiveConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    handleArchiveTask();
                  }}
                >
                  Archive
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Completion Comment Modal */}
        <CompletionCommentModal
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onSubmit={handleCompletionSubmit}
          title="Complete Task"
          placeholder="Required: Add a comment about this completion..."
          minLength={5}
        />
      </div>
    </div>
  );
};

export default TaskViewModal;

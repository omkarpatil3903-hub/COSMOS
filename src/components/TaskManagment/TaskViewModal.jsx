/**
 * TaskViewModal Component
 *
 * Purpose: Comprehensive task detail modal with editing, comments, and activity.
 * The primary interface for viewing and managing individual tasks.
 *
 * Responsibilities:
 * - Display task details (title, description, dates, priority, status)
 * - Manage subtasks (add, toggle, edit, delete)
 * - Handle comments with @mentions
 * - Show activity timeline (comments + activities merged)
 * - Track time spent per user (start/stop timer)
 * - Toggle assignees with multi-select
 * - Quick inline updates for fields
 * - Handle task completion with comment modal
 * - Support recurring task instance creation
 * - Delete and archive tasks
 *
 * Dependencies:
 * - taskService (CRUD, comments, activities, time tracking)
 * - recurringTasks (createNextRecurringInstance, shouldCreateNextInstance)
 * - colorMaps (getStatusBadge, getPriorityBadge)
 * - formatDate (date formatting)
 * - Firestore (real-time updates)
 * - TagInput, TimeEstimateInput, UserAvatar, CompletionCommentModal
 * - useThemeStyles (themed styling)
 *
 * Props:
 * - task: Initial task object
 * - project: Associated project
 * - projects: All projects for dropdown
 * - users: All users for assignee selection
 * - clients: All clients for assignee selection
 * - onClose: Close callback
 * - onEdit: Edit mode callback
 * - currentUser: Current logged-in user
 * - onDelete/onArchive: Action callbacks
 * - canDelete/canArchive/canEdit: Permission flags
 * - statuses: Available status options
 *
 * Sections:
 * 1. Header: Title, recurring indicator, action menu
 * 2. Main Content: Description, tags, time estimate, subtasks
 * 3. Sidebar: Status, priority, dates, assignees, project, time tracking
 * 4. Timeline: Grouped comments and activities with dates
 * 5. Comment Input: With @mention support
 *
 * Status Logic:
 * - Admin tasks: Updates assigneeStatus per user, calculates global
 * - Self tasks: Updates global status directly
 * - Completion triggers recurring instance creation
 *
 * Time Tracking:
 * - Per-user timer with start/stop
 * - Elapsed time calculated from trackingStartTime
 * - Global total from all assignee times
 *
 * Keyboard Shortcuts:
 * - ESC: Close modal (with unsaved changes check)
 * - Cmd/Ctrl+Enter: Save description
 *
 * Last Modified: 2026-01-10
 */

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
import UserAvatar from "./UserAvatar";
import {
  updateTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  updateSubtask,
  addTaskComment,
  subscribeToTaskComments,
  subscribeToTaskActivities,
  deleteTask,
  archiveTask,

  logTaskActivity,
  logSubtaskActivity,
  startTimeTracking,
  stopTimeTracking,
} from "../../services/taskService";
import {
  FaPlay,
  FaStop
} from "react-icons/fa";
import { getStatusBadge, getPriorityBadge } from "../../utils/colorMaps"; // Adjust path
import { doc, getDoc, onSnapshot, serverTimestamp, runTransaction, deleteField } from "firebase/firestore";
import { db } from "../../firebase";
import TagInput from "./TagInput";
import TimeEstimateInput from "./TimeEstimateInput";
import toast from "react-hot-toast";
import CompletionCommentModal from "../CompletionCommentModal"; // Adjust path if needed
import {
  createNextRecurringInstance,
  shouldCreateNextInstance,
  shouldCreateNextInstanceAsync,
} from "../../utils/recurringTasks";
import { formatDate } from "../../utils/formatDate"; // Import utility
import { useThemeStyles } from "../../hooks/useThemeStyles";

const getRelativeDateLabel = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const oneDay = 24 * 60 * 60 * 1000;

  // Reset times for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === today.getTime() - oneDay) return "Yesterday";

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

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
  canTrackTime = true,
  statuses = [],
}) => {
  const { buttonClass, linkColor, iconColor } = useThemeStyles();
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
  const [expandedViewSubtaskId, setExpandedViewSubtaskId] = useState(null);

  // Quick add subtask fields
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState(null);
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState(null);
  const [newSubtaskPriority, setNewSubtaskPriority] = useState("Medium");
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [showQuickAssigneePicker, setShowQuickAssigneePicker] = useState(false);
  const [showQuickPriorityPicker, setShowQuickPriorityPicker] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState(null);
  const [visibleItems, setVisibleItems] = useState(20);

  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showAllAssignees, setShowAllAssignees] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const [cursorPosition, setCursorPosition] = useState(0);

  // Time Tracking State
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false); // Local Derived State
  const [globalTotalTime, setGlobalTotalTime] = useState(0);


  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes to the description. Close anyway?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        // If comment focused, submit is handled in textarea. 
        // If general context, maybe save description?
        if (isEditingDesc) {
          handleQuickUpdate("description", descValue);
          setIsEditingDesc(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isEditingDesc, descValue]);

  useEffect(() => {
    if (!task) return;

    // Calculate global total time
    let total = 0;
    if (task.assigneeStatus) {
      Object.values(task.assigneeStatus).forEach(status => {
        if (status.timeSpent) total += status.timeSpent;
      });
    }
    setGlobalTotalTime(total);

    if (!currentUser) return;
    const userStatus = task.assigneeStatus?.[currentUser.uid];
    const tracking = userStatus?.isTracking || false;
    setIsTracking(tracking);

    const baseTime = userStatus?.timeSpent || 0;

    if (tracking && userStatus?.trackingStartTime) {
      const start = userStatus.trackingStartTime.toDate ? userStatus.trackingStartTime.toDate() : new Date(userStatus.trackingStartTime);
      // Initial calc
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);
      setElapsedTime(baseTime + diff);

      const interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        setElapsedTime(baseTime + diff);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(baseTime);
    }
  }, [task, currentUser]);

  const handleToggleTimer = async () => {
    if (!currentUser) return;
    const userStatus = task.assigneeStatus?.[currentUser.uid];
    const tracking = userStatus?.isTracking || false;

    try {
      if (tracking) {
        await stopTimeTracking(
          task.id,
          currentUser.uid,
          userStatus?.timeSpent || 0,
          userStatus?.trackingStartTime,
          currentUser,
          task.collectionName
        );
        toast.success("Timer stopped");
      } else {
        await startTimeTracking(task.id, currentUser.uid, task.collectionName);
        toast.success("Timer started");
      }
    } catch (err) {
      console.error("Timer toggle failed", err);
      toast.error("Failed to toggle timer");
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    let removedUserId = null;

    if (existsIndex >= 0) {
      current.splice(existsIndex, 1);
      removedUserId = item.id; // Track removed user for cleanup
    } else {
      current.push({ id: item.id, type });
    }

    // Update task
    const primary = current[0] || {};
    const updates = {
      assignees: current,
      assigneeId: primary.id || "",
      assigneeType: primary.type || "user",
      assigneeIds: current.map(a => a.id)
    };

    // Clean up assigneeStatus for removed user
    if (removedUserId) {
      updates[`assigneeStatus.${removedUserId}`] = deleteField();
    }

    await updateTask(task.id, updates, task.collectionName);
  };

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(descValue !== (task?.description || ""));
  }, [descValue, task?.description]);

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
    const hasCreationActivity = activities.some(a =>
      a.action === "created" ||
      (a.details && a.details.toLowerCase().includes("task created"))
    );

    if (task.createdAt && !hasCreationActivity) {
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

  const groupedTimeline = useMemo(() => {
    const groups = {};
    timeline.forEach(item => {
      const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || 0);
      const label = getRelativeDateLabel(date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  }, [timeline]);



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

          // BUG FIX #4: Removed redundant fire-and-forget recurrence trigger
          // Recurrence creation happens after database update (lines 538-562)
        } else {
          // Not everyone is done, so global status is "In Progress"
          updates.status = "In Progress";
          updates.completedAt = null; // Clear completion if logic reverts
          // We don't touch progressPercent/completedBy globally here
        }

        // IMPORTANT: Wait for update to complete FIRST
        await updateTask(task.id, updates, col);

        // THEN create recurring instance (if all assignees are done)
        if (allOthersDone && task.isRecurring) {
          console.log("All assignees done. Triggering recurrence for:", task.id);

          // Fetch fresh data from database to ensure accuracy
          const freshTaskDoc = await getDoc(doc(db, col, task.id));
          if (freshTaskDoc.exists()) {
            const freshData = freshTaskDoc.data();
            const dueDate = freshData.dueDate?.toDate ? freshData.dueDate.toDate() : new Date(freshData.dueDate);
            const completedTaskState = {
              ...freshData,
              id: task.id,
              taskId: task.id,
              dueDate: dueDate,
              status: "Done",
              completedAt: new Date(),
            };

            if (await shouldCreateNextInstanceAsync(completedTaskState)) {
              try {
                const newId = await createNextRecurringInstance(completedTaskState);
                if (newId) {
                  toast.success("Next recurring task created!");
                } else {
                  console.log("Recurring task creation skipped (duplicate or end condition)");
                }
              } catch (err) {
                console.error("Recurrence error:", err);
                toast.error(`Failed to create next recurring task: ${err.message}`);
              }
            }
          }
        }
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

        // IMPORTANT: Wait for update to complete FIRST
        await updateTask(task.id, updates, col);
      }

      // REMOVED: Duplicate recurring task creation block
      // This was causing race conditions - already handled above in lines 522-550

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
        // Use transaction to prevent race conditions
        const taskRef = doc(db, col, task.id);

        await runTransaction(db, async (transaction) => {
          const taskDoc = await transaction.get(taskRef);
          if (!taskDoc.exists()) {
            throw new Error("Task does not exist!");
          }

          const currentData = taskDoc.data();
          const nextAssigneeStatus = { ...(currentData.assigneeStatus || {}) };
          const nextUserStatus = { ...(nextAssigneeStatus[currentUser.uid] || {}) };

          // Update user's individual status
          if (field === "status") {
            nextUserStatus.status = value;
            if (value === "Done") {
              nextUserStatus.completedAt = serverTimestamp();
              nextUserStatus.progressPercent = 100;
              nextUserStatus.completedBy = currentUser?.uid;
            } else if (value === "In Progress") {
              nextUserStatus.progressPercent = nextUserStatus.progressPercent || 0;
              nextUserStatus.completedAt = null;
            } else {
              nextUserStatus.completedAt = null;
              nextUserStatus.progressPercent = 0;
            }
          } else if (field === "progressPercent") {
            nextUserStatus.progressPercent = value;
            if (value === 100) {
              nextUserStatus.status = "Done";
              nextUserStatus.completedAt = serverTimestamp();
              nextUserStatus.completedBy = currentUser?.uid;
            } else if (value > 0 && value < 100) {
              // Fix: Revert status if progress is reduced
              nextUserStatus.status = "In Progress";
            } else {
              nextUserStatus.status = "To-Do";
            }
          }

          // Apply back to map
          nextAssigneeStatus[currentUser.uid] = nextUserStatus;

          // Calculate Global Status based on ALL assignees (fresh data)
          const currentAssignees = currentData.assigneeIds || [];
          const updates = {
            [`assigneeStatus.${currentUser.uid}`]: nextUserStatus
          };

          if (currentAssignees.length > 0) {
            const userStatValues = currentAssignees.map(uid => nextAssigneeStatus[uid] || {});
            const allDone = userStatValues.every(s => s.status === "Done");
            const anyInProgress = userStatValues.some(s =>
              s.status === "In Progress" || s.status === "In Review" || s.status === "Done"
            );

            if (allDone) {
              updates.status = "Done";
              updates.completedAt = serverTimestamp();
              updates.progressPercent = 100;
            } else if (anyInProgress) {
              updates.status = "In Progress";
              updates.completedAt = null;
            } else {
              updates.status = "To-Do";
              updates.completedAt = null;
            }
          }

          transaction.update(taskRef, updates);
        });

        console.log("Transaction completed successfully");
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

            const shouldCreate = await shouldCreateNextInstanceAsync(completedTaskState);
            console.log("shouldCreateNextInstanceAsync result:", shouldCreate);

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
                toast.error(`Failed to create next recurring task: ${err.message}`);
              }
            } else {
              console.warn("shouldCreateNextInstanceAsync returned false. Check task criteria (end date, max occurrences, etc).");
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

  // Simple Markdown Renderer Helper
  const renderMarkdown = (text) => {
    if (!text) return null;

    // Split by newlines first to handle blocks
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('# ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h3>;
      if (line.startsWith('## ')) return <h4 key={i} className="text-md font-bold mt-3 mb-1">{line.slice(3)}</h4>;

      // List items
      if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInlineStyles(line.trim().slice(2))}</li>;

      // Regular paragraphs
      return <p key={i} className="mb-2 min-h-[1.2em]">{renderInlineStyles(line)}</p>;
    });
  };

  const renderInlineStyles = (text) => {
    // Bold: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
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
      // Get subtask title before deleting for logging
      const subtask = (task.subtasks || []).find((s) => s.id === subtaskId);
      const subtaskTitle = subtask?.title || "Unknown";

      await deleteSubtask(task.id, subtaskId, task.collectionName);
      setDeletingSubtaskId(null);
      toast.success("Subtask deleted");

      // Log activity
      logSubtaskActivity(
        task.id,
        subtaskId,
        subtaskTitle,
        "subtask_deleted",
        `Deleted subtask "${subtaskTitle}"`,
        { uid: currentUser?.uid, displayName: currentUser?.displayName },
        task.collectionName
      );
    } catch (err) {
      console.error("Failed to delete subtask", err);
      toast.error("Failed to delete subtask");
    }
  };

  // Helpers


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
    return item.userName || "Unknown";
  };

  const getUserDetails = (userId) => {
    if (!userId || userId === "system") return { name: "System", avatar: null };
    const user = users.find(u => u.id === userId);
    if (user) return user;
    const client = clients.find(c => c.id === userId);
    if (client) return { ...client, name: client.clientName };
    return { name: "Unknown" };
  };

  const renderCommentText = (text) => {
    if (!text) return "";

    // Split by mention pattern @Name
    const parts = text.split(/(@[\w\s]+)/g);

    return parts.map((part, index) => {
      // Check if this part matches our mention format (heuristic)
      if (part.startsWith("@")) {
        const nameToCheck = part.substring(1).trim();
        const userExists = users.some(u =>
          (u.name && u.name.toLowerCase() === nameToCheck.toLowerCase()) ||
          (u.displayName && u.displayName.toLowerCase() === nameToCheck.toLowerCase())
        ) || clients.some(c => c.clientName && c.clientName.toLowerCase() === nameToCheck.toLowerCase());

        if (userExists) {
          return (
            <span key={index} className="text-indigo-600 font-semibold bg-indigo-50 rounded px-1">
              {part}
            </span>
          );
        }
      }
      return part;
    });
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
      onClick={handleClose}
    >
      <div

        className="bg-white/95 [.dark_&]:bg-[#181B2A]/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/20 w-[95vw] max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-white/20 [.dark_&]:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Header --- */}
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-100/50 [.dark_&]:border-white/10 bg-white/80 [.dark_&]:bg-[#181B2A]/80 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden">
            <span className="truncate font-medium text-gray-700 [.dark_&]:text-white max-w-[150px] lg:max-w-[200px]" title={project?.name}>
              {project?.name || "No Project"}
            </span>
            <span className="text-gray-300 [.dark_&]:text-gray-600">/</span>
            <span className="px-2 py-0.5 rounded border border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-white/5 text-xs font-mono text-gray-600 [.dark_&]:text-gray-400">
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
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full text-gray-400 transition-colors ml-2"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* --- Main Body (Responsive Split View) --- */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
          {/* LEFT PANEL: Content */}
          <div className="flex-1 p-6 lg:p-8 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-100/50">
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 [.dark_&]:text-white mb-6 leading-tight">
              {task.title}
            </h1>

            {/* Relocated Metadata Grid (Left Panel) */}
            <div className="bg-white/50 [.dark_&]:bg-white/5 backdrop-blur-sm rounded-xl p-5 mb-8 border border-gray-100/50 [.dark_&]:border-white/10 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* Status */}
                <div className="group relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Status</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] flex items-center justify-between hover:border-indigo-300 transition-colors min-w-0 ${getStatusBadge(displayStatus)}`}
                    >
                      <span className="font-medium truncate [.dark_&]:text-white">{displayStatus}</span>
                      <FaChevronDown className="text-[10px] opacity-50 ml-1 shrink-0" />
                    </button>
                    {statusOptions.includes("Done") && (
                      <button
                        type="button"
                        onClick={() => {
                          const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                          if (norm("Done") === "done") { setShowCompletionModal(true); }
                          else { handleQuickUpdate("status", "Done"); }
                        }}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 shrink-0 ${String(displayStatus || "").toLowerCase().includes("done") ? "bg-emerald-500 text-white border-emerald-500" : "bg-white border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-500"}`}
                        title="Mark as Done"
                      >
                        <FaCheck className="text-xs" />
                      </button>
                    )}
                  </div>
                  {showStatusDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)}></div>
                      <div className="absolute top-full left-0 w-48 mt-1 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-100 [.dark_&]:border-white/10 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {/* Ensure Done is always an option */}
                        {Array.from(new Set([...statusOptions, "Done"])).map(status => (
                          <button
                            key={status}
                            onClick={() => { handleQuickUpdate("status", status); setShowStatusDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 [.dark_&]:hover:bg-white/5 flex items-center justify-between text-gray-700 [.dark_&]:text-gray-200"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Priority */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Priority</label>
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className={`w-full px-3 py-2 rounded-lg text-xs border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] flex items-center justify-between hover:border-indigo-300 transition-colors ${getPriorityBadge(task.priority)}`}
                  >
                    <span className="font-medium truncate [.dark_&]:text-white">{task.priority || "Medium"}</span>
                    <FaChevronDown className="text-[10px] opacity-50 ml-1 shrink-0" />
                  </button>
                  {showPriorityDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)}></div>
                      <div className="absolute top-full left-0 w-32 mt-1 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-100 [.dark_&]:border-white/10 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {["Low", "Medium", "High"].map(p => (
                          <button key={p} onClick={() => { handleQuickUpdate("priority", p); setShowPriorityDropdown(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 [.dark_&]:hover:bg-white/5 text-gray-700 [.dark_&]:text-gray-200">{p}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Dates */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Dates</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600 [.dark_&]:text-gray-400">
                      <span className="w-8 text-[10px] uppercase tracking-wider opacity-70">Start</span>
                      <div className="relative cursor-pointer hover:text-indigo-600">
                        {formatDate(task.assignedDate)}
                        {canEdit && <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleQuickUpdate("assignedDate", e.target.value)} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 [.dark_&]:text-gray-400">
                      <span className="w-8 text-[10px] uppercase tracking-wider opacity-70">Due</span>
                      <div className={`relative cursor-pointer hover:text-indigo-600 ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done" ? "text-red-500 font-bold" : ""}`}>
                        {formatDate(task.dueDate)}
                        {canEdit && <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleQuickUpdate("dueDate", e.target.value)} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignees */}
                <div className="relative col-span-1 md:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Assignees</label>
                  <div className="flex flex-col gap-2">
                    {/* Avatar Stack for Read-Only View */}
                    <div
                      className={`flex items-center -space-x-2 cursor-pointer p-1 rounded-full hover:bg-gray-100 [.dark_&]:hover:bg-white/5 transition-colors w-fit ${localAssigneesResolved.length === 0 ? "pl-2" : ""}`}
                      onClick={() => setShowAssigneePopover(!showAssigneePopover)}
                      title="Manage Assignees"
                    >
                      {localAssigneesResolved.length > 0 ? (
                        <>
                          {localAssigneesResolved.slice(0, 4).map((u, i) => (
                            <UserAvatar
                              key={i}
                              user={u}
                              size="sm"
                              showStatusDot={true}
                              status={u.status}
                              className="border-2 border-white [.dark_&]:border-[#181B2A]"
                            />
                          ))}
                          {localAssigneesResolved.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white [.dark_&]:border-[#181B2A] bg-gray-100 [.dark_&]:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 [.dark_&]:text-gray-300">
                              +{localAssigneesResolved.length - 4}
                            </div>
                          )}
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 [.dark_&]:border-gray-600 bg-transparent flex items-center justify-center text-gray-400 ml-2 hover:border-indigo-400 hover:text-indigo-500 transition-colors z-0">
                            <FaPlus className="text-xs" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 [.dark_&]:border-gray-600 flex items-center justify-center bg-transparent"><FaPlus className="text-xs" /></div>
                          <span>Add Assignee</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {showAssigneePopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAssigneePopover(false)}></div>
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white [.dark_&]:bg-[#1e212b] rounded-xl shadow-2xl border border-gray-200 [.dark_&]:border-white/10 z-50 p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
                        {/* Search Header */}
                        <div className="p-3 border-b border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-white/5">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search users..."
                              className="w-full bg-white [.dark_&]:bg-[#15171e] text-gray-900 [.dark_&]:text-gray-200 text-xs px-8 py-2 rounded-lg border border-gray-200 [.dark_&]:border-transparent focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 [.dark_&]:placeholder:text-gray-500"
                              autoFocus
                            />
                            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400 [.dark_&]:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          </div>
                        </div>

                        {/* Current Assignees Section */}
                        {localAssigneesResolved.length > 0 && (
                          <div className="p-2">
                            <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned</div>
                            {localAssigneesResolved.map((u, i) => (
                              <div key={u.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 [.dark_&]:hover:bg-white/5 group transition-colors cursor-pointer" onClick={() => handleToggleAssignee(u, 'user')}>
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    user={u}
                                    size="sm"
                                    showStatusDot={true}
                                    status={u.status}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm text-gray-900 [.dark_&]:text-gray-200 font-medium leading-tight">{u.name}</span>
                                    {u.status && <span className={`text-[10px] font-medium ${u.status === "Done" ? "text-green-600 [.dark_&]:text-green-500" : u.status === "In Progress" ? "text-amber-600 [.dark_&]:text-amber-500" : "text-gray-500"}`}>{u.status}</span>}
                                  </div>
                                </div>
                                <FaCheck className="text-indigo-600 [.dark_&]:text-indigo-400 text-xs" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Divider */}
                        {localAssigneesResolved.length > 0 && <div className="h-px bg-gray-200 [.dark_&]:bg-white/10 mx-2 my-1"></div>}

                        {/* All Users List */}
                        <div className="p-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 [.dark_&]:scrollbar-thumb-white/10">
                          <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Suggestions</div>
                          {users.filter(u => !localAssigneesResolved.some(a => a.id === u.id)).map(u => (
                            <div key={u.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer transition-colors" onClick={() => handleToggleAssignee(u, 'user')}>
                              <UserAvatar user={u} size="sm" />
                              <span className="text-sm text-gray-900 [.dark_&]:text-gray-300">{u.name}</span>
                            </div>
                          ))}
                        </div>


                      </div>
                    </>
                  )}

                </div>

                {/* Time Tracker */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">My Time</label>
                  <div className="min-h-[34px] flex items-center gap-2">
                    <button
                      onClick={handleToggleTimer}
                      disabled={!canTrackTime}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isTracking ? "bg-red-50 text-red-600 animate-pulse-red border border-red-200" : "bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"}`}
                      title={isTracking ? "Stop Timer" : "Start Timer"}
                    >
                      {isTracking ? <FaStop className="text-xs" /> : <FaPlay className="text-[10px]" />}
                    </button>
                    <div className="flex flex-col">
                      <span className={`text-xs font-mono font-medium leading-none ${isTracking ? "text-indigo-600" : "text-gray-600 [.dark_&]:text-gray-400"}`}>
                        {formatDuration(elapsedTime)}
                      </span>
                      {globalTotalTime > 0 && (
                        <span className="text-[10px] text-gray-400 font-mono leading-none mt-1" title="Total accumulated time by everyone">
                          Total: {formatDuration(globalTotalTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Est. Time</label>
                  <div className="min-h-[34px]">
                    <TimeEstimateInput
                      value={task.timeEstimate || 0}
                      onChange={handleUpdateTimeEstimate}
                      readOnly={!canEdit}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tags</label>
                  <div className="min-h-[34px]">
                    <TagInput tags={task.tags || []} onAdd={handleAddTag} onRemove={handleRemoveTag} readOnly={!canEdit} simple />
                  </div>
                </div>

              </div>
            </div>

            {/* Description Section */}
            <div className="mb-8 group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                  Description
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingDesc(!isEditingDesc)}
                    className={`text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${linkColor}`}
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
                    className="w-full h-32 p-3 border border-gray-200 [.dark_&]:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
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
                  className={`prose prose-sm max-w-none text-gray-600 [.dark_&]:text-gray-300 bg-gray-50/50 [.dark_&]:bg-white/5 p-4 rounded-xl border border-gray-100/50 [.dark_&]:border-white/10 min-h-[60px] transition-colors ${canEdit ? "cursor-pointer hover:bg-gray-50 [.dark_&]:hover:bg-white/10" : ""}`}
                  onClick={() => canEdit && setIsEditingDesc(true)}
                >
                  {task.description ? (
                    <div className="whitespace-pre-wrap break-words">{renderMarkdown(task.description)}</div>
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
                <h3 className="text-sm font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                  Subtasks
                </h3>
                <span className="text-xs text-gray-400">
                  {(task.subtasks || []).filter((s) => s.completed).length}/
                  {(task.subtasks || []).length} completed
                </span>
              </div>
              {/* Circular Progress Ring */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 [.dark_&]:text-white/10" />
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 - ((((task.subtasks || []).filter(s => s.completed).length) / ((task.subtasks || []).length || 1)) * 2 * Math.PI * 20)}
                      className="text-green-500 transition-all duration-500 ease-out" />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-gray-600 [.dark_&]:text-white">
                    {Math.round(((task.subtasks || []).filter(s => s.completed).length / ((task.subtasks || []).length || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Progress</p>
                  <p className="text-sm font-bold text-gray-800 [.dark_&]:text-white">
                    Completed {(task.subtasks || []).filter(s => s.completed).length} of {(task.subtasks || []).length} subtasks
                  </p>
                </div>
              </div>
              <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-xl overflow-hidden">
                {(task.subtasks || []).length > 0 ? (
                  <div className="divide-y divide-gray-100 [.dark_&]:divide-white/5">
                    {task.subtasks.map((sub) => {
                      const isSubExpanded = expandedViewSubtaskId === sub.id;
                      const subtaskAssignee = users.find(u => u.id === sub.assigneeId);
                      const isOverdue = sub.dueDate && new Date(sub.dueDate) < new Date() && !sub.completed;

                      // Phase 2: Check if blocked by incomplete dependencies
                      const blockedByIds = (sub.dependsOn || []).filter((depId) => {
                        const dep = task.subtasks.find((s) => s.id === depId);
                        return dep && !dep.completed;
                      });
                      const isBlocked = blockedByIds.length > 0 && !sub.completed;
                      const blockedByNames = blockedByIds.map((depId) => {
                        const dep = task.subtasks.find((s) => s.id === depId);
                        return dep?.title || depId;
                      });

                      return (
                        <div key={sub.id} className="group">
                          {/* Main Row */}
                          <div className={`flex items-center gap-3 p-3 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors ${isBlocked ? 'bg-amber-50/50 [.dark_&]:bg-amber-900/10' : ''}`}>
                            <button
                              onClick={async () => {
                                if (isBlocked) {
                                  toast.error(`Complete "${blockedByNames[0]}" first`);
                                  return;
                                }
                                try {
                                  await toggleSubtask(
                                    task.id,
                                    sub.id,
                                    !sub.completed,
                                    task.collectionName,
                                    currentUser?.uid
                                  );
                                  // Log activity
                                  const action = !sub.completed ? "subtask_completed" : "subtask_reopened";
                                  const details = !sub.completed
                                    ? `Completed subtask "${sub.title}"`
                                    : `Reopened subtask "${sub.title}"`;
                                  logSubtaskActivity(
                                    task.id,
                                    sub.id,
                                    sub.title,
                                    action,
                                    details,
                                    { uid: currentUser?.uid, displayName: currentUser?.displayName },
                                    task.collectionName
                                  );
                                } catch (err) {
                                  toast.error(err.message || "Failed to toggle subtask");
                                }
                              }}
                              disabled={isBlocked}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${isBlocked
                                ? "border-amber-300 [.dark_&]:border-amber-600 bg-amber-100 [.dark_&]:bg-amber-900/30 text-amber-500 cursor-not-allowed"
                                : sub.completed
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-gray-300 [.dark_&]:border-gray-600 hover:border-indigo-500 text-transparent"
                                }`}
                              title={isBlocked ? `Blocked by: ${blockedByNames.join(', ')}` : ''}
                            >
                              {isBlocked ? (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : (
                                <FaRegCheckCircle className="text-xs" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm block truncate ${isBlocked
                                  ? "text-amber-700 [.dark_&]:text-amber-400"
                                  : sub.completed
                                    ? "text-gray-400 line-through"
                                    : "text-gray-700 [.dark_&]:text-white"
                                  }`}
                              >
                                {isBlocked && <span className="mr-1">🔒</span>}
                                {sub.title}
                              </span>
                              {isBlocked && (
                                <span className="text-[10px] text-amber-600 [.dark_&]:text-amber-400 truncate block">
                                  Waiting for: {blockedByNames.join(', ')}
                                </span>
                              )}
                              {sub.description && !isSubExpanded && !isBlocked && (
                                <span className="text-[10px] text-gray-400 truncate block">{sub.description}</span>
                              )}
                            </div>
                            {/* Quick indicators */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Dependency count badge */}
                              {(sub.dependsOn || []).length > 0 && !isBlocked && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 [.dark_&]:bg-white/10 [.dark_&]:text-gray-400" title={`Depends on ${sub.dependsOn.length} subtask(s)`}>
                                  ⛓️ {sub.dependsOn.length}
                                </span>
                              )}
                              {sub.dueDate && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isOverdue ? 'bg-red-100 text-red-600 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400' : 'bg-gray-100 text-gray-500 [.dark_&]:bg-white/10 [.dark_&]:text-gray-400'}`}>
                                  {new Date(sub.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {subtaskAssignee && (
                                <span className="w-5 h-5 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 text-indigo-600 [.dark_&]:text-indigo-400 text-[9px] font-bold flex items-center justify-center" title={subtaskAssignee.name}>
                                  {subtaskAssignee.name?.charAt(0)?.toUpperCase()}
                                </span>
                              )}
                              {sub.priority && sub.priority !== 'Medium' && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sub.priority === 'High' ? 'bg-red-100 text-red-600 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400' : 'bg-blue-100 text-blue-600 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-400'}`}>
                                  {sub.priority === 'High' ? '!' : 'L'}
                                </span>
                              )}
                            </div>
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => setExpandedViewSubtaskId(isSubExpanded ? null : sub.id)}
                                  className="text-gray-400 hover:text-indigo-500 p-1 transition-all"
                                  title="Edit details"
                                >
                                  <svg className={`w-3.5 h-3.5 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
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
                              </>
                            )}
                          </div>
                          {/* Expanded Edit Panel */}
                          {isSubExpanded && canEdit && (
                            <div className="px-4 pb-4 pt-2 bg-gray-50/50 [.dark_&]:bg-white/5 border-t border-gray-100 [.dark_&]:border-white/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                              <div className="grid grid-cols-3 gap-3">
                                {/* Due Date */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Due Date</label>
                                  <input
                                    type="date"
                                    value={sub.dueDate || ''}
                                    onChange={async (e) => {
                                      await updateSubtask(task.id, sub.id, { dueDate: e.target.value || null }, task.collectionName);
                                    }}
                                    className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                  />
                                </div>
                                {/* Assignee */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Assignee</label>
                                  <select
                                    value={sub.assigneeId || ''}
                                    onChange={async (e) => {
                                      await updateSubtask(task.id, sub.id, { assigneeId: e.target.value || null }, task.collectionName);
                                    }}
                                    className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                  >
                                    <option value="">Unassigned</option>
                                    {users.map((u) => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Priority */}
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Priority</label>
                                  <div className="flex gap-1">
                                    {['Low', 'Medium', 'High'].map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={async () => {
                                          await updateSubtask(task.id, sub.id, { priority: p }, task.collectionName);
                                        }}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-all ${sub.priority === p
                                          ? p === 'High' ? 'bg-red-500 text-white' : p === 'Low' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                                          : 'bg-gray-100 [.dark_&]:bg-white/10 text-gray-500 hover:bg-gray-200 [.dark_&]:hover:bg-white/20'
                                          }`}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {/* Description */}
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Description</label>
                                <textarea
                                  value={sub.description || ''}
                                  onChange={async (e) => {
                                    // Debounce would be better here, but for simplicity we update on blur
                                  }}
                                  onBlur={async (e) => {
                                    if (e.target.value !== (sub.description || '')) {
                                      await updateSubtask(task.id, sub.id, { description: e.target.value }, task.collectionName);
                                    }
                                  }}
                                  defaultValue={sub.description || ''}
                                  placeholder="Add details..."
                                  rows={2}
                                  className="w-full rounded border-0 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600 resize-none"
                                />
                              </div>
                              {/* Dependencies */}
                              {(task.subtasks || []).length > 1 && (
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                    Depends On <span className="text-gray-400">(must complete first)</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {(task.subtasks || [])
                                      .filter((other) => other.id !== sub.id)
                                      .map((other) => {
                                        const isSelected = (sub.dependsOn || []).includes(other.id);
                                        const wouldBeCircular = (other.dependsOn || []).includes(sub.id);
                                        return (
                                          <button
                                            key={other.id}
                                            type="button"
                                            disabled={wouldBeCircular}
                                            onClick={async () => {
                                              const currentDeps = sub.dependsOn || [];
                                              const newDeps = isSelected
                                                ? currentDeps.filter((d) => d !== other.id)
                                                : [...currentDeps, other.id];
                                              await updateSubtask(task.id, sub.id, { dependsOn: newDeps }, task.collectionName);
                                            }}
                                            className={`px-2 py-1 text-[9px] rounded border transition-all ${wouldBeCircular
                                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                              : isSelected
                                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400 [.dark_&]:border-indigo-500/30'
                                                : 'bg-white [.dark_&]:bg-[#181B2A] text-gray-600 [.dark_&]:text-gray-400 border-gray-200 [.dark_&]:border-white/10 hover:border-indigo-300'
                                              }`}
                                            title={wouldBeCircular ? `Circular: "${other.title}" depends on this` : ''}
                                          >
                                            {isSelected && <span className="mr-1">⛓️</span>}
                                            {other.title?.slice(0, 20)}{other.title?.length > 20 ? '...' : ''}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No subtasks yet
                  </div>
                )}
                {canEdit && (
                  <div className="p-3 bg-gray-50 [.dark_&]:bg-white/5 border-t border-gray-100 [.dark_&]:border-white/10">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a subtask..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 [.dark_&]:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newSubtaskTitle.trim()) {
                            const title = newSubtaskTitle.trim();
                            const newSub = await addSubtask(task.id, {
                              title,
                              dueDate: newSubtaskDueDate,
                              assigneeId: newSubtaskAssigneeId,
                              priority: newSubtaskPriority,
                            }, task.collectionName);
                            setNewSubtaskTitle("");
                            setNewSubtaskDueDate(null);
                            setNewSubtaskAssigneeId(null);
                            setNewSubtaskPriority("Medium");
                            // Log activity
                            logSubtaskActivity(
                              task.id,
                              newSub?.id || "unknown",
                              title,
                              "subtask_added",
                              `Added subtask "${title}"`,
                              { uid: currentUser?.uid, displayName: currentUser?.displayName },
                              task.collectionName
                            );
                          }
                        }}
                      />

                      {/* Quick Option Icons */}
                      <div className="flex items-center gap-1">
                        {/* Due Date Icon */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickDatePicker(!showQuickDatePicker);
                              setShowQuickAssigneePicker(false);
                              setShowQuickPriorityPicker(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${newSubtaskDueDate ? 'bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400' : 'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'}`}
                            title="Set due date"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {showQuickDatePicker && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowQuickDatePicker(false)} />
                              <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-3 z-20 animate-in fade-in zoom-in-95 duration-100">
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Due Date</label>
                                <input
                                  type="date"
                                  value={newSubtaskDueDate || ''}
                                  onChange={(e) => {
                                    setNewSubtaskDueDate(e.target.value || null);
                                    setShowQuickDatePicker(false);
                                  }}
                                  className="w-36 rounded border-0 bg-gray-50 [.dark_&]:bg-[#181B2A] px-2 py-1.5 text-xs text-gray-900 [.dark_&]:text-white ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-indigo-600"
                                  autoFocus
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Assignee Icon */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickAssigneePicker(!showQuickAssigneePicker);
                              setShowQuickDatePicker(false);
                              setShowQuickPriorityPicker(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${newSubtaskAssigneeId ? 'bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400' : 'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'}`}
                            title="Assign to"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </button>
                          {showQuickAssigneePicker && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowQuickAssigneePicker(false)} />
                              <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-2 z-20 w-48 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                <label className="block text-[10px] font-medium text-gray-500 mb-1 px-1">Assign to</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewSubtaskAssigneeId(null);
                                    setShowQuickAssigneePicker(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 [.dark_&]:hover:bg-white/10 ${!newSubtaskAssigneeId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 [.dark_&]:text-gray-300'}`}
                                >
                                  Unassigned
                                </button>
                                {users.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setNewSubtaskAssigneeId(u.id);
                                      setShowQuickAssigneePicker(false);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 ${newSubtaskAssigneeId === u.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 [.dark_&]:text-gray-300'}`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center">
                                      {u.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                    {u.name}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Priority Icon */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickPriorityPicker(!showQuickPriorityPicker);
                              setShowQuickDatePicker(false);
                              setShowQuickAssigneePicker(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${newSubtaskPriority === 'High' ? 'bg-red-100 text-red-600 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400' :
                              newSubtaskPriority === 'Low' ? 'bg-blue-100 text-blue-600 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-400' :
                                'hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-400 hover:text-gray-600'
                              }`}
                            title="Set priority"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                          </button>
                          {showQuickPriorityPicker && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowQuickPriorityPicker(false)} />
                              <div className="absolute bottom-full right-0 mb-2 bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-xl border border-gray-200 [.dark_&]:border-white/10 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                                <div className="flex gap-1">
                                  {['Low', 'Medium', 'High'].map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => {
                                        setNewSubtaskPriority(p);
                                        setShowQuickPriorityPicker(false);
                                      }}
                                      className={`px-3 py-1.5 text-[10px] font-medium rounded transition-all ${newSubtaskPriority === p
                                        ? p === 'High' ? 'bg-red-500 text-white' : p === 'Low' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                                        : 'bg-gray-100 [.dark_&]:bg-white/10 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (newSubtaskTitle.trim()) {
                            const title = newSubtaskTitle.trim();
                            const newSub = await addSubtask(task.id, {
                              title,
                              dueDate: newSubtaskDueDate,
                              assigneeId: newSubtaskAssigneeId,
                              priority: newSubtaskPriority,
                            }, task.collectionName);
                            setNewSubtaskTitle("");
                            setNewSubtaskDueDate(null);
                            setNewSubtaskAssigneeId(null);
                            setNewSubtaskPriority("Medium");
                            // Log activity
                            logSubtaskActivity(
                              task.id,
                              newSub?.id || "unknown",
                              title,
                              "subtask_added",
                              `Added subtask "${title}"`,
                              { uid: currentUser?.uid, displayName: currentUser?.displayName },
                              task.collectionName
                            );
                          }
                        }}
                        className={`px-4 py-2 bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 text-gray-600 [.dark_&]:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 [.dark_&]:hover:bg-white/10 transition-colors`}
                      >
                        Add
                      </button>
                    </div>

                    {/* Selected Options Preview */}
                    {(newSubtaskDueDate || newSubtaskAssigneeId || newSubtaskPriority !== 'Medium') && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400">Options:</span>
                        {newSubtaskDueDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 [.dark_&]:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1">
                            📅 {new Date(newSubtaskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <button type="button" onClick={() => setNewSubtaskDueDate(null)} className="text-gray-400 hover:text-red-500">×</button>
                          </span>
                        )}
                        {newSubtaskAssigneeId && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 [.dark_&]:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1">
                            👤 {users.find(u => u.id === newSubtaskAssigneeId)?.name}
                            <button type="button" onClick={() => setNewSubtaskAssigneeId(null)} className="text-gray-400 hover:text-red-500">×</button>
                          </span>
                        )}
                        {newSubtaskPriority !== 'Medium' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${newSubtaskPriority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            ⚡ {newSubtaskPriority}
                            <button type="button" onClick={() => setNewSubtaskPriority('Medium')} className="hover:text-red-500">×</button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* OKR Display Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <FaBullseye className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                  Objectives & Key Results
                </h3>
              </div>
              <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-xl p-4">
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
                    <div className="bg-gradient-to-br from-indigo-50 to-white [.dark_&]:from-indigo-900/20 [.dark_&]:to-[#181B2A] border-l-4 border-indigo-500 rounded-r-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-sm text-indigo-600 [.dark_&]:text-indigo-400 shrink-0">
                          <FaBullseye className="text-lg" />
                        </div>
                        <div className="space-y-3 flex-1">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">
                              Objective
                            </span>
                            <p className="text-sm text-gray-900 [.dark_&]:text-white font-semibold leading-snug">
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
                                  <li key={i} className="text-sm text-gray-600 [.dark_&]:text-gray-300 flex items-start gap-2">
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



          {/* --- RIGHT PANEL: Activity Only (Responsive) --- */}
          <div className="lg:w-[400px] flex flex-col bg-gray-50/50 [.dark_&]:bg-black/20 border-l border-gray-100/50 [.dark_&]:border-white/10 order-1 lg:order-2 h-[50vh] lg:h-auto">
            {/* Activity Header */}
            <div className="p-4 border-b border-gray-100/50 [.dark_&]:border-white/10 bg-white/80 [.dark_&]:bg-[#181B2A]/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-700 [.dark_&]:text-white flex items-center gap-2">
                <FaHistory className="text-indigo-500" />
                Activity & Comments
              </h3>
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 relative custom-scrollbar">
              {/* Vertical Timeline Line */}
              <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gray-200 [.dark_&]:bg-white/5 z-0"></div>

              {Object.keys(groupedTimeline).length === 0 ? (
                <div className="text-center py-12 text-gray-400 relative z-10">
                  <div className="w-12 h-12 bg-gray-100 [.dark_&]:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaHistory className="text-gray-300 [.dark_&]:text-gray-600" />
                  </div>
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                Object.entries(groupedTimeline).map(([dateLabel, items]) => (
                  <div key={dateLabel} className="relative z-10">
                    <div className="sticky top-0 bg-gray-50/95 [.dark_&]:bg-[#1F2234]/95 backdrop-blur py-1 mb-4 z-20 flex justify-center">
                      <span className="text-[10px] font-bold text-gray-500 [.dark_&]:text-gray-400 bg-gray-200/50 [.dark_&]:bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-white/50 [.dark_&]:border-white/5">
                        {dateLabel}
                      </span>
                    </div>

                    <div className="space-y-6">
                      {items.map((item, index) => {
                        const isComment = item.type === "comment";
                        const isCurrentUser = item.userId === currentUser?.uid;

                        // Determine Icon & Color
                        let Icon = FaHistory;
                        let iconBg = "bg-gray-100 text-gray-500 border-gray-200 [.dark_&]:bg-white/10 [.dark_&]:text-gray-400 [.dark_&]:border-white/10";

                        if (isComment) {
                          // For comments we use the avatar, but we can set a fallback icon just in case
                          Icon = FaComment;
                        } else if (item.type === "created") {
                          Icon = FaPlus;
                          iconBg = "bg-green-100 text-green-600 border-green-200";
                        } else if (item.type === "completed") {
                          Icon = FaCheck;
                          iconBg = "bg-emerald-100 text-emerald-600 border-emerald-200";
                        } else if (item.action === "status_updated") {
                          Icon = FaExchangeAlt;
                          iconBg = "bg-blue-100 text-blue-600 border-blue-200";
                        } else if (item.action === "assignee_updated") {
                          Icon = FaUserPlus;
                          iconBg = "bg-purple-100 text-purple-600 border-purple-200";
                        }


                        return (
                          <div key={item.id || index} className="flex gap-4 group">

                            {/* Icon / Avatar Column */}
                            <div className="relative z-10 shrink-0">
                              {isComment ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white [.dark_&]:ring-[#181B2A]">
                                  {getUserDisplayName(item).substring(0, 2).toUpperCase()}
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${iconBg} z-10 bg-white`}>
                                  <Icon className="text-sm" />
                                </div>
                              )}
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-900 [.dark_&]:text-white">
                                  {getUserDisplayName(item)}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatDateTime(item.createdAt).split(',')[1]}
                                </span>
                              </div>

                              {isComment ? (
                                <div className={`text-sm px-4 py-3 rounded-2xl rounded-tl-none shadow-sm ${isCurrentUser
                                  ? "bg-indigo-50 text-gray-800 border border-indigo-100 [.dark_&]:bg-indigo-900/20 [.dark_&]:text-indigo-100 [.dark_&]:border-indigo-500/20"
                                  : "bg-white text-gray-700 border border-gray-200 [.dark_&]:bg-white/5 [.dark_&]:text-gray-300 [.dark_&]:border-white/10"
                                  }`}>
                                  <div className="whitespace-pre-wrap leading-relaxed">{renderMarkdown ? renderMarkdown(item.text) : item.text}</div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600 [.dark_&]:text-gray-400 bg-gray-50 [.dark_&]:bg-white/5 px-3 py-2 rounded-lg border border-gray-100 [.dark_&]:border-white/5">
                                  {item.details}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {(comments.length === visibleItems || activities.length === visibleItems) && (
                <div className="text-center pt-4 relative z-20">
                  <button
                    onClick={() => setVisibleItems(prev => prev + 20)}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full font-medium transition-colors"
                  >
                    Load earlier history
                  </button>
                </div>
              )}
            </div>

            {/* Comment Input Footer */}
            <div className="p-4 border-t border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] sticky bottom-0 z-10 transition-all">
              <div className="flex gap-2 items-end relative">
                {/* Mention Suggestions Popover */}
                {showMentions && (() => {
                  const filteredUsers = [
                    ...users.filter(u => {
                      if (!project) return true;
                      return (
                        u.id === project.projectManagerId ||
                        (project.assigneeIds && project.assigneeIds.includes(u.id))
                      );
                    }).map(u => ({ ...u, type: 'user', label: u.name || u.displayName })),
                    ...clients.filter(c => {
                      if (!project) return true;
                      return c.id === project.clientId;
                    }).map(c => ({ ...c, type: 'client', label: c.clientName }))
                  ].filter(u => u.label?.toLowerCase().includes(mentionQuery.toLowerCase()));

                  if (filteredUsers.length === 0) return null;

                  return (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-2xl border border-gray-100 [.dark_&]:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                        {filteredUsers.map((u, idx) => (
                          <button
                            key={`${u.type}-${u.id}`}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors ${idx === mentionIndex ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 [.dark_&]:hover:bg-white/5 text-gray-700 [.dark_&]:text-gray-200"}`}
                            onClick={() => {
                              const beforeMention = commentText.substring(0, commentText.lastIndexOf("@", cursorPosition - 1));
                              const afterMention = commentText.substring(cursorPosition);
                              const newText = `${beforeMention}@${u.label} ${afterMention}`;
                              setCommentText(newText);
                              setShowMentions(false);
                              setMentionQuery("");
                              // Move cursor to end of inserted mention
                              // Ideally we'd set input ref selection too
                            }}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === mentionIndex ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                              {u.label?.[0]}
                            </div>
                            <span className="truncate">{u.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <textarea
                  placeholder="Write a comment... (@ to mention)"
                  className="flex-1 min-h-[44px] max-h-[120px] p-3 bg-gray-50 [.dark_&]:bg-white/5 border border-gray-200 [.dark_&]:border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white [.dark_&]:focus:bg-[#181B2A] [.dark_&]:text-white transition-all resize-none shadow-inner"
                  value={commentText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCommentText(val);
                    setCursorPosition(e.target.selectionStart);

                    const lastAt = val.lastIndexOf("@", e.target.selectionStart - 1);
                    if (lastAt !== -1) {
                      const query = val.substring(lastAt + 1, e.target.selectionStart);
                      const charBeforeAt = lastAt > 0 ? val[lastAt - 1] : " ";

                      if (/\s/.test(charBeforeAt)) {
                        setMentionQuery(query);
                        setShowMentions(true);
                        setMentionIndex(0);
                      } else {
                        setShowMentions(false);
                      }
                    } else {
                      setShowMentions(false);
                    }
                  }}
                  onKeyDown={async (e) => {
                    if (showMentions) {
                      // ... mention nav logic ...
                      const filteredUsersList = [
                        ...users.filter(u => {
                          if (!project) return true;
                          return (u.id === project.projectManagerId || (project.assigneeIds && project.assigneeIds.includes(u.id)));
                        }).map(u => ({ ...u, type: 'user', label: u.name || u.displayName })),
                        ...clients.filter(c => {
                          if (!project) return true;
                          return c.id === project.clientId;
                        }).map(c => ({ ...c, type: 'client', label: c.clientName }))
                      ].filter(u => u.label?.toLowerCase().includes(mentionQuery.toLowerCase()));

                      if (filteredUsersList.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setMentionIndex(prev => (prev + 1) % filteredUsersList.length);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setMentionIndex(prev => (prev - 1 + filteredUsersList.length) % filteredUsersList.length);
                        } else if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const u = filteredUsersList[mentionIndex];
                          if (u) {
                            const beforeMention = commentText.substring(0, commentText.lastIndexOf("@", cursorPosition - 1));
                            const afterMention = commentText.substring(cursorPosition);
                            const newText = `${beforeMention}@${u.label} ${afterMention}`;
                            setCommentText(newText);
                            setShowMentions(false);
                            setMentionQuery("");
                          }
                        } else if (e.key === "Escape") {
                          setShowMentions(false);
                        }
                        return;
                      }
                    }

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
                  className={`p-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 ${buttonClass}`}
                >
                  <FaPaperPlane className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {
          showDeleteConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
              <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 [.dark_&]:text-white mb-2">Delete Task?</h3>
                <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mb-4">
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
          )
        }

        {/* Archive Confirmation Modal */}
        {
          showArchiveConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
              <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 [.dark_&]:text-white mb-2">Archive Task?</h3>
                <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mb-4">
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
          )
        }

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

import { useState, useEffect, useRef } from "react";
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
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import Button from "../../components/Button";
import CompletionCommentModal from "../../components/CompletionCommentModal";
import { LuAlarmClock } from "react-icons/lu";
import { FaStickyNote } from "react-icons/fa";


import {
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaChartLine,
  FaCalendarAlt,
  FaFileAlt,
  FaBell,

  FaThumbtack,
  FaPlus,
} from "react-icons/fa";
import { LuNotebookPen } from "react-icons/lu";
import toast from "react-hot-toast";

const EmployeeDashboard = () => {
  const { user, userData } = useAuthContext();
  const navigate = useNavigate();
  const { buttonClass, linkColor } = useThemeStyles();

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "No date";
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    // Check if date is valid
    if (isNaN(d.getTime())) return "No date";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    employeeName: "",
    reportDate: "",
    reportTime: "",
    reportContent: "",
  });
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reminderNotifications, setReminderNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(
    new Set()
  );
  const notificationRef = useRef(null);
  const quickMenusRef = useRef(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTask, setReminderTask] = useState(null);
  const [showQuickReminderMenu, setShowQuickReminderMenu] = useState(false);
  const [showQuickNotesMenu, setShowQuickNotesMenu] = useState(false);
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [quickNotes, setQuickNotes] = useState([]);
  const [editingQuickNoteId, setEditingQuickNoteId] = useState(null);
  const [quickReminders, setQuickReminders] = useState([]);
  const [showInlineReminderForm, setShowInlineReminderForm] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("");
  const [remDesc, setRemDesc] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);

  const isTaskExpired = (task) => {
    const created = task.createdAt;
    if (!created) return false;
    const createdDate = created?.toDate ? created.toDate() : new Date(created);
    const now = new Date();
    const diffMs = now - createdDate;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    return diffMs >= twelveHoursMs;
  };

  // Load employee quick notes from top-level notes collection (one doc per note)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notes"), where("userUid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          text: data.bodyText || data.text || data.title || "",
          isPinned: data.isPinned === true,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      const sorted = [...items].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const at = (a.updatedAt?.toMillis?.() || (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0) || 0) ||
          (a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) || 0);
        const bt = (b.updatedAt?.toMillis?.() || (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0) || 0) ||
          (b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) || 0);
        return bt - at;
      });
      setQuickNotes(sorted);
    }, (e) => {
      console.error("Failed to load quick notes", e);
    });
    return () => unsub();
  }, [user?.uid]);

  // Load quick reminders list for the popover preview
  useEffect(() => {
    if (!user?.uid) return;
    const qRem = query(
      collection(db, "reminders"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(qRem, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const ad = a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt);
        const bd = b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt);
        return ad - bd;
      });
      setQuickReminders(items);
    });
    return () => unsub();
  }, [user?.uid]);

  const formatDueTime = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday ? `Today at ${timeStr}` : `${d.toLocaleDateString()} at ${timeStr}`;
  };

  useEffect(() => {
    if (!user?.uid) {
      console.log("No user UID found");
      setLoading(false);
      return;
    }

    console.log("Fetching tasks for user:", user.uid);

    // Simplified query - fetch all tasks for this user
    const q = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Tasks fetched:", snapshot.docs.length);
        const taskData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            status:
              (doc.data().status === "In Review"
                ? "In Progress"
                : doc.data().status) || "To-Do",
          }))
          // Filter by assigneeType in client-side
          .filter((task) => task.assigneeType === "user")
          // Auto-expire tasks after 12 hours based on createdAt (server time)
          .filter((task) => !isTaskExpired(task));

        console.log("Tasks after filtering:", taskData.length);

        // Sort by dueDate in client
        taskData.sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
          return dateA - dateB;
        });
        setTasks(taskData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks. Please refresh the page.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch projects where employee has tasks
  useEffect(() => {
    if (!user?.uid || tasks.length === 0) {
      setProjects([]);
      return;
    }

    const projectIds = [
      ...new Set(tasks.map((t) => t.projectId).filter(Boolean)),
    ];

    if (projectIds.length === 0) {
      setProjects([]);
      return;
    }

    console.log("Fetching projects:", projectIds);

    const qProjects = query(
      collection(db, "projects"),
      where("__name__", "in", projectIds.slice(0, 10)) // Firestore 'in' limit
    );

    const unsubProjects = onSnapshot(
      qProjects,
      (snapshot) => {
        console.log("Projects fetched:", snapshot.docs.length);
        setProjects(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        console.error("Error fetching projects:", error);
      }
    );

    return () => unsubProjects();
  }, [user, tasks]);

  // Listen for due reminders with interval checking
  useEffect(() => {
    if (!user?.uid) return;

    const allRemindersRef = { current: [] };
    const shownToastsRef = { current: new Set() };

    // Helper function to format date as dd/mm/yyyy hh:mm:ss
    const formatDateTime = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Function to check and show due reminders
    const checkDueReminders = () => {
      const now = new Date();
      console.log('=== Checking reminders at:', formatDateTime(now));
      console.log('Total reminders loaded:', allRemindersRef.current.length);

      const due = allRemindersRef.current.filter((r) => {
        const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
        const isDue = dueAt <= now;
        const isNotRead = !r.isRead;
        const notShown = !shownToastsRef.current.has(r.id);

        console.log(`Reminder "${r.title}":`, {
          dueTime: formatDateTime(dueAt),
          currentTime: formatDateTime(now),
          isDue: isDue,
          isNotRead: isNotRead,
          notShownYet: notShown,
          willShow: isDue && isNotRead && notShown
        });

        return isDue && isNotRead && notShown;
      });

      console.log('Reminders to show:', due.length);

      // Show toast for each newly due reminder
      due.forEach((r) => {
        const toastId = `reminder-${r.id}`;
        shownToastsRef.current.add(r.id);
        const when = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
        const timeLabel = isNaN(when.getTime())
          ? ""
          : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        console.log('✅ Showing reminder toast:', r.title, 'at', timeLabel);

        toast.custom(
          (t) => (
            <div
              className={`
                pointer-events-auto w-72 max-w-xs transform transition-all duration-300
                ${t.visible ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"}
              `}
            >
              <div className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-xl p-[2px] shadow-lg">
                <div className="bg-white dark:!bg-[#1e1e2d] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0 max-h-16 overflow-y-auto">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-[11px] font-semibold text-indigo-600 dark:!text-indigo-400 tracking-wide uppercase">
                        Reminder
                      </div>
                      {timeLabel && (
                        <div className="ml-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                          {timeLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-900 dark:!text-white break-words leading-snug">
                      {r.title || "Untitled reminder"}
                    </div>
                    {r.description && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 break-words leading-snug">
                        {r.description}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteDoc(doc(db, "reminders", r.id));
                        shownToastsRef.current.delete(r.id);
                      } catch (e) {
                        console.error("Failed to delete reminder", e);
                      }
                      toast.dismiss(toastId);
                    }}
                    className="shrink-0 ml-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Dismiss reminder"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ),
          {
            id: toastId,
            duration: Infinity,
            position: "top-right",
          }
        );
      });

      // Update reminder notifications for the notification bell
      const notificationsPayload = due.map((r) => ({
        id: `reminder-${r.id}`,
        type: "reminder",
        title: "Reminder",
        message: r.title,
        reminderId: r.id,
        redirectTo: null,
      }));

      if (notificationsPayload.length > 0) {
        setReminderNotifications((prev) => [...prev, ...notificationsPayload]);
      }
    };

    // Listen to Firestore for reminder changes
    const q = query(
      collection(db, "reminders"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      allRemindersRef.current = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log('📥 Loaded reminders from Firestore:', allRemindersRef.current.length);
      allRemindersRef.current.forEach(r => {
        const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
        console.log(`  - "${r.title}" due at: ${formatDateTime(dueAt)}, isRead: ${r.isRead}`);
      });
      checkDueReminders();
    });

    // Check every 10 seconds for newly due reminders
    const intervalId = setInterval(checkDueReminders, 10000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [user]);



  // Calculate stats
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "Done").length,
    inProgressTasks: tasks.filter((t) => t.status === "In Progress").length,
    pendingTasks: tasks.filter((t) => t.status !== "Done").length,
    overdueTasks: tasks.filter((t) => {
      if (t.status === "Done") return false;
      const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
      return dueDate < new Date();
    }).length,
  };

  // Today's tasks
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    const dueDateStr = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
    return dueDateStr === todayStr && t.status !== "Done";
  });

  const upcomingTasks = tasks.filter((t) => t.status !== "Done").slice(0, 5);

  // Recent activity (last 7 days completed tasks)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCompletedTasks = tasks
    .filter((t) => {
      if (t.status !== "Done" || !t.completedAt) return false;
      const completedDate =
        t.completedAt?.toDate?.() || new Date(t.completedAt);
      return completedDate >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
      return dateB - dateA;
    })
    .slice(0, 5);

  // Performance metrics
  const completionRate =
    stats.totalTasks > 0
      ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
      : 0;

  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "High" && t.status !== "Done"
  ).length;

  // Quick mark as done handler
  const handleQuickComplete = (taskId) => {
    setCompletionTaskId(taskId);
    setShowCompletionModal(true);
  };

  const handleSubmitCompletion = async (comment) => {
    if (!completionTaskId) {
      setShowCompletionModal(false);
      return;
    }
    try {
      await updateDoc(doc(db, "tasks", completionTaskId), {
        status: "Done",
        completedAt: serverTimestamp(),
        completedBy: user?.uid || "",
        completedByType: "user",
        progressPercent: 100,
        ...(comment ? { completionComment: comment } : {}),
      });
      toast.success("Task marked as complete!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setShowCompletionModal(false);
      setCompletionTaskId(null);
    }
  };

  // Initialize report data when modal opens
  useEffect(() => {
    if (showReportModal) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");

      setReportData({
        employeeName: userData?.name || "Employee",
        reportDate: `${dd}/${mm}/${yyyy}`,
        reportTime: `${hh}:${min}`,
        reportContent: "",
      });
      setIsEditingReport(false);
    }
  }, [showReportModal, userData]);

  // Generate real-time notifications based on task data
  useEffect(() => {
    if (tasks.length === 0 && reminderNotifications.length === 0) return;

    const newNotifications = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check for overdue tasks
    const overdueTasks = tasks.filter((task) => {
      if (task.status === "Done") return false;
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      return dueDate < now;
    });

    overdueTasks.forEach((task) => {
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));

      newNotifications.push({
        id: `overdue-${task.id}`,
        type: "overdue",
        title: "Overdue Task",
        message: `"${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""
          } overdue`,
        taskId: task.id,
        redirectTo: "/employee/tasks?view=overdue",
      });
    });

    // Check for newly assigned tasks (assigned in last 24 hours)
    const newlyAssignedTasks = tasks.filter((task) => {
      if (!task.assignedDate) return false;
      const assignedDate =
        task.assignedDate?.toDate?.() || new Date(task.assignedDate);
      return assignedDate >= oneDayAgo && task.status !== "Done";
    });

    newlyAssignedTasks.forEach((task) => {
      newNotifications.push({
        id: `new-${task.id}`,
        type: "task",
        title: "New Task Assigned",
        message: `"${task.title}" has been assigned to you`,
        taskId: task.id,
        redirectTo: "/employee/tasks",
      });
    });

    // Merge with reminder notifications
    const allNotifications = [...newNotifications, ...reminderNotifications];

    // Filter out dismissed notifications
    const filteredNotifications = allNotifications.filter(
      (notification) => !dismissedNotifications.has(notification.id)
    );

    // Sort notifications by priority (overdue first, then reminders, then new tasks)
    filteredNotifications.sort((a, b) => {
      const priority = { overdue: 0, reminder: 1, task: 2 };
      return priority[a.type] - priority[b.type];
    });

    setNotifications(filteredNotifications);
  }, [tasks, reminderNotifications, dismissedNotifications]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  // Close quick menus (reminders/notes) when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        quickMenusRef.current &&
        !quickMenusRef.current.contains(event.target)
      ) {
        setShowQuickActionsMenu(false);
        setShowQuickReminderMenu(false);
        setShowQuickNotesMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (notification.type === "overdue" || notification.type === "task") {
      // For overdue and newly assigned tasks, redirect to task management with scroll to task
      navigate("/employee/tasks", {
        state: {
          highlightTaskId: notification.taskId,
        },
      });
    } else if (notification.type === "reminder") {
      // Mark as read
      try {
        await updateDoc(doc(db, "reminders", notification.reminderId), {
          isRead: true
        });
        toast.success("Reminder marked as read");
      } catch (e) {
        console.error("Error updating reminder", e);
      }
    } else {
      // For other notifications, use the original redirect
      if (notification.redirectTo) navigate(notification.redirectTo);
    }
    setShowNotifications(false);
  };

  // Remove individual notification
  const removeNotification = (notificationId, event) => {
    event.stopPropagation(); // Prevent notification click
    setDismissedNotifications((prev) => new Set([...prev, notificationId]));
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    );
    toast.success("Notification removed");
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    // Add all current notification IDs to dismissed notifications
    const currentNotificationIds = notifications.map((n) => n.id);
    setDismissedNotifications(
      (prev) => new Set([...prev, ...currentNotificationIds])
    );
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  // Generate Report handler - now opens modal
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  const handleSetReminder = (task, e) => {
    e.stopPropagation();
    setReminderTask(task);
    setShowReminderModal(true);
  };

  // Generate report content
  const generateReportContent = () => {
    setGeneratingReport(true);
    try {
      const content = `# Employee Performance Report

*Employee:* ${reportData.employeeName}
*Date:* ${reportData.reportDate}
*Time:* ${reportData.reportTime}

## Task Summary
- *Total Tasks:* ${stats.totalTasks}
- *Completed Tasks:* ${stats.completedTasks}
- *Pending Tasks:* ${stats.pendingTasks}
- *Today's Tasks:* ${todayTasks.length}
- *Overdue Tasks:* ${stats.overdueTasks}
- *High Priority Tasks:* ${highPriorityTasks}

## Performance Metrics
- *Completion Rate:* ${completionRate}%
- *Active Projects:* ${projects.length}

## Recent Activity
${recentCompletedTasks.length > 0
          ? recentCompletedTasks.map((task) => `- ${task.title}`).join("\n")
          : "- No recent completed tasks"
        }

## Today's Focus
${todayTasks.length > 0
          ? todayTasks
            .map((task) => `- ${task.title} (${task.priority} Priority)`)
            .join("\n")
          : "- No tasks due today"
        }

---
*Generated on: ${formatDateToDDMMYYYY(
          new Date()
        )} at ${new Date().toLocaleTimeString()}*`;

      setReportData((prev) => ({ ...prev, reportContent: content }));
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Save report
  const saveReport = () => {
    setSavingReport(true);
    try {
      const blob = new Blob([reportData.reportContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee-report-${reportData.reportDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Report saved and downloaded!");
      setShowReportModal(false);
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
    } finally {
      setSavingReport(false);
    }
  };

  console.log("Render state:", {
    loading,
    tasksCount: tasks.length,
    user: user?.uid,
    userData: userData?.name,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading your dashboard..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Please log in" />
        <Card>
          <p className="text-center py-8 text-gray-500">
            No user found. Please log in again.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Header with Notification Bell */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageHeader
            title={`Welcome, ${userData?.name || "Employee"}!`}
            description="Overview of your tasks and activities"
          />
        </div>
        <div className="flex items-center gap-2" ref={notificationRef}>
          <div className="relative flex items-center gap-1" ref={quickMenusRef}>
            <button
              type="button"
              onClick={() => {
                setShowQuickActionsMenu((v) => !v);
                setShowQuickReminderMenu(false);
                setShowQuickNotesMenu(false);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Quick actions"
            >
              <LuNotebookPen className="h-4 w-4" />
            </button>
            {showQuickActionsMenu && (
              <div className="absolute right-0 top-9 z-30 w-44 rounded-lg bg-white dark:bg-[#1e1e2d] shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickReminderMenu(true);
                    setShowQuickNotesMenu(false);
                    setShowQuickActionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                >
                  <LuAlarmClock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Reminders</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickNotesMenu(true);
                    setShowQuickReminderMenu(false);
                    setShowQuickActionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2"
                >
                  <FaStickyNote className="h-3.5 w-3.5 text-yellow-500" />
                  <span>Notes</span>
                </button>
              </div>
            )}

            {showQuickReminderMenu && (
              <div className="absolute right-0 top-11 z-20 w-72 rounded-lg bg-white dark:bg-[#1e1e2d] shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-800 dark:text-white">Quick Reminders</div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showInlineReminderForm) {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, "0");
                        const dd = String(now.getDate()).padStart(2, "0");
                        setRemDate(`${yyyy}-${mm}-${dd}`);
                        const next = new Date(now.getTime() + 60 * 60 * 1000);
                        const hh = String(next.getHours()).padStart(2, "0");
                        const min = String(next.getMinutes()).padStart(2, "0");
                        setRemTime(`${hh}:${min}`);
                      }
                      setShowInlineReminderForm((v) => !v);
                      setEditingReminderId(null);
                      setRemTitle("");
                      setRemDesc("");
                    }}
                    className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${linkColor}`}
                    title="Add reminder"
                  >
                    <FaPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {showInlineReminderForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!user?.uid) {
                        toast.error("User not ready. Please wait a moment and try again.");
                        return;
                      }
                      if (!remTitle || !remDate || !remTime) {
                        toast.error("Please fill in title, date and time");
                        return;
                      }
                      try {
                        setSavingReminder(true);
                        const dueAt = new Date(`${remDate}T${remTime}`);
                        if (editingReminderId) {
                          await updateDoc(doc(db, "reminders", editingReminderId), {
                            title: remTitle,
                            description: remDesc,
                            dueAt,
                            updatedAt: serverTimestamp(),
                          });
                          toast.success("Reminder updated!");
                        } else {
                          await addDoc(collection(db, "reminders"), {
                            userId: user.uid,
                            title: remTitle,
                            description: remDesc,
                            dueAt,
                            status: "pending",
                            isRead: false,
                            createdAt: serverTimestamp(),
                          });
                          toast.success("Reminder set successfully!");
                        }
                        setShowInlineReminderForm(false);
                        setRemTitle("");
                        setRemDesc("");
                        setEditingReminderId(null);
                      } catch (err) {
                        console.error("Failed to save reminder", err);
                        toast.error("Failed to save reminder");
                      } finally {
                        setSavingReminder(false);
                      }
                    }}
                    className="mb-3 space-y-2 border border-gray-100 rounded-md p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <input
                      type="text"
                      className="w-full rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Reminder title"
                      value={remTitle}
                      onChange={(e) => setRemTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        value={remDate}
                        onChange={(e) => setRemDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className="rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        value={remTime}
                        onChange={(e) => setRemTime(e.target.value)}
                      />
                    </div>
                    <textarea
                      rows={2}
                      className="w-full rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Description (optional)"
                      value={remDesc}
                      onChange={(e) => setRemDesc(e.target.value)}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                        onClick={() => {
                          setShowInlineReminderForm(false);
                          setEditingReminderId(null);
                        }}
                        disabled={savingReminder}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-2 py-1 text-xs rounded-md text-white disabled:opacity-50 ${buttonClass}`}
                        disabled={savingReminder}
                      >
                        {savingReminder ? "Saving..." : editingReminderId ? "Update" : "Save"}
                      </button>
                    </div>
                  </form>
                )}
                {quickReminders.length === 0 ? (
                  <div className="text-xs text-gray-400">No reminders yet.</div>
                ) : (
                  <ul className="space-y-2 text-gray-700 dark:text-white max-h-60 overflow-y-auto">
                    {quickReminders.slice(0, 5).map((r) => (
                      <li
                        key={r.id}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="mt-1">•</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{r.title}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {formatDueTime(r.dueAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                            title="Edit reminder"
                            onClick={() => {
                              setShowInlineReminderForm(true);
                              setEditingReminderId(r.id);
                              setRemTitle(r.title || "");
                              setRemDesc(r.description || "");
                              const d = r.dueAt?.toDate
                                ? r.dueAt.toDate()
                                : new Date(r.dueAt);
                              const yyyy = d.getFullYear();
                              const mm = String(d.getMonth() + 1).padStart(2, "0");
                              const dd = String(d.getDate()).padStart(2, "0");
                              const hh = String(d.getHours()).padStart(2, "0");
                              const min = String(d.getMinutes()).padStart(2, "0");
                              setRemDate(`${yyyy}-${mm}-${dd}`);
                              setRemTime(`${hh}:${min}`);
                            }}
                          >
                            <span className="sr-only">Edit</span>
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                              <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600"
                            title="Delete reminder"
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, "reminders", r.id));
                              } catch (e) {
                                console.error("Failed to delete reminder", e);
                              }
                            }}
                          >
                            <span className="sr-only">Delete</span>
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1z"
                                clipRule="evenodd"
                              />
                              <path d="M4 5h12v2H4z" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {showQuickNotesMenu && (
              <div className="absolute right-0 top-11 z-20 w-72 rounded-lg bg-white dark:bg-[#1e1e2d] shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white">Quick Notes</div>
                  <div className="flex items-center gap-2">
                    {quickNotes.length > 0 && (
                      <span className="text-xs text-gray-400">{quickNotes.length} {quickNotes.length === 1 ? "Note" : "Notes"}</span>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const value = quickNoteDraft.trim();
                        if (!value || !user?.uid) return;
                        try {
                          if (editingQuickNoteId) {
                            await updateDoc(doc(db, "notes", editingQuickNoteId), {
                              title: value,
                              bodyText: value,
                              updatedAt: serverTimestamp(),
                            });
                          } else {
                            await addDoc(collection(db, "notes"), {
                              title: value,
                              bodyText: value,
                              category: "General",
                              color: "Yellow",
                              isPinned: false,
                              userUid: user.uid,
                              userEmail: user?.email || "",
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                            });
                          }

                          // Reload notes for this user
                          const q = query(collection(db, "notes"), where("userUid", "==", user.uid));
                          const snap = await getDocs(q);
                          const items = snap.docs.map((d) => {
                            const data = d.data() || {};
                            return {
                              id: d.id,
                              text: data.bodyText || data.text || data.title || "",
                              isPinned: data.isPinned === true,
                              createdAt: data.createdAt || null,
                              updatedAt: data.updatedAt || null,
                            };
                          });
                          const sorted = [...items].sort((a, b) => {
                            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                            const at = (a.updatedAt?.toMillis?.() || (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0) || 0) ||
                              (a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) || 0);
                            const bt = (b.updatedAt?.toMillis?.() || (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0) || 0) ||
                              (b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) || 0);
                            return bt - at;
                          });
                          setQuickNotes(sorted);
                          setQuickNoteDraft("");
                          setEditingQuickNoteId(null);
                        } catch (e) {
                          console.error("Failed to save quick note", e);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-white text-[10px] font-medium disabled:opacity-50 ${buttonClass}`}
                      disabled={!quickNoteDraft.trim()}
                    >
                      {editingQuickNoteId ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Write a note..."
                  value={quickNoteDraft}
                  onChange={(e) => setQuickNoteDraft(e.target.value)}
                />
                <div className="mt-1 text-xs text-gray-400">
                  {editingQuickNoteId ? "Editing existing note" : "Saved to your account"}
                </div>

                {quickNotes.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-2 max-h-40 overflow-y-auto space-y-2">
                    {quickNotes.map((note) => (
                      <div
                        key={note.id}
                        className="group flex items-start justify-between gap-2 rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5"
                      >
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug flex-1 whitespace-pre-wrap break-all">
                          {note.isPinned && (
                            <span className="inline-flex items-center gap-1 text-amber-600 mr-1 align-top">
                              <FaThumbtack className="h-3 w-3" />
                            </span>
                          )}
                          {note.text}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextPinned = !note.isPinned;
                              try {
                                await updateDoc(doc(db, "notes", note.id), {
                                  isPinned: nextPinned,
                                  updatedAt: serverTimestamp(),
                                });
                                setQuickNotes((prev) => {
                                  const updated = prev.map((n) =>
                                    n.id === note.id ? { ...n, isPinned: nextPinned } : n
                                  );
                                  return [...updated].sort((a, b) => {
                                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                                    const at = (a.updatedAt?.toMillis?.() || (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0) || 0) ||
                                      (a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) || 0);
                                    const bt = (b.updatedAt?.toMillis?.() || (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0) || 0) ||
                                      (b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) || 0);
                                    return bt - at;
                                  });
                                });
                              } catch (err) {
                                console.error("Failed to toggle pin", err);
                              }
                            }}
                            className={`p-1 rounded hover:bg-gray-200 ${note.isPinned ? "text-amber-600" : "text-gray-400 hover:text-gray-600"}`}
                            title={note.isPinned ? "Unpin note" : "Pin note"}
                          >
                            <FaThumbtack className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickNoteDraft(note.text);
                              setEditingQuickNoteId(note.id);
                            }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800"
                            title="Edit note"
                          >
                            <span className="sr-only">Edit</span>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                              <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!user?.uid) return;
                              try {
                                await deleteDoc(doc(db, "notes", note.id));
                                setQuickNotes((prev) => prev.filter((n) => n.id !== note.id));
                                if (editingQuickNoteId === note.id) {
                                  setEditingQuickNoteId(null);
                                  setQuickNoteDraft("");
                                }
                              } catch (e) {
                                console.error("Failed to delete quick note", e);
                              }
                            }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600"
                            title="Delete note"
                          >
                            <span className="sr-only">Delete</span>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1z"
                                clipRule="evenodd"
                              />
                              <path d="M4 5h12v2H4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <FaBell className="h-6 w-6" />
              {/* Notification Badge */}
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1e1e2d] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer relative group"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {notification.type === "task" && (
                                <FaTasks className="h-4 w-4 text-blue-500 mt-1" />
                              )}
                              {notification.type === "overdue" && (
                                <FaExclamationTriangle className="h-4 w-4 text-red-500 mt-1" />
                              )}
                              {notification.type === "reminder" && (
                                <FaBell className="h-4 w-4 text-indigo-500 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-8">
                              <p className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            {/* Individual Remove Button - For all notifications */}
                            <button
                              onClick={(e) =>
                                removeNotification(notification.id, e)
                              }
                              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove notification"
                            >
                              <svg
                                className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={clearAllNotifications}
                      className="w-full text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 py-2 px-3 rounded-md transition-colors"
                    >
                      Clear All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Reordered: Today's Tasks, Pending Tasks, Completed Tasks, Generate Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          className="cursor-pointer"
          onClick={() => navigate("/employee/tasks?view=today")}
        >
          <StatCard
            icon={<FaCalendarAlt className="h-5 w-5" />}
            label="Today's Tasks"
            value={String(todayTasks.length)}
            color="indigo"
          />
        </div>
        <div
          className="cursor-pointer"
          onClick={() => navigate("/employee/tasks?status=pending")}
        >
          <StatCard
            icon={<FaClock className="h-5 w-5" />}
            label="Pending Tasks"
            value={String(stats.pendingTasks)}
            color="amber"
          />
        </div>
        <div
          className="cursor-pointer"
          onClick={() => navigate("/employee/tasks?status=Done")}
        >
          <StatCard
            icon={<FaCheckCircle className="h-5 w-5" />}
            label="Completed Tasks"
            value={String(stats.completedTasks)}
            color="green"
          />
        </div>
        <div
          className="cursor-pointer hover:transform hover:scale-105 transition-transform duration-200"
          onClick={handleGenerateReport}
        >
          <StatCard
            icon={<FaFileAlt className="h-5 w-5" />}
            label="Generate Report"
            value="📋"
            color="sky"
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <Card className="dark:bg-[#1e1e2d] dark:text-white dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" />
          Performance Overview
        </h3>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-300">Task Completion Rate</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-xs text-blue-700 dark:text-blue-100">Active Projects</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-white">
                {projects.length}
              </div>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
              <div className="text-xs text-yellow-700 dark:text-yellow-100">Due Today</div>
              <div className="text-2xl font-bold text-yellow-900 dark:text-white">
                {todayTasks.length}
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              <div className="text-xs text-red-700 dark:text-red-100">High Priority</div>
              <div className="text-2xl font-bold text-red-900 dark:text-white">
                {highPriorityTasks}
              </div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="text-xs text-purple-700 dark:text-purple-100">This Week</div>
              <div className="text-2xl font-bold text-purple-900 dark:text-white">
                {recentCompletedTasks.length}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Three Column Layout - Upcoming Tasks, Reminders, Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card className="dark:bg-[#1e1e2d] dark:text-white dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
            <Button
              onClick={() => navigate("/employee/tasks")}
              variant="ghost"
              className="text-sm"
            >
              View All →
            </Button>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
              <p className="text-gray-500">No pending tasks. Great job! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingTasks.map((task) => {
                const dueDate =
                  task.dueDate?.toDate?.() || new Date(task.dueDate);
                const isOverdue = dueDate < new Date();

                const priorityColors = {
                  High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
                  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
                  Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
                };

                const statusColors = {
                  "To-Do": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                  Done: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                };

                return (
                  <div
                    key={task.id}
                    className={`border-l-4 rounded-lg p-4 hover:shadow-md transition-shadow ${priorityColors[task.priority]
                      ?.replace("bg-", "border-")
                      .split(" ")[0] || "border-gray-300"
                      } bg-white dark:bg-[#1F2234] border border-gray-200 dark:border-gray-700`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status] || statusColors["To-Do"]
                              }`}
                          >
                            {task.status}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority] ||
                              priorityColors.Medium
                              }`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`text-xs ${isOverdue
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-gray-500 dark:text-gray-400"
                              }`}
                          >
                            {formatDateToDDMMYYYY(dueDate)}
                            {isOverdue && " (Overdue!)"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleSetReminder(task, e)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors shrink-0"
                          title="Set Reminder"
                        >
                          <FaBell />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>



        {/* Recent Activity */}
        <Card className="dark:bg-[#1e1e2d] dark:text-white dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {recentCompletedTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaClock className="text-gray-400 text-4xl mx-auto mb-2" />
              <p className="text-gray-500">
                No recent activity in the last 7 days
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentCompletedTasks.map((task) => {
                const completedDate =
                  task.completedAt?.toDate?.() || new Date(task.completedAt);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg"
                  >
                    <FaCheckCircle className="text-green-600 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Completed {formatDateToDDMMYYYY(completedDate)}
                        </span>
                        {task.priority && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Today's Focus */}
      {todayTasks.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 dark:text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-600" />
            Today's Focus ({todayTasks.length}{" "}
            {todayTasks.length === 1 ? "task" : "tasks"} due today)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayTasks.slice(0, 4).map((task) => {
              const priorityColors = {
                High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                Medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
                Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
              };

              return (
                <div
                  key={task.id}
                  className="p-3 bg-white dark:bg-[#1F2234] rounded-lg border-2 border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </h4>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority] || priorityColors.Medium
                          }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        onClick={(e) => handleSetReminder(task, e)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-amber-600 hover:bg-amber-50 px-2"
                        title="Set Reminder"
                      >
                        <FaBell />
                      </Button>
                      <Button
                        onClick={() => handleQuickComplete(task.id)}
                        size="sm"
                      >
                        ✓
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {todayTasks.length > 4 && (
            <div className="text-center mt-3">
              <Button
                onClick={() => navigate("/employee/tasks")}
                variant="outline"
                size="sm"
              >
                View all {todayTasks.length} tasks →
              </Button>
            </div>
          )}
        </Card>
      )}
      <CompletionCommentModal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletionTaskId(null);
        }}
        onSubmit={handleSubmitCompletion}
        title="Add Completion Comment"
        confirmLabel="Complete Task"
      />

      {/* Report Generation Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white dark:bg-[#1e1e2d] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FaFileAlt className="h-5 w-5 text-indigo-600" />
                Generate Performance Report
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={reportData.employeeName}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      employeeName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                  spellCheck="true"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Date
                </label>
                <input
                  type="date"
                  value={reportData.reportDate}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      reportDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Time
                </label>
                <input
                  type="time"
                  value={reportData.reportTime}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      reportTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                onClick={generateReportContent}
                disabled={generatingReport}
                className="flex items-center gap-2"
              >
                {generatingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileAlt className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditingReport(!isEditingReport)}
                disabled={!reportData.reportContent}
              >
                {isEditingReport ? "Stop Editing" : "Edit"}
              </Button>
              <Button
                variant="secondary"
                onClick={saveReport}
                disabled={!reportData.reportContent || savingReport}
              >
                {savingReport ? "Saving..." : "Save"}
              </Button>
            </div>

            {/* Report Preview */}
            {reportData.reportContent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Preview
                </label>
                {isEditingReport ? (
                  <textarea
                    value={reportData.reportContent}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        reportContent: e.target.value,
                      }))
                    }
                    className="w-full h-96 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                    placeholder="Report content will appear here..."
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-96 overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {reportData.reportContent}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminder functionality is now handled inline */}
    </div>
  );
};

export default EmployeeDashboard;

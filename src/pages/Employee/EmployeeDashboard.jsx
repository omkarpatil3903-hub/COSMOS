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
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import Button from "../../components/Button";
import CompletionCommentModal from "../../components/CompletionCommentModal";

import RemindersList from "../../components/Reminders/RemindersList";
import AddReminderModal from "../../components/Reminders/AddReminderModal";
import {
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaChartLine,
  FaCalendarAlt,
  FaFileAlt,
  FaBell,
  FaStickyNote,
  FaThumbtack,
} from "react-icons/fa";
import { LuNotebookPen } from "react-icons/lu";
import toast from "react-hot-toast";

const EmployeeDashboard = () => {
  const { user, userData } = useAuthContext();
  const navigate = useNavigate();

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
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTask, setReminderTask] = useState(null);
  const [showQuickReminderMenu, setShowQuickReminderMenu] = useState(false);
  const [showQuickNotesMenu, setShowQuickNotesMenu] = useState(false);
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [quickNotes, setQuickNotes] = useState([]);
  const [editingQuickNoteId, setEditingQuickNoteId] = useState(null);

  // Load employee quick notes from top-level notes collection (one doc per note)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notes"), where("userUid", "==", user.uid));
    const load = async () => {
      try {
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
      } catch (e) {
        console.error("Failed to load quick notes", e);
      }
    };
    load();
  }, [user?.uid]);

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
          .filter((task) => task.assigneeType === "user");

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

  // Listen for due reminders
  useEffect(() => {
    if (!user?.uid) return;

    // We fetch all pending reminders and filter client-side for "due" ones
    // to avoid complex composite indexes for now, or we can just query by status
    const q = query(
      collection(db, "reminders"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const due = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => {
          const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
          return dueAt <= now && !r.isRead;
        })
        .map(r => ({
          id: `reminder-${r.id}`,
          type: "reminder",
          title: "Reminder Due",
          message: r.title,
          reminderId: r.id,
          redirectTo: null // Or open a modal?
        }));

      setReminderNotifications(due);
    });

    return () => unsubscribe();
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
              className="h-32 bg-gray-200 animate-pulse rounded-lg"
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
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowQuickActionsMenu((v) => !v);
                setShowQuickReminderMenu(false);
                setShowQuickNotesMenu(false);
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Quick actions"
            >
              <LuNotebookPen className="h-4 w-4" />
            </button>
            {showQuickActionsMenu && (
              <div className="absolute right-0 top-9 z-30 w-40 rounded-lg bg-white shadow-lg border border-gray-200 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickReminderMenu(true);
                    setShowQuickNotesMenu(false);
                    setShowQuickActionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                >
                  Reminders
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickNotesMenu(true);
                    setShowQuickReminderMenu(false);
                    setShowQuickActionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 border-t border-gray-100"
                >
                  Notes
                </button>
              </div>
            )}

            {showQuickReminderMenu && (
              <div className="absolute right-0 top-11 z-20 w-64 rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-sm">
                <div className="font-semibold mb-2 text-gray-800">
                  Quick Reminders
                </div>
                <ul className="space-y-1 text-gray-600">
                  <li>• Check today's tasks.</li>
                  <li>• Review overdue items.</li>
                  <li>• Plan tomorrow's priorities.</li>
                </ul>
              </div>
            )}

            {showQuickNotesMenu && (
              <div className="absolute right-0 top-11 z-20 w-72 rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">Quick Notes</div>
                  <div className="flex items-center gap-2">
                    {quickNotes.length > 0 && (
                      <span className="text-xs text-gray-400">{quickNotes.length} saved</span>
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
                      className="px-2 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-700 disabled:opacity-50"
                      disabled={!quickNoteDraft.trim()}
                    >
                      {editingQuickNoteId ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="group flex items-start justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
                      >
                        <p className="text-xs text-gray-700 leading-snug flex-1 whitespace-pre-wrap break-all">
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
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
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
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group"
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
                              <p className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            {/* Individual Remove Button - For all notifications */}
                            <button
                              onClick={(e) =>
                                removeNotification(notification.id, e)
                              }
                              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove notification"
                            >
                              <svg
                                className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
                  <div className="p-3 border-t border-gray-200">
                    <button
                      onClick={clearAllNotifications}
                      className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 py-2 px-3 rounded-md transition-colors"
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
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" />
          Performance Overview
        </h3>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Task Completion Rate</span>
              <span className="font-semibold text-gray-900">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-700">Active Projects</div>
              <div className="text-2xl font-bold text-blue-900">
                {projects.length}
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-xs text-yellow-700">Due Today</div>
              <div className="text-2xl font-bold text-yellow-900">
                {todayTasks.length}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xs text-red-700">High Priority</div>
              <div className="text-2xl font-bold text-red-900">
                {highPriorityTasks}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-xs text-purple-700">This Week</div>
              <div className="text-2xl font-bold text-purple-900">
                {recentCompletedTasks.length}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Three Column Layout - Upcoming Tasks, Reminders, Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card>
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
                  High: "bg-red-100 text-red-800 border-red-200",
                  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
                  Low: "bg-green-100 text-green-800 border-green-200",
                };

                const statusColors = {
                  "To-Do": "bg-gray-100 text-gray-800",
                  "In Progress": "bg-blue-100 text-blue-800",
                  Done: "bg-green-100 text-green-800",
                };

                return (
                  <div
                    key={task.id}
                    className={`border-l-4 rounded-lg p-4 hover:shadow-md transition-shadow ${priorityColors[task.priority]
                      ?.replace("bg-", "border-")
                      .split(" ")[0] || "border-gray-300"
                      } bg-white border border-gray-200`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
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
                              ? "text-red-600 font-semibold"
                              : "text-gray-500"
                              }`}
                          >
                            {formatDateToDDMMYYYY(dueDate)}
                            {isOverdue && " (Overdue!)"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleSetReminder(task, e)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors shrink-0"
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

        {/* Reminders Widget */}
        <RemindersList />

        {/* Recent Activity */}
        <Card>
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
                    className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg"
                  >
                    <FaCheckCircle className="text-green-600 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          Completed {formatDateToDDMMYYYY(completedDate)}
                        </span>
                        {task.priority && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white text-gray-700 border border-gray-200">
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
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-600" />
            Today's Focus ({todayTasks.length}{" "}
            {todayTasks.length === 1 ? "task" : "tasks"} due today)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayTasks.slice(0, 4).map((task) => {
              const priorityColors = {
                High: "bg-red-100 text-red-800 border-red-200",
                Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
                Low: "bg-green-100 text-green-800 border-green-200",
              };

              return (
                <div
                  key={task.id}
                  className="p-3 bg-white rounded-lg border-2 border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaFileAlt className="h-5 w-5 text-indigo-600" />
                Generate Performance Report
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
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

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  spellCheck="true"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full h-96 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="Report content will appear here..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 h-96 overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none"
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

      {/* Add Reminder Modal */}
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

export default EmployeeDashboard;

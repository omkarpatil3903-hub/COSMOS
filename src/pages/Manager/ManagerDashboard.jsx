/**
 * Manager Dashboard Page
 * Shows only data relevant to the current manager:
 * - Only their managed projects
 * - Only team members assigned to their projects
 * - Only tasks from their projects
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, doc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { useAuthContext } from "../../context/useAuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import {
    FaProjectDiagram,
    FaTasks,
    FaUsers,
    FaCheckCircle,
    FaClock,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaChartLine,
    FaArrowRight,
    FaBell,
    FaStickyNote,
    FaThumbtack,
    FaPlus,
} from "react-icons/fa";
import { LuNotebookPen, LuAlarmClock } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import toast from "react-hot-toast";
import StatCard from "../../components/StatCard";
import TeamMembersModal from "../../components/TeamMembersModal";

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const { userData } = useAuthContext();
    const { accent } = useTheme();
    const { buttonClass, linkColor, iconColor } = useThemeStyles();
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Quick menus state
    const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
    const [showQuickReminderMenu, setShowQuickReminderMenu] = useState(false);
    const [showQuickNotesMenu, setShowQuickNotesMenu] = useState(false);
    const [quickNotes, setQuickNotes] = useState([]);
    const [noteInput, setNoteInput] = useState("");
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [quickReminders, setQuickReminders] = useState([]);
    const [showInlineReminderForm, setShowInlineReminderForm] = useState(false);
    const [remTitle, setRemTitle] = useState("");
    const [remDate, setRemDate] = useState("");
    const [remTime, setRemTime] = useState("");
    const [remDesc, setRemDesc] = useState("");
    const [savingReminder, setSavingReminder] = useState(false);
    const [editingReminderId, setEditingReminderId] = useState(null);
    const quickMenusRef = useRef(null);

    // Notifications state
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [reminderNotifications, setReminderNotifications] = useState([]);
    const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
    const notificationRef = useRef(null);
    const [showTeamModal, setShowTeamModal] = useState(false);

    // Get current user's managed projects
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const q = query(
            collection(db, "projects"),
            where("projectManagerId", "==", currentUser.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    assigneeIds: data.assigneeIds || [],
                    startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || null),
                    endDate: data.endDate?.toDate ? data.endDate.toDate() : (data.endDate || null),
                };
            });
            setProjects(list);
        });

        return () => unsub();
    }, []);

    // Get all users for team display
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setUsers(list);
        });
        return () => unsub();
    }, []);

    // Get tasks for managed projects
    // Helper to safely parse dates
    const parseDate = (dateInput) => {
        if (!dateInput) return null;
        try {
            // Handle Firestore Timestamp
            if (dateInput.toDate && typeof dateInput.toDate === 'function') {
                return dateInput.toDate();
            }
            // Handle String or Date
            const d = new Date(dateInput);
            if (!isNaN(d.getTime())) return d;
            return null;
        } catch (e) {
            console.error("Date parsing error:", dateInput, e);
            return null;
        }
    };

    useEffect(() => {
        if (!projects.length) {
            setLoading(false);
            return;
        }

        const projectIds = projects.map((p) => p.id);

        // Firestore 'in' query has a limit of 10, so we fetch all and filter
        const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
            const allTasks = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    // Use helper to ensure we get a Date object or null
                    dueDate: parseDate(data.dueDate),
                };
            });
            const filtered = allTasks.filter((t) => projectIds.includes(t.projectId));

            // Overdue Debug Log
            console.log("Found Tasks:", filtered.length);
            filtered.forEach(t => {
                const status = (t.status || "").toLowerCase();
                const due = t.dueDate;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let isOver = false;
                if (due) {
                    const d = new Date(due);
                    d.setHours(0, 0, 0, 0);
                    isOver = d < today;
                }

                // console.log(`Task [${t.title}]: Status=${t.status}, Due=${due}, IsOver=${isOver}`);
            });

            setTasks(filtered);
            setLoading(false);
        });

        return () => unsub();
    }, [projects]);

    // Get team members grouped by project
    const projectTeams = useMemo(() => {
        return projects.map((project) => {
            const members = users.filter((u) => (project.assigneeIds || []).includes(u.id));
            return {
                id: project.id,
                name: project.projectName || project.name || "Untitled Project",
                members
            };
        });
    }, [projects, users]);

    // Keep flat list for stats if needed, or derive from projectTeams
    const teamMembers = useMemo(() => {
        const uniqueIds = new Set();
        projectTeams.forEach(p => p.members.forEach(m => uniqueIds.add(m.id)));
        return users.filter(u => uniqueIds.has(u.id));
    }, [projectTeams, users]);

    // Compute stats
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        const completedProjects = projects.filter((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            if (!projectTasks.length) return false;
            const done = projectTasks.filter((t) =>
                ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
            ).length;
            return done === projectTasks.length;
        }).length;

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) =>
            ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
        ).length;
        const inProgressTasks = tasks.filter((t) =>
            ["in progress", "in-progress"].includes((t.status || "").toLowerCase())
        ).length;
        const overdueTasks = tasks.filter((t) => {
            const status = (t.status || "").toLowerCase();
            if (["done", "completed", "complete"].includes(status)) return false;

            // Robust date parsing
            let dueDate = null;
            if (t.dueDate?.toDate) {
                dueDate = t.dueDate.toDate();
            } else if (t.dueDate) {
                dueDate = new Date(t.dueDate);
            }

            // Check if invalid date
            if (!dueDate || isNaN(dueDate.getTime())) return false;

            // Normalize to start of day for fair comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);

            const isOver = due < today;
            // console.log(`Task: ${t.title}, Status: ${status}, Due: ${due.toISOString()}, Today: ${today.toISOString()}, Overdue: ${isOver}`);
            return isOver;
        }).length;

        // console.log("Manager Stats Debug:", { totalProjects, totalTasks, overdueTasks, sampleTask: tasks[0] });

        const teamSize = teamMembers.length;

        return {
            totalProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            teamSize,
        };
    }, [projects, tasks, teamMembers]);

    // Get upcoming deadlines
    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return tasks
            .filter((t) => {
                if (!t.dueDate) return false;
                const status = (t.status || "").toLowerCase();
                if (["done", "completed", "complete"].includes(status)) return false;
                return t.dueDate >= now && t.dueDate <= nextWeek;
            })
            .sort((a, b) => a.dueDate - b.dueDate)
            .slice(0, 5);
    }, [tasks]);

    // Recent projects with progress
    const projectsWithProgress = useMemo(() => {
        return projects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const total = projectTasks.length;
            const done = projectTasks.filter((t) =>
                ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
            ).length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return { ...p, progress, taskCount: total, completedTasks: done };
        });
    }, [projects, tasks]);

    // Load quick notes
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const q = query(collection(db, "notes"), where("userUid", "==", currentUser.uid));
        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() || new Date(),
                updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
            }));
            const sorted = items.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return b.updatedAt - a.updatedAt;
            });
            setQuickNotes(sorted);
        }, (e) => {
            console.error("Failed to load notes", e);
        });
        return () => unsub();
    }, []);

    // Load quick reminders
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const q = query(
            collection(db, "reminders"),
            where("userId", "==", currentUser.uid),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
                const ad = a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt);
                const bd = b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt);
                return ad - bd;
            });
            setQuickReminders(items);
        });
        return () => unsub();
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (quickMenusRef.current && !quickMenusRef.current.contains(event.target)) {
                setShowQuickActionsMenu(false);
                setShowQuickReminderMenu(false);
                setShowQuickNotesMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
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

    // Listen for due reminders with interval checking
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const allRemindersRef = { current: [] };
        const shownToastsRef = { current: new Set() };

        // Function to check and show due reminders
        const checkDueReminders = () => {
            const now = new Date();
            const due = allRemindersRef.current.filter((r) => {
                const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
                return dueAt <= now && !r.isRead && !shownToastsRef.current.has(r.id);
            });

            // Show custom toast for each newly due reminder
            due.forEach((r) => {
                const toastId = `reminder-${r.id}`;
                shownToastsRef.current.add(r.id);
                const when = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
                const timeLabel = isNaN(when.getTime())
                    ? ""
                    : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                console.log('Showing reminder toast:', r.title, 'at', timeLabel); // Debug log

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
            where("userId", "==", currentUser.uid),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            allRemindersRef.current = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            console.log('Loaded reminders:', allRemindersRef.current.length); // Debug log
            checkDueReminders();
        });

        // Check every 10 seconds for newly due reminders
        const intervalId = setInterval(checkDueReminders, 10000);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, []);

    // Generate real-time notifications based on task and project data
    useEffect(() => {
        if (tasks.length === 0 && projects.length === 0 && reminderNotifications.length === 0) return;

        const newNotifications = [];
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Check for overdue tasks in managed projects
        const overdueTasks = tasks.filter((task) => {
            if (["done", "completed", "complete"].includes((task.status || "").toLowerCase())) return false;
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
                message: `"${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`,
                taskId: task.id,
                redirectTo: "/manager/tasks",
            });
        });

        // Check for newly created tasks (created in last 24 hours)
        const newlyCreatedTasks = tasks.filter((task) => {
            if (!task.createdAt) return false;
            const createdDate = task.createdAt?.toDate?.() || new Date(task.createdAt);
            return createdDate >= oneDayAgo && !["done", "completed", "complete"].includes((task.status || "").toLowerCase());
        });

        newlyCreatedTasks.forEach((task) => {
            newNotifications.push({
                id: `new-task-${task.id}`,
                type: "task",
                title: "New Task Created",
                message: `"${task.title}" has been created in your project`,
                taskId: task.id,
                redirectTo: "/manager/tasks",
            });
        });

        // Check for projects nearing deadline
        const projectsNearDeadline = projects.filter((project) => {
            if (!project.endDate) return false;
            const endDate = project.endDate;
            const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            return daysUntilEnd > 0 && daysUntilEnd <= 7;
        });

        projectsNearDeadline.forEach((project) => {
            const daysUntilEnd = Math.ceil((project.endDate - now) / (1000 * 60 * 60 * 24));
            newNotifications.push({
                id: `project-deadline-${project.id}`,
                type: "project",
                title: "Project Deadline Approaching",
                message: `"${project.name}" is due in ${daysUntilEnd} day${daysUntilEnd > 1 ? "s" : ""}`,
                projectId: project.id,
                redirectTo: "/manager/projects",
            });
        });

        // Merge with reminder notifications
        const allNotifications = [...newNotifications, ...reminderNotifications];

        // Filter out dismissed notifications
        const filteredNotifications = allNotifications.filter(
            (notification) => !dismissedNotifications.has(notification.id)
        );

        // Sort notifications by priority
        filteredNotifications.sort((a, b) => {
            const priority = { overdue: 0, reminder: 1, project: 2, task: 3 };
            return priority[a.type] - priority[b.type];
        });

        setNotifications(filteredNotifications);
    }, [tasks, projects, reminderNotifications, dismissedNotifications]);

    const handleSaveQuickNote = async () => {
        if (!noteInput.trim()) return;
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            if (editingNoteId) {
                await updateDoc(doc(db, "notes", editingNoteId), {
                    text: noteInput,
                    updatedAt: serverTimestamp(),
                });
                setQuickNotes((prev) =>
                    prev.map((n) => (n.id === editingNoteId ? { ...n, text: noteInput, updatedAt: new Date() } : n))
                );
                toast.success("Note updated");
            } else {
                const newNote = {
                    userUid: currentUser.uid,
                    text: noteInput,
                    isPinned: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                const ref = await addDoc(collection(db, "notes"), newNote);
                setQuickNotes((prev) => [
                    { ...newNote, id: ref.id, createdAt: new Date(), updatedAt: new Date() },
                    ...prev,
                ]);
                toast.success("Note saved");
            }
            setNoteInput("");
            setEditingNoteId(null);
        } catch (error) {
            console.error("Error saving note:", error);
            toast.error("Failed to save note");
        }
    };

    const handleDeleteQuickNote = async (noteId) => {
        try {
            await deleteDoc(doc(db, "notes", noteId));
            setQuickNotes((prev) => prev.filter((n) => n.id !== noteId));
            toast.success("Note deleted");
        } catch (error) {
            console.error("Error deleting note:", error);
            toast.error("Failed to delete note");
        }
    };

    const handleTogglePinQuickNote = async (note) => {
        try {
            const newPinnedState = !note.isPinned;
            await updateDoc(doc(db, "notes", note.id), {
                isPinned: newPinnedState,
                updatedAt: serverTimestamp(),
            });
            setQuickNotes((prev) => {
                const updated = prev.map((n) =>
                    n.id === note.id ? { ...n, isPinned: newPinnedState } : n
                );
                return updated.sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return b.updatedAt - a.updatedAt;
                });
            });
        } catch (error) {
            console.error("Error toggling pin:", error);
            toast.error("Failed to update note");
        }
    };

    const handleSaveQuickReminder = async (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!remTitle.trim() || !remDate || !remTime || !currentUser) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSavingReminder(true);
        try {
            const dueAt = new Date(`${remDate}T${remTime}`);
            const reminderData = {
                userId: currentUser.uid,
                title: remTitle,
                description: remDesc,
                dueAt: dueAt,
                status: "pending",
                createdAt: serverTimestamp(),
                isRead: false,
            };

            if (editingReminderId) {
                await updateDoc(doc(db, "reminders", editingReminderId), reminderData);
                toast.success("Reminder updated");
            } else {
                await addDoc(collection(db, "reminders"), reminderData);
                toast.success("Reminder set");
            }

            setShowInlineReminderForm(false);
            setEditingReminderId(null);
            setRemTitle("");
            setRemDate("");
            setRemTime("");
            setRemDesc("");
        } catch (err) {
            console.error("Failed to save reminder", err);
            toast.error("Failed to save reminder");
        } finally {
            setSavingReminder(false);
        }
    };

    const handleDeleteQuickReminder = async (id) => {
        try {
            await deleteDoc(doc(db, "reminders", id));
            toast.success("Reminder removed");
        } catch (err) {
            console.error("Failed to delete reminder", err);
            toast.error("Failed to remove reminder");
        }
    };

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (notification.type === "overdue" || notification.type === "task") {
            navigate("/manager/tasks");
        } else if (notification.type === "project") {
            navigate("/manager/projects");
        } else if (notification.type === "reminder") {
            try {
                await updateDoc(doc(db, "reminders", notification.reminderId), {
                    isRead: true,
                });
                toast.success("Reminder marked as read");
            } catch (e) {
                console.error("Error updating reminder", e);
            }
        } else {
            if (notification.redirectTo) navigate(notification.redirectTo);
        }
        setShowNotifications(false);
    };

    // Remove individual notification
    const removeNotification = (notificationId, event) => {
        event.stopPropagation();
        setDismissedNotifications((prev) => new Set([...prev, notificationId]));
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== notificationId)
        );
        toast.success("Notification removed");
    };

    // Clear all notifications
    const clearAllNotifications = () => {
        const currentNotificationIds = notifications.map((n) => n.id);
        setDismissedNotifications(
            (prev) => new Set([...prev, ...currentNotificationIds])
        );
        setNotifications([]);
        toast.success("All notifications cleared");
    };



    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Dashboard">Welcome back! Loading your dashboard...</PageHeader>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="space-y-3 flex-1">
                                    <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                    <div className="h-8 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16" />
                                    <div className="h-2 bg-gray-200 [.dark_&]:bg-white/10 rounded w-20" />
                                </div>
                                <div className="w-14 h-14 rounded-xl bg-gray-200 [.dark_&]:bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Two Column Layout Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Project Progress Skeleton */}
                    <Card title="Project Progress" className="h-full">
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-4">
                                    <div className="flex justify-between mb-2">
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-32" />
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-10" />
                                    </div>
                                    <div className="w-full bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-2 mb-2" />
                                    <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Upcoming Deadlines Skeleton */}
                    <Card title="Upcoming Deadlines (Next 7 Days)" className="h-full">
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-3">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-40" />
                                        <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                    </div>
                                    <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-20" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Team Overview Skeleton */}
                <Card title="Team Overview">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="text-center p-3 border border-gray-100 [.dark_&]:border-white/10 rounded-lg">
                                <div className="w-12 h-12 rounded-full bg-gray-200 [.dark_&]:bg-white/10 mx-auto mb-2" />
                                <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16 mx-auto mb-1" />
                                <div className="h-2 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12 mx-auto" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <PageHeader title={`Welcome, ${userData?.name || "Manager"}!`}>
                        Here's an overview of your projects and team performance.
                    </PageHeader>
                </div>
                <div className="flex items-center gap-2" ref={notificationRef}>
                    <div className="relative flex items-center gap-2" ref={quickMenusRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowQuickActionsMenu((v) => !v);
                                setShowQuickReminderMenu(false);
                                setShowQuickNotesMenu(false);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-200 dark:border-white/10 shadow-sm"
                            title="Quick actions"
                        >
                            <LuNotebookPen className="h-5 w-5" />
                        </button>
                        {showQuickActionsMenu && (
                            <div className="absolute right-0 top-11 z-20 w-48 rounded-lg bg-white dark:bg-[#1F2234] shadow-lg border border-gray-200 dark:border-white/20 py-1 text-sm">
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
                                    onClick={() => {
                                        setShowQuickReminderMenu(true);
                                        setShowQuickActionsMenu(false);
                                    }}
                                >
                                    <LuAlarmClock className="h-4 w-4 text-indigo-500" />
                                    Reminders
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
                                    onClick={() => {
                                        setShowQuickNotesMenu(true);
                                        setShowQuickActionsMenu(false);
                                    }}
                                >
                                    <FaStickyNote className="h-4 w-4 text-amber-500" />
                                    Quick Notes
                                </button>
                            </div>
                        )}

                        {/* Reminders Dropdown */}
                        {showQuickReminderMenu && (
                            <div className="absolute right-0 top-11 z-20 w-80 rounded-lg bg-white dark:bg-[#1F2234] shadow-lg border border-gray-200 dark:border-white/20 p-3 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-gray-800 dark:text-white">Quick Reminders</div>
                                    <button
                                        onClick={() => {
                                            setShowInlineReminderForm(true);
                                            setEditingReminderId(null);
                                            setRemTitle("");
                                            setRemDate("");
                                            setRemTime("");
                                            setRemDesc("");
                                        }}
                                        className={`${linkColor} hover:opacity-80 p-1`}
                                        title="Add Reminder"
                                    >
                                        <FaPlus />
                                    </button>
                                </div>

                                {showInlineReminderForm && (
                                    <form
                                        onSubmit={handleSaveQuickReminder}
                                        className="mb-3 space-y-2 border border-gray-100 dark:border-white/10 rounded-md p-2 bg-gray-50 dark:bg-white/5"
                                    >
                                        <input
                                            type="text"
                                            className="w-full rounded border border-gray-200 dark:border-white/20 px-2 py-1 text-sm bg-white dark:bg-[#1F2234] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                            placeholder="Reminder title"
                                            value={remTitle}
                                            onChange={(e) => setRemTitle(e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="date"
                                                className="rounded border border-gray-200 dark:border-white/20 px-2 py-1 text-sm bg-white dark:bg-[#1F2234] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                                value={remDate}
                                                onChange={(e) => setRemDate(e.target.value)}
                                            />
                                            <input
                                                type="time"
                                                className="rounded border border-gray-200 dark:border-white/20 px-2 py-1 text-sm bg-white dark:bg-[#1F2234] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                                value={remTime}
                                                onChange={(e) => setRemTime(e.target.value)}
                                            />
                                        </div>
                                        <textarea
                                            rows={2}
                                            className="w-full rounded border border-gray-200 dark:border-white/20 px-2 py-1 text-xs bg-white dark:bg-[#1F2234] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                            placeholder="Description (optional)"
                                            value={remDesc}
                                            onChange={(e) => setRemDesc(e.target.value)}
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                className="px-2 py-1 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
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
                                    <div className="text-xs text-gray-400 dark:text-gray-500">No reminders yet.</div>
                                ) : (
                                    <ul className="space-y-2 text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto">
                                        {quickReminders.slice(0, 5).map((r) => (
                                            <li key={r.id} className="group flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    <div className="mt-0.5">
                                                        <FaClock className="h-3 w-3 text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-medium truncate">{r.title}</div>
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                            {r.dueAt?.toDate().toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                                        title="Edit reminder"
                                                        onClick={() => {
                                                            setShowInlineReminderForm(true);
                                                            setRemTitle(r.title);
                                                            setRemDesc(r.description || "");
                                                            const d = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
                                                            setRemDate(d.toISOString().split("T")[0]);
                                                            setRemTime(d.toTimeString().slice(0, 5));
                                                            setEditingReminderId(r.id);
                                                        }}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                                                        title="Delete reminder"
                                                        onClick={() => handleDeleteQuickReminder(r.id)}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Notes Dropdown */}
                        {showQuickNotesMenu && (
                            <div className="absolute right-0 top-11 z-20 w-80 rounded-lg bg-white dark:bg-[#1F2234] shadow-lg border border-gray-200 dark:border-white/20 p-3 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-gray-800 dark:text-white">Quick Notes</div>
                                    <div className="flex items-center gap-2">
                                        {quickNotes.length > 0 && (
                                            <span className="text-xs text-gray-400">
                                                {quickNotes.length} saved
                                            </span>
                                        )}
                                        <button
                                            onClick={handleSaveQuickNote}
                                            disabled={!noteInput.trim()}
                                            className={`${linkColor} hover:opacity-80 disabled:opacity-50 text-xs font-medium`}
                                        >
                                            {editingNoteId ? "Update" : "Save"}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    rows={3}
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-white/20 rounded-md px-2 py-1 text-sm bg-white dark:bg-[#181B2A] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                    placeholder="Write a quick note..."
                                />
                                <div className="mt-3 border-t border-gray-100 dark:border-white/10 pt-2 max-h-40 overflow-y-auto space-y-2">
                                    {quickNotes.length === 0 ? (
                                        <div className="text-xs text-gray-400 dark:text-gray-500">No saved notes yet.</div>
                                    ) : (
                                        quickNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="group flex items-start justify-between gap-2 rounded-md border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5"
                                            >
                                                <div className="flex items-start gap-2 flex-1">
                                                    <button
                                                        onClick={() => handleTogglePinQuickNote(note)}
                                                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${note.isPinned ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
                                                        title={note.isPinned ? "Unpin note" : "Pin note"}
                                                    >
                                                        <FaThumbtack className="h-3 w-3" />
                                                    </button>
                                                    <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug whitespace-pre-wrap break-all flex-1">
                                                        {note.text}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                                        title="Edit note"
                                                        onClick={() => {
                                                            setEditingNoteId(note.id);
                                                            setNoteInput(note.text);
                                                        }}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                                                        title="Delete note"
                                                        onClick={() => handleDeleteQuickNote(note.id)}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                        <FaBell className="h-5 w-5" />
                        {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notifications.length > 9 ? "9+" : notifications.length}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1F2234] rounded-lg shadow-lg border border-gray-200 dark:border-white/20 z-50">
                            <div className="p-4 border-b border-gray-200 dark:border-white/10">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Notifications
                                </h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                        <p>No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-white/10">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group"
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
                                                        {notification.type === "project" && (
                                                            <FaProjectDiagram className="h-4 w-4 text-purple-500 mt-1" />
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
                                                    <button
                                                        onClick={(e) => removeNotification(notification.id, e)}
                                                        className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
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
                                <div className="p-3 border-t border-gray-200 dark:border-white/10">
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


            {/* Stats Cards */}
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* My Projects */}
                <div
                    onClick={() => navigate("/manager/projects")}
                    className="cursor-pointer transform transition-transform hover:scale-105"
                    title="Click to view Projects page"
                >
                    <StatCard
                        icon={<FaProjectDiagram className="h-5 w-5" />}
                        label="My Projects"
                        value={stats.totalProjects}
                        subValue={<span className="text-green-600 dark:text-green-400">{stats.completedProjects} completed</span>}
                        color="amber"
                        variant="solid"
                    />
                </div>

                {/* Team Members */}
                <div
                    onClick={() => setShowTeamModal(true)}
                    className="cursor-pointer transform transition-transform hover:scale-105"
                    title="Click to view all team members"
                >
                    <StatCard
                        icon={<FaUsers className="h-5 w-5" />}
                        label="Team Members"
                        value={stats.teamSize}
                        subValue="Across all projects"
                        color="green"
                        variant="solid"
                    />
                </div>

                {/* Total Tasks */}
                <div
                    onClick={() => navigate("/manager/tasks")}
                    className="cursor-pointer transform transition-transform hover:scale-105"
                    title="Click to view Tasks page"
                >
                    <StatCard
                        icon={<FaTasks className="h-5 w-5" />}
                        label="Total Tasks"
                        value={stats.totalTasks}
                        subValue={<span className="text-blue-600 dark:text-blue-400">{stats.inProgressTasks} in progress</span>}
                        color="blue"
                        variant="solid"
                    />
                </div>

                {/* Overdue Tasks */}
                <div
                    onClick={() => navigate("/manager/tasks?filter=overdue")}
                    className="cursor-pointer transform transition-transform hover:scale-105"
                    title="Click to view overdue tasks"
                >
                    <StatCard
                        icon={<FaExclamationTriangle className="h-5 w-5" />}
                        label="Overdue Tasks"
                        value={stats.overdueTasks}
                        subValue="Need attention"
                        color={stats.overdueTasks > 0 ? "red" : "gray"}
                        variant="solid"
                    />
                </div>
            </div>

            <TeamMembersModal
                isOpen={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                members={teamMembers}
                tasks={tasks}
                projects={projects}
            />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Progress */}
                <Card title="Project Progress" className="h-full">
                    <div className="space-y-0 divide-y divide-gray-100 dark:divide-white/10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {projectsWithProgress.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No projects assigned yet</p>
                        ) : (
                            projectsWithProgress.map((project) => (
                                <div key={project.id} className="group py-3 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors px-2 -mx-2 rounded-md">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="min-w-0 flex-1 mr-4">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {project.projectName}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {project.clientName || "(No Client)"}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
                                            {project.completedTasks}/{project.taskCount} <span className="mx-1">•</span> {project.progress}%
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${project.progress === 100 ? "bg-green-500" :
                                                project.progress > 50 ? "bg-blue-500" :
                                                    project.progress > 0 ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                                                }`}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Upcoming Deadlines */}
                <Card title="Upcoming Deadlines (Next 7 Days)" className="h-full">
                    <div className="space-y-3">
                        {upcomingDeadlines.length === 0 ? (
                            <div className="text-center py-8">
                                <FaCheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                                <p className="text-gray-500 [.dark_&]:text-gray-400">No upcoming deadlines!</p>
                            </div>
                        ) : (
                            upcomingDeadlines.map((task) => (
                                <div key={task.id} className="flex items-center justify-between border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-3 hover:bg-gray-50 [.dark_&]:hover:bg-white/5">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 [.dark_&]:text-white truncate">{task.title}</h4>
                                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">{task.projectName || "No project"}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                                            {task.dueDate?.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Team Overview */}
            <Card title="Team Overview">
                <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                    {projectTeams.length === 0 ? (
                        <p className="text-gray-500 [.dark_&]:text-gray-400 col-span-full text-center py-8">
                            No projects assigned yet.
                        </p>
                    ) : (
                        projectTeams.map((project) => (
                            <div key={project.id} className="border-b border-gray-100 [.dark_&]:border-white/10 last:border-0 pb-6 last:pb-0">
                                <h4 className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 mb-3 flex items-center gap-2">
                                    <FaProjectDiagram className="text-indigo-500" />
                                    {project.name}
                                    <span className="text-xs font-normal text-gray-400 bg-gray-100 [.dark_&]:bg-white/10 px-2 py-0.5 rounded-full">
                                        {project.members.length} members
                                    </span>
                                </h4>

                                {project.members.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic pl-6">No members assigned to this project.</p>
                                ) : (
                                    <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar">
                                        {project.members.map((member) => (
                                            <div key={`${project.id}-${member.id}`} className="min-w-[130px] w-[130px] shrink-0 text-center p-3 border border-gray-100 [.dark_&]:border-white/10 rounded-lg hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm mx-auto mb-2 shadow-sm">
                                                    {(member.name || member.fullName || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-xs font-medium text-gray-900 [.dark_&]:text-white truncate">
                                                    {member.name || member.fullName || "Unknown"}
                                                </p>
                                                <p className="text-[10px] text-gray-500 [.dark_&]:text-gray-400 truncate mt-0.5">
                                                    {member.resourceRole || "Team Member"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}

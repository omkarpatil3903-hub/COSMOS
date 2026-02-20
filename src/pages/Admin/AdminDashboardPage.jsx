// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/useAuthContext"; // To get the user's name
import {
  FaUsers,
  FaUserTie,
  FaProjectDiagram,
  FaCalendarCheck,
  FaStickyNote,
  FaThumbtack,
  FaPlus,
  FaFlag,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import { LuNotebookPen, LuAlarmClock } from "react-icons/lu";
import { db } from "../../firebase";
import { TYPE_HEX, PRIORITY_HEX, getTypeHex } from "../../utils/colorMaps";
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import DashboardSkeleton from "../../components/DashboardSkeleton";
import toast from "react-hot-toast";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { useTheme } from "../../context/ThemeContext";
function DashboardPage() {
  const navigate = useNavigate();
  const { user, userData } = useAuthContext(); // Get user data for personalization
  const { iconColor, buttonClass, barColor } = useThemeStyles();
  const { mode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedProject, setSelectedProject] = useState(""); // Project filter
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [showNotesMenu, setShowNotesMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [quickReminders, setQuickReminders] = useState([]);
  const [showInlineReminderForm, setShowInlineReminderForm] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("");
  const [remDesc, setRemDesc] = useState("");
  const [showTopNotes, setShowTopNotes] = useState(true);
  const [savingReminder, setSavingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const quickMenusRef = useRef(null);



  // Realtime subscriptions
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          projectId: data.projectId || "",
          status: data.status || "To-Do",
          createdAt: data.createdAt,
          dueDate: data.dueDate || null,
          priority: data.priority || "",
        };
      });
      setTasks(items);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    // Subscribe to global events so dashboard calendar can render real events
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      setEvents(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: data.title || "",
            type: String(data.type || "meeting").toLowerCase(),
            status: String(data.status || "pending").toLowerCase(),
            date: data.date || "",
            time: data.time || "",
            duration: data.duration || 60,
            clientId: data.clientId || "",
            clientName: data.clientName || "",
            description: data.description || "",
            priority: data.priority || "medium",
            location: data.location || "",
            attendees: data.attendees || [],
            attendeeIds: data.attendeeIds || [],
            color: data.color || getTypeHex(data.type),
          };
        })
      );
    });

    // Listen for due reminders for Admin and show persistent toast
    const uid = userData?.uid || user?.uid;
    let unsubReminders = null;
    if (uid) {
      const qRem = query(
        collection(db, "reminders"),
        where("userId", "==", uid),
        where("status", "==", "pending")
      );
      unsubReminders = onSnapshot(qRem, (snapshot) => {
        const now = new Date();
        const due = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => {
            const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
            return dueAt <= now && !r.isRead;
          });

        due.forEach((r) => {
          const toastId = `reminder-${r.id}`;
          const when = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
          const timeLabel = isNaN(when.getTime())
            ? ""
            : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
      });
    }

    // Mark loading false after first data frames arrive
    const timer = setTimeout(() => setLoading(false), 300);
    return () => {
      unsubProjects();
      unsubTasks();
      unsubUsers();
      unsubClients();
      if (unsubEvents) unsubEvents();
      if (unsubReminders) unsubReminders();
      clearTimeout(timer);
    };
  }, []);

  // Close quick menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        quickMenusRef.current &&
        !quickMenusRef.current.contains(event.target)
      ) {
        setShowQuickMenu(false);
        setShowReminderMenu(false);
        setShowNotesMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load notes for this Admin from dedicated notes collection (notes/{uid})
  useEffect(() => {
    const uid = userData?.uid || user?.uid;
    if (!uid) return;
    const q = query(collection(db, "notes"), where("userUid", "==", uid));

    const load = async () => {
      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
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
          setNotes(sorted);
        } else {
          setNotes([]);
        }
      } catch (e) {
        console.error("Failed to load notes for user", e);
      }
    };

    load();
  }, [userData?.uid, user?.uid]);

  useEffect(() => {
    const uid = userData?.uid || user?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "reminders"),
      where("userId", "==", uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const aD = a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt);
        const bD = b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt);
        return aD - bD;
      });
      setQuickReminders(data);
    });
    return () => unsub();
  }, [userData?.uid, user?.uid]);

  const formatDueTime = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday ? `Today at ${timeStr}` : `${d.toLocaleDateString()} at ${timeStr}`;
  };

  // Filter tasks and events by selected project
  const filteredTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter((t) => t.projectId === selectedProject);
  }, [tasks, selectedProject]);

  // Note: Events filtering can be added later if needed

  // Derived stats
  const normalizeStatus = (s) => {
    const x = String(s || "")
      .trim()
      .toLowerCase();
    if (x === "done" || x === "completed" || x === "complete") return "Done";
    if (x === "in progress" || x === "in-progress" || x === "inprogress")
      return "In Progress";
    if (x === "in review" || x === "in-review" || x === "inreview")
      return "In Progress";
    if (
      x === "" ||
      x === "to-do" ||
      x === "to do" ||
      x === "todo" ||
      x === "backlog" ||
      x === "open"
    )
      return "To-Do";
    return s || "To-Do";
  };

  const stats = useMemo(() => {
    const tasksCompleted = filteredTasks.filter(
      (t) => normalizeStatus(t.status) === "Done"
    ).length;
    return {
      totalResources: String(users.length),
      totalClients: String(clients.length),
      totalProjects: selectedProject ? "1" : String(projects.length),
      tasksCompleted: String(tasksCompleted),
    };
  }, [
    users.length,
    clients.length,
    projects.length,
    filteredTasks,
    selectedProject,
  ]);

  // Monthly Project Status (last 12 months) derived from tasks.createdAt
  const monthlyStatus = useMemo(() => {
    // Build last 12 month buckets
    const now = new Date();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        name: monthNames[d.getMonth()],
        completed: 0,
        inProgress: 0,
        pending: 0,
      });
    }

    const findBucketIndex = (date) => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const key = `${y}-${m}`;
      return buckets.findIndex((b) => b.key === key);
    };

    const toDate = (val) => {
      if (!val) return null;
      if (typeof val.toDate === "function") return val.toDate();
      if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const t of filteredTasks) {
      const d = toDate(t.createdAt);
      if (!d) continue;
      const idx = findBucketIndex(d);
      if (idx === -1) continue; // outside last 12 months
      const st = normalizeStatus(t.status);
      if (st === "Done") buckets[idx].completed += 1;
      else if (st === "In Progress") buckets[idx].inProgress += 1;
      else buckets[idx].pending += 1; // To-Do, In Review, others treated as pending
    }

    return buckets.map(({ name, completed, inProgress, pending }) => ({
      name,
      completed,
      inProgress,
      pending,
    }));
  }, [filteredTasks]);

  // Project Health and Status Distribution
  const statusSummary = useMemo(() => {
    const counts = { done: 0, inProgress: 0, todo: 0 };
    for (const t of filteredTasks) {
      const st = normalizeStatus(t.status);
      if (st === "Done") counts.done++;
      else if (st === "In Progress") counts.inProgress++;
      else counts.todo++;
    }
    const total = filteredTasks.length || 1; // avoid div by zero
    const pct = {
      done: Math.round((counts.done / total) * 100),
      inProgress: Math.round((counts.inProgress / total) * 100),
      todo: Math.round((counts.todo / total) * 100),
    };
    return { counts, pct, total: filteredTasks.length };
  }, [filteredTasks]);

  const projectHealth = useMemo(() => {
    // Helper: parse to Date
    const toDate = (val) => {
      if (!val) return null;
      if (typeof val.toDate === "function") return val.toDate();
      if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const today = new Date();
    const filteredProjects = selectedProject
      ? projects.filter((p) => p.id === selectedProject)
      : projects;
    const items = filteredProjects.map((p) => {
      const projTasks = filteredTasks.filter((t) => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(
        (t) => normalizeStatus(t.status) === "Done"
      ).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const overdue = projTasks.filter((t) => {
        if (normalizeStatus(t.status) === "Done") return false;
        const d = toDate(t.dueDate);
        return d ? d < today : false;
      }).length;
      let health = "Needs Attention";
      if (overdue > 0) health = "At Risk";
      else if (progress >= 80) health = "On Track";
      return {
        id: p.id,
        name: p.projectName || p.name || "Untitled",
        progress,
        overdue,
        health,
      };
    });

    const counts = { onTrack: 0, atRisk: 0, needsAttention: 0 };
    for (const it of items) {
      if (it.health === "On Track") counts.onTrack++;
      else if (it.health === "At Risk") counts.atRisk++;
      else counts.needsAttention++;
    }
    const topAtRisk = items
      .filter((x) => x.health === "At Risk")
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 3);

    return { items, counts, topAtRisk };
  }, [projects, filteredTasks, selectedProject]);

  // Enhanced bar chart component with better styling
  const BarChart = ({
    data,
    title,
    dataKey1,
    dataKey2,
    dataKey3,
    label1,
    label2,
    label3,
    color1 = "#10B981",
    color2 = "#F59E0B",
    color3 = "#EF4444",
  }) => {
    const maxValue = Math.max(
      ...data.map(
        (d) => (d[dataKey1] || 0) + (d[dataKey2] || 0) + (d[dataKey3] || 0)
      )
    );
    if (
      !Array.isArray(data) ||
      data.length === 0 ||
      !isFinite(maxValue) ||
      maxValue <= 0
    ) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
            {title}
          </h3>
          <div className="h-64 flex items-center justify-center text-sm text-gray-500 [.dark_&]:text-gray-400">
            No data
          </div>
        </div>
      );
    }
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
          {title}
        </h3>
        <div className="h-64">
          <div className="flex items-end justify-between h-full pb-8">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center flex-1 mx-1"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="w-8 flex flex-col items-center space-y-0">
                    {dataKey3 && item[dataKey3] > 0 && (
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(item[dataKey3] / maxValue) * 150}px`,
                          backgroundColor: color3,
                        }}
                        title={`${label3}: ${item[dataKey3]}`}
                      ></div>
                    )}
                    {dataKey2 && item[dataKey2] > 0 && (
                      <div
                        className="w-full"
                        style={{
                          height: `${(item[dataKey2] / maxValue) * 150}px`,
                          backgroundColor: color2,
                        }}
                        title={`${label2}: ${item[dataKey2]}`}
                      ></div>
                    )}
                    {dataKey1 && item[dataKey1] > 0 && (
                      <div
                        className="w-full rounded-b"
                        style={{
                          height: `${(item[dataKey1] / maxValue) * 150}px`,
                          backgroundColor: color1,
                        }}
                        title={`${label1}: ${item[dataKey1]}`}
                      ></div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-600 [.dark_&]:text-gray-400 mt-2">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color1 }}
              ></div>
              <span className="text-xs text-gray-600 [.dark_&]:text-gray-400">{label1}</span>
            </div>
            {dataKey2 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color2 }}
                ></div>
                <span className="text-xs text-gray-600 [.dark_&]:text-gray-400">{label2}</span>
              </div>
            )}
            {dataKey3 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color3 }}
                ></div>
                <span className="text-xs text-gray-600 [.dark_&]:text-gray-400">{label3}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced line chart component for revenue with better visualization
  const LineChart = ({ data, title, dataKey, color = "#10B981" }) => {
    const values = Array.isArray(data)
      ? data
        .map((d) => (d && typeof d[dataKey] === "number" ? d[dataKey] : null))
        .filter((v) => typeof v === "number" && isFinite(v))
      : [];

    if (values.length === 0) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
            {title}
          </h3>
          <div className="h-64 flex items-center justify-center text-sm text-gray-500 [.dark_&]:text-gray-400">
            No data
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
          {title}
        </h3>
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-end justify-between pb-8">
            {data.map((item, index) => {
              const value = Number(item && item[dataKey]) || 0;
              const height = ((value - minValue) / range) * 150;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="relative flex flex-col items-center">
                    <div className="text-xs font-semibold text-content-primary mb-1">
                      ${(item[dataKey] / 1000).toFixed(0)}k
                    </div>
                    <div
                      className="w-3 rounded-full"
                      style={{
                        height: `${height}px`,
                        backgroundColor: color,
                        opacity: 0.6,
                      }}
                    ></div>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-y-2"
                      style={{ backgroundColor: color }}
                      title={`${item.name}: $${item[dataKey].toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 [.dark_&]:text-gray-400 mt-2">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <p className="text-xs text-gray-600 [.dark_&]:text-gray-400">
              Total Revenue: $
              {data.reduce((sum, d) => sum + d[dataKey], 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Projects Progress Card (replaces Resource Allocation)
  const ProjectsProgress = () => {
    const filteredProjects = selectedProject
      ? projects.filter((p) => p.id === selectedProject)
      : projects;

    const list = filteredProjects.map((p) => {
      const projTasks = filteredTasks.filter((t) => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(
        (t) => normalizeStatus(t.status) === "Done"
      ).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: p.id,
        name: p.projectName || p.name || "Untitled",
        client: p.clientName || "",
        total,
        done,
        progress,
      };
    });

    const sorted = [...list].sort((a, b) => b.progress - a.progress);

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
            Projects Progress
          </h3>
        </div>
        <div
          className="overflow-y-auto pr-2 space-y-2.5"
          style={{ maxHeight: "420px" }}
        >
          {sorted.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white truncate flex-1 min-w-0">
                  <span className="truncate block" title={p.name}>
                    {p.name}
                  </span>
                  {p.client && (
                    <span className="text-xs text-gray-500 [.dark_&]:text-gray-400 block truncate">
                      ({p.client})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 [.dark_&]:text-gray-400 whitespace-nowrap shrink-0">
                  {p.done}/{p.total} · {p.progress}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${p.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                No projects yet.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calendar component for project events
  const Calendar = ({ data, title, tasks = [] }) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Month names
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Day names
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Create calendar grid
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    // Get tasks for a specific date
    const getTasksForDate = (day) => {
      if (!day) return [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      return tasks.filter((task) => {
        if (!task.dueDate) return false;
        // Don't count completed tasks
        if (normalizeStatus(task.status) === "Done") return false;

        let d;
        if (typeof task.dueDate.toDate === 'function') {
          d = task.dueDate.toDate();
        } else {
          d = new Date(task.dueDate);
        }
        if (isNaN(d.getTime())) return false;

        const taskDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return taskDateStr === dateStr;
      });
    };

    // Get events for a specific date
    const getEventsForDate = (day) => {
      if (!day) return [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      return data.filter((event) => event.date === dateStr);
    };

    // Check if date is today
    const isToday = (day) => {
      return (
        day === currentDate.getDate() &&
        currentMonth === currentDate.getMonth() &&
        currentYear === currentDate.getFullYear()
      );
    };

    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
          {title}
        </h3>
        <div className="h-61 overflow-hidden">
          {/* Calendar Header */}
          <div className="mb-3">
            <h4 className="text-center font-semibold text-gray-900 [.dark_&]:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h4>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-600 [.dark_&]:text-gray-400 p-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {calendarDays.map((day, index) => {
              const events = getEventsForDate(day);
              const dayTasks = getTasksForDate(day);
              const hasEvents = events.length > 0;
              const hasTasks = dayTasks.length > 0;

              // High-priority upcoming tasks (future or today)
              const hasHighPriorityTasks = day && (() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const cellDate = new Date(currentYear, currentMonth, day);
                cellDate.setHours(0, 0, 0, 0);
                return cellDate >= now && dayTasks.some((t) =>
                  String(t.priority || "").toLowerCase() === "high"
                );
              })();

              // Determine dot color
              let dotColor = null;
              if (day) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const cellDate = new Date(currentYear, currentMonth, day);
                cellDate.setHours(0, 0, 0, 0);

                const diffTime = cellDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                  dotColor = "bg-red-500"; // Overdue
                } else if (diffDays === 0) {
                  dotColor = "bg-orange-500"; // Today
                }
              }

              // Determine tooltip positioning based on column (0=Sun, 6=Sat)
              const tooltipPos = index % 7 === 0 ? "left-0 translate-x-1" : index % 7 >= 5 ? "right-0 -translate-x-1" : "left-1/2 -translate-x-1/2";

              return (
                <div
                  key={index}
                  className={`
                    h-8 p-1 border border-subtle relative
                    ${day ? "hover:bg-surface-subtle" : ""}
                    ${isToday(day) ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300" : "bg-surface"}
                  `}
                >
                  {day && (
                    <>
                      {/* High-priority flag — top-right */}
                      {hasHighPriorityTasks && (
                        <div
                          className="absolute top-0.5 right-0.5 cursor-pointer hover:scale-110 transition-transform z-10 group/flag"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            navigate("/admin/task-management", { state: { date: dateStr, priority: "High" } });
                          }}
                        >
                          <FaFlag className="text-[7px] sm:text-[9px] md:text-[10px] flex-shrink-0" style={{ color: "#ef4444" }} />
                          {/* Professional hover card */}
                          <div className={`pointer-events-none absolute top-full mt-1 hidden group-hover/flag:block z-50 ${index % 7 >= 5 ? "right-0" : "left-1/2 -translate-x-1/2"}`} style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
                            <div style={{
                              backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
                              border: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              padding: '8px 10px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            }}>
                              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', marginBottom: '6px', borderBottom: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`, paddingBottom: '4px' }}>
                                High Priority Task
                              </div>
                              <div style={{ fontSize: '10px', color: mode === 'dark' ? '#f3f4f6' : '#111827' }}>
                                Click to filter tasks by this date
                              </div>
                            </div>
                            {/* Arrow */}
                            <div style={{ position: 'absolute', bottom: '100%', right: '4px', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `5px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}` }} />
                          </div>
                        </div>
                      )}

                      {/* Date number */}
                      <div
                        className={`text-center ${isToday(day)
                          ? "font-bold text-blue-600 [.dark_&]:text-blue-400"
                          : "text-gray-900 [.dark_&]:text-white"
                          }`}
                      >
                        {day}
                      </div>

                      {/* Dots row — absolute bottom, side by side: task dot + events dot */}
                      {(hasTasks && dotColor || hasEvents) && (
                        <div className="absolute bottom-0.5 left-0 right-0 flex justify-center items-center gap-1">

                          {/* Task dot: red=overdue, orange=today */}
                          {hasTasks && dotColor && (
                            <div className="relative group/taskdot flex-shrink-0">
                              <div
                                className="w-1.5 h-1.5 rounded-full cursor-pointer hover:scale-125 transition-transform"
                                style={{ backgroundColor: dotColor === "bg-red-500" ? "#ef4444" : "#f97316" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  navigate(`/admin/task-management?date=${dateStr}`);
                                }}
                              />
                              {/* Professional hover card */}
                              <div className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover/taskdot:block z-50 ${tooltipPos}`} style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
                                <div style={{
                                  backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
                                  border: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                }}>
                                  {/* Header */}
                                  <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: dotColor === "bg-red-500" ? "#ef4444" : "#f97316", marginBottom: '6px', borderBottom: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`, paddingBottom: '4px' }}>
                                    {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'} Due
                                  </div>
                                  <div style={{ fontSize: '10px', color: mode === 'dark' ? '#f3f4f6' : '#111827' }}>
                                    Click to view in Task Management
                                  </div>
                                </div>
                                {/* Arrow */}
                                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}` }} />
                              </div>
                            </div>
                          )}

                          {/* Events blue dot with hover tooltip */}
                          {hasEvents && (
                            <div className="relative group/evtdot flex-shrink-0">
                              <div
                                className="w-1.5 h-1.5 rounded-full bg-blue-500 cursor-pointer hover:scale-125 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  navigate("/admin/calendar", { state: { date: dateStr } });
                                }}
                              />
                              {/* Professional hover card */}
                              <div className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover/evtdot:block z-50 ${tooltipPos}`} style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
                                <div style={{
                                  backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
                                  border: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                }}>
                                  {/* Header */}
                                  <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '6px', borderBottom: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`, paddingBottom: '4px' }}>
                                    {events.length} {events.length === 1 ? 'Meeting' : 'Meetings'}
                                  </div>
                                  <div style={{ fontSize: '10px', color: mode === 'dark' ? '#f3f4f6' : '#111827' }}>
                                    Click to open Calendar
                                  </div>
                                </div>
                                {/* Arrow */}
                                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}` }} />
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <h5 className="text-sm font-medium text-gray-900 [.dark_&]:text-white mb-3">
          Upcoming Events
        </h5>
        {/* Upcoming Events List */}
        <div className="space-y-2 max-h-25 overflow-y-auto mb-6">

          {data
            .filter((event) => {
              const d = new Date(event.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .length === 0 ? (
            <div className="text-xs text-gray-500 [.dark_&]:text-gray-400">
              No events this month.
            </div>
          ) : (
            data
              .filter((event) => {
                const d = new Date(event.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((event, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  ></div>
                  <span className="text-gray-600 [.dark_&]:text-gray-400 whitespace-nowrap flex-shrink-0">
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-gray-900 [.dark_&]:text-white font-medium truncate">
                    {event.title}
                  </span>
                </div>
              ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 [.dark_&]:text-gray-500 mr-1">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-[9px] text-gray-500 [.dark_&]:text-gray-400">Overdue tasks</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
            <span className="text-[9px] text-gray-500 [.dark_&]:text-gray-400">Due today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[9px] text-gray-500 [.dark_&]:text-gray-400">Meetings</span>
          </div>
          <div className="flex items-center gap-1">
            <FaFlag className="text-[8px] flex-shrink-0" style={{ color: "#ef4444" }} />
            <span className="text-[9px] text-gray-500 [.dark_&]:text-gray-400">High-priority task</span>
          </div>
          <span className="text-[9px] text-gray-400 [.dark_&]:text-gray-500 ml-1 italic">Click any dot or flag to navigate</span>
        </div>
      </div>
    );
  };

  // Use the skeleton loader while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Use realistic user name
  const welcomeTitle = `Welcome${userData?.name ? ", " + userData.name : ""}!`;

  return (
    <div>
      <PageHeader
        title={welcomeTitle}
        className="[.dark_&]:text-white"
        actions={
          <div className="flex items-center gap-3" ref={quickMenusRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowQuickMenu((v) => !v);
                  setShowReminderMenu(false);
                  setShowNotesMenu(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-200 shadow-sm"
                title="Quick actions"
              >
                <LuNotebookPen className={`h-5 w-5 ${iconColor}`} />
              </button>
              {showQuickMenu && (
                <div className="absolute right-0 top-9 z-30 w-44 rounded-lg bg-surface shadow-lg border border-subtle text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReminderMenu(true);
                      setShowNotesMenu(false);
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-subtle text-content-primary flex items-center gap-2"
                  >
                    <LuAlarmClock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Reminders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotesMenu(true);
                      setShowReminderMenu(false);
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-subtle text-content-primary border-t border-subtle flex items-center gap-2"
                  >
                    <FaStickyNote className="h-3.5 w-3.5 text-amber-500" />
                    <span>Notes</span>
                  </button>
                </div>
              )}

              {showReminderMenu && (
                <div className="absolute right-0 top-11 z-20 w-80 rounded-lg bg-surface shadow-lg border border-subtle p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-content-primary">Quick Reminders</div>
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
                        // Start a fresh create when toggling via +
                        setEditingReminderId(null);
                        setRemTitle("");
                        setRemDesc("");
                        setShowInlineReminderForm((v) => !v);
                      }}
                      className={`p-1.5 rounded-md hover:bg-gray-100 ${iconColor}`}
                      title="Add reminder"
                    >
                      <FaPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {showInlineReminderForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const activeUid = userData?.uid || user?.uid;
                        if (!remTitle || !remDate || !remTime) {
                          toast.error("Please fill in title, date and time");
                          return;
                        }
                        if (!activeUid) {
                          toast.error("User not ready. Please wait a moment and try again.");
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
                              userId: activeUid,
                              title: remTitle,
                              description: remDesc,
                              dueAt,
                              status: "pending",
                              isRead: false,
                              createdAt: serverTimestamp(),
                            });
                            toast.success("Reminder saved!");
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
                      className="mb-3 space-y-2 border border-gray-100 [.dark_&]:border-white/10 rounded-md p-2 bg-gray-50 [.dark_&]:bg-white/5"
                    >
                      <input
                        type="text"
                        className="w-full rounded border border-gray-200 [.dark_&]:border-white/20 px-2 py-1 text-sm bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
                        placeholder="Reminder title"
                        value={remTitle}
                        onChange={(e) => setRemTitle(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          className="rounded border border-gray-200 [.dark_&]:border-white/20 px-2 py-1 text-sm bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
                          value={remDate}
                          onChange={(e) => setRemDate(e.target.value)}
                        />
                        <input
                          type="time"
                          className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={remTime}
                          onChange={(e) => setRemTime(e.target.value)}
                        />
                      </div>
                      <textarea
                        rows={2}
                        className="w-full rounded border border-gray-200 [.dark_&]:border-white/20 px-2 py-1 text-xs bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
                        placeholder="Description (optional)"
                        value={remDesc}
                        onChange={(e) => setRemDesc(e.target.value)}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded-md text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-100 [.dark_&]:hover:bg-white/10"
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
                    <div className="text-xs text-gray-400 [.dark_&]:text-gray-500">No reminders yet.</div>
                  ) : (
                    <ul className="space-y-2 text-gray-700 [.dark_&]:text-gray-300 max-h-60 overflow-y-auto">
                      {quickReminders.slice(0, 5).map((r) => (
                        <li key={r.id} className="group flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="mt-1">•</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{r.title}</div>
                              <div className="text-[11px] text-gray-500">{formatDueTime(r.dueAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200 [.dark_&]:hover:bg-white/10 text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-800 [.dark_&]:hover:text-gray-200"
                              title="Edit reminder"
                              onClick={() => {
                                setShowInlineReminderForm(true);
                                setEditingReminderId(r.id);
                                setRemTitle(r.title || "");
                                setRemDesc(r.description || "");
                                const d = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
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
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                                <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600"
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
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {showNotesMenu && (
                <div className="absolute right-0 top-11 z-20 w-80 rounded-lg bg-white [.dark_&]:bg-[#1F2234] shadow-lg border border-gray-200 [.dark_&]:border-white/20 p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800 [.dark_&]:text-white">Quick Notes</div>
                    <div className="flex items-center gap-2">
                      {notes.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {notes.length} {notes.length === 1 ? "Note" : "Notes"}

                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = noteInput.trim();
                          const activeUid = userData?.uid || user?.uid;
                          const activeEmail = userData?.email || user?.email || "";
                          if (!trimmed) return;
                          if (!activeUid) {
                            toast.error("User not ready. Please wait a moment and try again.");
                            return;
                          }

                          try {
                            if (editingNoteId) {
                              await updateDoc(doc(db, "notes", editingNoteId), {
                                text: trimmed,
                                updatedAt: serverTimestamp(),
                              });
                            } else {
                              await addDoc(collection(db, "notes"), {
                                text: trimmed,
                                isPinned: false,
                                userUid: activeUid,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                              });
                            }

                            // Reload notes for this user
                            const q = query(
                              collection(db, "notes"),
                              where("userUid", "==", activeUid)
                            );
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
                            setNotes(sorted);

                            setNoteInput("");
                            setEditingNoteId(null);
                          } catch (e) {
                            console.error("Failed to save note", e);
                            toast.error("Failed to save note");
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-white text-[10px] font-medium disabled:opacity-50 ${buttonClass}`}
                        disabled={!noteInput.trim()}
                      >
                        {editingNoteId ? "Update" : "Save"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full border border-gray-200 [.dark_&]:border-white/20 rounded-md px-2 py-1 text-sm bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
                    placeholder="Write a quick note..."
                  />
                  <div className="mt-3 border-t border-gray-100 [.dark_&]:border-white/10 pt-2 max-h-40 overflow-y-auto space-y-2">
                    {notes.length === 0 ? (
                      <div className="text-xs text-gray-400 [.dark_&]:text-gray-500">No saved notes yet.</div>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className="group flex items-start justify-between gap-2 rounded-md border border-gray-100 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-white/5 px-2 py-1.5"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextPinned = !note.isPinned;
                                try {
                                  await updateDoc(doc(db, "notes", note.id), {
                                    isPinned: nextPinned,
                                    updatedAt: serverTimestamp(),
                                  });
                                  setNotes((prev) => {
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
                              className={`p-1 rounded hover:bg-gray-200 [.dark_&]:hover:bg-white/10 ${note.isPinned ? "text-amber-600 [.dark_&]:text-amber-400" : "text-gray-400 [.dark_&]:text-gray-500 hover:text-gray-600 [.dark_&]:hover:text-gray-300"}`}
                              title={note.isPinned ? "Unpin note" : "Pin note"}
                            >
                              <FaThumbtack className="h-3 w-3" />
                            </button>
                            <div className="text-xs text-gray-700 [.dark_&]:text-gray-300 leading-snug whitespace-pre-wrap break-all flex-1">
                              {note.text}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200 [.dark_&]:hover:bg-white/10 text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-800 [.dark_&]:hover:text-gray-200"
                              title="Edit note"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setNoteInput(note.text);
                              }}
                            >
                              <span className="sr-only">Edit</span>
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                                <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600"
                              title="Delete note"
                              onClick={async () => {
                                const activeUid = userData?.uid || user?.uid;
                                if (!activeUid) return;
                                try {
                                  await deleteDoc(doc(db, "notes", note.id));
                                  setNotes((prev) => prev.filter((n) => n.id !== note.id));
                                  if (editingNoteId === note.id) {
                                    setEditingNoteId(null);
                                    setNoteInput("");
                                  }
                                } catch (e) {
                                  console.error("Failed to delete note", e);
                                }
                              }}
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
                      ))
                    )}
                  </div>

                </div>
              )}
            </div>

            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 [.dark_&]:text-gray-300">
                Filter by Project:
              </span>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="border border-gray-300 [.dark_&]:border-white/20 rounded-md px-3 py-2 text-sm bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
              >
                <option value="" className="bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white">
                    {project.projectName || project.name || "Untitled"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        <span className="text-gray-700 [.dark_&]:text-gray-300">
          Monitor project performance, client engagement, and manage resources
          from a single control center.
        </span>
      </PageHeader>

      {/* --- Floating Top Right Sticky Notes Section --- */}
      <div className="fixed top-5 right-8 z-50 flex flex-col items-end pointer-events-none">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#1f2937] shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 cursor-pointer mb-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all hover:-translate-y-1 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] pointer-events-auto group"
          onClick={() => setShowTopNotes(!showTopNotes)}
          title="Toggle Dashboard Notes"
        >
          <FaStickyNote className="text-amber-500 text-lg group-hover:scale-110 transition-transform" />
        </div>

        {showTopNotes && (
          <div className="w-80 flex flex-col gap-4 transition-all max-h-[80vh] overflow-y-auto pointer-events-auto custom-scrollbar px-2 pb-4 pt-1">
            {notes.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                No sticky notes saved yet. Add one from the quick menu above!
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className="relative p-5 rounded-[12px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] transform transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-amber-200 dark:border-amber-900/60 bg-[#fef3c7] dark:bg-[#422006]"
                >
                  <div className="flex justify-between items-start mb-3">
                    {note.isPinned ? <FaThumbtack className="text-amber-600 dark:text-amber-500 w-3.5 h-3.5 transform rotate-45" /> : <div></div>}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-auto tracking-wider uppercase">
                      {(() => {
                        const d = note.updatedAt?.toDate ? note.updatedAt.toDate() : (note.updatedAt ? new Date(note.updatedAt) : null);
                        if (!d || isNaN(d)) return 'Just now';
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      })()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words flex-1 leading-relaxed font-normal">
                    {note.text}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- Stat Cards Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => navigate("/admin/manage-projects")}
          className="cursor-pointer transform transition-transform hover:scale-105"
          title="Click to view Projects page"
        >
          <StatCard
            icon={<FaProjectDiagram className="h-5 w-5" />}
            label="Total Projects"
            value={stats.totalProjects}
            color="indigo"
          />
        </div>
        <div
          onClick={() => navigate("/admin/manage-resources")}
          className="cursor-pointer transform transition-transform hover:scale-105"
          title="Click to view Resources page"
        >
          <StatCard
            icon={<FaUsers className="h-5 w-5" />}
            label="Total Resources"
            value={stats.totalResources}
            color="blue"
          />
        </div>
        <div
          onClick={() => navigate("/admin/manage-clients")}
          className="cursor-pointer transform transition-transform hover:scale-105"
          title="Click to view Clients page"
        >
          <StatCard
            icon={<FaUserTie className="h-5 w-5" />}
            label="Total Clients"
            value={stats.totalClients}
            color="red"
          />
        </div>
        <div
          onClick={() => navigate("/admin/task-management")}
          className="cursor-pointer transform transition-transform hover:scale-105"
          title="Click to view Tasks page"
        >
          <StatCard
            icon={<FaCalendarCheck className="h-5 w-5" />}
            label="Tasks Completed"
            value={stats.tasksCompleted}
            color="green"
          />
        </div>
      </div>

      {/* --- Analytical Graphs Section --- */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900 [.dark_&]:text-white sm:text-2xl mb-6">
          Project Analytics Dashboard
        </h2>

        {/* Top Row - Project Progress and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <BarChart
              data={monthlyStatus}
              title="Monthly Project Status (Last 12 months)"
              dataKey1="completed"
              dataKey2="inProgress"
              dataKey3="pending"
              label1="Completed"
              label2="In Progress"
              label3="Pending"
              color1="#10B981"
              color2="#3B82F6"
              color3="#F59E0B"
            />
          </Card>

          <Card className="p-6">
            <Calendar data={events} title="Project Calendar & Events" tasks={filteredTasks} />
          </Card>
        </div>

        {/* Bottom Row - Projects Progress and Project Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <ProjectsProgress />
          </Card>

          <Card className="p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">
                Project Health Overview
              </h3>
              {statusSummary.total === 0 && (
                <div className="text-sm text-gray-500 [.dark_&]:text-gray-400 mb-2">
                  No task data yet.
                </div>
              )}

              {/* Status distribution stacked bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-3 overflow-hidden flex">
                  {statusSummary.counts.done > 0 && (
                    <div
                      className="h-3 bg-green-500"
                      style={{ flexGrow: statusSummary.counts.done }}
                      title={`Done ${statusSummary.counts.done} (${statusSummary.pct.done}%)`}
                    />
                  )}
                  {statusSummary.counts.inProgress > 0 && (
                    <div
                      className="h-3 bg-blue-500"
                      style={{ flexGrow: statusSummary.counts.inProgress }}
                      title={`In Progress ${statusSummary.counts.inProgress} (${statusSummary.pct.inProgress}%)`}
                    />
                  )}
                  {statusSummary.counts.todo > 0 && (
                    <div
                      className="h-3 bg-gray-400"
                      style={{ flexGrow: statusSummary.counts.todo }}
                      title={`To-Do ${statusSummary.counts.todo} (${statusSummary.pct.todo}%)`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 [.dark_&]:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    Done:{" "}
                    <span className="font-medium text-gray-900 [.dark_&]:text-white">
                      {statusSummary.counts.done}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    In Progress:{" "}
                    <span className="font-medium text-gray-900 [.dark_&]:text-white">
                      {statusSummary.counts.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                    To-Do:{" "}
                    <span className="font-medium text-gray-900 [.dark_&]:text-white">
                      {statusSummary.counts.todo}
                    </span>
                  </div>
                  <div className="ml-auto text-xs">
                    Total tasks:{" "}
                    <span className="font-medium text-gray-900 [.dark_&]:text-white">
                      {statusSummary.total}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portfolio health counts */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-50 [.dark_&]:bg-green-500/10 border border-green-100 [.dark_&]:border-green-500/30">
                  <div className="text-xs text-green-700 [.dark_&]:text-green-400">On Track</div>
                  <div className="text-lg font-semibold text-green-800 [.dark_&]:text-green-300">
                    {projectHealth.counts.onTrack}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 [.dark_&]:bg-amber-500/10 border border-amber-100 [.dark_&]:border-amber-500/30">
                  <div className="text-xs text-amber-700 [.dark_&]:text-amber-400">Needs Attention</div>
                  <div className="text-lg font-semibold text-amber-800 [.dark_&]:text-amber-300">
                    {projectHealth.counts.needsAttention}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 [.dark_&]:bg-red-500/10 border border-red-100 [.dark_&]:border-red-500/30">
                  <div className="text-xs text-red-700 [.dark_&]:text-red-400">At Risk</div>
                  <div className="text-lg font-semibold text-red-800 [.dark_&]:text-red-300">
                    {projectHealth.counts.atRisk}
                  </div>
                </div>
              </div>

              {/* Top at-risk projects */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                    Top At-Risk Projects
                  </h4>
                  <span className="text-xs text-gray-600 [.dark_&]:text-gray-400">
                    Showing up to 3
                  </span>
                </div>
                {projectHealth.topAtRisk.length === 0 ? (
                  <div className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                    No at-risk projects. Keep it up!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-32 overflow-auto pr-1">
                    {projectHealth.topAtRisk.map((p) => (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-red-600 [.dark_&]:text-red-400 font-medium">
                            {p.overdue} overdue
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500 bg-red-500"
                            style={{ width: `${p.progress}%` }}
                            title={`Completion ${p.progress}%`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer stats */}
              <div className="mt-6 p-4 bg-gray-50 [.dark_&]:bg-white/5 rounded-lg border border-gray-100 [.dark_&]:border-white/10">
                <div className="text-sm text-gray-600 [.dark_&]:text-gray-400">
                  <div className="flex justify-between items-center">
                    <span>Total Active Projects:</span>
                    <span className="font-semibold text-gray-900 [.dark_&]:text-white">
                      {projects.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>Average Completion Rate:</span>
                    <span className="font-semibold text-green-600 [.dark_&]:text-green-400">
                      {projects.length
                        ? Math.round(
                          projects
                            .map((p) => {
                              const projTasks = tasks.filter(
                                (t) => t.projectId === p.id
                              );
                              const total = projTasks.length;
                              const done = projTasks.filter(
                                (t) => normalizeStatus(t.status) === "Done"
                              ).length;
                              return total > 0 ? (done / total) * 100 : 0;
                            })
                            .reduce((a, b) => a + b, 0) / projects.length
                        )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

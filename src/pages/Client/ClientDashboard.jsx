import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import { useAuthContext } from "../../context/useAuthContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import {
  FaProjectDiagram,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaArrowRight,
  FaBell,
  FaStickyNote,
  FaThumbtack,
  FaPlus,
} from "react-icons/fa";
import { LuNotebookPen, LuAlarmClock } from "react-icons/lu";
import toast from "react-hot-toast";

export default function ClientDashboard() {
  const { user, userData, loading } = useAuthContext();
  const navigate = useNavigate();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
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
  const [savingReminder, setSavingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const quickMenusRef = useRef(null);

  const isTaskExpired = (task) => {
    const created = task.createdAt;
    if (!created) return false;
    const createdDate = created?.toDate ? created.toDate() : new Date(created);
    const now = new Date();
    const diffMs = now - createdDate;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    return diffMs >= twelveHoursMs;
  };

  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);

    // Fetch tasks assigned to client
    const qTasks = query(
      collection(db, "tasks"),
      where("assigneeType", "==", "client"),
      where("assigneeId", "==", uid)
    );
    const unsubT = onSnapshot(qTasks, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          ...data,
          status:
            data.status === "In Review"
              ? "In Progress"
              : data.status || "To-Do",
        };
      });
      const active = items.filter((t) => !isTaskExpired(t));
      setTasks(active);
      setLoadingData(false);
    });

    // Fetch events for client
    const qEvents = query(
      collection(db, "events"),
      where("clientId", "==", uid)
    );
    const unsubE = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Fetch projects for client
    const qProjects = query(
      collection(db, "projects"),
      where("clientId", "==", uid)
    );
    const unsubP = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubT();
      unsubE();
      unsubP();
    };
  }, [uid]);

  // Close quick menus (reminders/notes) when clicking outside
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

  useEffect(() => {
    if (!uid) return;
    const qRem = query(
      collection(db, "reminders"),
      where("userId", "==", uid),
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

      // Show snackbar for due reminders (match SuperAdmin behavior)
      const now = new Date();
      items
        .filter((r) => {
          const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
          return dueAt <= now && !r.isRead;
        })
        .forEach((r) => {
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
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0 max-h-16 overflow-y-auto">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="text-[11px] font-semibold text-indigo-600 tracking-wide uppercase">
                          Reminder
                        </div>
                        {timeLabel && (
                          <div className="ml-2 text-[10px] text-gray-500 font-medium whitespace-nowrap">
                            {timeLabel}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-900 break-words leading-snug">
                        {r.title || "Untitled reminder"}
                      </div>
                      {r.description && (
                        <div className="text-[11px] text-gray-600 mt-0.5 break-words leading-snug">
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
    return () => unsub();
  }, [uid]);

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

  // Load client notes from top-level 'notes' collection (one document per note)
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "notes"), where("userUid", "==", uid));
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
      setNotes(sorted);
    }, (error) => {
      console.error("Failed to load notes", error);
    });
    return () => unsub();
  }, [uid]);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const pendingTasks = tasks.filter(
    (t) => t.status === "To-Do" || t.status === "In Progress"
  ).length;
  const totalProjects = projects.length;
  const completedProjects = projects.filter(
    (p) => p.progress === 100 || p.status === "Completed"
  ).length;
  const upcomingEvents = events.filter((e) => {
    const eventDate = new Date(e.date || e.startDate || e.dueDate);
    return eventDate >= new Date();
  }).length;

  // Navigation handlers for KPI cards
  const handleProjectsClick = () => {
    navigate("/client/projects");
  };

  const handleTasksClick = () => {
    navigate("/client/tasks");
  };

  const handleCompletedClick = () => {
    // Navigate to projects page with completed filter
    navigate("/client/projects", { state: { showCompleted: true } });
  };

  const handlePendingClick = () => {
    // Navigate to tasks page with pending filter
    navigate("/client/tasks", { state: { filterStatus: "pending" } });
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-content-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const welcomeTitle = `Welcome${userData?.clientName || userData?.name || userData?.companyName
    ? ", " + (userData?.clientName || userData?.name || userData?.companyName)
    : ""
    }!`;

  return (
    <div>
      <PageHeader
        title={welcomeTitle}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2" ref={quickMenusRef}>
              <button
                type="button"
                onClick={() => {
                  setShowQuickMenu((v) => !v);
                  setShowReminderMenu(false);
                  setShowNotesMenu(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Quick actions"
              >
                <LuNotebookPen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReminderMenu((v) => !v);
                  setShowNotesMenu(false);
                  setShowQuickMenu(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Notifications"
              >
                <FaBell className="h-4 w-4" />
              </button>
              {showQuickMenu && (
                <div className="absolute right-0 top-9 z-30 w-44 rounded-lg bg-white [.dark_&]:bg-[#1F2234] shadow-lg border border-gray-200 [.dark_&]:border-white/20 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReminderMenu(true);
                      setShowNotesMenu(false);
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 text-gray-700 [.dark_&]:text-gray-200 flex items-center gap-2"
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
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 text-gray-700 [.dark_&]:text-gray-200 border-t border-gray-100 [.dark_&]:border-white/10 flex items-center gap-2"
                  >
                    <FaStickyNote className="h-3.5 w-3.5 text-amber-500" />
                    <span>Notes</span>
                  </button>
                </div>
              )}

              {showReminderMenu && (
                <div className="absolute right-0 top-11 z-20 w-80 rounded-lg bg-white [.dark_&]:bg-[#1F2234] shadow-lg border border-gray-200 [.dark_&]:border-white/20 p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800 [.dark_&]:text-white">Quick Reminders</div>
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
                        setEditingReminderId(null);
                        setRemTitle("");
                        setRemDesc("");
                        setShowInlineReminderForm((v) => !v);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 [.dark_&]:hover:bg-white/10 text-indigo-600 [.dark_&]:text-indigo-400"
                      title="Add reminder"
                    >
                      <FaPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {showInlineReminderForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!uid) {
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
                              userId: uid,
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
                          className="rounded border border-gray-200 [.dark_&]:border-white/20 px-2 py-1 text-sm bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
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
                          className="px-2 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
                              <div className="text-[11px] text-gray-500 [.dark_&]:text-gray-400">{formatDueTime(r.dueAt)}</div>
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
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
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
                        <span className="text-xs text-gray-400 [.dark_&]:text-gray-500">{notes.length} {notes.length === 1 ? "Note" : "Notes"}</span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = noteInput.trim();
                          if (!trimmed || !uid) return;
                          try {
                            if (editingNoteId) {
                              await updateDoc(doc(db, "notes", editingNoteId), {
                                title: trimmed,
                                bodyText: trimmed,
                                updatedAt: serverTimestamp(),
                              });
                            } else {
                              await addDoc(collection(db, "notes"), {
                                title: trimmed,
                                bodyText: trimmed,
                                category: "General",
                                color: "Yellow",
                                isPinned: false,
                                userUid: uid,
                                userEmail: user?.email || userData?.email || "",
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                              });
                            }

                            // Reload notes for this user
                            const q = query(collection(db, "notes"), where("userUid", "==", uid));
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
                          }
                        }}
                        className="px-2 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-700 disabled:opacity-50"
                        disabled={!noteInput.trim()}
                      >
                        {editingNoteId ? "Update" : "Create"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 [.dark_&]:border-white/20 rounded-md px-2 py-1 text-sm bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [.dark_&]:focus:ring-indigo-400"
                    placeholder="Write a quick note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  {notes.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 [.dark_&]:border-white/10 pt-2 max-h-40 overflow-y-auto space-y-2">
                      {notes.map((note) => (
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
                            <p className="text-xs text-gray-700 [.dark_&]:text-gray-300 leading-snug whitespace-pre-wrap break-all flex-1">
                              {note.text}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNoteInput(note.text);
                                setEditingNoteId(note.id);
                              }}
                              className="p-1 rounded hover:bg-gray-200 [.dark_&]:hover:bg-white/10 text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-800 [.dark_&]:hover:text-gray-200"
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
                                if (!uid) return;
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
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
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
          </div>
        }
      >
        Here's an overview of your projects, tasks, and upcoming events.
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={handleProjectsClick} className="cursor-pointer">
          <StatCard
            icon={<FaProjectDiagram className="h-5 w-5" />}
            label="Total Projects"
            value={String(totalProjects)}
            color="blue"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handleTasksClick} className="cursor-pointer">
          <StatCard
            icon={<FaTasks className="h-5 w-5" />}
            label="Total Tasks"
            value={String(totalTasks)}
            color="indigo"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handleCompletedClick} className="cursor-pointer">
          <StatCard
            icon={<FaCheckCircle className="h-5 w-5" />}
            label="Completed Projects"
            value={String(completedProjects)}
            color="green"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handlePendingClick} className="cursor-pointer">
          <StatCard
            icon={<FaClock className="h-5 w-5" />}
            label="Pending Tasks"
            value={String(pendingTasks)}
            color="amber"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
      </div>

      {/* Recent Tasks and Upcoming Events */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">
              Recent Tasks
            </h3>
            <Link
              to="/client/tasks"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              View All <FaArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-content-tertiary">
              <FaTasks className="mx-auto text-4xl mb-2 text-gray-300" />
              <p>No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="p-3 border border-subtle rounded-lg hover:border-indigo-300 transition-colors bg-surface-subtle"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-content-primary">
                        {task.title || task.taskName || "Untitled Task"}
                      </p>
                      <p className="text-sm text-content-secondary mt-1">
                        {task.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${task.status === "Done"
                        ? "bg-success-100 text-success-600"
                        : task.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {task.status || "To-Do"}
                    </span>
                  </div>
                  {task.dueDate && (
                    <p className="text-xs text-content-tertiary mt-2">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">
              Upcoming Events
            </h3>
            <Link
              to="/client/calendar"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              View Calendar <FaArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingEvents === 0 ? (
            <div className="text-center py-8 text-content-tertiary">
              <FaCalendarAlt className="mx-auto text-4xl mb-2 text-gray-300" />
              <p>No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter((e) => {
                  const eventDate = new Date(
                    e.date || e.startDate || e.dueDate
                  );
                  return eventDate >= new Date();
                })
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border border-subtle rounded-lg hover:border-indigo-300 transition-colors bg-surface-subtle"
                  >
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <FaCalendarAlt className="text-indigo-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-content-primary">
                          {event.title || event.name || "Untitled Event"}
                        </p>
                        <p className="text-sm text-content-secondary mt-1">
                          {new Date(
                            event.date || event.startDate || event.dueDate
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* Active Projects */}
      <Card className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content-primary">
            Active Projects
          </h3>
          <Link
            to="/client/projects"
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
          >
            View All <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-content-tertiary">
            <FaProjectDiagram className="mx-auto text-4xl mb-2 text-gray-300" />
            <p>No projects assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="p-4 border border-subtle rounded-lg hover:border-indigo-300 hover:shadow-soft transition-all bg-surface-subtle"
              >
                <h4 className="font-semibold text-content-primary mb-2">
                  {project.name || project.projectName || "Untitled Project"}
                </h4>
                <p className="text-sm text-content-secondary mb-3 line-clamp-2">
                  {project.description || "No description available"}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${project.status === "Completed"
                      ? "bg-success-100 text-success-600"
                      : project.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {project.status || "Active"}
                  </span>
                  {project.progress !== undefined && (
                    <span className="text-xs text-content-tertiary">
                      {project.progress}% Complete
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

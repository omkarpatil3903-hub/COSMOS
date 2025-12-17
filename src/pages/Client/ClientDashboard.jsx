import React, { useEffect, useState } from "react";
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
} from "react-icons/fa";
import { LuNotebookPen, LuAlarmClock } from "react-icons/lu";

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
      setTasks(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            status:
              data.status === "In Review"
                ? "In Progress"
                : data.status || "To-Do",
          };
        })
      );
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

  // Load client notes from top-level 'notes' collection (one document per note)
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "notes"), where("userUid", "==", uid));
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
        setNotes(sorted);
      } catch (e) {
        console.error("Failed to load notes", e);
      }
    };
    load();
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

  const welcomeTitle = `Welcome${
    userData?.clientName || userData?.name || userData?.companyName
      ? ", " + (userData?.clientName || userData?.name || userData?.companyName)
      : ""
  }!`;

  return (
    <div>
      <PageHeader
        title={welcomeTitle}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickMenu((v) => !v);
                  setShowReminderMenu(false);
                  setShowNotesMenu(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Quick actions"
              >
                <LuNotebookPen className="h-4 w-4" />
              </button>
              {showQuickMenu && (
                <div className="absolute right-0 top-9 z-30 w-44 rounded-lg bg-white shadow-lg border border-gray-200 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReminderMenu(true);
                      setShowNotesMenu(false);
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
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
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 border-t border-gray-100 flex items-center gap-2"
                  >
                    <FaStickyNote className="h-3.5 w-3.5 text-amber-500" />
                    <span>Notes</span>
                  </button>
                </div>
              )}

              {showReminderMenu && (
                <div className="absolute right-0 top-11 z-20 w-64 rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-sm">
                  <div className="font-semibold mb-2 text-gray-800">
                    Quick Reminders
                  </div>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Check recent project updates.</li>
                    <li>• Review upcoming meetings.</li>
                    <li>• Share feedback with your manager.</li>
                  </ul>
                </div>
              )}

              {showNotesMenu && (
                <div className="absolute right-0 top-11 z-20 w-72 rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">Quick Notes</div>
                    <div className="flex items-center gap-2">
                      {notes.length > 0 && (
                        <span className="text-xs text-gray-400">{notes.length} saved</span>
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
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Write a quick note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  {notes.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 pt-2 max-h-40 overflow-y-auto space-y-2">
                      {notes.map((note) => (
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
                              className={`p-1 rounded hover:bg-gray-200 ${note.isPinned ? "text-amber-600" : "text-gray-400 hover:text-gray-600"}`}
                              title={note.isPinned ? "Unpin note" : "Pin note"}
                            >
                              <FaThumbtack className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNoteInput(note.text);
                                setEditingNoteId(note.id);
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
                      className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        task.status === "Done"
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
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === "Completed"
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

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import TaskModal from "../../components/TaskModal";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaClock,
  FaTasks,
} from "react-icons/fa";
import { db, auth } from "../../firebase";
import {
  TYPE_CLASSES,
  PRIORITY_CLASSES,
  getPriorityBadge,
} from "../../utils/colorMaps";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// Refactored: Import utilities and services
import { tsToDate, dateToInputValue, DAY_NAMES } from "../../utils/dateUtils";
import { calculateCalendarStats } from "../../utils/calendarUtils";
import StatsCards from "../../components/calendar/StatsCards";
import CalendarHeader from "../../components/calendar/CalendarHeader";
import { expandRecurringOccurrences } from "../../utils/recurringTasks";
import { useTheme } from "../../context/ThemeContext";

// Refactored: Utility functions moved to utils/dateUtils.js and utils/calendarUtils.js
const buildDefaultEventForm = (baseDate = new Date()) => ({
  title: "",
  type: "meeting",
  status: "pending",
  date: dateToInputValue(baseDate),
  time: "09:00",
  duration: 60,
  clientId: "",
  description: "",
  priority: "medium",
  location: "",
  attendeesText: "",
});

function Calendar({ onlyMyManagedProjects = false }) {
  const { mode } = useTheme();
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeRequestDate, setActiveRequestDate] = useState(null);
  const [eventForm, setEventForm] = useState(() => buildDefaultEventForm());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  const clientsById = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      map.set(client.id, client);
    });
    return map;
  }, [clients]);

  // Auto-select date from navigation state (from dashboard calendar dot click)
  const location = useLocation();
  useEffect(() => {
    const dateParam = location.state?.date;
    if (dateParam) {
      const parsed = new Date(dateParam + "T00:00:00");
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        setCurrentDate(parsed);
      }
    }
  }, [location.state]);

  // Firestore subscriptions
  useEffect(() => {
    let unsubEvents,
      unsubMeetingRequests,
      unsubClients,
      unsubTasks,
      unsubResources,
      unsubProjects;

    const initSubscriptions = async () => {
      unsubEvents = onSnapshot(
        query(collection(db, "events"), orderBy("date", "asc")),
        (snap) => {
          const loadedEvents = snap.docs.map((d) => {
            const data = d.data() || {};
            const cancelledAt = tsToDate(data.cancelledAt);
            const completedAt = tsToDate(data.completedAt);
            const createdAt = tsToDate(data.createdAt);
            const status = String(data.status || "pending").toLowerCase();
            const type = String(data.type || "meeting").toLowerCase();
            const priority = String(data.priority || "medium").toLowerCase();
            return {
              id: d.id,
              title: data.title || "",
              type,
              status,
              date: data.date || "",
              time: data.time || "",
              duration: data.duration || 60,
              clientId: data.clientId || "",
              clientName: data.clientName || "",
              description: data.description || "",
              priority,
              location: data.location || "",
              attendees: data.attendees || [],
              attendeeIds: data.attendeeIds || [],
              createdBy: data.createdBy || "",
              objectives: data.objectives || [],
              cancelReason: data.cancelReason || "",
              cancelledBy: data.cancelledBy || "",
              cancelledAt,
              completedAt,
              createdAt,
              assignee: data.assignee || "",
              progress: data.progress || 0,
            };
          });
          setEvents(loadedEvents);
        }
      );

      unsubMeetingRequests = onSnapshot(
        collection(db, "meetingRequests"),
        (snap) => {
          setMeetingRequests(
            snap.docs.map((d) => {
              const data = d.data() || {};
              const requestedAt = tsToDate(data.requestedAt);
              const rejectedAt = tsToDate(data.rejectedAt);
              return {
                id: d.id,
                clientId: data.clientId || "",
                clientName: data.clientName || "",
                companyName: data.companyName || "",
                requestedDate: data.requestedDate || "",
                requestedTime: data.requestedTime || "",
                duration: data.duration || 60,
                purpose: data.purpose || "",
                priority: data.priority || "medium",
                status: data.status || "pending",
                requestedAt,
                rejectedAt,
                rejectedBy: data.rejectedBy || "",
                rejectionReason: data.rejectionReason || "",
                email: data.email || "",
                phone: data.phone || "",
              };
            })
          );
        }
      );

      unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      });

      unsubTasks = onSnapshot(
        query(collection(db, "tasks"), orderBy("dueDate", "asc")),
        (snap) => {
          setTasks(
            snap.docs.map((d) => {
              const data = d.data() || {};
              const dueDate = tsToDate(data.dueDate);
              const createdAt = tsToDate(data.createdAt);
              const completedAt = tsToDate(data.completedAt);
              return {
                id: d.id,
                title: data.title || "",
                projectId: data.projectId || "",
                assigneeId: data.assigneeId || "",
                assigneeType: data.assigneeType || "user",
                status: data.status || "To-Do",
                priority: data.priority || "Medium",
                dueDate,
                createdAt,
                completedAt,
                archived: data.archived || false,
              };
            })
          );
          setLoading(false);
        }
      );

      // Load resources (employees)
      unsubResources = onSnapshot(
        query(collection(db, "users"), orderBy("name", "asc")),
        (snap) => {
          const loadedResources = snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name || d.data().email || "Unknown",
            email: d.data().email || "",
            role: d.data().role || "resource",
          }));
          setResources(loadedResources);
        }
      );

      // Load projects
      unsubProjects = onSnapshot(
        query(collection(db, "projects"), orderBy("projectName", "asc")),
        (snap) => {
          const loadedProjects = snap.docs
            .map((d) => {
              const data = d.data() || {};
              return {
                id: d.id,
                name: data.projectName || data.name || "",
                ...data,
              };
            })
            .filter((p) => !p.deleted && !p.isDeleted);
          setProjects(loadedProjects);
        }
      );
    };

    initSubscriptions();

    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubMeetingRequests) unsubMeetingRequests();
      if (unsubClients) unsubClients();
      if (unsubTasks) unsubTasks();
      if (unsubResources) unsubResources();
      if (unsubProjects) unsubProjects();
    };
  }, []);

  // Get managed project IDs for Manager filtering
  const managedProjectIds = useMemo(() => {
    if (!onlyMyManagedProjects) return null;
    const currentUser = auth.currentUser;
    return projects
      .filter(p => p.projectManagerId === currentUser?.uid)
      .map(p => p.id);
  }, [projects, onlyMyManagedProjects]);

  // Filter projects for Manager view
  const filteredProjects = useMemo(() => {
    if (!managedProjectIds) return projects;
    return projects.filter(p => managedProjectIds.includes(p.id));
  }, [projects, managedProjectIds]);

  // Combine events and tasks with dueDate, expanding recurring tasks within the visible month
  const allEvents = useMemo(() => {
    const eventList = [...events];

    // Add tasks with dueDate as events
    tasks.forEach((task) => {
      if (!task.dueDate || task.archived) return;

      // Skip tasks not in managed projects (for Manager view)
      if (managedProjectIds && !managedProjectIds.includes(task.projectId)) return;

      // Determine the visible month range based on currentDate
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      // Resolve base due date for non-recurring fallback
      const dueDate =
        task.dueDate instanceof Date ? task.dueDate : tsToDate(task.dueDate);

      // Find assignee name (client or user)
      let assigneeName = "";
      if (task.assigneeType === "client") {
        const client = clients.find((c) => c.id === task.assigneeId);
        assigneeName = client?.clientName || client?.companyName || "Client";
      } else {
        assigneeName = "Team Member";
      }

      const pushTaskEvent = (dateStr) => {
        eventList.push({
          id: `task_${task.id}_${dateStr}`,
          title: `Task: ${task.title}`,
          type: "task",
          status:
            task.status === "Done"
              ? "completed"
              : task.status === "In Progress"
                ? "pending"
                : "pending",
          date: dateStr,
          time: "23:59",
          duration: 0,
          clientId: task.assigneeType === "client" ? task.assigneeId : "",
          clientName: assigneeName,
          description: `Task assigned to ${assigneeName}`,
          priority: String(task.priority || "Medium").toLowerCase(),
          location: "",
          attendees: [assigneeName],
          createdBy: "",
          objectives: [],
          assignee: task.assigneeId,
          progress:
            task.status === "Done"
              ? 100
              : task.status === "In Progress"
                ? 50
                : 0,
          isTask: true,
          taskId: task.id,
        });
      };

      if (task.isRecurring && !task.parentRecurringTaskId) {
        const occurrenceDates = expandRecurringOccurrences(
          task,
          monthStart,
          monthEnd
        );
        occurrenceDates.forEach((dateStr) => pushTaskEvent(dateStr));
      } else {
        // Non-recurring: push single event on its due date
        const y = dueDate.getFullYear();
        const m = String(dueDate.getMonth() + 1).padStart(2, "0");
        const d = String(dueDate.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        pushTaskEvent(dateStr);
      }
    });


    return eventList;
  }, [events, tasks, clients, currentDate, managedProjectIds]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...allEvents]
      .filter((event) => {
        if (!event.date) return false;
        const eventDateTime = new Date(
          `${event.date}T${event.time || "00:00"}`
        );
        return eventDateTime >= now;
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const bTime = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [allEvents]);

  const requestsForModal = useMemo(() => {
    if (!activeRequestDate) return [];
    return meetingRequests.filter(
      (req) => req.requestedDate === activeRequestDate
    );
  }, [meetingRequests, activeRequestDate]);

  const openEventModal = (event) => {
    if (event?.isTask) return; // tasks are managed separately

    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title || "",
        type: event.type || "meeting",
        status: event.status || "pending",
        date: event.date || dateToInputValue(new Date()),
        time: event.time || "09:00",
        duration: event.duration || 60,
        clientId: event.clientId || "",
        description: event.description || "",
        priority: event.priority || "medium",
        location: event.location || "",
        attendeesText: (event.attendees || []).join(", "),
      });
      // Set selected attendees from event.attendeeIds
      setSelectedAttendees(event.attendeeIds || []);
    } else {
      const base = selectedDate || new Date();
      setEditingEvent(null);
      setEventForm(buildDefaultEventForm(base));
      setSelectedAttendees([]);
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    const base = selectedDate || new Date();
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm(buildDefaultEventForm(base));
    setSelectedAttendees([]);
  };

  const handleEventFormChange = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!eventForm.date) {
      toast.error("Date is required");
      return;
    }

    // Get attendee names from IDs
    const attendeeNames = selectedAttendees
      .map((id) => {
        const resource = resources.find((r) => r.id === id);
        return resource ? resource.name : "";
      })
      .filter(Boolean);

    const duration = Number(eventForm.duration) || 0;
    const clientRecord = eventForm.clientId
      ? clientsById.get(eventForm.clientId)
      : null;
    const clientName =
      clientRecord?.companyName || clientRecord?.clientName || "";

    const payload = {
      title: eventForm.title.trim(),
      type: eventForm.type,
      status: "approved", // Admin-created events are automatically approved
      date: eventForm.date,
      time: eventForm.time,
      duration,
      clientId: eventForm.clientId,
      clientName,
      description: eventForm.description,
      priority: eventForm.priority,
      location: eventForm.location,
      attendees: attendeeNames, // Store names for display
      attendeeIds: selectedAttendees, // Store IDs for filtering
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), payload);
        toast.success("Event updated successfully!");
      } else {
        await addDoc(collection(db, "events"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: "admin",
          approvedBy: "admin", // Admin-created events are automatically approved
          approvedAt: serverTimestamp(),
        });
        toast.success("Event created successfully!");
      }
      closeEventModal();
    } catch {
      toast.error("Failed to save event");
    }
  };

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return allEvents.filter((event) => {
      const eventDate = event.date;
      let typeMatch = filterType === "all" || event.type === filterType;
      let statusMatch = filterStatus === "all" || event.status === filterStatus;
      let projectMatch =
        filterProject === "all" ||
        (event.isTask &&
          tasks.find((t) => t.id === event.taskId)?.projectId ===
          filterProject);

      // Employee filter: check if employee is assigned to task or is attendee of event
      let employeeMatch = filterEmployee === "all";
      if (!employeeMatch && filterEmployee !== "all") {
        if (event.isTask) {
          // For tasks, check if the employee is the assignee
          const task = tasks.find((t) => t.id === event.taskId);
          employeeMatch =
            task?.assigneeId === filterEmployee &&
            task?.assigneeType === "user";
        } else {
          // For events, check if employee is in attendeeIds
          employeeMatch = event.attendeeIds?.includes(filterEmployee) || false;
        }
      }

      return (
        eventDate === dateStr &&
        typeMatch &&
        statusMatch &&
        projectMatch &&
        employeeMatch
      );
    });
  };

  // Get meeting requests for a specific date
  const getMeetingRequestsForDate = (date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const filtered = meetingRequests.filter(
      (req) => req.requestedDate === dateStr
    );
    return filtered;
  };

  // Handle event actions
  const handleApproveEvent = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), {
        status: "approved",
      });
      toast.success("Event approved successfully!");
    } catch {
      toast.error("Failed to approve event");
    }
  };

  const handleCancelEvent = async (eventId, reason) => {
    try {
      await updateDoc(doc(db, "events", eventId), {
        status: "cancelled",
        cancelReason: reason,
        cancelledBy: "admin",
        cancelledAt: serverTimestamp(),
      });
      toast.success("Event cancelled successfully!");
    } catch {
      toast.error("Failed to cancel event");
    }
  };

  const deleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db, "events", eventId));
        toast.success("Event deleted successfully!");
      } catch {
        toast.error("Failed to delete event");
      }
    }
  };

  // Handle meeting request approval
  const handleApproveRequest = async (requestId) => {
    const request = meetingRequests.find((req) => req.id === requestId);
    if (!request) return;


    try {
      // Create new event first
      const eventData = {
        title: `Client Meeting - ${request.purpose}`,
        type: "meeting",
        status: "approved",
        date: request.requestedDate,
        time: request.requestedTime,
        duration: request.duration,
        clientId: request.clientId,
        clientName: request.clientName,
        description: request.purpose,
        priority: request.priority,
        location: "Conference Room",
        attendees: [request.clientName],
        createdBy: "admin",
        createdAt: serverTimestamp(),
        objectives: [
          {
            id: `o_${Date.now()}`,
            text: "Discuss project requirements",
            completed: false,
          },
          {
            id: `o_${Date.now() + 1}`,
            text: "Review timeline",
            completed: false,
          },
        ],
      };

      const newEventRef = await addDoc(collection(db, "events"), eventData);

      // Remove the request after successful event creation
      await deleteDoc(doc(db, "meetingRequests", requestId));

      toast.success(
        `Meeting with ${request.clientName} approved and scheduled!`
      );
    } catch (error) {
      console.error("❌ Error approving request:", error);
      toast.error("Failed to approve meeting request");
    }
  };

  // Open rejection modal
  const openRejectModal = (request) => {
    setRejectingRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // Handle meeting request rejection
  const handleRejectRequest = async () => {
    if (!rejectingRequest) return;

    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      await updateDoc(doc(db, "meetingRequests", rejectingRequest.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: "admin",
        rejectionReason: rejectReason.trim(),
      });
      toast.success(
        `Meeting request from ${rejectingRequest.clientName} rejected.`
      );
      setShowRejectModal(false);
      setRejectingRequest(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject meeting request");
    }
  };

  // Task modal handlers
  const openTaskModal = () => {
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
  };

  const handleSaveTask = async (taskData) => {
    try {
      // Ensure id is not present for new tasks to let Firestore generate one
      const { id, ...dataWithoutId } = taskData;

      // Add admin-specific fields to the task data
      const adminTaskData = {
        ...dataWithoutId,
        createdAt: serverTimestamp(),
        createdBy: "admin",
        approvedBy: "admin", // Admin-created tasks are automatically approved
        approvedAt: serverTimestamp(),
        archived: false,
      };

      await addDoc(collection(db, "tasks"), adminTaskData);
      toast.success("Task created successfully!");
      closeTaskModal();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  // Show requests for a specific date
  const showRequestsForDate = (date) => {
    const requests = getMeetingRequestsForDate(date);
    if (requests.length > 0) {
      // Use local date string to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      setActiveRequestDate(dateStr);
      setShowRequestModal(true);
    }
  };

  useEffect(() => {
    if (!showRequestModal || !activeRequestDate) return;
    if (requestsForModal.length === 0) {
      setShowRequestModal(false);
      setActiveRequestDate(null);
    }
  }, [requestsForModal, showRequestModal, activeRequestDate]);

  // Refactored: Use utility function for stats calculation
  const calendarStats = useMemo(() => {
    return calculateCalendarStats(events, meetingRequests, tasks);
  }, [events, meetingRequests, tasks]);

  // Calendar rendering
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className={`h-28 border ${mode === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}
        ></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const dayRequests = getMeetingRequestsForDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0);
      const isPast = currentDate < today;
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`min-h-28 max-h-48 border p-2 cursor-pointer relative transition-all duration-200 overflow-hidden 
            ${mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}
            ${isPast
              ? (mode === 'dark' ? "bg-gray-900 hover:bg-gray-800" : "bg-white hover:bg-gray-100")
              : (mode === 'dark' ? "hover:bg-blue-900/20 hover:border-blue-700" : "hover:bg-blue-50 hover:shadow-inner hover:border-blue-300")
            }
            ${isToday
              ? (mode === 'dark'
                ? "bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-500 border-2 opacity-100 ring-2 ring-blue-900"
                : "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-400 border-2 opacity-100 ring-2 ring-blue-200")
              : ""
            }
            ${isSelected
              ? (mode === 'dark'
                ? "bg-gradient-to-br from-indigo-900/40 to-indigo-800/40 border-indigo-500 border-2 opacity-100 ring-2 ring-indigo-900"
                : "bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-400 border-2 opacity-100 ring-2 ring-indigo-200")
              : ""
            }`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-bold mb-1 ${isPast && !isToday
              ? (mode === 'dark' ? "text-gray-500" : "text-gray-400")
              : isToday
                ? (mode === 'dark' ? "text-blue-400 text-base" : "text-blue-700 text-base")
                : (mode === 'dark' ? "text-white" : "text-gray-800")
              } ${isSelected && !isToday ? (mode === 'dark' ? "text-indigo-400 text-base" : "text-indigo-700 text-base") : ""}`}
          >
            {day}
          </div>

          {/* Meeting requests indicator */}
          {dayRequests.length > 0 && (
            <div className="absolute top-2 right-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showRequestsForDate(date);
                }}
                className="w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full text-white text-xs flex items-center justify-center hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200 animate-pulse"
                title={`${dayRequests.length} meeting request(s)`}
              >
                {dayRequests.length}
              </button>
            </div>
          )}

          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event) => {
              const typeKey = String(event.type || "").toLowerCase();
              const priorityKey = String(event.priority || "").toLowerCase();
              const typeBadge =
                TYPE_CLASSES[typeKey]?.badge || "bg-gray-100 text-gray-700";
              const priorityDot =
                PRIORITY_CLASSES[priorityKey]?.dot || "bg-gray-400";

              return (
                <div
                  key={event.id}
                  className={`text-xs p-1.5 rounded-md ${typeBadge} truncate relative shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                  title={event.title}
                >
                  {/* Priority strip on the left -- hidden for meetings */}
                  {typeKey !== "meeting" && (
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${priorityDot}`}
                      aria-hidden
                    />
                  )}

                  <div className="flex items-center gap-1 pl-2">
                    <span className="truncate font-medium">
                      {event.time} {event.title}
                    </span>
                  </div>
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-600 font-semibold bg-gray-100 rounded px-2 py-1 text-center hover:bg-gray-200 transition-colors cursor-pointer">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // Refactored: monthNames and dayNames imported from dateUtils

  return (
    <div>
      <PageHeader title="Project Calendar">
        Manage meetings, tasks, milestones, and client interactions in one
        place.
      </PageHeader>

      {loading ? (
        <div className="space-y-6">
          {/* Skeleton for Calendar Controls */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          </Card>

          {/* Skeleton for Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-l-4">
                <div className="h-20 bg-gray-200 animate-pulse rounded" />
              </Card>
            ))}
          </div>

          {/* Skeleton for Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-3 p-4">
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-gray-200 animate-pulse rounded"
                  />
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 animate-pulse rounded" />
                <div className="h-32 bg-gray-200 animate-pulse rounded" />
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Refactored: Calendar Header Component */}
          <CalendarHeader
            currentDate={currentDate}
            onNavigateMonth={navigateMonth}
            onToday={() => setCurrentDate(new Date())}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterProject={filterProject}
            onFilterProjectChange={setFilterProject}
            filterEmployee={filterEmployee}
            onFilterEmployeeChange={setFilterEmployee}
            projects={filteredProjects}
            resources={resources}
            onAddEvent={() => openEventModal(null)}
            onAddTask={openTaskModal}
            employeeScheduleInfo={
              filterEmployee !== "all"
                ? {
                  name:
                    resources.find((r) => r.id === filterEmployee)?.name ||
                    "Unknown Employee",
                }
                : null
            }
            onClearEmployeeFilter={() => setFilterEmployee("all")}
          />

          {/* Refactored: Stats Cards Component */}
          <StatsCards stats={calendarStats} />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar Grid */}
            <Card className="lg:col-span-3 p-4">
              <div className="grid grid-cols-7 gap-0 mb-4">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className={`p-3 text-center font-semibold border-b ${mode === 'dark' ? 'text-white border-gray-700' : 'text-gray-700 border-gray-200'}`}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                {renderCalendarDays()}
              </div>
            </Card>

            {/* Event Details Sidebar */}
            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-4 border-b pb-2">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                  : "Select a date"}
              </h3>

              {selectedDate ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getEventsForDate(selectedDate).sort((a, b) => {
                    const timeA = a.time || "00:00";
                    const timeB = b.time || "00:00";
                    return timeA.localeCompare(timeB);
                  }).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <FaCalendarAlt className="text-gray-400 text-2xl" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        No events on this date
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Click "Add Event" or "Add Task" to schedule something
                      </p>
                    </div>
                  ) : (
                    getEventsForDate(selectedDate)
                      .sort((a, b) => {
                        const timeA = a.time || "00:00";
                        const timeB = b.time || "00:00";
                        return timeA.localeCompare(timeB);
                      })
                      .map((event) => {
                        const clientRecord = event.clientId
                          ? clientsById.get(event.clientId)
                          : null;
                        const contactName =
                          event.clientName ||
                          clientRecord?.companyName ||
                          clientRecord?.clientName ||
                          "—";
                        const contactEmail =
                          clientRecord?.email || event.email || "—";
                        const isTaskEvent = Boolean(event.isTask);
                        const statusStyles = {
                          approved: "bg-green-100 text-green-700",
                          pending: "bg-yellow-100 text-yellow-700",
                          cancelled: "bg-red-100 text-red-700",
                          completed: "bg-blue-100 text-blue-700",
                        };
                        const statusClass =
                          statusStyles[event.status] ||
                          "bg-gray-100 text-gray-600";
                        // Show "by admin" for admin-created events instead of status
                        const isAdminCreated = event.createdBy === "admin";
                        const displayLabel = isAdminCreated
                          ? "by admin"
                          : event.status
                            ? event.status.replace(/\b\w/g, (ch) =>
                              ch.toUpperCase()
                            )
                            : "Pending";
                        const displayClass = isAdminCreated
                          ? "bg-blue-100 text-blue-700"
                          : statusClass;

                        return (
                          <div
                            key={event.id}
                            className="border-2 rounded-lg p-3 space-y-2 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium text-sm dark:text-gray-200">
                                  {event.title}
                                </h4>
                                <span
                                  className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${displayClass}`}
                                >
                                  {displayLabel}
                                </span>
                              </div>
                              {!isTaskEvent && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openEventModal(event)}
                                    className="w-11 h-11 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit event"
                                  >
                                    <FaEdit size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteEvent(event.id)}
                                    className="w-11 h-11 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Delete event"
                                  >
                                    <FaTrash size={16} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              <div>Time: {event.time || "—"}</div>
                              <div>Client: {contactName}</div>
                              <div>
                                Duration:{" "}
                                {event.duration
                                  ? `${event.duration} minutes`
                                  : "—"}
                              </div>
                              <div>Email: {contactEmail}</div>
                              {event.priority && event.type !== "meeting" && (
                                <div>
                                  Priority:{" "}
                                  <span
                                    className={`inline-block ml-1 px-2 py-0.5 rounded ${getPriorityBadge(
                                      event.priority
                                    )}`}
                                  >
                                    {String(event.priority)
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase() +
                                      String(event.priority).trim().slice(1)}
                                  </span>
                                </div>
                              )}
                              {event.location && (
                                <div>Location: {event.location}</div>
                              )}
                              {event.description && (
                                <div className="text-[11px] text-content-secondary">
                                  Notes: {event.description}
                                </div>
                              )}
                            </div>

                            {event.objectives &&
                              event.objectives.length > 0 && (
                                <div className="border-t pt-2">
                                  <p className="text-[11px] font-semibold text-content-secondary mb-1">
                                    Objectives
                                  </p>
                                  <ul className="space-y-1">
                                    {event.objectives.map((objective) => (
                                      <li
                                        key={objective.id}
                                        className="text-[11px] text-content-secondary"
                                      >
                                        • {objective.text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            <div className="flex gap-2 mt-2">
                              {event.status === "pending" &&
                                !isTaskEvent &&
                                !isAdminCreated && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleApproveEvent(event.id)
                                      }
                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                                    >
                                      <FaCheck size={10} /> Approve
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCancelEvent(
                                          event.id,
                                          "Cancelled by admin"
                                        )
                                      }
                                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                                    >
                                      <FaTimes size={10} /> Cancel
                                    </button>
                                  </>
                                )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  <FaCalendarAlt
                    size={48}
                    className="mx-auto mb-4 opacity-50 dark:text-gray-600"
                  />
                  <p className="text-sm dark:text-gray-400">Click on a date to view events</p>
                </div>
              )}
            </Card>
          </div>

          {upcomingEvents.length > 0 && (
            <Card title="Upcoming Schedule" icon={<FaClock />}>
              <ul className="space-y-3">
                {upcomingEvents.map((event) => {
                  const clientRecord = event.clientId
                    ? clientsById.get(event.clientId)
                    : null;
                  const contactName =
                    event.clientName ||
                    clientRecord?.companyName ||
                    clientRecord?.clientName ||
                    "—";
                  const eventDateTime = new Date(
                    `${event.date}T${event.time || "00:00"}`
                  );
                  const dateLabel = Number.isNaN(eventDateTime.getTime())
                    ? "TBD"
                    : eventDateTime.toLocaleDateString();
                  const timeLabel = Number.isNaN(eventDateTime.getTime())
                    ? "—"
                    : event.time || "—";
                  return (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-4 border-b border-subtle pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-sm text-content-primary dark:text-gray-200">
                          {event.title}
                        </p>
                        <p className="text-xs text-content-secondary dark:text-gray-400">
                          {contactName}
                        </p>
                      </div>
                      <div className="text-right text-xs text-content-secondary">
                        <div>{dateLabel}</div>
                        <div>{timeLabel}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Event Create/Edit Modal */}
          {showEventModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeEventModal}
              />
              <Card className="z-10 w-full max-w-xl md:max-w-2xl max-h-[90vh] overflow-auto dark:bg-gray-800 dark:border-gray-700">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {editingEvent ? "Edit Event" : "Create Event"}
                  </h2>
                  <button
                    onClick={closeEventModal}
                    className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
                  >
                    ✕
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSaveEvent}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Title
                      </span>
                      <input
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.title}
                        onChange={(e) =>
                          handleEventFormChange("title", e.target.value)
                        }
                        placeholder="Project sync with client"
                        required
                        spellCheck="true"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Client
                      </span>
                      <select
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.clientId}
                        onChange={(e) =>
                          handleEventFormChange("clientId", e.target.value)
                        }
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.companyName ||
                              client.clientName ||
                              client.email}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Duration (minutes)
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.duration}
                        onChange={(e) =>
                          handleEventFormChange("duration", e.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Date
                      </span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.date}
                        onChange={(e) =>
                          handleEventFormChange("date", e.target.value)
                        }
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Time
                      </span>
                      <input
                        type="time"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.time}
                        onChange={(e) =>
                          handleEventFormChange("time", e.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Description
                      </span>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={eventForm.description}
                        onChange={(e) =>
                          handleEventFormChange("description", e.target.value)
                        }
                        placeholder="Agenda or key talking points"
                        spellCheck="true"
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-medium text-content-secondary dark:text-gray-300">
                        Attendees (Select Resources)
                      </span>
                      <div className="border border-subtle rounded-md bg-surface p-3 max-h-48 overflow-y-auto dark:bg-gray-700 dark:border-gray-600">
                        {resources.length === 0 ? (
                          <p className="text-sm text-content-tertiary">
                            No resources available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {resources.map((resource) => (
                              <label
                                key={resource.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-surface-subtle dark:hover:bg-gray-600 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedAttendees.includes(
                                    resource.id
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAttendees([
                                        ...selectedAttendees,
                                        resource.id,
                                      ]);
                                    } else {
                                      setSelectedAttendees(
                                        selectedAttendees.filter(
                                          (id) => id !== resource.id
                                        )
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-500"
                                />
                                <span className="text-sm dark:text-gray-200">{resource.name}</span>
                                <span className="text-xs text-content-tertiary">
                                  ({resource.email})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedAttendees.length > 0 && (
                        <p className="text-xs text-content-tertiary mt-1">
                          {selectedAttendees.length} attendee(s) selected
                        </p>
                      )}
                    </label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeEventModal}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingEvent ? "Save Changes" : "Create Event"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* Task Creation Modal */}
          {showTaskModal && (
            <TaskModal
              onClose={closeTaskModal}
              onSave={handleSaveTask}
              taskToEdit={null}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              assignees={resources}
              clients={clients}
              isManager={onlyMyManagedProjects}
            />
          )}

          {/* Meeting Requests Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowRequestModal(false);
                  setActiveRequestDate(null);
                }}
              />
              <Card className="z-10 max-w-4xl max-h-[90vh] overflow-auto dark:bg-gray-800 dark:border-gray-700">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Meeting Requests -{" "}
                    {activeRequestDate
                      ? new Date(
                        activeRequestDate + "T00:00"
                      ).toLocaleDateString()
                      : ""}
                  </h2>
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setActiveRequestDate(null);
                    }}
                    className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {requestsForModal.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-3 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-content-primary dark:text-gray-200">
                            {request.companyName}
                          </h3>
                          <p className="text-sm text-content-secondary dark:text-gray-400">
                            Contact: {request.clientName}
                          </p>
                        </div>
                        {/* Remove status badge */}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-content-secondary">
                            Requested Time:
                          </span>
                          <div>{request.requestedTime}</div>
                        </div>
                        <div>
                          <span className="font-medium text-content-secondary">
                            Duration:
                          </span>
                          <div>{request.duration} minutes</div>
                        </div>
                        <div>
                          <span className="font-medium text-content-secondary">
                            Email:
                          </span>
                          <div>{request.email}</div>
                        </div>
                        <div>
                          <span className="font-medium text-content-secondary dark:text-gray-300">
                            Phone:
                          </span>
                          <div className="dark:text-gray-200">{request.phone}</div>
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-content-secondary dark:text-gray-300">
                          Purpose:
                        </span>
                        <p className="mt-1 text-sm text-content-primary dark:text-gray-200">
                          {request.purpose}
                        </p>
                      </div>

                      {/* Remove priority section */}

                      <div className="text-xs text-content-tertiary">
                        Requested on:{" "}
                        {request.requestedAt
                          ? request.requestedAt.toLocaleString()
                          : "—"}
                      </div>

                      {/* Show buttons only for pending requests */}
                      {request.status === "pending" ? (
                        <div className="flex gap-3 pt-3 border-t">
                          <Button
                            variant="primary"
                            onClick={() => handleApproveRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <FaCheck /> Accept
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => openRejectModal(request)}
                          >
                            <FaTimes /> Reject
                          </Button>
                        </div>
                      ) : request.status === "rejected" ? (
                        <div className="pt-3 border-t">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                              Rejected
                            </p>
                            <p className="text-sm text-red-700">
                              <strong>Reason:</strong> {request.rejectionReason}
                            </p>
                            {request.rejectedAt && (
                              <p className="text-xs text-red-600 mt-1">
                                Rejected on:{" "}
                                {request.rejectedAt.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRequestModal(false);
                      setActiveRequestDate(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Rejection Reason Modal */}
          {showRejectModal && rejectingRequest && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequest(null);
                  setRejectReason("");
                }}
              />
              <Card className="z-10 w-full max-w-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-red-600">
                    Reject Meeting Request
                  </h2>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectingRequest(null);
                      setRejectReason("");
                    }}
                    className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>Client:</strong> {rejectingRequest.clientName}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>Company:</strong> {rejectingRequest.companyName}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>Requested Date:</strong>{" "}
                      {new Date(
                        rejectingRequest.requestedDate + "T00:00"
                      ).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>Time:</strong> {rejectingRequest.requestedTime}
                    </p>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-content-secondary dark:text-gray-300">
                      Reason for Rejection *
                    </span>
                    <textarea
                      rows={4}
                      className="w-full rounded-md border border-subtle bg-surface px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this meeting request..."
                      required
                      spellCheck="true"
                    />
                  </label>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectingRequest(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={handleRejectRequest}>
                      <FaTimes /> Confirm Rejection
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Floating Add Button with Dropdown */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Dropdown Menu */}
          {showFloatingMenu && (
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] animate-in slide-in-from-bottom-2">
              <button
                onClick={() => {
                  openEventModal(null);
                  setShowFloatingMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
              >
                <FaCalendarAlt className="text-indigo-600" />
                <span className="font-medium">Add Event</span>
              </button>
              <button
                onClick={() => {
                  openTaskModal();
                  setShowFloatingMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
              >
                <FaTasks className="text-emerald-600" />
                <span className="font-medium">Add Task</span>
              </button>
            </div>
          )}

          {/* Main Floating Button */}
          <button
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            className={`w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${showFloatingMenu ? "rotate-45" : ""
              }`}
            title="Add Event or Task"
          >
            <FaPlus className="text-xl group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Export events for use in dashboard
// Removed sample export
export default Calendar;

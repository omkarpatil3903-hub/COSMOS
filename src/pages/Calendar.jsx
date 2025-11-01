import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { db } from "../firebase";
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

const tsToDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateToInputValue = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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

// Add meeting requests data
// Removed sample data

// Sample data for events
// Removed sample data

// Removed sample data

function Calendar() {
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeRequestDate, setActiveRequestDate] = useState(null);
  const [eventForm, setEventForm] = useState(() => buildDefaultEventForm());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const clientsById = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      map.set(client.id, client);
    });
    return map;
  }, [clients]);

  // Firestore subscriptions
  useEffect(() => {
    let unsubEvents, unsubMeetingRequests, unsubClients, unsubTasks;

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
          console.log("📅 Events loaded:", loadedEvents.length, loadedEvents);
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
    };

    initSubscriptions();

    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubMeetingRequests) unsubMeetingRequests();
      if (unsubClients) unsubClients();
      if (unsubTasks) unsubTasks();
    };
  }, []);

  // Combine events and tasks with dueDate
  const allEvents = useMemo(() => {
    const eventList = [...events];

    // Add tasks with dueDate as events
    tasks.forEach((task) => {
      if (task.dueDate && !task.archived) {
        const dueDate =
          task.dueDate instanceof Date ? task.dueDate : tsToDate(task.dueDate);

        // Use local date string to avoid timezone issues
        const year = dueDate.getFullYear();
        const month = String(dueDate.getMonth() + 1).padStart(2, "0");
        const day = String(dueDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = "23:59"; // Default to end of day for tasks

        // Find assignee name (client or user)
        let assigneeName = "";
        if (task.assigneeType === "client") {
          const client = clients.find((c) => c.id === task.assigneeId);
          assigneeName = client?.clientName || client?.companyName || "Client";
        } else {
          assigneeName = "Team Member";
        }

        eventList.push({
          id: `task_${task.id}`,
          title: `Task: ${task.title}`,
          type: "task",
          status:
            task.status === "Done"
              ? "completed"
              : task.status === "In Progress"
              ? "pending"
              : "pending",
          date: dateStr,
          time: timeStr,
          duration: 0,
          clientId: task.assigneeType === "client" ? task.assigneeId : "",
          clientName: assigneeName,
          description: `Task assigned to ${assigneeName}`,
          priority: task.priority.toLowerCase(),
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
          isTask: true, // Mark as task event
          taskId: task.id,
        });
      }
    });

    return eventList;
  }, [events, tasks, clients]);

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
    } else {
      const base = selectedDate || new Date();
      setEditingEvent(null);
      setEventForm(buildDefaultEventForm(base));
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    const base = selectedDate || new Date();
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm(buildDefaultEventForm(base));
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

    const attendees = eventForm.attendeesText
      .split(",")
      .map((item) => item.trim())
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
      status: eventForm.status,
      date: eventForm.date,
      time: eventForm.time,
      duration,
      clientId: eventForm.clientId,
      clientName,
      description: eventForm.description,
      priority: eventForm.priority,
      location: eventForm.location,
      attendees,
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
      return eventDate === dateStr && typeMatch && statusMatch;
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

  const handleCompleteTask = async (eventId) => {
    // Check if it's a task event
    if (eventId.startsWith("task_")) {
      const taskId = eventId.replace("task_", "");
      try {
        await updateDoc(doc(db, "tasks", taskId), {
          status: "Done",
          completedAt: serverTimestamp(),
        });
        toast.success("Task marked as completed!");
      } catch {
        toast.error("Failed to complete task");
      }
    } else {
      // Regular event
      try {
        await updateDoc(doc(db, "events", eventId), {
          status: "completed",
          completedAt: serverTimestamp(),
        });
        toast.success("Event marked as completed!");
      } catch {
        toast.error("Failed to complete event");
      }
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

    console.log("🎯 Approving request:", request);

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

      console.log("📝 Creating event with data:", eventData);
      const newEventRef = await addDoc(collection(db, "events"), eventData);
      console.log("✅ Event created with ID:", newEventRef.id);

      // Remove the request after successful event creation
      await deleteDoc(doc(db, "meetingRequests", requestId));
      console.log("🗑️ Request deleted");

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

  // Calculate stats including meeting requests
  const calendarStats = {
    totalEvents: allEvents.length,
    pendingApprovals: allEvents.filter((e) => e.status === "pending").length,
    approvedMeetings: allEvents.filter(
      (e) => e.type === "meeting" && e.status === "approved"
    ).length,
    cancelledEvents: allEvents.filter((e) => e.status === "cancelled").length,
    completedTasks: allEvents.filter((e) => e.status === "completed").length,
    upcomingDeadlines: allEvents.filter((e) => {
      const eventDate = new Date(e.date);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return (
        eventDate >= today && eventDate <= nextWeek && e.status !== "completed"
      );
    }).length,
    pendingRequests: meetingRequests.filter((req) => req.status === "pending")
      .length,
  };

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
        <div key={`empty-${i}`} className="h-24 border border-gray-100"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const dayRequests = getMeetingRequestsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 relative ${
            isToday ? "bg-blue-50 border-blue-200" : ""
          } ${isSelected ? "bg-indigo-50 border-indigo-300" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-medium ${
              isToday ? "text-blue-600" : "text-gray-900"
            }`}
          >
            {day}
          </div>

          {/* Meeting requests indicator */}
          {dayRequests.length > 0 && (
            <div className="absolute top-1 right-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showRequestsForDate(date);
                }}
                className="w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-orange-600"
                title={`${dayRequests.length} meeting request(s)`}
              >
                {dayRequests.length}
              </button>
            </div>
          )}

          <div className="mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map((event) => {
              const colors = {
                meeting: "bg-blue-100 text-blue-700",
                task: "bg-green-100 text-green-700",
                milestone: "bg-purple-100 text-purple-700",
                call: "bg-yellow-100 text-yellow-700",
              };

              const statusColors = {
                approved: "border-l-4 border-green-500",
                pending: "border-l-4 border-yellow-500",
                cancelled: "border-l-4 border-red-500",
                completed: "border-l-4 border-blue-500",
              };

              return (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded ${colors[event.type]} ${
                    statusColors[event.status]
                  } truncate`}
                  title={event.title}
                >
                  {event.time} - {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

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

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

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
          {/* Calendar Controls */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <FaChevronLeft />
                  </button>
                  <h2 className="text-lg font-semibold min-w-[200px] text-center">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <FaChevronRight />
                  </button>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="meeting">Meetings</option>
                  <option value="task">Tasks</option>
                  <option value="milestone">Milestones</option>
                  <option value="call">Calls</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>

                <Button onClick={() => openEventModal(null)}>
                  <FaPlus /> Add Event
                </Button>
              </div>
            </div>
          </Card>

          {/* Calendar Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4" style={{ borderLeftColor: "#4f46e5" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">
                    Total Scheduled
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {calendarStats.totalEvents}
                  </p>
                </div>
                <FaCalendarAlt className="h-8 w-8 text-indigo-600 opacity-60" />
              </div>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: "#10b981" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">
                    Approved Meetings
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {calendarStats.approvedMeetings}
                  </p>
                </div>
                <FaCheck className="h-8 w-8 text-emerald-500 opacity-60" />
              </div>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: "#f97316" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">
                    Upcoming Deadlines
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {calendarStats.upcomingDeadlines}
                  </p>
                </div>
                <FaClock className="h-8 w-8 text-orange-500 opacity-60" />
              </div>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: "#ef4444" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">
                    Pending Requests
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {calendarStats.pendingRequests}
                  </p>
                </div>
                <FaTimes className="h-8 w-8 text-red-500 opacity-60" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar Grid */}
            <Card className="lg:col-span-3 p-4">
              <div className="grid grid-cols-7 gap-0 mb-4">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center font-medium text-gray-600 border-b"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {renderCalendarDays()}
              </div>
            </Card>

            {/* Event Details Sidebar */}
            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-4">
                {selectedDate
                  ? `Events for ${selectedDate.toLocaleDateString()}`
                  : "Select a date"}
              </h3>

              {selectedDate ? (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No events on this date
                    </p>
                  ) : (
                    getEventsForDate(selectedDate).map((event) => {
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
                      const statusLabel = event.status
                        ? event.status.replace(/\b\w/g, (ch) =>
                            ch.toUpperCase()
                          )
                        : "Pending";

                      return (
                        <div
                          key={event.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {event.title}
                              </h4>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            {!isTaskEvent && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openEventModal(event)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit event"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete event"
                                >
                                  <FaTrash size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Time: {event.time || "—"}</div>
                            <div>Client: {contactName}</div>
                            <div>
                              Duration:{" "}
                              {event.duration
                                ? `${event.duration} minutes`
                                : "—"}
                            </div>
                            <div>Email: {contactEmail}</div>
                            {event.location && (
                              <div>Location: {event.location}</div>
                            )}
                            {event.description && (
                              <div className="text-[11px] text-content-secondary">
                                Notes: {event.description}
                              </div>
                            )}
                          </div>

                          {event.objectives && event.objectives.length > 0 && (
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
                            {event.status === "pending" && !isTaskEvent && (
                              <>
                                <button
                                  onClick={() => handleApproveEvent(event.id)}
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
                            {isTaskEvent && event.status !== "completed" && (
                              <button
                                onClick={() => handleCompleteTask(event.id)}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                <FaCheck size={10} /> Complete
                              </button>
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
                    className="mx-auto mb-4 opacity-50"
                  />
                  <p className="text-sm">Click on a date to view events</p>
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
                        <p className="font-medium text-sm text-content-primary">
                          {event.title}
                        </p>
                        <p className="text-xs text-content-secondary">
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
                className="absolute inset-0 bg-black/50"
                onClick={closeEventModal}
              />
              <Card className="z-10 w-full max-w-3xl max-h-[90vh] overflow-auto">
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
                      <span className="font-medium text-content-secondary">
                        Title
                      </span>
                      <input
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.title}
                        onChange={(e) =>
                          handleEventFormChange("title", e.target.value)
                        }
                        placeholder="Project sync with client"
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary">
                        Client
                      </span>
                      <select
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
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
                      <span className="font-medium text-content-secondary">
                        Duration (minutes)
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.duration}
                        onChange={(e) =>
                          handleEventFormChange("duration", e.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary">
                        Date
                      </span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.date}
                        onChange={(e) =>
                          handleEventFormChange("date", e.target.value)
                        }
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-content-secondary">
                        Time
                      </span>
                      <input
                        type="time"
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.time}
                        onChange={(e) =>
                          handleEventFormChange("time", e.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-medium text-content-secondary">
                        Description
                      </span>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.description}
                        onChange={(e) =>
                          handleEventFormChange("description", e.target.value)
                        }
                        placeholder="Agenda or key talking points"
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-medium text-content-secondary">
                        Attendees (comma separated)
                      </span>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                        value={eventForm.attendeesText}
                        onChange={(e) =>
                          handleEventFormChange("attendeesText", e.target.value)
                        }
                        placeholder="John Doe, Jane Smith"
                      />
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

          {/* Meeting Requests Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                  setShowRequestModal(false);
                  setActiveRequestDate(null);
                }}
              />
              <Card className="z-10 w-full max-w-4xl max-h-[90vh] overflow-auto">
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
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-content-primary">
                            {request.companyName}
                          </h3>
                          <p className="text-sm text-content-secondary">
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
                          <span className="font-medium text-content-secondary">
                            Phone:
                          </span>
                          <div>{request.phone}</div>
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-content-secondary">
                          Purpose:
                        </span>
                        <p className="mt-1 text-sm text-content-primary">
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
                className="absolute inset-0 bg-black/50"
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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <strong>Client:</strong> {rejectingRequest.clientName}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Company:</strong> {rejectingRequest.companyName}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Requested Date:</strong>{" "}
                      {new Date(
                        rejectingRequest.requestedDate + "T00:00"
                      ).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Time:</strong> {rejectingRequest.requestedTime}
                    </p>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-content-secondary">
                      Reason for Rejection *
                    </span>
                    <textarea
                      rows={4}
                      className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this meeting request..."
                      required
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
    </div>
  );
}

// Export events for use in dashboard
// Removed sample export
export default Calendar;

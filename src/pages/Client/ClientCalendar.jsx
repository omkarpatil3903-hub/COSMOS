// src/pages/ClientCalendar.jsx
import React, { useEffect, useState, useMemo } from "react";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import { useAuthContext } from "../../context/useAuthContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import {
  TYPE_CLASSES,
  STATUS_BORDER_CLASSES,
  PRIORITY_CLASSES,
  getPriorityBadge,
} from "../../utils/colorMaps";
const tsToDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function ClientCalendar() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [requestForm, setRequestForm] = useState({
    requestedDate: "",
    requestedTime: "09:00",
    duration: 60,
    purpose: "",
    priority: "medium",
  });

  useEffect(() => {
    if (!uid) return;

    const qEvents = query(
      collection(db, "events"),
      where("clientId", "==", uid)
    );
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(
        snap.docs.map((d) => {
          const data = d.data() || {};
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
            createdAt,
          };
        })
      );
      setLoading(false);
    });

    const qRequests = query(
      collection(db, "meetingRequests"),
      where("clientId", "==", uid)
    );
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setMeetingRequests(
        snap.docs.map((d) => {
          const data = d.data() || {};
          const requestedAt = tsToDate(data.requestedAt);
          const rejectedAt = tsToDate(data.rejectedAt);
          return {
            id: d.id,
            requestedDate: data.requestedDate || "",
            requestedTime: data.requestedTime || "",
            duration: data.duration || 60,
            purpose: data.purpose || "",
            priority: data.priority || "medium",
            status: data.status || "pending",
            requestedAt,
            rejectedAt,
            rejectionReason: data.rejectionReason || "",
          };
        })
      );
    });

    return () => {
      unsubEvents();
      unsubRequests();
    };
  }, [uid]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
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
  }, [events]);

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
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter((event) => {
      const eventDate = event.date;
      let typeMatch = filterType === "all" || event.type === filterType;
      let statusMatch = filterStatus === "all" || event.status === filterStatus;
      return eventDate === dateStr && typeMatch && statusMatch;
    });
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
        <div
          key={`empty-${i}`}
          className="h-28 border border-gray-100 bg-gray-50"
        ></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
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
          className={`h-28 border border-gray-200 p-2 cursor-pointer relative transition-all duration-200 ${
            isPast
              ? "bg-gray-50 hover:bg-gray-100 opacity-60"
              : "hover:bg-blue-50 hover:shadow-inner hover:border-blue-300"
          } ${
            isToday
              ? "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-400 border-2 opacity-100 ring-2 ring-blue-200"
              : ""
          } ${
            isSelected
              ? "bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-400 border-2 opacity-100 ring-2 ring-indigo-200"
              : ""
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-bold mb-1 ${
              isPast && !isToday
                ? "text-gray-400"
                : isToday
                ? "text-blue-700 text-base"
                : "text-gray-800"
            } ${isSelected && !isToday ? "text-indigo-700 text-base" : ""}`}
          >
            {day}
          </div>

          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event) => {
              const typeKey = event.isRecurring
                ? "recurring"
                : String(event.type || "").toLowerCase();
              const priorityKey = String(
                event.priority || "medium"
              ).toLowerCase();
              const typeBadge =
                TYPE_CLASSES[typeKey]?.badge || "bg-gray-100 text-gray-700";
              const priorityDot =
                PRIORITY_CLASSES[priorityKey]?.dot || "bg-gray-400";

              return (
                <div
                  key={event.id}
                  className={`text-xs p-1.5 rounded-md ${
                    isPast ? "bg-gray-200 text-gray-500" : typeBadge
                  } truncate relative shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
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

  // Calculate stats
  const calendarStats = {
    totalEvents: events.length,
    approvedMeetings: events.filter(
      (e) => e.type === "meeting" && e.status === "approved"
    ).length,
    upcomingDeadlines: events.filter((e) => {
      const eventDate = new Date(e.date);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return (
        eventDate >= today && eventDate <= nextWeek && e.status !== "completed"
      );
    }).length,
    completedEvents: events.filter((e) => e.status === "completed").length,
  };

  // Handle meeting request
  const handleRequestMeeting = async (e) => {
    e.preventDefault();

    if (!requestForm.requestedDate || !requestForm.purpose) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addDoc(collection(db, "meetingRequests"), {
        clientId: uid,
        clientName: userData?.clientName || userData?.name || "Client",
        companyName: userData?.companyName || "",
        email: userData?.email || user?.email || "",
        phone: userData?.phone || "",
        requestedDate: requestForm.requestedDate,
        requestedTime: requestForm.requestedTime,
        duration: Number(requestForm.duration),
        purpose: requestForm.purpose,
        priority: requestForm.priority,
        status: "pending",
        requestedAt: serverTimestamp(),
      });

      toast.success("Meeting request sent successfully!");
      setShowRequestModal(false);
      setRequestForm({
        requestedDate: "",
        requestedTime: "09:00",
        duration: 60,
        purpose: "",
        priority: "medium",
      });
    } catch (error) {
      console.error("Error submitting meeting request:", error);
      toast.error("Failed to send meeting request");
    }
  };

  return (
    <div>
      <PageHeader title="My Calendar">
        View your meetings and events schedule.
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

                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <FaPlus className="mr-2" /> Request Meeting
                </Button>
              </div>
            </div>
          </Card>

          {/* Calendar Stats */}
          {/* Meeting Requests Section */}
          {meetingRequests.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-indigo-600" />
                My Meeting Requests
              </h3>
              <div className="space-y-3">
                {meetingRequests
                  .sort((a, b) => b.requestedAt - a.requestedAt)
                  .map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">
                              {request.requestedDate} at {request.requestedTime}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                request.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : request.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {request.status.charAt(0).toUpperCase() +
                                request.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {request.purpose}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Duration: {request.duration} min</span>
                          </div>
                        </div>
                      </div>

                      {request.status === "rejected" &&
                        request.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm font-medium text-red-800 mb-1">
                              Rejection Reason:
                            </p>
                            <p className="text-sm text-red-700">
                              {request.rejectionReason}
                            </p>
                          </div>
                        )}

                      <div className="mt-2 text-xs text-gray-400">
                        Requested on {request.requestedAt?.toLocaleDateString()}{" "}
                        at {request.requestedAt?.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4" style={{ borderLeftColor: "#4f46e5" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">Total Events</p>
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

            <Card className="border-l-4" style={{ borderLeftColor: "#3b82f6" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-tertiary">Completed</p>
                  <p className="text-3xl font-bold mt-1">
                    {calendarStats.completedEvents}
                  </p>
                </div>
                <FaTimes className="h-8 w-8 text-blue-500 opacity-60" />
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
                    className="p-3 text-center font-semibold text-gray-700 border-b border-gray-200"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded overflow-hidden">
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
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <FaCalendarAlt className="text-gray-400 text-2xl" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        No events on this date
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Request a meeting to schedule something
                      </p>
                    </div>
                  ) : (
                    getEventsForDate(selectedDate).map((event) => {
                      const statusStyles = {
                        approved: "bg-green-100 text-green-700",
                        pending: "bg-yellow-100 text-yellow-700",
                        cancelled: "bg-red-100 text-red-700",
                        completed: "bg-blue-100 text-blue-700",
                      };
                      const statusClass =
                        statusStyles[event.status] ||
                        "bg-gray-100 text-gray-600";
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
                          className="border-2 rounded-lg p-3 space-y-2 hover:shadow-lg transition-all duration-200 bg-white hover:border-blue-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {event.title}
                              </h4>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${displayClass}`}
                              >
                                {displayLabel}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Time: {event.time || "—"}</div>
                            <div>
                              Duration:{" "}
                              {event.duration
                                ? `${event.duration} minutes`
                                : "—"}
                            </div>
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
                              <div className="text-[11px] text-content-secondary bg-gray-50 p-2 rounded">
                                {event.description}
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
                          {event.clientName || "—"}
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
        </div>
      )}

      {/* Meeting Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRequestModal(false)}
          />
          <Card className="z-10 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Request a Meeting</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleRequestMeeting}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Preferred Date *
                  </span>
                  <input
                    type="date"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    value={requestForm.requestedDate}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        requestedDate: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Preferred Time *
                  </span>
                  <input
                    type="time"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    value={requestForm.requestedTime}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        requestedTime: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Duration (minutes) *
                  </span>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    value={requestForm.duration}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        duration: e.target.value,
                      })
                    }
                    placeholder="60"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Priority
                  </span>
                  <select
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    value={requestForm.priority}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        priority: e.target.value,
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-content-secondary">
                  Purpose of Meeting *
                </span>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                  value={requestForm.purpose}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, purpose: e.target.value })
                  }
                  placeholder="Please describe what you'd like to discuss..."
                  required
                />
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Send Request</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Floating Add Button with Dropdown */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Dropdown Menu */}
          {showFloatingMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] animate-in slide-in-from-bottom-2">
              <button
                onClick={() => {
                  setShowRequestModal(true);
                  setShowFloatingMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
              >
                <FaCalendarAlt className="text-indigo-600" />
                <span className="font-medium">Request Meeting</span>
              </button>
            </div>
          )}

          {/* Main Floating Button */}
          <button
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            className={`w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${
              showFloatingMenu ? "rotate-45" : ""
            }`}
            title="Request Meeting"
          >
            <FaPlus className="text-xl group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

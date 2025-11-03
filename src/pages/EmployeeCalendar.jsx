import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaClock,
  FaTasks,
} from "react-icons/fa";
import { TYPE_CLASSES, PRIORITY_CLASSES } from "../utils/colorMaps";

const EmployeeCalendar = () => {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Load tasks assigned to user
    const qTasks = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => task.assigneeType === "user")
        .sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
          return dateA - dateB;
        });
      setTasks(taskData);
      setLoading(false);
    });

    // Load events where user is an attendee
    const qEvents = query(
      collection(db, "events"),
      where("attendeeIds", "array-contains", user.uid)
    );

    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const eventData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventData);
    });

    return () => {
      unsubTasks();
      unsubEvents();
    };
  }, [user]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Calculate stats
  const calendarStats = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalItems = tasks.length + events.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const pendingTasks = tasks.filter((t) => t.status !== "Done").length;
    const upcomingDeadlines = tasks.filter((task) => {
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      return dueDate >= now && dueDate <= nextWeek && task.status !== "Done";
    }).length;

    return {
      totalScheduled: totalItems,
      completedTasks,
      pendingTasks,
      upcomingDeadlines,
    };
  }, [tasks, events]);

  const getTasksForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const dayTasks = tasks.filter((task) => {
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      const taskDateStr = `${dueDate.getFullYear()}-${String(
        dueDate.getMonth() + 1
      ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      return taskDateStr === dateStr;
    });

    const dayEvents = events.filter((event) => event.date === dateStr);

    return [...dayTasks, ...dayEvents];
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-100" />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayItems = getTasksForDate(date);
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

          <div className="mt-1 space-y-0.5">
            {dayItems.slice(0, 2).map((item) => {
              const isEvent = item.type === "meeting" || item.attendees;
              const typeKey = isEvent
                ? String(item.type || "meeting").toLowerCase()
                : "task";
              const priorityKey = String(
                item.priority || "medium"
              ).toLowerCase();
              const typeBadge =
                TYPE_CLASSES[typeKey]?.badge || "bg-gray-100 text-gray-700";
              const priorityDot =
                PRIORITY_CLASSES[priorityKey]?.dot || "bg-gray-400";

              return (
                <div
                  key={item.id}
                  className={`text-xs p-1 rounded ${typeBadge} truncate relative`}
                  title={item.title}
                >
                  {/* Priority strip on the left -- hidden for meetings */}
                  {typeKey !== "meeting" && (
                    <span
                      className={`absolute left-0 top-1 bottom-1 w-1 rounded-l ${priorityDot}`}
                      aria-hidden
                    />
                  )}

                  <div className="flex items-center gap-2 pl-3">
                    {isEvent ? (
                      <span className="truncate">
                        {item.time} - {item.title}
                      </span>
                    ) : (
                      <span className="truncate">{item.title}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {dayItems.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayItems.length - 2} more
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

  if (loading) {
    return (
      <div>
        <PageHeader title="My Calendar">
          View your tasks, meetings, and deadlines.
        </PageHeader>
        <div className="space-y-6">
          {/* Skeleton for Calendar Controls */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-20 bg-gray-200 animate-pulse rounded" />
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
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Calendar">
        View your tasks, meetings, and deadlines.
      </PageHeader>

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
          </div>
        </Card>

        {/* Calendar Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4" style={{ borderLeftColor: "#4f46e5" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Total Scheduled</p>
                <p className="text-3xl font-bold mt-1">
                  {calendarStats.totalScheduled}
                </p>
              </div>
              <FaCalendarAlt className="h-8 w-8 text-indigo-600 opacity-60" />
            </div>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: "#10b981" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Completed Tasks</p>
                <p className="text-3xl font-bold mt-1">
                  {calendarStats.completedTasks}
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

          <Card className="border-l-4" style={{ borderLeftColor: "#eab308" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Pending Tasks</p>
                <p className="text-3xl font-bold mt-1">
                  {calendarStats.pendingTasks}
                </p>
              </div>
              <FaTasks className="h-8 w-8 text-yellow-600 opacity-60" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3 p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0 mb-4">
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center font-medium text-gray-600 border-b"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0">{renderCalendarDays()}</div>
          </Card>

          {/* Task Details Sidebar */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-4">
              {selectedDate
                ? `Events for ${selectedDate.toLocaleDateString()}`
                : "Select a date"}
            </h3>

            {selectedDate ? (
              <div className="space-y-3">
                {getTasksForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No events on this date
                  </p>
                ) : (
                  getTasksForDate(selectedDate).map((item) => {
                    // Check if it's a task or event
                    const isEvent = item.type === "meeting" || item.attendees;

                    if (isEvent) {
                      const statusStyles = {
                        approved: "bg-green-100 text-green-700",
                        pending: "bg-yellow-100 text-yellow-700",
                        cancelled: "bg-red-100 text-red-700",
                        completed: "bg-blue-100 text-blue-700",
                      };
                      const statusClass =
                        statusStyles[item.status] ||
                        "bg-gray-100 text-gray-600";
                      const statusLabel = item.status
                        ? item.status.replace(/\b\w/g, (ch) => ch.toUpperCase())
                        : "Pending";

                      return (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {item.title}
                              </h4>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Time: {item.time || "—"}</div>
                            <div>
                              Duration:{" "}
                              {item.duration ? `${item.duration} minutes` : "—"}
                            </div>
                            {item.location && (
                              <div>Location: {item.location}</div>
                            )}
                            {item.description && (
                              <div className="text-[11px] text-content-secondary">
                                Notes: {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Task rendering
                    const statusStyles = {
                      Done: "bg-green-100 text-green-700",
                      "In Progress": "bg-blue-100 text-blue-700",
                      "To-Do": "bg-yellow-100 text-yellow-700",
                    };
                    const statusClass =
                      statusStyles[item.status] || "bg-gray-100 text-gray-600";

                    return (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-sm">
                              {item.title}
                            </h4>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${statusClass}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 space-y-1">
                          {(() => {
                            const pk = String(
                              item.priority || ""
                            ).toLowerCase();
                            const borderClass =
                              PRIORITY_CLASSES[pk]?.border || "border-gray-400";
                            const badgeClass =
                              PRIORITY_CLASSES[pk]?.badge ||
                              "bg-gray-100 text-gray-700";
                            return (
                              <div
                                className={`inline-block px-2 py-0.5 border-l-4 ${borderClass}`}
                              >
                                <span
                                  className={`px-2 py-0.5 rounded ${badgeClass}`}
                                >
                                  {item.priority} Priority
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <FaCalendarAlt size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Click on a date to view events</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendar;

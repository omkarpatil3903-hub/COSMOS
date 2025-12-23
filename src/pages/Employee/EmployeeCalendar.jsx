import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import TaskModal from "../../components/TaskModal";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaClock,
  FaTasks,
  FaPlus,
} from "react-icons/fa";
import { MdReplayCircleFilled } from "react-icons/md";
import { TYPE_CLASSES, PRIORITY_CLASSES } from "../../utils/colorMaps";
import { occursOnDate } from "../../utils/recurringTasks";

const EmployeeCalendar = () => {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, meetings, tasks
  const [filterStatus, setFilterStatus] = useState("all"); // all, approved, request, pending (for meetings) | in_progress, done (for tasks)
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    // Load tasks assigned to user (primary assignee)
    const qTasksPrimary = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );
    // Load tasks where user is among multiple assignees
    const qTasksMulti = query(
      collection(db, "tasks"),
      where("assigneeIds", "array-contains", user.uid)
    );

    const unsubTasksPrimary = onSnapshot(qTasksPrimary, (snapshot) => {
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
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        taskData.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
      setLoading(false);
    });

    const unsubTasksMulti = onSnapshot(qTasksMulti, (snapshot) => {
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
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        taskData.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
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

    // Load projects
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().projectName || doc.data().name || "",
        ...doc.data(),
      }));
      setProjects(projectData);
    });

    // Load clients
    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      const clientData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientData);
    });

    // Load resources (other employees)
    const unsubResources = onSnapshot(collection(db, "users"), (snapshot) => {
      const resourceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.data().email || "Unknown",
        email: doc.data().email || "",
        role: doc.data().role || "resource",
      }));
      setResources(resourceData);
    });

    return () => {
      unsubTasksPrimary();
      unsubTasksMulti();
      unsubEvents();
      unsubProjects();
      unsubClients();
      unsubResources();
    };
  }, [user]);

  // Reference editingEvent to satisfy lint (used in modal logic)
  useEffect(() => {
    // no-op; keeps state reactive for external consumers
  }, [editingEvent]);

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

  // Filtered tasks and events based on current filter settings
  const filteredItems = useMemo(() => {
    let items = [];

    // Add tasks if type filter allows
    if (filterType === "all" || filterType === "tasks") {
      const filteredTasks = tasks.filter((task) => {
        if (filterStatus === "all") return true;

        // Map task status to filter values
        const statusMap = {
          in_progress: ["In Progress", "To-Do"],
          done: ["Done", "Completed"],
        };

        return statusMap[filterStatus]?.includes(task.status);
      });

      items = [
        ...items,
        ...filteredTasks.map((task) => ({ ...task, itemType: "task" })),
      ];
    }

    // Add events/meetings if type filter allows
    if (filterType === "all" || filterType === "meetings") {
      const filteredEvents = events.filter((event) => {
        if (filterStatus === "all") return true;

        // Map event status to filter values
        return event.status === filterStatus;
      });

      items = [
        ...items,
        ...filteredEvents.map((event) => ({ ...event, itemType: "meeting" })),
      ];
    }

    return items;
  }, [tasks, events, filterType, filterStatus]);

  const getItemsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    // 1. Find all "Real" items for this date (Meetings, Non-recurring tasks, Child tasks)
    const realItems = filteredItems.filter((item) => {
      if (item.itemType === "meeting") {
        return item.date === dateStr;
      }
      // It's a task
      const dueDate = item.dueDate?.toDate?.() || new Date(item.dueDate);
      const taskDateStr = `${dueDate.getFullYear()}-${String(
        dueDate.getMonth() + 1
      ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

      return taskDateStr === dateStr;
    });

    // 2. Find "Ghost" items (Recurring roots expanding to this date)
    const ghostItems = filteredItems
      .filter((item) => {
        if (item.itemType !== "task") return false;
        if (!item.isRecurring) return false;
        if (item.parentRecurringTaskId) return false; // Child tasks don't generate ghosts

        // Check if it occurs on this date
        if (!occursOnDate(item, date)) return false;

        // Check if this EXACT task is already in realItems (e.g. Root task is due today)
        if (realItems.some((real) => real.id === item.id)) return false;

        // Check if a CHILD instance of this series exists in realItems
        const hasRealInstance = realItems.some(
          (real) => real.parentRecurringTaskId === item.id
        );

        return !hasRealInstance;
      })
      .map((item) => ({
        ...item,
        status: "To-Do",
        progressPercent: 0,
        completedAt: null,
        isGhost: true, // Marker for debugging or styling if needed
      }));

    return [...realItems, ...ghostItems];
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
        <div
          key={`empty-${i}`}
          className="h-28 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
        />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayItems = getItemsForDate(date);
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
          className={`h-28 border border-gray-200 dark:border-gray-700 p-2 cursor-pointer relative transition-all duration-200 ${isPast
            ? "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-60"
            : "dark:bg-[#1e1e2d] hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-inner hover:border-blue-300"
            } ${isToday
              ? "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 border-blue-400 border-2 opacity-100 ring-2 ring-blue-200 dark:ring-blue-800"
              : ""
            } ${isSelected
              ? "bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 border-indigo-400 border-2 opacity-100 ring-2 ring-indigo-200 dark:ring-indigo-800"
              : ""
            }`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-bold mb-1 ${isPast && !isToday
              ? "text-gray-400"
              : isToday
                ? "text-blue-700 dark:text-blue-400 text-base"
                : "text-gray-800 dark:text-gray-200"
              } ${isSelected && !isToday ? "text-indigo-700 text-base" : ""}`}
          >
            {day}
          </div>

          <div className="mt-1 space-y-1">
            {dayItems.slice(0, 2).map((item) => {
              const isEvent = item.type === "meeting" || item.attendees;
              const typeKey = isEvent
                ? String(item.type || "meeting").toLowerCase()
                : item.isRecurring
                  ? "recurring"
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
                  className={`text-xs p-1.5 rounded-md ${isPast ? "bg-gray-200 text-gray-500" : typeBadge
                    } truncate relative shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                  title={item.title}
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
                      {isEvent ? `${item.time} ${item.title}` : item.title}
                    </span>
                    {/* Recurring icon for events */}
                    {isEvent && (item.isRecurring || item.recurringPattern) && (
                      <MdReplayCircleFilled className="text-teal-600 text-sm ml-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
            {dayItems.length > 2 && (
              <div className="text-xs text-gray-600 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
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

  // Task creation handlers
  const handleTaskSave = async (taskData) => {
    try {
      // Convert dueDate string to Date object if needed
      const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;

      const newTask = {
        title: taskData.title,
        description: taskData.description || "",
        projectId: taskData.projectId || "",
        assigneeId: user.uid, // Always assign to current user for employee calendar
        assigneeType: "user",
        status: taskData.status || "To-Do",
        priority: taskData.priority || "Medium",
        dueDate: dueDate,
        assignedDate: taskData.assignedDate
          ? new Date(taskData.assignedDate)
          : new Date(),
        weightage: taskData.weightage ? Number(taskData.weightage) : 0,
        completionComment: taskData.completionComment || "",
        isRecurring: taskData.isRecurring || false,
        recurringPattern: taskData.recurringPattern || "daily",
        recurringInterval: taskData.recurringInterval || 1,
        recurringEndDate: taskData.recurringEndDate || "",
        recurringEndAfter: taskData.recurringEndAfter || "",
        recurringEndType: taskData.recurringEndType || "never",
        createdAt: serverTimestamp(),
        archived: false,
      };

      await addDoc(collection(db, "tasks"), newTask);
      toast.success("Task created successfully!");
      setShowTaskModal(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  // Event creation handlers
  const openEventModal = (event) => {
    if (event) {
      setEditingEvent(event);
    } else {
      setEditingEvent(null);
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const handleEventSave = async (eventData) => {
    try {
      const newEvent = {
        title: eventData.title,
        type: eventData.type || "meeting",
        status: eventData.status || "pending",
        date: eventData.date,
        time: eventData.time || "09:00",
        duration: Number(eventData.duration) || 60,
        clientId: eventData.clientId || "",
        clientName: eventData.clientName || "",
        description: eventData.description || "",
        priority: eventData.priority || "medium",
        location: eventData.location || "",
        attendees: eventData.attendees || [],
        attendeeIds: [user.uid], // Include current user as attendee
        createdBy: user.uid,
        objectives: eventData.objectives || [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "events"), newEvent);
      toast.success("Meeting created successfully!");
      closeEventModal();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create meeting");
    }
  };

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
                <div className="h-10 w-64 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
                <div className="h-10 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
              </div>
            </div>
          </Card>

          {/* Skeleton for Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-l-4">
                <div className="h-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
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
                    className="h-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded"
                  />
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
                <div className="h-32 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
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
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
                >
                  <FaChevronLeft />
                </button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center dark:text-white">
                  {monthNames[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
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
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterStatus("all");
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Items</option>
                <option value="meetings">Meetings</option>
                <option value="tasks">Tasks</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                {filterType === "meetings" && (
                  <>
                    <option value="approved">Approved</option>
                    <option value="request">Request</option>
                    <option value="pending">Pending</option>
                  </>
                )}
                {filterType === "tasks" && (
                  <>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </>
                )}
              </select>

              <Button
                onClick={() => openEventModal(null)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <FaPlus className="mr-2" /> Add Event
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
                  className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
              {renderCalendarDays()}
            </div>
          </Card>

          {/* Task Details Sidebar */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-4 border-b dark:border-gray-700 pb-2 dark:text-white">
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
                {getItemsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <FaCalendarAlt className="text-gray-400 text-2xl" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      No items on this date
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Click "Add Event" or "Add Task" to schedule something
                    </p>
                  </div>
                ) : (
                  getItemsForDate(selectedDate).map((item) => {
                    // Check if it's a task or meeting based on itemType
                    const isEvent = item.itemType === "meeting";

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
                      const isAdminCreated = item.createdBy === "admin";
                      const displayLabel = isAdminCreated
                        ? "by admin"
                        : item.status
                          ? item.status.replace(/\b\w/g, (ch) => ch.toUpperCase())
                          : "Pending";
                      const displayClass = isAdminCreated
                        ? "bg-blue-100 text-blue-700"
                        : statusClass;

                      return (
                        <div
                          key={item.id}
                          className="border-2 rounded-lg p-3 space-y-2 hover:shadow-lg transition-all duration-200 bg-white hover:border-blue-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {item.title}
                              </h4>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${displayClass}`}
                              >
                                {displayLabel}
                              </span>
                            </div>
                            {/* Recurring icon for events in detail view */}
                            {(item.isRecurring || item.recurringPattern) && (
                              <MdReplayCircleFilled className="text-teal-600 text-lg flex-shrink-0" />
                            )}
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
                            {item.attendees && item.attendees.length > 0 && (
                              <div className="text-[11px]">
                                <span className="font-medium">Attendees:</span>{" "}
                                {item.attendees.length}
                              </div>
                            )}
                          </div>

                          {item.objectives && item.objectives.length > 0 && (
                            <div className="border-t pt-2">
                              <p className="text-[11px] font-semibold text-content-secondary mb-1">
                                Objectives
                              </p>
                              <ul className="space-y-1">
                                {item.objectives.map((objective) => (
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
                    }

                    // Task rendering with enhanced styling
                    const statusStyles = {
                      Done: "bg-green-100 text-green-700",
                      "In Progress": "bg-blue-100 text-blue-700",
                      "To-Do": "bg-yellow-100 text-yellow-700",
                    };
                    const statusClass =
                      statusStyles[item.status] || "bg-gray-100 text-gray-600";

                    const isAdminCreatedTask = item.createdBy === "admin";
                    const taskDisplayLabel = isAdminCreatedTask
                      ? "by admin"
                      : item.status;
                    const taskDisplayClass = isAdminCreatedTask
                      ? "bg-blue-100 text-blue-700"
                      : statusClass;

                    return (
                      <div
                        key={item.id}
                        className="border-2 rounded-lg p-3 space-y-2 hover:shadow-lg transition-all duration-200 bg-white hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {item.title}
                              </h4>
                              {item.isRecurring && (
                                <MdReplayCircleFilled className="text-teal-600 text-sm" />
                              )}
                            </div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${taskDisplayClass}`}
                            >
                              {taskDisplayLabel}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            Due Date:{" "}
                            {item.dueDate
                              ? new Date(
                                item.dueDate?.toDate?.() || item.dueDate
                              ).toLocaleDateString()
                              : "No due date"}
                          </div>
                          {item.priority && (
                            <div>
                              Priority:{" "}
                              <span
                                className={`inline-block ml-1 px-2 py-0.5 rounded ${PRIORITY_CLASSES[
                                  String(item.priority).toLowerCase()
                                ]?.badge || "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                          )}
                          {item.weightage && (
                            <div>Weight: {item.weightage}%</div>
                          )}
                          {item.projectId && (
                            <div>
                              Project:{" "}
                              {projects.find((p) => p.id === item.projectId)
                                ?.name || item.projectId}
                            </div>
                          )}
                          {item.description && (
                            <div className="text-[11px] text-content-secondary">
                              Notes: {item.description}
                            </div>
                          )}
                          {item.isRecurring && (
                            <div className="text-[11px] text-teal-600">
                              Recurs: {item.recurringPattern} • Every{" "}
                              {item.recurringInterval}
                            </div>
                          )}
                          {item.completionComment && item.status === "Done" && (
                            <div className="text-[11px] text-green-700 bg-green-50 p-2 rounded border border-green-200">
                              <span className="font-medium">
                                ✅ Completion note:
                              </span>
                              <div className="mt-1">
                                {item.completionComment}
                              </div>
                            </div>
                          )}
                          {item.assignedDate && (
                            <div className="text-[10px] text-gray-400">
                              Assigned:{" "}
                              {new Date(
                                item.assignedDate?.toDate?.() ||
                                item.assignedDate
                              ).toLocaleDateString()}
                            </div>
                          )}
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

      {/* Floating Add Button with Dropdown */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Dropdown Menu */}
          {showFloatingMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[160px] animate-in slide-in-from-bottom-2">
              <button
                onClick={() => {
                  openEventModal(null);
                  setShowFloatingMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
              >
                <FaCalendarAlt className="text-indigo-600" />
                <span className="font-medium">Add Meeting</span>
              </button>
              <button
                onClick={() => {
                  setShowTaskModal(true);
                  setShowFloatingMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
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
            title="Add Task"
          >
            <FaPlus className="text-xl group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSave={handleTaskSave}
          projects={projects}
          assignees={resources}
          clients={clients}
        />
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEventModal}
          />
          <Card className="z-10 w-auto max-w-[90vw] md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Meeting</h2>
              <button
                onClick={closeEventModal}
                className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
              >
                ✕
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const eventData = {
                  title: formData.get("title"),
                  date: formData.get("date"),
                  time: formData.get("time"),
                  duration: formData.get("duration"),
                  description: formData.get("description"),
                  location: formData.get("location"),
                  clientId: formData.get("clientId"),
                  clientName:
                    clients.find((c) => c.id === formData.get("clientId"))
                      ?.clientName || "",
                  priority: formData.get("priority"),
                };
                handleEventSave(eventData);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="font-medium text-content-secondary">
                    Meeting Title *
                  </span>
                  <input
                    name="title"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    placeholder="Team sync meeting"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Date *
                  </span>
                  <input
                    name="date"
                    type="date"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2 date-input-blue"
                    defaultValue={
                      selectedDate
                        ? selectedDate.toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]
                    }
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Time *
                  </span>
                  <input
                    name="time"
                    type="time"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2 date-input-blue"
                    defaultValue="09:00"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Duration (minutes)
                  </span>
                  <select
                    name="duration"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60" selected>
                      1 hour
                    </option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Client (Optional)
                  </span>
                  <select
                    name="clientId"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.clientName ||
                          client.companyName ||
                          client.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-content-secondary">
                    Priority
                  </span>
                  <select
                    name="priority"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium" selected>
                      Medium
                    </option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="font-medium text-content-secondary">
                    Location
                  </span>
                  <input
                    name="location"
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    placeholder="Conference Room A / Zoom Link"
                  />
                </label>

                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="font-medium text-content-secondary">
                    Description
                  </span>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2"
                    placeholder="Meeting agenda and objectives..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEventModal}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Meeting</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;

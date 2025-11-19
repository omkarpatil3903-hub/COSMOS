import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import TaskModal from "../components/TaskModal";
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
import { TYPE_CLASSES, PRIORITY_CLASSES } from "../utils/colorMaps";
// ✅ Import Helper Functions
import { expandRecurringOccurrences } from "../utils/recurringTasks";

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
  // eslint-disable-next-line no-unused-vars
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);

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
      unsubTasks();
      unsubEvents();
      unsubProjects();
      unsubClients();
      unsubResources();
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

  // ✅ CORRECTED: Filtered items with Robust Date Logic
  const filteredItems = useMemo(() => {
    let items = [];

    // 1. PROCESSING TASKS
    if (filterType === "all" || filterType === "tasks") {
      const activeTasks = tasks.filter((task) => {
        if (filterStatus === "all") return true;
        const statusMap = {
          in_progress: ["In Progress", "To-Do"],
          done: ["Done", "Completed"],
        };
        return statusMap[filterStatus]?.includes(task.status);
      });

      activeTasks.forEach((task) => {
        // A. Always add the REAL task instance
        items.push({ ...task, itemType: "task" });

        // B. If Recurring, generate GHOST tasks for this view
        if (task.isRecurring && task.status !== "Done") {
          // Calculate view range (Current Month)
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();

          const startView = new Date(year, month, 1);
          const endView = new Date(year, month + 1, 0);

          // ✅ FIX: The expandRecurringOccurrences needs to start from task's base date
          // Get task base due date
          const taskDueDate =
            task.dueDate?.toDate?.() || new Date(task.dueDate);
          // Use UTC components to get the "intended" date (since tasks are stored as UTC midnight)
          const taskBaseDateOnly = new Date(
            taskDueDate.getUTCFullYear(),
            taskDueDate.getUTCMonth(),
            taskDueDate.getUTCDate()
          );

          // Use the LATER of task start date or month start date
          const effectiveStart =
            taskBaseDateOnly > startView ? taskBaseDateOnly : startView;

          // Only process if task starts on or before month end
          if (effectiveStart <= endView) {
            // Get all dates this task should occur on in this month
            const occurrenceDates = expandRecurringOccurrences(
              task,
              effectiveStart,
              endView
            );

            occurrenceDates.forEach((dateStr) => {
              // Check if a real task already exists for this date to avoid duplicates
              const realTaskExists = tasks.some((t) => {
                const tDate = t.dueDate?.toDate
                  ? t.dueDate.toDate().toISOString().split("T")[0]
                  : t.dueDate;

                // Compare Series ID and Date String
                return (
                  t.parentRecurringTaskId ===
                    (task.parentRecurringTaskId || task.id) && tDate === dateStr
                );
              });

              // If no real task exists yet, add a GHOST task
              if (!realTaskExists) {
                items.push({
                  ...task,
                  id: `ghost-${task.id}-${dateStr}`, // Unique fake ID
                  dueDate: dateStr, // Override date
                  itemType: "task",
                  isGhost: true, // Flag for UI styling
                  status: "Scheduled",
                });
              }
            });
          }
        }
      });
    }

    // 2. PROCESSING MEETINGS
    if (filterType === "all" || filterType === "meetings") {
      const filteredEvents = events.filter((event) => {
        if (filterStatus === "all") return true;
        return event.status === filterStatus;
      });

      items = [
        ...items,
        ...filteredEvents.map((event) => ({ ...event, itemType: "meeting" })),
      ];
    }

    return items;
  }, [tasks, events, filterType, filterStatus, currentDate]);

  const getItemsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const dayItems = filteredItems.filter((item) => {
      if (item.itemType === "task") {
        const dueDate = item.dueDate?.toDate?.() || new Date(item.dueDate);
        const taskDateStr = `${dueDate.getFullYear()}-${String(
          dueDate.getMonth() + 1
        ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

        return item.isGhost
          ? item.dueDate === dateStr
          : taskDateStr === dateStr;
      } else if (item.itemType === "meeting") {
        return item.date === dateStr;
      }
      return false;
    });

    return dayItems;
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
          className="h-28 border border-gray-100 bg-gray-50"
        />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayItems = getItemsForDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDateObj = new Date(date);
      currentDateObj.setHours(0, 0, 0, 0);
      const isPast = currentDateObj < today;
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
            {dayItems.slice(0, 2).map((item) => {
              const isEvent = item.itemType === "meeting";
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

              // Styling for Ghost Items
              return (
                <div
                  key={item.id}
                  className={`text-xs p-1.5 rounded-md truncate relative shadow-sm hover:shadow-md transition-shadow cursor-pointer 
                    ${isPast ? "bg-gray-200 text-gray-500" : typeBadge}
                    ${
                      item.isGhost
                        ? "opacity-60 border border-dashed border-gray-400 bg-gray-50"
                        : ""
                    } 
                  `}
                  title={
                    item.isGhost ? "Future Recurrence (Projected)" : item.title
                  }
                >
                  {/* Priority strip on the left -- hidden for meetings and ghost tasks */}
                  {typeKey !== "meeting" && !item.isGhost && (
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${priorityDot}`}
                      aria-hidden
                    />
                  )}

                  <div className="flex items-center gap-1 pl-2">
                    <span className="truncate font-medium">
                      {isEvent ? `${item.time} ${item.title}` : item.title}
                    </span>
                    {/* Recurring/Ghost Icon */}
                    {(isEvent && (item.isRecurring || item.recurringPattern)) ||
                    item.isGhost ? (
                      <MdReplayCircleFilled className="text-teal-600 text-sm ml-1 flex-shrink-0" />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {dayItems.length > 2 && (
              <div className="text-xs text-gray-600 font-semibold bg-gray-100 rounded px-2 py-1 text-center hover:bg-gray-200 transition-colors cursor-pointer">
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

  const handleTaskSave = async (taskData) => {
    try {
      const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
      const newTask = {
        title: taskData.title,
        description: taskData.description || "",
        projectId: taskData.projectId || "",
        assigneeId: user.uid,
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
        attendeeIds: [user.uid],
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
          <Card className="p-4">Loading...</Card>
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
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterStatus("all");
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Items</option>
                <option value="meetings">Meetings</option>
                <option value="tasks">Tasks</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
          <Card className="lg:col-span-3 p-4">
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
                {getItemsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <FaCalendarAlt className="text-gray-400 text-2xl" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">
                      No items on this date
                    </p>
                  </div>
                ) : (
                  getItemsForDate(selectedDate).map((item) => {
                    // ✅ RENDER DETAILS IN SIDEBAR
                    const isEvent = item.itemType === "meeting";
                    if (isEvent) {
                      return (
                        <div
                          key={item.id}
                          className="border-2 rounded-lg p-3 space-y-2 bg-white"
                        >
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            Meeting
                          </span>
                        </div>
                      );
                    }

                    const isGhost = item.isGhost;
                    const taskDisplayClass = isGhost
                      ? "bg-gray-100 text-gray-600 border-dashed border-gray-300"
                      : "bg-white";

                    return (
                      <div
                        key={item.id}
                        className={`border-2 rounded-lg p-3 space-y-2 hover:shadow-lg transition-all duration-200 hover:border-blue-300 ${taskDisplayClass} ${
                          isGhost ? "opacity-75" : ""
                        }`}
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
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100">
                              {isGhost ? "Projected Recurrence" : item.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Due Date: {item.dueDate}</div>
                          {item.isGhost && (
                            <div className="text-indigo-600 font-medium">
                              Auto-creates on this date
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
                <p className="text-sm">Click on a date to view events</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Floating Add Button with Dropdown */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
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
          <button
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            className={`w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${
              showFloatingMenu ? "rotate-45" : ""
            }`}
          >
            <FaPlus className="text-xl group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSave={handleTaskSave}
          projects={projects}
          assignees={resources}
          clients={clients}
        />
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEventModal}
          />
          <Card className="z-10 w-auto max-w-[90vw] md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create Meeting</h2>
                <button
                  onClick={closeEventModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleEventSave(Object.fromEntries(formData));
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Title
                    </span>
                    <input
                      name="title"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Date
                    </span>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Time
                    </span>
                    <input
                      type="time"
                      name="time"
                      required
                      defaultValue="09:00"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Duration (min)
                    </span>
                    <input
                      type="number"
                      name="duration"
                      defaultValue="60"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">
                      Description
                    </span>
                    <textarea
                      name="description"
                      rows="3"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    ></textarea>
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
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;

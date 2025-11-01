import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const EmployeeCalendar = () => {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return () => unsubscribe();
  }, [user]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getTasksForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return tasks.filter((task) => {
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      const taskDateStr = `${dueDate.getFullYear()}-${String(
        dueDate.getMonth() + 1
      ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      return taskDateStr === dateStr;
    });
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
      const dayTasks = getTasksForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 ${
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
          {dayTasks.length > 0 && (
            <div className="mt-1">
              <span className="text-xs bg-blue-500 text-white px-1 rounded">
                {dayTasks.length} task{dayTasks.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
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
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Your task schedule" />
        <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Calendar"
        description="View your tasks and deadlines"
        icon={<FaCalendarAlt />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 p-4">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FaChevronLeft />
            </button>
            <h2 className="text-lg font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FaChevronRight />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="p-2 text-center font-medium text-gray-600 border-b"
              >
                {day}
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
              ? `Tasks for ${selectedDate.toLocaleDateString()}`
              : "Select a date"}
          </h3>

          {selectedDate ? (
            <div className="space-y-3">
              {getTasksForDate(selectedDate).map((task) => {
                const priorityColors = {
                  High: "border-red-500",
                  Medium: "border-yellow-500",
                  Low: "border-green-500",
                };

                return (
                  <div
                    key={task.id}
                    className={`border-l-4 ${
                      priorityColors[task.priority]
                    } bg-gray-50 p-3 rounded`}
                  >
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{task.status}</p>
                  </div>
                );
              })}
              {getTasksForDate(selectedDate).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks for this date
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Click on a date to view tasks
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployeeCalendar;

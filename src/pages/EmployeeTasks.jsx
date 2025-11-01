import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import KanbanBoard from "../components/KanbanBoard";
import toast from "react-hot-toast";
import {
  FaTasks,
  FaFilter,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTimes,
  FaCalendar,
  FaFlag,
  FaSortAmountDown,
  FaTh,
  FaList,
} from "react-icons/fa";

const EmployeeTasks = () => {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // all, overdue, today, week
  const [displayMode, setDisplayMode] = useState("list"); // list, kanban

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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        ...(newStatus === "Done" && { completedAt: new Date() }),
      });
      toast.success("Task status updated!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task status");
    }
  };

  // Calculate task statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "Done").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    overdue: tasks.filter((t) => {
      if (t.status === "Done") return false;
      const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
      return dueDate < new Date();
    }).length,
  };

  // Advanced filtering
  const filteredTasks = tasks
    .filter((task) => {
      // Status filter
      const statusMatch =
        statusFilter === "all" || task.status === statusFilter;

      // Priority filter
      const priorityMatch =
        priorityFilter === "all" || task.priority === priorityFilter;

      // Search filter
      const searchMatch =
        searchQuery === "" ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // View mode filter
      let viewModeMatch = true;
      const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
      const today = new Date();
      const todayStr = today.toDateString();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (viewMode === "overdue") {
        viewModeMatch = dueDate < today && task.status !== "Done";
      } else if (viewMode === "today") {
        viewModeMatch = dueDate.toDateString() === todayStr;
      } else if (viewMode === "week") {
        viewModeMatch =
          dueDate >= today && dueDate <= weekFromNow && task.status !== "Done";
      }

      return statusMatch && priorityMatch && searchMatch && viewModeMatch;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
        const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
        return dateA - dateB;
      } else if (sortBy === "priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return (
          (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
        );
      } else if (sortBy === "status") {
        const statusOrder = {
          "To-Do": 0,
          "In Progress": 1,
          "In Review": 2,
          Done: 3,
        };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      } else if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

  const priorityColors = {
    High: "bg-red-100 text-red-800 border-red-300",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Low: "bg-green-100 text-green-800 border-green-300",
  };

  const statusColors = {
    "To-Do": "bg-gray-100 text-gray-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "In Review": "bg-purple-100 text-purple-800",
    Done: "bg-green-100 text-green-800",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Tasks" description="Manage your assigned tasks" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="View and manage your assigned tasks"
        icon={<FaTasks />}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {stats.total}
              </p>
            </div>
            <FaTasks className="text-blue-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {stats.completed}
              </p>
            </div>
            <FaCheckCircle className="text-green-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">In Progress</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">
                {stats.inProgress}
              </p>
            </div>
            <FaClock className="text-yellow-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {stats.overdue}
              </p>
            </div>
            <FaExclamationTriangle className="text-red-600 text-3xl" />
          </div>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode("today")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "today"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaCalendar className="inline mr-1" />
              Due Today
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "week"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setViewMode("overdue")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaExclamationTriangle className="inline mr-1" />
              Overdue
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode("list")}
              className={`p-2 rounded transition-colors ${
                displayMode === "list"
                  ? "bg-white text-indigo-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="List View"
            >
              <FaList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode("kanban")}
              className={`p-2 rounded transition-colors ${
                displayMode === "kanban"
                  ? "bg-white text-indigo-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Kanban View"
            >
              <FaTh className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <span className="font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="To-Do">To-Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <div className="flex items-center gap-2">
              <FaSortAmountDown className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="status">Sort by Status</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 font-medium">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery ||
            statusFilter !== "all" ||
            priorityFilter !== "all" ||
            viewMode !== "all") && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchQuery && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("all")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {priorityFilter !== "all" && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                  Priority: {priorityFilter}
                  <button onClick={() => setPriorityFilter("all")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {viewMode !== "all" && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  View: {viewMode}
                  <button onClick={() => setViewMode("all")}>
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setViewMode("all");
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Tasks List or Kanban View */}
      {displayMode === "kanban" ? (
        <Card>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <FaTasks className="text-gray-300 text-5xl mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No tasks found matching the filters.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onMove={handleStatusChange}
              onEdit={(task) => setSelectedTask(task)}
              getProject={() => ({ name: "—", color: "#6b7280" })}
              getAssignee={() => ({ name: "You", role: "Employee" })}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FaTasks className="text-gray-300 text-5xl mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No tasks found matching the filters.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const dueDate =
                task.dueDate?.toDate?.() || new Date(task.dueDate);
              const isOverdue = dueDate < new Date() && task.status !== "Done";
              const daysUntilDue = Math.ceil(
                (dueDate - new Date()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card
                  key={task.id}
                  className={`border-l-4 hover:shadow-lg transition-shadow ${
                    priorityColors[task.priority]?.split(" ")[2] ||
                    "border-gray-300"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="flex-1 text-left"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                              {task.title}
                            </h3>
                          </button>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                              statusColors[task.status] || statusColors["To-Do"]
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          priorityColors[task.priority] || priorityColors.Medium
                        }`}
                      >
                        <FaFlag className="text-xs" />
                        {task.priority} Priority
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          isOverdue
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : daysUntilDue <= 3 && daysUntilDue >= 0
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <FaCalendar className="text-xs" />
                        Due: {dueDate.toLocaleDateString()}
                        {isOverdue
                          ? " (Overdue!)"
                          : daysUntilDue === 0
                          ? " (Today)"
                          : daysUntilDue === 1
                          ? " (Tomorrow)"
                          : daysUntilDue > 0 && daysUntilDue <= 7
                          ? ` (${daysUntilDue} days)`
                          : ""}
                      </span>
                      {task.projectName && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          📁 {task.projectName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t">
                      <span className="text-sm text-gray-600 font-medium">
                        Update Status:
                      </span>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task.id, e.target.value)
                        }
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 cursor-pointer transition-colors ${
                          statusColors[task.status] || statusColors["To-Do"]
                        } hover:opacity-80`}
                      >
                        <option value="To-Do">To-Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="In Review">In Review</option>
                        <option value="Done">Done</option>
                      </select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="whitespace-nowrap ml-auto"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-white/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl border border-gray-200">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTask.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      statusColors[selectedTask.status] || statusColors["To-Do"]
                    }`}
                  >
                    {selectedTask.status}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      priorityColors[selectedTask.priority] ||
                      priorityColors.Medium
                    }`}
                  >
                    <FaFlag className="inline mr-1" />
                    {selectedTask.priority} Priority
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Due Date
                  </h4>
                  <p className="text-gray-900">
                    <FaCalendar className="inline mr-2 text-indigo-600" />
                    {(
                      selectedTask.dueDate?.toDate?.() ||
                      new Date(selectedTask.dueDate)
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {selectedTask.projectName && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Project
                    </h4>
                    <p className="text-gray-900">
                      📁 {selectedTask.projectName}
                    </p>
                  </div>
                )}
              </div>

              {/* Completion Date */}
              {selectedTask.completedAt && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Completed On
                  </h4>
                  <p className="text-gray-900">
                    <FaCheckCircle className="inline mr-2 text-green-600" />
                    {(
                      selectedTask.completedAt?.toDate?.() ||
                      new Date(selectedTask.completedAt)
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Update Status
                </h4>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    handleStatusChange(selectedTask.id, e.target.value);
                    setSelectedTask({
                      ...selectedTask,
                      status: e.target.value,
                    });
                  }}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg border-2 ${
                    statusColors[selectedTask.status] || statusColors["To-Do"]
                  }`}
                >
                  <option value="To-Do">To-Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasks;

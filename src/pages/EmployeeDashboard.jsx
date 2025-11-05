import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import Button from "../components/Button";
import CompletionCommentModal from "../components/CompletionCommentModal";
import {
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaChartLine,
  FaCalendarAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";

const EmployeeDashboard = () => {
  const { user, userData } = useAuthContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      console.log("No user UID found");
      setLoading(false);
      return;
    }

    console.log("Fetching tasks for user:", user.uid);

    // Simplified query - fetch all tasks for this user
    const q = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Tasks fetched:", snapshot.docs.length);
        const taskData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            status:
              (doc.data().status === "In Review" ? "In Progress" : doc.data().status) ||
              "To-Do",
          }))
          // Filter by assigneeType in client-side
          .filter((task) => task.assigneeType === "user");

        console.log("Tasks after filtering:", taskData.length);

        // Sort by dueDate in client
        taskData.sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate || 0);
          const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate || 0);
          return dateA - dateB;
        });
        setTasks(taskData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks. Please refresh the page.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch projects where employee has tasks
  useEffect(() => {
    if (!user?.uid || tasks.length === 0) {
      setProjects([]);
      return;
    }

    const projectIds = [
      ...new Set(tasks.map((t) => t.projectId).filter(Boolean)),
    ];

    if (projectIds.length === 0) {
      setProjects([]);
      return;
    }

    console.log("Fetching projects:", projectIds);

    const qProjects = query(
      collection(db, "projects"),
      where("__name__", "in", projectIds.slice(0, 10)) // Firestore 'in' limit
    );

    const unsubProjects = onSnapshot(
      qProjects,
      (snapshot) => {
        console.log("Projects fetched:", snapshot.docs.length);
        setProjects(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        console.error("Error fetching projects:", error);
      }
    );

    return () => unsubProjects();
  }, [user, tasks]);

  // Calculate stats
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "Done").length,
    inProgressTasks: tasks.filter((t) => t.status === "In Progress").length,
    overdueTasks: tasks.filter((t) => {
      if (t.status === "Done") return false;
      const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
      return dueDate < new Date();
    }).length,
  };

  // Today's tasks
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    const dueDateStr = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
    return dueDateStr === todayStr && t.status !== "Done";
  });

  const upcomingTasks = tasks.filter((t) => t.status !== "Done").slice(0, 5);

  // Recent activity (last 7 days completed tasks)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCompletedTasks = tasks
    .filter((t) => {
      if (t.status !== "Done" || !t.completedAt) return false;
      const completedDate =
        t.completedAt?.toDate?.() || new Date(t.completedAt);
      return completedDate >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
      return dateB - dateA;
    })
    .slice(0, 5);

  // Performance metrics
  const completionRate =
    stats.totalTasks > 0
      ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
      : 0;

  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "High" && t.status !== "Done"
  ).length;

  // Quick mark as done handler
  const handleQuickComplete = (taskId) => {
    setCompletionTaskId(taskId);
    setShowCompletionModal(true);
  };

  const handleSubmitCompletion = async (comment) => {
    if (!completionTaskId) {
      setShowCompletionModal(false);
      return;
    }
    try {
      await updateDoc(doc(db, "tasks", completionTaskId), {
        status: "Done",
        completedAt: serverTimestamp(),
        completedBy: user?.uid || "",
        completedByType: "user",
        progressPercent: 100,
        ...(comment ? { completionComment: comment } : {}),
      });
      toast.success("Task marked as complete!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setShowCompletionModal(false);
      setCompletionTaskId(null);
    }
  };

  console.log("Render state:", {
    loading,
    tasksCount: tasks.length,
    user: user?.uid,
    userData: userData?.name,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading your dashboard..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Please log in" />
        <Card>
          <p className="text-center py-8 text-gray-500">
            No user found. Please log in again.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${userData?.name || "Employee"}!`}
        description="Overview of your tasks and activities"
      />

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {stats.totalTasks}
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
                {stats.completedTasks}
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
                {stats.inProgressTasks}
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
                {stats.overdueTasks}
              </p>
            </div>
            <FaExclamationTriangle className="text-red-600 text-3xl" />
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" />
          Performance Overview
        </h3>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Task Completion Rate</span>
              <span className="font-semibold text-gray-900">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-700">Active Projects</div>
              <div className="text-2xl font-bold text-blue-900">
                {projects.length}
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-xs text-yellow-700">Due Today</div>
              <div className="text-2xl font-bold text-yellow-900">
                {todayTasks.length}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xs text-red-700">High Priority</div>
              <div className="text-2xl font-bold text-red-900">
                {highPriorityTasks}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-xs text-purple-700">This Week</div>
              <div className="text-2xl font-bold text-purple-900">
                {recentCompletedTasks.length}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Layout - Upcoming Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
            <Button
              onClick={() => navigate("/employee/tasks")}
              variant="ghost"
              className="text-sm"
            >
              View All →
            </Button>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
              <p className="text-gray-500">No pending tasks. Great job! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingTasks.map((task) => {
                const dueDate =
                  task.dueDate?.toDate?.() || new Date(task.dueDate);
                const isOverdue = dueDate < new Date();

                const priorityColors = {
                  High: "bg-red-100 text-red-800 border-red-200",
                  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
                  Low: "bg-green-100 text-green-800 border-green-200",
                };

                const statusColors = {
                  "To-Do": "bg-gray-100 text-gray-800",
                  "In Progress": "bg-blue-100 text-blue-800",
                  Done: "bg-green-100 text-green-800",
                };

                return (
                  <div
                    key={task.id}
                    className={`border-l-4 rounded-lg p-4 hover:shadow-md transition-shadow ${
                      priorityColors[task.priority]
                        ?.replace("bg-", "border-")
                        .split(" ")[0] || "border-gray-300"
                    } bg-white border border-gray-200`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              statusColors[task.status] || statusColors["To-Do"]
                            }`}
                          >
                            {task.status}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              priorityColors[task.priority] ||
                              priorityColors.Medium
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`text-xs ${
                              isOverdue
                                ? "text-red-600 font-semibold"
                                : "text-gray-500"
                            }`}
                          >
                            {dueDate.toLocaleDateString()}
                            {isOverdue && " (Overdue!)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {recentCompletedTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaClock className="text-gray-400 text-4xl mx-auto mb-2" />
              <p className="text-gray-500">
                No recent activity in the last 7 days
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentCompletedTasks.map((task) => {
                const completedDate =
                  task.completedAt?.toDate?.() || new Date(task.completedAt);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg"
                  >
                    <FaCheckCircle className="text-green-600 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          Completed {completedDate.toLocaleDateString()}
                        </span>
                        {task.priority && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white text-gray-700 border border-gray-200">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Today's Focus */}
      {todayTasks.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-600" />
            Today's Focus ({todayTasks.length}{" "}
            {todayTasks.length === 1 ? "task" : "tasks"} due today)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayTasks.slice(0, 4).map((task) => {
              const priorityColors = {
                High: "bg-red-100 text-red-800 border-red-200",
                Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
                Low: "bg-green-100 text-green-800 border-green-200",
              };

              return (
                <div
                  key={task.id}
                  className="p-3 bg-white rounded-lg border-2 border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                          priorityColors[task.priority] || priorityColors.Medium
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>
                    <Button
                      onClick={() => handleQuickComplete(task.id)}
                      size="sm"
                      className="shrink-0"
                    >
                      ✓
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {todayTasks.length > 4 && (
            <div className="text-center mt-3">
              <Button
                onClick={() => navigate("/employee/tasks")}
                variant="outline"
                size="sm"
              >
                View all {todayTasks.length} tasks →
              </Button>
            </div>
          )}
        </Card>
      )}
      <CompletionCommentModal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletionTaskId(null);
        }}
        onSubmit={handleSubmitCompletion}
        title="Mark Task as Done"
        confirmLabel="Mark Done"
        minLength={5}
        maxLength={300}
      />
    </div>
  );
};

export default EmployeeDashboard;

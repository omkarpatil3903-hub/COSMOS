import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import { useAuthContext } from "../context/useAuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  FaChartBar,
  FaDownload,
  FaCheckCircle,
  FaClock,
  FaProjectDiagram,
  FaTasks,
} from "react-icons/fa";

export default function EmployeeReports() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    // Fetch tasks assigned to employee
    const qTasks = query(
      collection(db, "tasks"),
      where("assigneeId", "==", uid)
    );
    const unsubT = onSnapshot(qTasks, (snap) => {
      const allTasks = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((task) => task.assigneeType === "user");
      setTasks(allTasks);
      setLoading(false);
    });
    // Fetch projects where employee has tasks
    const projectIds = new Set();
    const unsubTasksForProjects = onSnapshot(qTasks, (snap) => {
      snap.docs.forEach((doc) => {
        const projectId = doc.data().projectId;
        if (projectId) projectIds.add(projectId);
      });

      if (projectIds.size > 0) {
        const qProjects = query(
          collection(db, "projects"),
          where("__name__", "in", Array.from(projectIds))
        );
        const unsubP = onSnapshot(qProjects, (projectSnap) => {
          setProjects(projectSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubP();
      } else {
        setProjects([]);
      }
    });

    return () => {
      unsubT();
      unsubTasksForProjects();
    };
  }, [uid]);

  // Calculate statistics
  const totalProjects = projects.length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const pendingTasks = tasks.filter((t) => t.status === "To-Do").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;
  // 'In Review' is no longer a status

  const taskCompletionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Overdue tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "Done") return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    return dueDate < new Date();
  }).length;

  // Tasks by priority
  const highPriorityTasks = tasks.filter((t) => t.priority === "High").length;
  const mediumPriorityTasks = tasks.filter(
    (t) => t.priority === "Medium"
  ).length;
  const lowPriorityTasks = tasks.filter((t) => t.priority === "Low").length;

  const exportToCSV = () => {
    const csvData = [
      ["Report Type", "Count", "Percentage"],
      ["Total Projects", totalProjects, "-"],
      ["Total Tasks", totalTasks, "-"],
      ["Completed Tasks", completedTasks, `${taskCompletionRate.toFixed(1)}%`],
      ["Pending Tasks", pendingTasks, "-"],
      ["In Progress Tasks", inProgressTasks, "-"],
      ["Overdue Tasks", overdueTasks, "-"],
      ["High Priority", highPriorityTasks, "-"],
      ["Medium Priority", mediumPriorityTasks, "-"],
      ["Low Priority", lowPriorityTasks, "-"],
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reports & Analytics"
        description="Overview of your performance and task statistics"
        icon={<FaChartBar />}
      />

      <div className="flex justify-end">
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <FaDownload />
          Export CSV
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Total Projects
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {totalProjects}
              </p>
            </div>
            <FaProjectDiagram className="text-blue-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Tasks</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {totalTasks}
              </p>
            </div>
            <FaTasks className="text-purple-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {completedTasks}
              </p>
            </div>
            <FaCheckCircle className="text-green-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {overdueTasks}
              </p>
            </div>
            <FaClock className="text-red-600 text-3xl" />
          </div>
        </Card>
      </div>

      {/* Completion Rate & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Task Completion Rate
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">
                  {taskCompletionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${taskCompletionRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">
                  {completedTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">Done</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">
                  {inProgressTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">In Progress</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xl font-bold text-yellow-600">
                  {pendingTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">To-Do</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks by Priority
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">High Priority</span>
                <span className="font-medium text-red-600">
                  {highPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? (highPriorityTasks / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Medium Priority</span>
                <span className="font-medium text-yellow-600">
                  {mediumPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? (mediumPriorityTasks / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Low Priority</span>
                <span className="font-medium text-green-600">
                  {lowPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0 ? (lowPriorityTasks / totalTasks) * 100 : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Projects
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalProjects}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalProjects}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Tasks
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {completedTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inProgressTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pendingTasks}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  High Priority
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {highPriorityTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "Done"
                    ).length
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "In Progress"
                    ).length
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "To-Do"
                    ).length
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

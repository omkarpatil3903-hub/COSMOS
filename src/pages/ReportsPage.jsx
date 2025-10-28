import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaDownload,
  FaUsers,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaProjectDiagram,
} from "react-icons/fa";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

// Helpers for Firestore data
const tsToDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// date formatting helper removed if unused

const normalizeStatus = (s) => {
  const x = String(s || "").trim().toLowerCase();
  if (x === "done" || x === "completed" || x === "complete") return "Done";
  if (x === "in progress" || x === "in-progress" || x === "inprogress")
    return "In Progress";
  if (x === "in review" || x === "in-review" || x === "inreview")
    return "In Review";
  if (x === "to-do" || x === "to do" || x === "todo" || x === "" || x === "open")
    return "To-Do";
  return s || "To-Do";
};

// Time period configurations
const timePeriods = [
  { id: "today", label: "Today", days: 0 },
  { id: "yesterday", label: "Yesterday", days: 1 },
  { id: "week", label: "This Week", days: 7 },
  { id: "last-week", label: "Last Week", days: 14, offset: 7 },
  { id: "month", label: "This Month", days: 30 },
  { id: "last-month", label: "Last Month", days: 60, offset: 30 },
  { id: "quarter", label: "This Quarter (3 months)", days: 90 },
  { id: "last-quarter", label: "Last Quarter", days: 180, offset: 90 },
  { id: "year", label: "This Year", days: 365 },
  { id: "all", label: "All Time", days: 9999 },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Live data subscriptions
  useEffect(() => {
    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), orderBy("projectName", "asc")),
      (snap) => {
        setProjects(
          snap.docs.map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              name: data.projectName || data.name || "Untitled",
              color: data.color || "#6b7280",
              status: data.status || "Active",
            };
          })
        );
      }
    );
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), orderBy("createdAt", "desc")),
      (snap) => {
        setTasks(
          snap.docs.map((d) => {
            const data = d.data() || {};
            const created = tsToDate(data.createdAt);
            const completed = tsToDate(data.completedAt);
            return {
              id: d.id,
              title: data.title || "",
              projectId: data.projectId || "",
              assigneeId: data.assigneeId || "",
              assigneeType: data.assigneeType || "user",
              status: normalizeStatus(data.status || "To-Do"),
              priority: data.priority || "Medium",
              createdDate: created ? created.toISOString() : "",
              completedDate: completed ? completed.toISOString() : "",
            };
          })
        );
      }
    );

    return () => {
      unsubProjects();
      unsubUsers();
      unsubClients();
      unsubTasks();
    };
  }, []);

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (period.days + (period.offset || 0)));
    const endDate = new Date();
    if (period.offset) {
      endDate.setDate(now.getDate() - period.offset);
    }

    const filterByDate = (dateStr) => {
      if (period.id === "all") return true;
      const date = new Date(dateStr);
      return date >= startDate && date <= endDate;
    };

    let tasksInRange = tasks.filter((t) => {
      const matchesDate =
        filterByDate(t.createdDate) ||
        (t.completedDate && filterByDate(t.completedDate));
      const matchesProject =
        !selectedProject || t.projectId === selectedProject;
      return matchesDate && matchesProject;
    });

    return { tasks: tasksInRange };
  }, [selectedPeriod, selectedProject, tasks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { tasks } = filteredData;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "In Progress"
    ).length;
    const todoTasks = tasks.filter((t) => t.status === "To-Do").length;
    const inReviewTasks = tasks.filter((t) => t.status === "In Review").length;

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const priorityBreakdown = {
      High: tasks.filter((t) => t.priority === "High").length,
      Medium: tasks.filter((t) => t.priority === "Medium").length,
      Low: tasks.filter((t) => t.priority === "Low").length,
    };

    const projectBreakdown = {};
    tasks.forEach((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      const name = project?.name || "Unknown";
      projectBreakdown[name] = (projectBreakdown[name] || 0) + 1;
    });

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      inReviewTasks,
      completionRate,
      priorityBreakdown,
      projectBreakdown,
    };
  }, [filteredData, projects]);

  // Calculate resource-based statistics
  const resourceStats = useMemo(() => {
    const { tasks } = filteredData;

    // Group tasks by resource
    const resourceData = {};

    users.forEach((resource) => {
      const resourceTasks = tasks.filter(
        (t) => t.assigneeId === resource.id && (t.assigneeType || "user") === "user"
      );
      const completed = resourceTasks.filter((t) => t.status === "Done").length;
      const inProgress = resourceTasks.filter(
        (t) => t.status === "In Progress"
      ).length;
      const todo = resourceTasks.filter((t) => t.status === "To-Do").length;
      const inReview = resourceTasks.filter(
        (t) => t.status === "In Review"
      ).length;
      const total = resourceTasks.length;
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      if (total > 0) {
        resourceData[resource.id] = {
          ...resource,
          total,
          completed,
          inProgress,
          todo,
          inReview,
          completionRate,
          tasks: resourceTasks,
        };
      }
    });

    return resourceData;
  }, [filteredData, users]);

  const escapeCSV = (value) =>
    `"${(value ?? "").toString().replace(/"/g, '""')}"`;

  const exportReport = (format) => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    if (format === "csv") {
      // Generate CSV content (use template literals and escaping)
      let csvContent = `Report: ${period.label} - ${projectName}\n\n`;
      csvContent += `Summary Statistics\n`;
      csvContent += `Total Tasks,${stats.totalTasks}\n`;
      csvContent += `Completed Tasks,${stats.completedTasks}\n`;
      csvContent += `In Progress,${stats.inProgressTasks}\n`;
      csvContent += `To-Do,${stats.todoTasks}\n`;
      csvContent += `Completion Rate,${stats.completionRate}%\n\n`;

      csvContent += `Task Details\n`;
      csvContent += `Title,Assignee,Project,Status,Priority,Created Date,Completed Date\n`;
      filteredData.tasks.forEach((task) => {
        const project = projects.find((p) => p.id === task.projectId);
        const assigneeUser = users.find((r) => r.id === task.assigneeId);
        const assigneeClient = clients.find((c) => c.id === task.assigneeId);
        const assigneeName = assigneeUser?.name || assigneeClient?.clientName || "Unassigned";
        csvContent +=
          [
            escapeCSV(task.title),
            escapeCSV(assigneeName),
            escapeCSV(project?.name || "N/A"),
            escapeCSV(task.status),
            escapeCSV(task.priority),
            escapeCSV(task.createdDate || ""),
            escapeCSV(task.completedDate || "N/A"),
          ].join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_report_${period.id}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV report downloaded!");
    } else if (format === "json") {
      const reportData = {
        period: period.label,
        project: projectName,
        generatedAt: new Date().toISOString(),
        statistics: stats,
        tasks: filteredData.tasks,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_report_${period.id}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("JSON report downloaded!");
    }
  };

  const exportResourceReport = () => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    // Generate CSV content for resource report using safe escaping
    let csvContent = `Resource Performance Report\n`;
    csvContent += `Period: ${period.label}\n`;
    csvContent += `Project: ${projectName}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    csvContent += `Resource Name,Email,Role,Total Tasks,Completed,In Progress,To-Do,In Review,Completion Rate\n`;

    Object.values(resourceStats)
      .sort((a, b) => b.completionRate - a.completionRate)
      .forEach((resource) => {
        csvContent +=
          [
            escapeCSV(resource.name),
            escapeCSV(resource.email || ""),
            escapeCSV(resource.role || ""),
            resource.total,
            resource.completed,
            resource.inProgress,
            resource.todo,
            resource.inReview,
            `${resource.completionRate}%`,
          ].join(",") + "\n";
      });

    csvContent += `\n\nDetailed Task Breakdown by Resource\n\n`;

    Object.values(resourceStats)
      .sort((a, b) => b.completionRate - a.completionRate)
      .forEach((resource) => {
        csvContent += `\n${resource.name} - Tasks\n`;
        csvContent += `Task Title,Project,Status,Priority,Created Date,Completed Date\n`;
        resource.tasks.forEach((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          csvContent +=
            [
              escapeCSV(task.title),
              escapeCSV(project?.name || "N/A"),
              escapeCSV(task.status),
              escapeCSV(task.priority),
              escapeCSV(task.createdDate || ""),
              escapeCSV(task.completedDate || "N/A"),
            ].join(",") + "\n";
        });
      });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource_report_${period.id}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Resource report downloaded!");
  };

  // compute widths for progress bars before JSX
  const pct = (count) =>
    stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0;
  const completedWidth = pct(stats.completedTasks);
  const inProgressWidth = pct(stats.inProgressTasks);
  const inReviewWidth = pct(stats.inReviewTasks);
  const todoWidth = pct(stats.todoTasks);

  return (
    <div>
      <PageHeader title="Analytics & Reports">
        View comprehensive analytics and reports across different time periods
      </PageHeader>

      <div className="space-y-6">
        {/* Filters */}
        <Card title="Report Filters">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block">
                <span className="text-sm font-medium mb-2 block">
                  Time Period
                </span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                >
                  {timePeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium mb-2 block">
                  Project Filter
                </span>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => exportReport("csv")} variant="secondary">
              <FaDownload /> Export CSV
            </Button>
            <Button onClick={() => exportReport("json")} variant="secondary">
              <FaDownload /> Export JSON
            </Button>
          </div>
        </Card>

        {/* Overview Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4" style={{ borderLeftColor: "#4f46e5" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Total Tasks</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <FaTasks className="h-8 w-8 text-indigo-600 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: "#059669" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Completed</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.completedTasks}
                </p>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: "#0891b2" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">In Progress</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.inProgressTasks}
                </p>
              </div>
              <FaClock className="h-8 w-8 text-cyan-600 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: "#7c3aed" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Completion Rate</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.completionRate}%
                </p>
              </div>
              <FaChartLine className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Task Status Breakdown */}
        <Card title="Task Status Breakdown" icon={<FaChartBar />}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-sm text-content-tertiary">
                  {stats.completedTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${completedWidth}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">In Progress</span>
                <span className="text-sm text-content-tertiary">
                  {stats.inProgressTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-cyan-600 h-3 rounded-full transition-all"
                  style={{ width: `${inProgressWidth}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">In Review</span>
                <span className="text-sm text-content-tertiary">
                  {stats.inReviewTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full transition-all"
                  style={{ width: `${inReviewWidth}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">To-Do</span>
                <span className="text-sm text-content-tertiary">
                  {stats.todoTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gray-400 h-3 rounded-full transition-all"
                  style={{ width: `${todoWidth}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Priority Breakdown */}
          <Card title="Priority Distribution" icon={<FaExclamationTriangle />}>
            <div className="space-y-3">
              {Object.entries(stats.priorityBreakdown).map(
                ([priority, count]) => {
                  const colors = {
                    High: {
                      bg: "bg-red-100",
                      text: "text-red-700",
                      bar: "bg-red-600",
                    },
                    Medium: {
                      bg: "bg-yellow-100",
                      text: "text-yellow-700",
                      bar: "bg-yellow-600",
                    },
                    Low: {
                      bg: "bg-green-100",
                      text: "text-green-700",
                      bar: "bg-green-600",
                    },
                  };
                  const color = colors[priority];
                  const width =
                    stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0;

                  return (
                    <div key={priority} className="flex items-center gap-3">
                      <span
                        className={`${color.bg} ${color.text} px-3 py-1 rounded text-sm font-medium min-w-[80px]`}
                      >
                        {priority}
                      </span>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${color.bar} h-2 rounded-full transition-all`}
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm text-content-tertiary min-w-[40px] text-right">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </Card>

          {/* Project Breakdown */}
          <Card title="Tasks by Project" icon={<FaProjectDiagram />}>
            {Object.keys(stats.projectBreakdown).length === 0 ? (
              <div className="py-8 text-center text-content-tertiary">
                No tasks found for selected period
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.projectBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([projectName, count]) => {
                    const project = projects.find((p) => p.name === projectName);
                    return (
                      <div
                        key={projectName}
                        className="flex items-center gap-3"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project?.color || "#9ca3af" }}
                        ></div>
                        <span className="text-sm flex-1">{projectName}</span>
                        <span className="text-sm font-semibold">{count}</span>
                        <span className="text-xs text-content-tertiary">
                          (
                          {stats.totalTasks > 0
                            ? Math.round((count / stats.totalTasks) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Resource-Based Reports */}
        {Object.keys(resourceStats).length > 0 && (
          <Card title="Resource Performance" icon={<FaUsers />}>
            <div className="mb-4">
              <p className="text-sm text-content-tertiary">
                Performance breakdown by team member for the selected period
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    <th className="text-left py-3 px-4">Resource</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-center py-3 px-4">Total Tasks</th>
                    <th className="text-center py-3 px-4">Completed</th>
                    <th className="text-center py-3 px-4">In Progress</th>
                    <th className="text-center py-3 px-4">To-Do</th>
                    <th className="text-center py-3 px-4">In Review</th>
                    <th className="text-center py-3 px-4">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(resourceStats)
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((resource) => {
                      const completionColor =
                        resource.completionRate >= 80
                          ? "text-green-600"
                          : resource.completionRate >= 50
                          ? "text-yellow-600"
                          : "text-red-600";

                      return (
                        <tr
                          key={resource.id}
                          className="border-b border-subtle hover:bg-surface-subtle"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{resource.name}</div>
                              <div className="text-xs text-content-tertiary">
                                {resource.email}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">
                              {resource.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            {resource.total}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <FaCheckCircle className="text-xs" />
                              {resource.completed}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-cyan-600">
                              <FaClock className="text-xs" />
                              {resource.inProgress}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600">
                            {resource.todo}
                          </td>
                          <td className="py-3 px-4 text-center text-yellow-600">
                            {resource.inReview}
                          </td>
                          <td
                            className={`py-3 px-4 text-center font-bold ${completionColor}`}
                          >
                            {resource.completionRate}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Export Resource Report */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => exportResourceReport()}
                variant="secondary"
                icon={<FaDownload />}
              >
                Export Resource Report
              </Button>
            </div>
          </Card>
        )}

        {/* Recent Tasks */}
        {filteredData.tasks.length > 0 && (
          <Card title="Recent Tasks" icon={<FaChartPie />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    <th className="text-left py-2 px-3">Task</th>
                    <th className="text-left py-2 px-3">Assignee</th>
                    <th className="text-left py-2 px-3">Project</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Priority</th>
                    <th className="text-left py-2 px-3">Created</th>
                    <th className="text-left py-2 px-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.tasks.slice(0, 10).map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    const assigneeUser = users.find((r) => r.id === task.assigneeId);
                    const assigneeClient = clients.find((c) => c.id === task.assigneeId);
                    const assigneeName = assigneeUser?.name || assigneeClient?.clientName || "Unassigned";
                    const assigneeRole = assigneeUser?.role || (assigneeClient ? "Client" : "");
                    const statusColors = {
                      Done: "bg-green-100 text-green-700",
                      "In Progress": "bg-cyan-100 text-cyan-700",
                      "To-Do": "bg-gray-100 text-gray-700",
                      "In Review": "bg-yellow-100 text-yellow-700",
                    };
                    const priorityColors = {
                      High: "text-red-600",
                      Medium: "text-yellow-600",
                      Low: "text-green-600",
                    };

                    return (
                      <tr key={task.id} className="border-b border-subtle">
                        <td className="py-2 px-3">{task.title}</td>
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <div className="font-medium">
                              {assigneeName}
                            </div>
                            <div className="text-content-tertiary">
                              {assigneeRole}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className="inline-block px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: project?.color + "20",
                              color: project?.color,
                            }}
                          >
                            {project?.name}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              statusColors[task.status] || ""
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 font-semibold ${
                            priorityColors[task.priority] || ""
                          }`}
                        >
                          {task.priority}
                        </td>
                        <td className="py-2 px-3 text-content-tertiary">
                          {task.createdDate}
                        </td>
                        <td className="py-2 px-3 text-content-tertiary">
                          {task.completedDate || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

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
  FaFlag,
} from "react-icons/fa";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getPriorityBadge, getStatusBadge } from "../utils/colorMaps";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Label,
} from "recharts";

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
  const x = String(s || "")
    .trim()
    .toLowerCase();
  if (x === "done" || x === "completed" || x === "complete") return "Done";
  if (x === "in progress" || x === "in-progress" || x === "inprogress")
    return "In Progress";
  if (x === "in review" || x === "in-review" || x === "inreview")
    return "In Progress";
  if (
    x === "to-do" ||
    x === "to do" ||
    x === "todo" ||
    x === "" ||
    x === "open"
  )
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
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
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
      const matchesEmployee =
        !selectedEmployee ||
        (t.assigneeId === selectedEmployee &&
          (t.assigneeType || "user") === "user");
      return matchesDate && matchesProject && matchesEmployee;
    });

    return { tasks: tasksInRange };
  }, [selectedPeriod, selectedProject, selectedEmployee, tasks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { tasks } = filteredData;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "In Progress"
    ).length;
    const todoTasks = tasks.filter((t) => t.status === "To-Do").length;

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
        (t) =>
          t.assigneeId === resource.id && (t.assigneeType || "user") === "user"
      );
      const completed = resourceTasks.filter((t) => t.status === "Done").length;
      const inProgress = resourceTasks.filter(
        (t) => t.status === "In Progress"
      ).length;
      const todo = resourceTasks.filter((t) => t.status === "To-Do").length;
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
        const assigneeName =
          assigneeUser?.name || assigneeClient?.clientName || "Unassigned";
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

    csvContent += `Resource Name,Email,Role,Total Tasks,Completed,In Progress,To-Do,Completion Rate\n`;

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
  const todoWidth = pct(stats.todoTasks);

  // Chart datasets
  const statusChartData = useMemo(
    () => [
      { name: "Completed", value: stats.completedTasks, color: "#16a34a" },
      { name: "In Progress", value: stats.inProgressTasks, color: "#06b6d4" },
      { name: "To-Do", value: stats.todoTasks, color: "#9ca3af" },
    ],
    [stats]
  );

  const tasksOverTimeData = useMemo(() => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);
    startDate.setDate(now.getDate() - (period.days + (period.offset || 0)));
    if (period.offset) endDate.setDate(now.getDate() - period.offset);
    if (period.id === "all") {
      // Cap to last 60 days for readability
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 60);
    }
    const keyOf = (d) => d.toISOString().slice(0, 10);
    const map = {};
    const seq = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const k = keyOf(d);
      map[k] = { date: k, Created: 0, Completed: 0 };
      seq.push(map[k]);
    }
    filteredData.tasks.forEach((t) => {
      if (t.createdDate) {
        const k = keyOf(new Date(t.createdDate));
        if (map[k]) map[k].Created += 1;
      }
      if (t.completedDate) {
        const k2 = keyOf(new Date(t.completedDate));
        if (map[k2]) map[k2].Completed += 1;
      }
    });
    return seq;
  }, [filteredData, selectedPeriod]);

  // removed Top Projects dataset per request

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => exportReport("csv")} variant="secondary">
              <FaDownload /> Export CSV
            </Button>
            <Button onClick={() => exportReport("json")} variant="ghost">
              <FaDownload /> Export JSON
            </Button>
          </div>
        }
      >
        View comprehensive analytics and reports across different time periods
      </PageHeader>

      <div className="space-y-6">
        {/* Filters */}
        <Card
          title="Report Filters"
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 rounded-lg border border-subtle p-1">
                {[
                  { id: "today", label: "Today" },
                  { id: "week", label: "Week" },
                  { id: "month", label: "Month" },
                  { id: "all", label: "All" },
                ].map((p) => (
                  <Button
                    key={p.id}
                    variant={selectedPeriod === p.id ? "primary" : "secondary"}
                    className="px-3 py-1.5"
                    onClick={() => setSelectedPeriod(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => {
                  setSelectedPeriod("week");
                  setSelectedProject("");
                  setSelectedEmployee("");
                  setEmployeeSearch("");
                }}
                variant="ghost"
              >
                Reset Filters
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block">
                <span className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-500" /> Time Period
                </span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                >
                  {timePeriods
                    .filter(
                      (p) => !["today", "week", "month", "all"].includes(p.id)
                    )
                    .map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FaProjectDiagram className="text-gray-500" /> Project Filter
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

            <div>
              <label className="block">
                <span className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FaUsers className="text-gray-500" /> Employee Filter
                </span>
                <input
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employee"
                  className="mb-2 w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                />
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                >
                  <option value="">All Employees</option>
                  {users
                    .filter(
                      (u) => (u.role || "user").toLowerCase() !== "client"
                    )
                    .filter((u) =>
                      (u.name || u.email || "")
                        .toString()
                        .toLowerCase()
                        .includes(employeeSearch.toLowerCase())
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </div>
        </Card>

        {/* Overview Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4" style={{ borderLeftColor: "#4f46e5" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Total Tasks</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.totalTasks.toLocaleString("en-US")}
                </p>
              </div>
              <FaTasks className="h-8 w-8 text-indigo-600 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: "#059669" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-content-tertiary">Completed</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.completedTasks.toLocaleString("en-US")}
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
                  {stats.inProgressTasks.toLocaleString("en-US")}
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

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Status Distribution" icon={<FaChartPie />}>
            {loading ? (
              <div className="h-72 animate-pulse rounded-lg bg-surface-strong" />
            ) : stats.totalTasks === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-content-tertiary">
                <FaChartBar className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">No data</div>
                <div className="text-xs">
                  Try expanding the date range or clearing filters
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusChartData.map((entry, idx) => (
                        <Cell key={`s-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} tasks`, name]}
                    />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Tasks Over Time" icon={<FaChartLine />}>
            {loading ? (
              <div className="h-72 animate-pulse rounded-lg bg-surface-strong" />
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={tasksOverTimeData}
                    margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                    >
                      <Label
                        value="Tasks"
                        angle={-90}
                        position="insideLeft"
                        style={{ fill: "#9ca3af" }}
                      />
                    </YAxis>
                    <Tooltip
                      formatter={(value, name) => [`${value} tasks`, name]}
                    />
                    <Legend verticalAlign="bottom" height={24} />
                    <Line
                      type="monotone"
                      dataKey="Created"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Completed"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
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
            {loading ? (
              <div className="h-40 animate-pulse rounded-lg bg-surface-strong" />
            ) : Object.keys(stats.projectBreakdown).length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-content-tertiary">
                <FaChartBar className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">No data</div>
                <div className="text-xs">
                  Try expanding the date range or clearing filters
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.projectBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([projectName, count]) => {
                    const project = projects.find(
                      (p) => p.name === projectName
                    );
                    return (
                      <div
                        key={projectName}
                        className="flex items-center gap-3"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: project?.color || "#9ca3af",
                          }}
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
          <Card
            title="Resource Performance"
            icon={<FaUsers />}
            actions={
              <Button
                onClick={() => exportResourceReport()}
                variant="secondary"
              >
                <FaDownload /> Export CSV
              </Button>
            }
          >
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
                            <div className="flex items-center gap-2">
                              <span className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-indigo-500/20">
                                {resource.imageUrl ? (
                                  <img
                                    src={resource.imageUrl}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                                    {(resource.name || resource.email || "U")
                                      .toString()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </span>
                              <div>
                                <div className="font-medium">
                                  {resource.name}
                                </div>
                                <div className="text-xs text-content-tertiary">
                                  {resource.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">
                              {resource?.resourceRole}
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
          </Card>
        )}

        {/* Recent Tasks */}
        {(loading || filteredData.tasks.length > 0) && (
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
                  {loading && <SkeletonRow columns={7} />}
                  {!loading &&
                    filteredData.tasks.slice(0, 10).map((task) => {
                      const project = projects.find(
                        (p) => p.id === task.projectId
                      );
                      const assigneeUser = users.find(
                        (r) => r.id === task.assigneeId
                      );
                      const assigneeClient = clients.find(
                        (c) => c.id === task.assigneeId
                      );
                      const assigneeName =
                        assigneeUser?.name ||
                        assigneeClient?.clientName ||
                        "Unassigned";
                      const assigneeRole =
                        assigneeUser?.role || (assigneeClient ? "Client" : "");

                      return (
                        <tr key={task.id} className="border-b border-subtle">
                          <td className="py-2 px-3">{task.title}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-indigo-500/20">
                                {assigneeUser?.imageUrl ||
                                assigneeClient?.imageUrl ? (
                                  <img
                                    src={
                                      assigneeUser?.imageUrl ||
                                      assigneeClient?.imageUrl
                                    }
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[9px] font-semibold text-white">
                                    {(assigneeName || "U")
                                      .toString()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </span>
                              <div className="text-xs">
                                <div className="font-medium">
                                  {assigneeName}
                                </div>
                                <div className="text-content-tertiary">
                                  {assigneeRole}
                                </div>
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
                              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getStatusBadge(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              <FaFlag />
                              <span>{task.priority}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-content-tertiary">
                            {task.createdDate
                              ? new Date(task.createdDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "-"}
                          </td>
                          <td className="py-2 px-3 text-content-tertiary">
                            {task.completedDate
                              ? new Date(task.completedDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "-"}
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

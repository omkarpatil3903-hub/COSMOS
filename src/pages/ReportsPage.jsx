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
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearchPlus,
  FaSearchMinus,
  FaUndo,
} from "react-icons/fa";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import GanttChart from "../components/GanttChart";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  getPriorityBadge,
  getStatusBadge,
  PRIORITY_HEX,
  TYPE_HEX,
} from "../utils/colorMaps";

// UI Color Theme - using colorMaps for consistency
const UI_COLORS = {
  primary: TYPE_HEX.meeting, // blue-500 (#3b82f6)
  secondary: TYPE_HEX.milestone, // violet-500 (#8b5cf6)
  success: TYPE_HEX.task, // emerald-500 (#10b981)
  warning: TYPE_HEX.call, // amber-500 (#f59e0b)
  danger: PRIORITY_HEX.high, // red-500 (#ef4444)
};
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

import { tsToDate } from "../utils/dateUtils";

const normalizeStatus = (s) => {
  const lc = (s || "").toLowerCase();
  if (lc.includes("in-progress") || lc.includes("in progress"))
    return "In Progress";
  if (lc.includes("done") || lc.includes("completed")) return "Done";
  return "To-Do";
};

// Time period configurations
const timePeriods = [
  { id: "today", label: "Today", days: 0 },
  { id: "yesterday", label: "Yesterday", days: 1 },
  { id: "week", label: "This Week", days: 7 },
  { id: "last-week", label: "Last Week", days: 14, offset: 7 },
  { id: "next-30", label: "Next 30 Days", days: 30, future: true },
  { id: "month", label: "This Month", days: 30 },
  { id: "last-month", label: "Last Month", days: 60, offset: 30 },
  { id: "quarter", label: "This Quarter (3 months)", days: 90 },
  { id: "last-quarter", label: "Last Quarter", days: 180, offset: 90 },
  { id: "year", label: "This Year", days: 365 },
  { id: "all", label: "All Time", days: 9999 },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("next-30");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGantt, setShowGantt] = useState(true);
  const [ganttScale, setGanttScale] = useState("day");
  const [ganttZoom, setGanttZoom] = useState(1);
  const [ganttShowLabels, setGanttShowLabels] = useState(false);
  const [ganttStatuses, setGanttStatuses] = useState({
    "To-Do": true,
    "In Progress": true,
    Done: true,
  });
  const [ganttGroupProjects, setGanttGroupProjects] = useState(true);
  const [ganttLeftWidth, setGanttLeftWidth] = useState(280);

  // Sorting state for Recent Tasks table
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Pagination for Recent Tasks
  const [recentTasksLimit, setRecentTasksLimit] = useState(10);

  // Load persisted Gantt UI state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("reports:gantt:ui");
      if (raw) {
        const prefs = JSON.parse(raw) || {};
        if (prefs.scale) setGanttScale(prefs.scale);
        if (Number.isFinite(prefs.leftWidth)) setGanttLeftWidth(prefs.leftWidth);
      }
    } catch (e) {
      void e;
    }
  }, []);

  // Persist Gantt UI state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("reports:gantt:ui");
      const prev = raw ? JSON.parse(raw) : {};
      const next = { ...prev, scale: ganttScale, leftWidth: ganttLeftWidth };
      localStorage.setItem("reports:gantt:ui", JSON.stringify(next));
    } catch (e) {
      void e;
    }
  }, [ganttScale, ganttLeftWidth]);

  // Debounce employee search (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(employeeSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [employeeSearch]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProject) count++;
    if (selectedEmployee) count++;
    return count;
  }, [selectedProject, selectedEmployee]);

  // Live data subscriptions
  useEffect(() => {
    setLoading(true); // Set loading at the start
    
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
      },
      (error) => {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      }
    );
    const unsubUsers = onSnapshot(
      collection(db, "users"), 
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      },
      (error) => {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      }
    );
    const unsubClients = onSnapshot(
      collection(db, "clients"), 
      (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      },
      (error) => {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
      }
    );
    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), orderBy("createdAt", "desc")),
      (snap) => {
        setTasks(
          snap.docs.map((d) => {
            const data = d.data() || {};
            const created = tsToDate(data.createdAt);
            const completed = tsToDate(data.completedAt);
            const assigned = tsToDate(data.assignedDate);
            const due = tsToDate(data.dueDate);
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
              assignedDate: assigned ? assigned.toISOString() : "",
              dueDate: due ? due.toISOString() : "",
              archived: !!data.archived,
              dependsOn: Array.isArray(data.dependsOn)
                ? data.dependsOn.filter(Boolean)
                : [],
            };
          })
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
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

  // Filter data based on selected filters (NOT time period - that's only for Gantt)
  const filteredData = useMemo(() => {
    let filteredTasks = tasks.filter((t) => {
      const matchesProject =
        !selectedProject || t.projectId === selectedProject;
      const matchesEmployee =
        !selectedEmployee ||
        (t.assigneeId === selectedEmployee &&
          (t.assigneeType || "user") === "user");
      return matchesProject && matchesEmployee;
    });

    return { tasks: filteredTasks };
  }, [selectedProject, selectedEmployee, tasks]);

  // Derive chart range from selected period
  const ganttRange = useMemo(() => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    if (!period) {
      const now = new Date();
      return { 
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 
        endDate: now 
      };
    }
    
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period.future) {
      // For future periods - show from today to future
      endDate.setDate(now.getDate() + period.days);
      startDate.setDate(now.getDate() - 1); // Start from yesterday for context
    } else {
      // For past periods
      startDate.setDate(now.getDate() - (period.days + (period.offset || 0)));
      if (period.offset) endDate.setDate(now.getDate() - period.offset);
      // pad a bit for visibility
      startDate.setDate(startDate.getDate() - 1);
      endDate.setDate(endDate.getDate() + 1);
    }

    // Validate date range - ensure endDate is after startDate
    if (endDate <= startDate) {
      console.warn("Invalid date range detected, adjusting...");
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 7 days
    }

    return { startDate, endDate };
  }, [selectedPeriod]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { tasks } = filteredData;
    const totalTasks = tasks.length;

    // Single pass through tasks for all stats
    let completedTasks = 0;
    let inProgressTasks = 0;
    let todoTasks = 0;
    const priorityBreakdown = { High: 0, Medium: 0, Low: 0 };
    const projectBreakdown = {};

    tasks.forEach((task) => {
      // Count by status
      if (task.status === "Done") completedTasks++;
      else if (task.status === "In Progress") inProgressTasks++;
      else if (task.status === "To-Do") todoTasks++;

      // Count by priority
      if (priorityBreakdown[task.priority] !== undefined) {
        priorityBreakdown[task.priority]++;
      }

      // Count by project
      const project = projects.find((p) => p.id === task.projectId);
      const name = project?.name || "Unknown";
      projectBreakdown[name] = (projectBreakdown[name] || 0) + 1;
    });

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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

  // Sorting handler for Recent Tasks table
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sorted tasks for Recent Tasks table
  const sortedRecentTasks = useMemo(() => {
    if (!sortConfig.key) return filteredData.tasks.slice(0, recentTasksLimit);

    const sorted = [...filteredData.tasks].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "task":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "assignee": {
          const aUser = users.find((u) => u.id === a.assigneeId);
          const aClient = clients.find((c) => c.id === a.assigneeId);
          const bUser = users.find((u) => u.id === b.assigneeId);
          const bClient = clients.find((c) => c.id === b.assigneeId);
          aValue = (
            aUser?.name ||
            aClient?.clientName ||
            "Unassigned"
          ).toLowerCase();
          bValue = (
            bUser?.name ||
            bClient?.clientName ||
            "Unassigned"
          ).toLowerCase();
          break;
        }
        case "project": {
          const aProject = projects.find((p) => p.id === a.projectId);
          const bProject = projects.find((p) => p.id === b.projectId);
          aValue = (aProject?.name || "").toLowerCase();
          bValue = (bProject?.name || "").toLowerCase();
          break;
        }
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "priority": {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        }
        case "created":
          aValue = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          bValue = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          break;
        case "completed":
          aValue = a.completedDate ? new Date(a.completedDate).getTime() : 0;
          bValue = b.completedDate ? new Date(b.completedDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted.slice(0, recentTasksLimit);
  }, [
    filteredData.tasks,
    sortConfig,
    users,
    clients,
    projects,
    recentTasksLimit,
  ]);

  // Memoize common inline styles for performance
  const iconStyles = useMemo(
    () => ({
      primary: { color: UI_COLORS.primary },
      secondary: { color: UI_COLORS.secondary },
      success: { color: UI_COLORS.success },
      warning: { color: UI_COLORS.warning },
      danger: { color: UI_COLORS.danger },
    }),
    []
  );

  const cardStyles = useMemo(
    () => ({
      primaryBorder: { borderTopColor: UI_COLORS.primary },
      successBorder: { borderTopColor: UI_COLORS.success },
      warningBorder: { borderTopColor: UI_COLORS.warning },
      dangerBorder: { borderTopColor: UI_COLORS.danger },
      primaryBg: { backgroundColor: UI_COLORS.primary },
      primaryBgLight: { backgroundColor: UI_COLORS.primary + "1a" },
      successBgLight: { backgroundColor: UI_COLORS.success + "1a" },
    }),
    []
  );

  // Get sort icon for column
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400" />;
    return sortConfig.direction === "asc" ? (
      <FaSortUp style={iconStyles.primary} />
    ) : (
      <FaSortDown style={iconStyles.primary} />
    );
  };

  const escapeCSV = (value) =>
    `"${(value ?? "").toString().replace(/"/g, '""')}"`;

  const exportReport = (format) => {
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    if (!period) {
      console.error("Invalid time period selected");
      return;
    }
    
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    if (format === "csv") {
      // Generate CSV content (use template literals and escaping)
      let csvContent = `Report: ${projectName}\n\n`;
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
      a.download = `analytics_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV report downloaded!");
    } else if (format === "json") {
      const reportData = {
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
      a.download = `analytics_report_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("JSON report downloaded!");
    }
  };

  const exportResourceReport = () => {
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    // Generate CSV content for resource report using safe escaping
    let csvContent = `Resource Performance Report\n`;
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
    a.download = `resource_report_${Date.now()}.csv`;
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
      { name: "Completed", value: stats.completedTasks, color: UI_COLORS.success },
      { name: "In Progress", value: stats.inProgressTasks, color: UI_COLORS.primary },
      { name: "To-Do", value: stats.todoTasks, color: "#9ca3af" },
    ],
    [stats]
  );

  const tasksOverTimeData = useMemo(() => {
    // Show last 30 days of task activity
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    
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
  }, [filteredData]);

  // Build Gantt items from filtered tasks
  const ganttItems = useMemo(() => {
    return filteredData.tasks
      .filter((t) => !t.archived)
      .map((t) => {
        const start = t.assignedDate || t.createdDate || "";
        const end = t.dueDate || t.completedDate || start || "";
        return {
          id: t.id,
          title: t.title,
          projectId: t.projectId,
          assigneeId: t.assigneeId,
          status: t.status,
          priority: t.priority,
          startDate: start,
          endDate: end,
          dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [],
        };
      })
      .filter((x) => x.startDate);
  }, [filteredData]);

  // removed Top Projects dataset per request

  return (
    <div className="max-w-full overflow-x-hidden">
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

      <div className="space-y-6 max-w-full">
        {/* Filters */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span>Report Filters</span>
              {activeFilterCount > 0 && (
                <span
                  style={cardStyles.primaryBg}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white text-xs font-bold"
                >
                  {activeFilterCount}
                </span>
              )}
            </div>
          }
          actions={
            <Button
              onClick={() => {
                setSelectedPeriod("next-30");
                setSelectedProject("");
                setSelectedEmployee("");
                setEmployeeSearch("");
              }}
              variant="ghost"
              className="text-xs"
            >
              🔄 Reset Filters
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
            <div className="min-w-0">
              <label className="block">
                <span className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                  <FaProjectDiagram style={iconStyles.secondary} />{" "}
                  Project Filter
                  {selectedProject && (
                    <span
                      style={{
                        backgroundColor: UI_COLORS.secondary + "1a",
                        color: UI_COLORS.secondary,
                      }}
                      className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                    >
                      Active
                    </span>
                  )}
                </span>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  aria-label="Filter by project"
                  style={{
                    "--tw-ring-color": UI_COLORS.secondary + "33",
                    borderColor: "#d1d5db",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = UI_COLORS.secondary)
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 transition-all truncate max-w-full"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                      className="truncate"
                    >
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="min-w-0">
              <label className="block">
                <span className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                  <FaUsers style={iconStyles.success} /> Employee
                  Filter
                  {selectedEmployee && (
                    <span
                      style={{
                        backgroundColor: UI_COLORS.success + "1a",
                        color: UI_COLORS.success,
                      }}
                      className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                    >
                      Active
                    </span>
                  )}
                </span>
                <div className="relative">
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="🔍 Search employee..."
                    aria-label="Search employees by name or email"
                    style={{
                      "--tw-ring-color": UI_COLORS.success + "33",
                      borderColor: "#d1d5db",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = UI_COLORS.success)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    className="mb-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 transition-all"
                  />
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    aria-label="Filter by employee"
                    style={{
                      "--tw-ring-color": UI_COLORS.success + "33",
                      borderColor: "#d1d5db",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = UI_COLORS.success)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 transition-all truncate max-w-full"
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
                          .includes(debouncedSearch.toLowerCase())
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id} className="truncate">
                          {u.name || u.email}
                        </option>
                      ))}
                  </select>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Overview Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            style={cardStyles.primaryBorder}
            className="border-t-4 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
                <p
                  style={{ color: UI_COLORS.primary }}
                  className="text-3xl font-bold mt-1 animate-[fadeIn_0.5s_ease-in]"
                >
                  {stats.totalTasks.toLocaleString("en-US")}
                </p>
              </div>
              <div
                style={{ backgroundColor: UI_COLORS.primary + "1a" }}
                className="h-12 w-12 rounded-full flex items-center justify-center"
              >
                <FaTasks
                  style={{ color: UI_COLORS.primary }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          <Card
            style={{ borderTopColor: UI_COLORS.success }}
            className="border-t-4 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p
                  style={{ color: UI_COLORS.success }}
                  className="text-3xl font-bold mt-1 animate-[fadeIn_0.5s_ease-in]"
                >
                  {stats.completedTasks.toLocaleString("en-US")}
                </p>
                <p
                  style={{ color: UI_COLORS.success }}
                  className="text-xs mt-1"
                >
                  {stats.completionRate}% completion rate
                </p>
              </div>
              <div
                style={{ backgroundColor: UI_COLORS.success + "1a" }}
                className="h-12 w-12 rounded-full flex items-center justify-center"
              >
                <FaCheckCircle
                  style={{ color: UI_COLORS.success }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          <Card
            style={{ borderTopColor: UI_COLORS.warning }}
            className="border-t-4 bg-gradient-to-br from-amber-50 to-white hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">In Progress</p>
                <p
                  style={{ color: UI_COLORS.warning }}
                  className="text-3xl font-bold mt-1 animate-[fadeIn_0.5s_ease-in]"
                >
                  {stats.inProgressTasks.toLocaleString("en-US")}
                </p>
              </div>
              <div
                style={{ backgroundColor: UI_COLORS.warning + "1a" }}
                className="h-12 w-12 rounded-full flex items-center justify-center animate-pulse"
              >
                <FaClock
                  style={{ color: UI_COLORS.warning }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          <Card
            style={{ borderTopColor: UI_COLORS.secondary }}
            className="border-t-4 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Completion Rate
                </p>
                <p
                  style={{ color: UI_COLORS.secondary }}
                  className="text-3xl font-bold mt-1 animate-[fadeIn_0.5s_ease-in]"
                >
                  {stats.completionRate}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FaChartLine className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Status Distribution" icon={<FaChartPie />}>
            {loading ? (
              <div className="h-72 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            ) : stats.totalTasks === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <div
                  style={{ backgroundColor: UI_COLORS.primary + "1a" }}
                  className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
                >
                  <FaChartPie
                    style={{ color: UI_COLORS.primary }}
                    className="h-8 w-8"
                  />
                </div>
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  No Task Data Available
                </div>
                <div className="text-sm text-gray-500 mb-4 text-center max-w-xs">
                  Try expanding the date range or clearing filters to see your
                  task distribution
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedPeriod("year");
                    setSelectedProject("");
                    setSelectedEmployee("");
                  }}
                  className="text-sm flex items-center gap-2"
                >
                  <FaChartBar />
                  View This Year
                </Button>
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
              <div className="h-72 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
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
                      stroke={UI_COLORS.secondary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Completed"
                      stroke={UI_COLORS.success}
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

        {/* Gantt Chart */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <FaCalendarAlt style={{ color: UI_COLORS.primary }} />
              <span>Timeline (Gantt)</span>
            </div>
          }
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              {/* Scale Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-medium">
                  Scale:
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm">
                  {[
                    { value: "day", label: "Day", icon: <FaCalendarAlt /> },
                    { value: "week", label: "Week", icon: <FaCalendarAlt /> },
                    { value: "month", label: "Month", icon: <FaCalendarAlt /> },
                  ].map((scale) => (
                    <button
                      key={scale.value}
                      onClick={() => setGanttScale(scale.value)}
                      style={{
                        backgroundColor:
                          ganttScale === scale.value
                            ? UI_COLORS.primary
                            : "transparent",
                        color: ganttScale === scale.value ? "white" : "#374151",
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        ganttScale === scale.value
                          ? "shadow-sm"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {scale.icon}
                      {scale.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Period Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <FaCalendarAlt className="text-[10px]" />
                  Time Range
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  aria-label="Select time period for Gantt chart"
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {timePeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setGanttZoom((z) => Math.max(0.5, z - 0.25))}
                  className="rounded px-2 py-1 text-xs hover:bg-gray-100 transition flex items-center gap-1"
                  title="Zoom out"
                >
                  <FaSearchMinus />
                </button>
                <span className="text-xs font-medium w-14 text-center text-gray-700">
                  {Math.round(ganttZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setGanttZoom((z) => Math.min(3, z + 0.25))}
                  className="rounded px-2 py-1 text-xs hover:bg-gray-100 transition flex items-center gap-1"
                  title="Zoom in"
                >
                  <FaSearchPlus />
                </button>
                <button
                  type="button"
                  onClick={() => setGanttZoom(1)}
                  className="ml-1 rounded px-2 py-1 text-xs hover:bg-gray-100 transition text-gray-600 flex items-center gap-1"
                  title="Reset zoom"
                >
                  <FaUndo className="text-[10px]" />
                  Reset
                </button>
              </div>

              {/* Options */}
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition">
                <input
                  type="checkbox"
                  checked={ganttShowLabels}
                  onChange={(e) => setGanttShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium text-gray-700">Show Labels</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition">
                <input
                  type="checkbox"
                  checked={ganttGroupProjects}
                  onChange={(e) => setGanttGroupProjects(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium text-gray-700">
                  Group by Project
                </span>
              </label>

              {/* Status Filters */}
              <div className="hidden xl:flex items-center gap-1">
                {Object.keys(ganttStatuses).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={ganttStatuses[s]}
                      onChange={(e) =>
                        setGanttStatuses((prev) => ({
                          ...prev,
                          [s]: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span className="font-medium text-gray-700">{s}</span>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowGantt((v) => !v)}
                  className="text-xs"
                >
                  {showGantt ? "👁️ Hide" : "👁️ Show"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const html2canvas = (await import("html2canvas")).default;
                      const el = document.querySelector(".gantt-export-target");
                      if (!el) return toast.error("Gantt not found");
                      const canvas = await html2canvas(el, {
                        backgroundColor: "#ffffff",
                        scale: 1.5,
                      });
                      const link = document.createElement("a");
                      link.href = canvas.toDataURL("image/png");
                      link.download = `gantt_export_${Date.now()}.png`;
                      link.click();
                      toast.success("Exported PNG");
                    } catch (e) {
                      console.error(e);
                      toast.error("PNG export failed");
                    }
                  }}
                  title="Export visible timeline to PNG"
                  className="text-xs"
                >
                  📥 Export PNG
                </Button>
              </div>
            </div>
          }
        >
          {showGantt ? (
            loading ? (
              <div className="h-56 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            ) : ganttItems.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <div
                  style={{ backgroundColor: UI_COLORS.primary + "1a" }}
                  className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
                >
                  <FaCalendarAlt
                    style={{ color: UI_COLORS.primary }}
                    className="h-8 w-8"
                  />
                </div>
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  No Tasks in Timeline
                </div>
                <div className="text-sm text-gray-500 mb-4 text-center max-w-md">
                  There are no tasks with assigned dates in the selected time
                  period. Tasks need start and end dates to appear on the Gantt
                  chart.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedPeriod("year")}
                    className="text-sm flex items-center gap-2"
                  >
                    <FaCalendarAlt />
                    View This Year
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto gantt-export-target max-w-full">
                <div className="min-w-[600px] max-w-full">
                  <GanttChart
                    items={ganttItems}
                    projects={projects}
                    users={users}
                    clients={clients}
                    start={ganttRange.startDate}
                    end={ganttRange.endDate}
                    scale={ganttScale}
                    baseDayWidth={
                      ganttScale === "day"
                        ? 26 * ganttZoom
                        : ganttScale === "week"
                        ? 6 * ganttZoom
                        : 2.2 * ganttZoom
                    }
                    showBarLabels={ganttShowLabels}
                    leftWidth={ganttLeftWidth}
                    visibleStatuses={Object.entries(ganttStatuses)
                      .filter(([, v]) => v)
                      .map(([k]) => k)}
                    groupByProject={ganttGroupProjects}
                    onLeftWidthChange={(w) => setGanttLeftWidth(w)}
                  />
                </div>
              </div>
            )
          ) : null}
        </Card>

        {/* Task Status Breakdown */}
        <Card title="Task Status Breakdown" icon={<FaChartBar />}>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    Completed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-600">
                    {stats.completedTasks}
                  </span>
                  <span className="text-xs text-gray-500">tasks</span>
                </div>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${completedWidth}%` }}
                >
                  {completedWidth > 10 && (
                    <span className="absolute right-2 top-0 text-[10px] font-bold text-white">
                      {Math.round(completedWidth)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaClock className="text-cyan-600 animate-pulse" />
                  <span className="text-sm font-semibold text-gray-800">
                    In Progress
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-cyan-600">
                    {stats.inProgressTasks}
                  </span>
                  <span className="text-xs text-gray-500">tasks</span>
                </div>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${inProgressWidth}%` }}
                >
                  {inProgressWidth > 10 && (
                    <span className="absolute right-2 top-0 text-[10px] font-bold text-white">
                      {Math.round(inProgressWidth)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaTasks className="text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    To-Do
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-600">
                    {stats.todoTasks}
                  </span>
                  <span className="text-xs text-gray-500">tasks</span>
                </div>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${todoWidth}%` }}
                >
                  {todoWidth > 10 && (
                    <span className="absolute right-2 top-0 text-[10px] font-bold text-white">
                      {Math.round(todoWidth)}%
                    </span>
                  )}
                </div>
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
              <div className="py-14 flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <FaProjectDiagram className="h-6 w-6 text-purple-500" />
                </div>
                <div className="text-sm font-semibold text-gray-800 mb-1">
                  No Project Data
                </div>
                <div className="text-xs text-gray-500">
                  Adjust filters to see task distribution
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
                              {resource.role || resource.resourceRole || ""}
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
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("task")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Task</span>
                        {getSortIcon("task")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("assignee")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Assignee</span>
                        {getSortIcon("assignee")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("project")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Project</span>
                        {getSortIcon("project")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {getSortIcon("status")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("priority")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Priority</span>
                        {getSortIcon("priority")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("created")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Created</span>
                        {getSortIcon("created")}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => handleSort("completed")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Completed</span>
                        {getSortIcon("completed")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <SkeletonRow columns={7} />}
                  {!loading &&
                    sortedRecentTasks.map((task) => {
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
                                backgroundColor: (project?.color || "#9ca3af") + "20",
                                color: project?.color || "#6b7280",
                              }}
                            >
                              {project?.name || "Unknown"}
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
            {/* Load More Button */}
            {!loading && filteredData.tasks.length > recentTasksLimit && (
              <div className="flex justify-center pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setRecentTasksLimit((prev) => prev + 20)}
                  className="text-sm"
                >
                  Load More Tasks (
                  {filteredData.tasks.length - recentTasksLimit} remaining)
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

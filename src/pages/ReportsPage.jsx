import React, { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaProjectDiagram,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFlag,
  FaDownload,
  FaChartPie,
  FaChartLine,
  FaClipboardList,
  FaSpinner,
} from "react-icons/fa";
import { FaArrowsRotate } from "react-icons/fa6";
import GanttChart from "../components/GanttChart";

import toast from "react-hot-toast";

import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";

import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import {
  getPriorityBadge,
  getPriorityHex,
  getStatusBadge,
  PRIORITY_HEX,
  STATUS_HEX,
  TYPE_HEX,
} from "../utils/colorMaps";

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

// ---------------------------------------------------
// UI THEME CONSTANTS
// ---------------------------------------------------
const UI_COLORS = {
  primary: TYPE_HEX.meeting, // blue
  secondary: TYPE_HEX.milestone, // violet
  success: TYPE_HEX.task, // green
  warning: TYPE_HEX.call, // amber
  danger: PRIORITY_HEX.high, // red
};

const statusIcons = {
  "To-Do": <FaClipboardList />,
  "In Progress": <FaSpinner className="animate-spin" />,
  Done: <FaCheckCircle />,
};

// ---------------------------------------------------
// UTILITY FUNCTIONS
// ---------------------------------------------------
const tsToDate = (ts) => {
  if (!ts) return null;
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d?.getTime?.()) ? null : d;
  } catch {
    return null;
  }
};

const normalizeStatus = (s) => {
  const lc = (s || "").toLowerCase();
  if (lc.includes("in-progress") || lc.includes("in progress"))
    return "In Progress";
  if (lc.includes("done") || lc.includes("completed")) return "Done";
  return "To-Do";
};

export default function ReportsPage() {
  // ---------------------------------------------------
  // FILTER STATES
  // ---------------------------------------------------
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // ---------------------------------------------------
  // DATA STATES
  // ---------------------------------------------------
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);

  // ---------------------------------------------------
  // UI STATES
  // ---------------------------------------------------
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------
  // ACTIVE FILTER COUNT
  // ---------------------------------------------------
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProject) count++;
    if (selectedEmployee) count++;
    return count;
  }, [selectedProject, selectedEmployee]);

  // ---------------------------------------------------
  // FIREBASE LIVE SUBSCRIPTIONS
  // ---------------------------------------------------
  useEffect(() => {
    setLoading(true);

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
              startDate: data.startDate
                ? data.startDate.toDate().toISOString().slice(0, 10)
                : null,
              endDate: data.endDate
                ? data.endDate.toDate().toISOString().slice(0, 10)
                : null,
            };
          })
        );
      },
      (err) => {
        console.error("Error fetching projects:", err);
        toast.error("Failed to load projects");
      }
    );
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      },
      (err) => {
        console.error("Error fetching users:", err);
        toast.error("Failed to load users");
      }
    );

    const unsubClients = onSnapshot(
      collection(db, "clients"),
      (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      },
      (err) => {
        console.error("Error fetching clients:", err);
        toast.error("Failed to load clients");
      }
    );

    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), orderBy("createdAt", "desc")),
      (snap) => {
        setTasks(
          snap.docs.map((d) => {
            const data = d.data() || {};

            return {
              id: d.id,
              title: data.title || "",
              projectId: data.projectId || "",
              assigneeId: data.assigneeId || "",
              assigneeType: data.assigneeType || "user",
              status: normalizeStatus(data.status || "To-Do"),

              priority: data.priority || "Medium",

              createdDate: tsToDate(data.createdAt)?.toISOString() || "",
              completedDate: tsToDate(data.completedAt)?.toISOString() || "",
              assignedDate: tsToDate(data.assignedDate)?.toISOString() || "",
              dueDate: tsToDate(data.dueDate)?.toISOString() || "",

              archived: !!data.archived,
            };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching tasks:", err);
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

  // ---------------------------------------------------
  // FILTERED TASKS
  // ---------------------------------------------------
  const filteredData = useMemo(() => {
    const filteredTasks = tasks.filter((t) => {
      const matchProject = !selectedProject || t.projectId === selectedProject;
      const matchEmployee =
        !selectedEmployee ||
        (t.assigneeId === selectedEmployee &&
          (t.assigneeType || "user") === "user");

      return matchProject && matchEmployee;
    });

    return { tasks: filteredTasks };
  }, [tasks, selectedProject, selectedEmployee]);

  // ---------------------------------------------------
  // STATS CALCULATIONS
  // ---------------------------------------------------
  const stats = useMemo(() => {
    const { tasks } = filteredData;
    const total = tasks.length;

    let completed = 0;
    let inProgress = 0;
    let todo = 0;

    const priorityCount = { High: 0, Medium: 0, Low: 0 };
    const projectCount = {};

    tasks.forEach((t) => {
      // Status
      if (t.status === "Done") completed++;
      else if (t.status === "In Progress") inProgress++;
      else todo++;

      // Priority
      if (priorityCount[t.priority] !== undefined) {
        priorityCount[t.priority]++;
      }

      // Project
      const p = projects.find((x) => x.id === t.projectId);
      const name = p?.name || "Unknown";
      projectCount[name] = (projectCount[name] || 0) + 1;
    });

    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      todoTasks: todo,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      priorityBreakdown: priorityCount,
      projectBreakdown: projectCount,
    };
  }, [filteredData, projects]);

  // ---------------------------------------------------
  // RESOURCE-BASED STATS
  // ---------------------------------------------------
  const resourceStats = useMemo(() => {
    const { tasks } = filteredData;
    const map = {};

    users.forEach((user) => {
      const assigned = tasks.filter(
        (t) => t.assigneeId === user.id && (t.assigneeType || "user") === "user"
      );

      const completed = assigned.filter((t) => t.status === "Done").length;
      const inPr = assigned.filter((t) => t.status === "In Progress").length;
      const todo = assigned.filter((t) => t.status === "To-Do").length;

      const total = assigned.length;
      const rate = total ? Math.round((completed / total) * 100) : 0;

      if (total > 0) {
        map[user.id] = {
          ...user,
          total,
          completed,
          inProgress: inPr,
          todo,
          completionRate: rate,
          tasks: assigned,
        };
      }
    });

    return map;
  }, [filteredData, users]);

  // ---------------------------------------------------
  // Gantt
  // ---------------------------------------------------
  const ganttData = useMemo(() => {
    if (!projects.length) return [];

    // ----- 1. PROJECT PARENTS -----
    const projectParents = projects.map((p) => {
      let duration = 1;

      if (p.startDate && p.endDate) {
        const s = new Date(p.startDate);
        const e = new Date(p.endDate);
        const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
        duration = diff > 0 ? diff : 1;
      }

      return {
        id: p.id,
        text: p.name,
        start_date: p.startDate || "2025-01-01",
        duration,
        parent: 0,
        progress: 0,
        open: true,
        color: p.color,
      };
    });

    // ---- 2. Task Rows ----
    const taskRows = filteredData.tasks.map((t) => {
      const start = t.assignedDate ? t.assignedDate.slice(0, 10) : null;
      const end = t.dueDate ? t.dueDate.slice(0, 10) : null;

      let duration = 1;

      if (start && end) {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
        duration = diff > 0 ? diff : 1;
      }

      //find the assigned user or client
      const assignedUser = users.find((u) => u.id === t.assigneeId);
      const assignedClient = clients.find((c) => c.id === t.assigneeId);
      const assignedName =
        assignedUser?.name || assignedClient?.clientName || "unassigned";

      return {
        id: t.id,
        assignedTo: assignedName,
        text: t.title,
        start_date: start || "2025-01-01",
        duration,
        parent: t.projectId,
        progress: t.status === "Done" ? 1 : 0,
        priority: t.priority?.toLowerCase(),
        status: t.status?.toLowerCase(),

        statusColor: STATUS_HEX[t.status?.toLowerCase()] || "#9ca3af",
        priorityColor: getPriorityHex(t.priority),
      };
    });
    console.log("gantt task Data ", taskRows);
    return [...projectParents, ...taskRows];
  }, [projects, filteredData.tasks]);

  // ---------------------------------------------------
  // ICON + CARD STYLE MEMOS
  // ---------------------------------------------------
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

  const exportReport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();

    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    // Create Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary");

    // Add title
    summarySheet.mergeCells("A1:D1");
    summarySheet.getCell("A1").value = `Analytics Report - ${projectName}`;
    summarySheet.getCell("A1").font = { bold: true, size: 16 };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    // Add generated date
    summarySheet.mergeCells("A2:D2");
    summarySheet.getCell(
      "A2"
    ).value = `Generated: ${new Date().toLocaleString()}`;
    summarySheet.getCell("A2").font = { italic: true };
    summarySheet.getCell("A2").alignment = { horizontal: "center" };

    // Add statistics
    summarySheet.addRow([]);
    summarySheet.addRow(["Summary Statistics"]);
    summarySheet.getCell("A4").font = { bold: true, size: 14 };

    summarySheet.addRow(["Total Tasks", stats.totalTasks]);
    summarySheet.addRow(["Completed Tasks", stats.completedTasks]);
    summarySheet.addRow(["In Progress", stats.inProgressTasks]);
    summarySheet.addRow(["To-Do", stats.todoTasks]);
    summarySheet.addRow(["Completion Rate", `${stats.completionRate}%`]);

    // Style statistics section
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 15;

    // Create Tasks Sheet
    const tasksSheet = workbook.addWorksheet("Tasks");

    // Add headers
    tasksSheet.columns = [
      { header: "Task Title", key: "title", width: 30 },
      { header: "Assignee", key: "assignee", width: 20 },
      { header: "Project", key: "project", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Created Date", key: "created", width: 18 },
      { header: "Completed Date", key: "completed", width: 18 },
    ];

    // Style headers
    tasksSheet.getRow(1).font = { bold: true };
    tasksSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    tasksSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add task data
    filteredData.tasks.forEach((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      const assigneeUser = users.find((r) => r.id === task.assigneeId);
      const assigneeClient = clients.find((c) => c.id === task.assigneeId);
      const assigneeName =
        assigneeUser?.name || assigneeClient?.clientName || "Unassigned";

      tasksSheet.addRow({
        title: task.title,
        assignee: assigneeName,
        project: project?.name || "N/A",
        status: task.status,
        priority: task.priority,
        created: task.createdDate
          ? new Date(task.createdDate).toLocaleDateString()
          : "",
        completed: task.completedDate
          ? new Date(task.completedDate).toLocaleDateString()
          : "N/A",
      });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Excel report downloaded!");
  };

  const exportResourceReport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();

    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name
      : "All Projects";

    // Create Resource Performance Sheet
    const sheet = workbook.addWorksheet("Resource Performance");

    // Add title
    sheet.mergeCells("A1:H1");
    sheet.getCell("A1").value = "Resource Performance Report";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    // Add metadata
    sheet.mergeCells("A2:H2");
    sheet.getCell("A2").value = `Project: ${projectName}`;
    sheet.getCell("A2").alignment = { horizontal: "center" };

    sheet.mergeCells("A3:H3");
    sheet.getCell("A3").value = `Generated: ${new Date().toLocaleString()}`;
    sheet.getCell("A3").alignment = { horizontal: "center" };

    // Add headers
    sheet.addRow([]);
    sheet.columns = [
      { header: "Resource Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 15 },
      { header: "Total Tasks", key: "total", width: 12 },
      { header: "Completed", key: "completed", width: 12 },
      { header: "In Progress", key: "inProgress", width: 12 },
      { header: "To-Do", key: "todo", width: 12 },
      { header: "Completion %", key: "rate", width: 15 },
    ];

    // Style headers (row 5)
    sheet.getRow(5).font = { bold: true };
    sheet.getRow(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add resource data
    Object.values(resourceStats)
      .sort((a, b) => b.completionRate - a.completionRate)
      .forEach((resource) => {
        sheet.addRow({
          name: resource.name,
          email: resource.email || "",
          role: resource.role || "",
          total: resource.total,
          completed: resource.completed,
          inProgress: resource.inProgress,
          todo: resource.todo,
          rate: `${resource.completionRate}%`,
        });
      });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource_report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Resource report downloaded!");
  };

  const statusChartData = useMemo(
    () => [
      {
        name: "Completed",
        value: stats.completedTasks,
        color: UI_COLORS.success,
      },
      {
        name: "In Progress",
        value: stats.inProgressTasks,
        color: UI_COLORS.primary,
      },
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

  const completedWidth =
    stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const inProgressWidth =
    stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0;
  const todoWidth =
    stats.totalTasks > 0 ? (stats.todoTasks / stats.totalTasks) * 100 : 0;

  // ---------------------------------------------------
  // MAIN RETURN START
  // ---------------------------------------------------
  return (
    <div className="max-w-full overflow-x-hidden">
      <PageHeader
        title="Analytics & Reports"
        actions={
          <Button variant="secondary" onClick={exportReport}>
            <FaDownload /> Export Excel
          </Button>
        }
      >
        View comprehensive analytics and reports across different time periods
      </PageHeader>

      <div className="max-w-full space-y-6">
        {/* ---------------------------------------------------
            FILTERS 
        --------------------------------------------------- */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span>Report Filters</span>

              {activeFilterCount > 0 && (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={cardStyles.primaryBg}
                >
                  {activeFilterCount}
                </span>
              )}
            </div>
          }
          actions={
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setSelectedProject("");
                setSelectedEmployee("");
              }}
            >
              <FaArrowsRotate />
              Reset Filters
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* -------------------------------
                PROJECT FILTER (Column 2)
            ------------------------------- */}
            <div className="min-w-0">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FaProjectDiagram style={iconStyles.secondary} />
                  Project Filter
                </span>
              </label>

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
                className="max-w-full w-full truncate rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:ring-2"
              >
                <option value="">All Projects</option>

                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="truncate">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* -------------------------------
                EMPLOYEE FILTER (Column 3)
            ------------------------------- */}
            <div className="min-w-0">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FaUsers style={iconStyles.success} />
                  Employee Filter
                </span>
              </label>

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
                className="max-w-full w-full truncate rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:ring-2"
              >
                <option value="">All Employees</option>

                {users
                  .filter((u) => (u.role || "user").toLowerCase() !== "client")
                  .map((u) => (
                    <option key={u.id} value={u.id} className="truncate">
                      {u.name || u.email}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------------
            OVERVIEW STATISTICS
        --------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Tasks */}
          <Card
            style={cardStyles.primaryBorder}
            className="border-t-4 bg-gradient-to-br from-blue-50 to-white transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p
                  className="mt-1 animate-[fadeIn_0.5s_ease-in] text-3xl font-bold"
                  style={{ color: UI_COLORS.primary }}
                >
                  {stats.totalTasks.toLocaleString("en-US")}
                </p>
              </div>

              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: UI_COLORS.primary + "1a" }}
              >
                <FaTasks
                  style={{ color: UI_COLORS.primary }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          {/* Completed */}
          <Card
            style={{ borderTopColor: UI_COLORS.success }}
            className="border-t-4 bg-gradient-to-br from-green-50 to-white transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p
                  className="mt-1 animate-[fadeIn_0.5s_ease-in] text-3xl font-bold"
                  style={{ color: UI_COLORS.success }}
                >
                  {stats.completedTasks.toLocaleString("en-US")}
                </p>
              </div>

              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: UI_COLORS.success + "1a" }}
              >
                <FaCheckCircle
                  style={{ color: UI_COLORS.success }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          {/* In Progress */}
          <Card
            style={{ borderTopColor: UI_COLORS.warning }}
            className="border-t-4 bg-gradient-to-br from-amber-50 to-white transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p
                  className="mt-1 animate-[fadeIn_0.5s_ease-in] text-3xl font-bold"
                  style={{ color: UI_COLORS.warning }}
                >
                  {stats.inProgressTasks.toLocaleString("en-US")}
                </p>
              </div>

              <div
                className="animate-pulse flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: UI_COLORS.warning + "1a" }}
              >
                <FaClock
                  style={{ color: UI_COLORS.warning }}
                  className="h-6 w-6"
                />
              </div>
            </div>
          </Card>

          {/* Completion Rate */}
          <Card
            style={{ borderTopColor: UI_COLORS.secondary }}
            className="border-t-4 bg-gradient-to-br from-purple-50 to-white transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Completion Rate
                </p>
                <p
                  className="mt-1 animate-[fadeIn_0.5s_ease-in] text-3xl font-bold"
                  style={{ color: UI_COLORS.secondary }}
                >
                  {stats.completionRate}%
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <FaChartLine className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
        {/* ---------------------------------------------------
            CHARTS
        --------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Status Distribution Pie Chart */}
          <Card title="Status Distribution" icon={<FaChartPie />}>
            {loading ? (
              <div className="h-72 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
            ) : stats.totalTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: UI_COLORS.primary + "1a" }}
                >
                  <FaChartPie
                    style={{ color: UI_COLORS.primary }}
                    className="h-8 w-8"
                  />
                </div>

                <div className="mb-2 text-lg font-semibold text-gray-800">
                  No Task Data Available
                </div>

                <div className="mb-4 max-w-xs text-center text-sm text-gray-500">
                  Try clearing filters to view your task distribution
                </div>

                <Button
                  variant="secondary"
                  className="flex items-center gap-2 text-sm"
                  onClick={() => {
                    setSelectedProject("");
                    setSelectedEmployee("");
                  }}
                >
                  <FaChartPie />
                  View All Tasks
                </Button>
              </div>
            ) : (
              <div className="h-[280px] w-full min-w-0">
                <ResponsiveContainer minWidth={0} minHeight={0}>
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
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>

                    <Tooltip formatter={(v, name) => [`${v} tasks`, name]} />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Tasks Over Time Line Chart */}
          <Card title="Tasks Over Time" icon={<FaChartLine />}>
            {loading ? (
              <div className="h-72 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
            ) : (
              <div className="h-[280px] w-full min-w-0">
                <ResponsiveContainer minWidth={0} minHeight={0}>
                  <LineChart
                    data={tasksOverTimeData}
                    margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
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

                    <Tooltip formatter={(v, name) => [`${v} tasks`, name]} />
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
        {/* ---------------------------------------------------
            TASK STATUS BREAKDOWN
        --------------------------------------------------- */}
        <Card title="Task Status Breakdown" icon={<FaChartLine />}>
          <div className="space-y-5">
            {/* Completed */}
            <div>
              <div className="mb-2 flex items-center justify-between">
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

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-sm transition-all duration-500"
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

            {/* In Progress */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaClock className="animate-pulse text-cyan-600" />
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

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-sm transition-all duration-500"
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

            {/* To-Do */}
            <div>
              <div className="mb-2 flex items-center justify-between">
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

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 shadow-sm transition-all duration-500"
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

        {/* ---------------------------------------------------
            PRIORITY DISTRIBUTION
        --------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

                  const c = colors[priority];
                  const width =
                    stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0;

                  return (
                    <div key={priority} className="flex items-center gap-3">
                      <span
                        className={`${c.bg} ${c.text} min-w-[80px] rounded px-3 py-1 text-sm font-medium`}
                      >
                        {priority}
                      </span>

                      <div className="flex-1">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`${c.bar} h-2 rounded-full transition-all`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>

                      <span className="min-w-[40px] text-right text-sm text-gray-600">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </Card>

          {/* ---------------------------------------------------
              PROJECT BREAKDOWN
          --------------------------------------------------- */}
          <Card title="Tasks by Project" icon={<FaProjectDiagram />}>
            {loading ? (
              <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
            ) : Object.keys(stats.projectBreakdown).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <FaProjectDiagram className="h-6 w-6 text-purple-500" />
                </div>

                <div className="mb-1 text-sm font-semibold text-gray-800">
                  No Project Data
                </div>

                <div className="text-xs text-gray-500">
                  Adjust filters to see distribution
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
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: project?.color || "#9ca3af",
                          }}
                        />

                        <span
                          className="flex-1 text-sm truncate"
                          title={projectName}
                        >
                          {projectName}
                        </span>

                        <span className="text-sm font-semibold">{count}</span>

                        <span className="text-xs text-gray-500">
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

        {/* ---------------------------------------------------
            RESOURCE PERFORMANCE TABLE
        --------------------------------------------------- */}
        {Object.keys(resourceStats).length > 0 && (
          <Card
            title="Resource Performance"
            icon={<FaUsers />}
            actions={
              <Button variant="secondary" onClick={exportResourceReport}>
                <FaDownload /> Export Excel
              </Button>
            }
          >
            <p className="mb-4 text-sm text-gray-500">
              Performance breakdown by team member
            </p>

            <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left">Resource</th>
                    <th className="py-3 px-4 text-left">Role</th>
                    <th className="py-3 px-4 text-center">Total Tasks</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">In Progress</th>
                    <th className="py-3 px-4 text-center">To-Do</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.values(resourceStats)
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((resource) => {
                      const color =
                        resource.completionRate >= 80
                          ? "text-green-600"
                          : resource.completionRate >= 50
                          ? "text-yellow-600"
                          : "text-red-600";

                      return (
                        <tr
                          key={resource.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          {/* Resource */}
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
                                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[10px] font-semibold text-white">
                                    {(resource.name || resource.email || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </span>

                              <div className="min-w-0">
                                <div className="font-medium max-w-[200px]">
                                  <span
                                    className="block truncate"
                                    title={
                                      resource.name ||
                                      resource.email ||
                                      "Unknown Resource"
                                    }
                                  >
                                    {resource.name ||
                                      resource.email ||
                                      "Unknown Resource"}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 max-w-[260px]">
                                  <span
                                    className="block truncate"
                                    title={resource.email || ""}
                                  >
                                    {resource.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4">
                            <span className="inline-flex max-w-[200px] rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">
                              <span
                                className="block truncate"
                                title={resource.resourceRole || "Not specified"}
                              >
                                {resource.resourceRole || "Not specified"}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-semibold">
                            {resource.total}
                          </td>

                          <td className="py-3 px-4 text-center text-green-600">
                            <FaCheckCircle className="inline text-xs" />{" "}
                            {resource.completed}
                          </td>

                          <td className="py-3 px-4 text-center text-cyan-600">
                            <FaClock className="inline text-xs" />{" "}
                            {resource.inProgress}
                          </td>

                          <td className="py-3 px-4 text-center text-gray-600">
                            {resource.todo}
                          </td>

                          <td
                            className={`py-3 px-4 text-center font-bold ${color}`}
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
        <Card
          title="Project Timeline (Gantt Chart)"
          icon={<FaProjectDiagram />}
        >
          {loading ? (
            <div className="h-64 bg-gray-100 animate-pulse rounded-md" />
          ) : ganttData.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              No tasks available to display Gantt chart.
            </p>
          ) : (
            <div className="mt-4">
              <GanttChart data={ganttData} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

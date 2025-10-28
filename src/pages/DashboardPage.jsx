// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuthContext } from "../context/useAuthContext"; // To get the user's name
import {
  FaUsers,
  FaUserTie,
  FaProjectDiagram,
  FaCalendarCheck,
} from "react-icons/fa";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import StatCard from "../components/StatCard"; // The new external component
import DashboardSkeleton from "../components/DashboardSkeleton"; // The new skeleton loader

function DashboardPage() {
  const { userData } = useAuthContext(); // Get user data for personalization
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);

  // Realtime subscriptions
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      setTasks(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            projectId: data.projectId || "",
            status: data.status || "To-Do",
            createdAt: data.createdAt,
            dueDate: data.dueDate || null,
          };
        })
      );
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    });

    // Mark loading false after first data frames arrive
    const timer = setTimeout(() => setLoading(false), 300);
    return () => {
      unsubProjects();
      unsubTasks();
      unsubUsers();
      unsubClients();
      clearTimeout(timer);
    };
  }, []);

  // Derived stats
  const normalizeStatus = (s) => {
    const x = String(s || "")
      .trim()
      .toLowerCase();
    if (x === "done" || x === "completed" || x === "complete") return "Done";
    if (x === "in progress" || x === "in-progress" || x === "inprogress")
      return "In Progress";
    if (x === "in review" || x === "in-review" || x === "inreview")
      return "In Review";
    if (
      x === "" ||
      x === "to-do" ||
      x === "to do" ||
      x === "todo" ||
      x === "backlog" ||
      x === "open"
    )
      return "To-Do";
    return s || "To-Do";
  };

  const stats = useMemo(() => {
    const tasksCompleted = tasks.filter(
      (t) => normalizeStatus(t.status) === "Done"
    ).length;
    return {
      totalResources: String(users.length),
      totalClients: String(clients.length),
      totalProjects: String(projects.length),
      tasksCompleted: String(tasksCompleted),
    };
  }, [users.length, clients.length, projects.length, tasks]);

  // Monthly Project Status (last 12 months) derived from tasks.createdAt
  const monthlyStatus = useMemo(() => {
    // Build last 12 month buckets
    const now = new Date();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        name: monthNames[d.getMonth()],
        completed: 0,
        inProgress: 0,
        pending: 0,
      });
    }

    const findBucketIndex = (date) => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const key = `${y}-${m}`;
      return buckets.findIndex((b) => b.key === key);
    };

    const toDate = (val) => {
      if (!val) return null;
      if (typeof val.toDate === "function") return val.toDate();
      if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const t of tasks) {
      const d = toDate(t.createdAt);
      if (!d) continue;
      const idx = findBucketIndex(d);
      if (idx === -1) continue; // outside last 12 months
      const st = normalizeStatus(t.status);
      if (st === "Done") buckets[idx].completed += 1;
      else if (st === "In Progress") buckets[idx].inProgress += 1;
      else buckets[idx].pending += 1; // To-Do, In Review, others treated as pending
    }

    return buckets.map(({ name, completed, inProgress, pending }) => ({
      name,
      completed,
      inProgress,
      pending,
    }));
  }, [tasks]);

  // Project Health and Status Distribution
  const statusSummary = useMemo(() => {
    const counts = { done: 0, inProgress: 0, inReview: 0, todo: 0 };
    for (const t of tasks) {
      const st = normalizeStatus(t.status);
      if (st === "Done") counts.done++;
      else if (st === "In Progress") counts.inProgress++;
      else if (st === "In Review") counts.inReview++;
      else counts.todo++;
    }
    const total = tasks.length || 1; // avoid div by zero
    const pct = {
      done: Math.round((counts.done / total) * 100),
      inProgress: Math.round((counts.inProgress / total) * 100),
      inReview: Math.round((counts.inReview / total) * 100),
      todo: Math.round((counts.todo / total) * 100),
    };
    return { counts, pct, total: tasks.length };
  }, [tasks]);

  const projectHealth = useMemo(() => {
    // Helper: parse to Date
    const toDate = (val) => {
      if (!val) return null;
      if (typeof val.toDate === "function") return val.toDate();
      if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const today = new Date();
    const items = projects.map((p) => {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(
        (t) => normalizeStatus(t.status) === "Done"
      ).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const overdue = projTasks.filter((t) => {
        if (normalizeStatus(t.status) === "Done") return false;
        const d = toDate(t.dueDate);
        return d ? d < today : false;
      }).length;
      let health = "Needs Attention";
      if (overdue > 0) health = "At Risk";
      else if (progress >= 80) health = "On Track";
      return {
        id: p.id,
        name: p.projectName || p.name || "Untitled",
        progress,
        overdue,
        health,
      };
    });

    const counts = { onTrack: 0, atRisk: 0, needsAttention: 0 };
    for (const it of items) {
      if (it.health === "On Track") counts.onTrack++;
      else if (it.health === "At Risk") counts.atRisk++;
      else counts.needsAttention++;
    }
    const topAtRisk = items
      .filter((x) => x.health === "At Risk")
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 3);

    return { items, counts, topAtRisk };
  }, [projects, tasks]);

  // Enhanced bar chart component with better styling
  const BarChart = ({
    data,
    title,
    dataKey1,
    dataKey2,
    dataKey3,
    label1,
    label2,
    label3,
    color1 = "#10B981",
    color2 = "#F59E0B",
    color3 = "#EF4444",
  }) => {
    const maxValue = Math.max(
      ...data.map(
        (d) => (d[dataKey1] || 0) + (d[dataKey2] || 0) + (d[dataKey3] || 0)
      )
    );

    return (
      <div>
        <h3 className="text-lg font-semibold text-content-primary mb-4">
          {title}
        </h3>
        <div className="h-64">
          <div className="flex items-end justify-between h-full pb-8">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center flex-1 mx-1"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="w-8 flex flex-col items-center space-y-0">
                    {dataKey3 && item[dataKey3] > 0 && (
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(item[dataKey3] / maxValue) * 150}px`,
                          backgroundColor: color3,
                        }}
                        title={`${label3}: ${item[dataKey3]}`}
                      ></div>
                    )}
                    {dataKey2 && item[dataKey2] > 0 && (
                      <div
                        className="w-full"
                        style={{
                          height: `${(item[dataKey2] / maxValue) * 150}px`,
                          backgroundColor: color2,
                        }}
                        title={`${label2}: ${item[dataKey2]}`}
                      ></div>
                    )}
                    {dataKey1 && item[dataKey1] > 0 && (
                      <div
                        className="w-full rounded-b"
                        style={{
                          height: `${(item[dataKey1] / maxValue) * 150}px`,
                          backgroundColor: color1,
                        }}
                        title={`${label1}: ${item[dataKey1]}`}
                      ></div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-content-secondary mt-2">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color1 }}
              ></div>
              <span className="text-xs text-content-secondary">{label1}</span>
            </div>
            {dataKey2 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color2 }}
                ></div>
                <span className="text-xs text-content-secondary">{label2}</span>
              </div>
            )}
            {dataKey3 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color3 }}
                ></div>
                <span className="text-xs text-content-secondary">{label3}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced line chart component for revenue with better visualization
  const LineChart = ({ data, title, dataKey, color = "#10B981" }) => {
    const maxValue = Math.max(...data.map((d) => d[dataKey]));
    const minValue = Math.min(...data.map((d) => d[dataKey]));

    return (
      <div>
        <h3 className="text-lg font-semibold text-content-primary mb-4">
          {title}
        </h3>
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-end justify-between pb-8">
            {data.map((item, index) => {
              const height =
                ((item[dataKey] - minValue) / (maxValue - minValue)) * 150;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="relative flex flex-col items-center">
                    <div className="text-xs font-semibold text-content-primary mb-1">
                      ${(item[dataKey] / 1000).toFixed(0)}k
                    </div>
                    <div
                      className="w-3 rounded-full"
                      style={{
                        height: `${height}px`,
                        backgroundColor: color,
                        opacity: 0.6,
                      }}
                    ></div>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-y-2"
                      style={{ backgroundColor: color }}
                      title={`${item.name}: $${item[dataKey].toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-xs text-content-secondary mt-2">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <p className="text-xs text-content-secondary">
              Total Revenue: $
              {data.reduce((sum, d) => sum + d[dataKey], 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Projects Progress Card (replaces Resource Allocation)
  const ProjectsProgress = () => {
    const list = projects.map((p) => {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(
        (t) => normalizeStatus(t.status) === "Done"
      ).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: p.id,
        name: p.projectName || p.name || "Untitled",
        client: p.clientName || "",
        total,
        done,
        progress,
      };
    });

    const sorted = [...list].sort((a, b) => b.progress - a.progress);

    return (
      <div>
        <h3 className="text-lg font-semibold text-content-primary mb-4">
          Projects Progress
        </h3>
        <div className="space-y-4 max-h-64 overflow-auto pr-2">
          {sorted.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-content-primary">
                  {p.name}
                  {p.client ? (
                    <span className="ml-2 text-xs text-content-tertiary">
                      ({p.client})
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-content-secondary">
                  {p.done}/{p.total} tasks · {p.progress}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500 bg-indigo-600"
                  style={{ width: `${p.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-sm text-content-tertiary">
              No projects yet.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calendar component for project events
  const Calendar = ({ data, title }) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Month names
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

    // Day names
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Create calendar grid
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    // Get events for a specific date
    const getEventsForDate = (day) => {
      if (!day) return [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      return data.filter((event) => event.date === dateStr);
    };

    // Check if date is today
    const isToday = (day) => {
      return (
        day === currentDate.getDate() &&
        currentMonth === currentDate.getMonth() &&
        currentYear === currentDate.getFullYear()
      );
    };

    return (
      <div>
        <h3 className="text-lg font-semibold text-content-primary mb-4">
          {title}
        </h3>
        <div className="h-64 overflow-hidden">
          {/* Calendar Header */}
          <div className="mb-3">
            <h4 className="text-center font-semibold text-content-primary">
              {monthNames[currentMonth]} {currentYear}
            </h4>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-content-secondary p-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {calendarDays.map((day, index) => {
              const events = getEventsForDate(day);
              const hasEvents = events.length > 0;

              return (
                <div
                  key={index}
                  className={`
                    h-8 p-1 border border-gray-100 relative
                    ${day ? "hover:bg-gray-50" : ""}
                    ${isToday(day) ? "bg-blue-100 border-blue-300" : "bg-white"}
                  `}
                >
                  {day && (
                    <>
                      <div
                        className={`text-center ${
                          isToday(day)
                            ? "font-bold text-blue-600"
                            : "text-content-primary"
                        }`}
                      >
                        {day}
                      </div>
                      {hasEvents && (
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                          <div className="flex gap-0.5">
                            {events.slice(0, 3).map((event, eventIndex) => (
                              <div
                                key={eventIndex}
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: event.color }}
                                title={event.title}
                              ></div>
                            ))}
                            {events.length > 3 && (
                              <div
                                className="w-1 h-1 rounded-full bg-gray-400"
                                title={`+${events.length - 3} more`}
                              ></div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events List */}
        <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
          <h5 className="text-sm font-medium text-content-primary">
            Upcoming Events
          </h5>
          {data
            .filter((event) => new Date(event.date) >= currentDate)
            .slice(0, 5)
            .map((event, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                ></div>
                <span className="text-content-secondary">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-content-primary font-medium truncate">
                  {event.title}
                </span>
              </div>
            ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-content-secondary">Deadlines</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-content-secondary">Meetings</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-content-secondary">Milestones</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-content-secondary">Tasks</span>
          </div>
        </div>
      </div>
    );
  };

  // Use the skeleton loader while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Use realistic user name
  const welcomeTitle = `Welcome${userData?.name ? ", " + userData.name : ""}!`;

  return (
    <div>
      <PageHeader title={welcomeTitle}>
        Monitor project performance, client engagement, and manage resources
        from a single control center.
      </PageHeader>

      {/* --- Stat Cards Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FaUsers className="h-5 w-5" />}
          label="Total Resources"
          value={stats.totalResources}
          color="blue"
        />
        <StatCard
          icon={<FaUserTie className="h-5 w-5" />}
          label="Total Clients"
          value={stats.totalClients}
          color="red"
        />
        <StatCard
          icon={<FaProjectDiagram className="h-5 w-5" />}
          label="Total Projects"
          value={stats.totalProjects}
          color="indigo"
        />
        <StatCard
          icon={<FaCalendarCheck className="h-5 w-5" />}
          label="Tasks Completed"
          value={stats.tasksCompleted}
          color="green"
        />
      </div>

      {/* --- Analytical Graphs Section --- */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-content-primary sm:text-2xl mb-6">
          Project Analytics Dashboard
        </h2>

        {/* Top Row - Project Progress and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <BarChart
              data={monthlyStatus}
              title="Monthly Project Status (2024)"
              dataKey1="completed"
              dataKey2="inProgress"
              dataKey3="pending"
              label1="Completed"
              label2="In Progress"
              label3="Pending"
              color1="#10B981"
              color2="#3B82F6"
              color3="#F59E0B"
            />
          </Card>

          <Card className="p-6">
            <Calendar data={[]} title="Project Calendar & Events" />
          </Card>
        </div>

        {/* Bottom Row - Projects Progress and Project Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <ProjectsProgress />
          </Card>

          <Card className="p-6">
            <div>
              <h3 className="text-lg font-semibold text-content-primary mb-4">
                Project Health Overview
              </h3>

              {/* Status distribution stacked bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden flex">
                  {statusSummary.counts.done > 0 && (
                    <div
                      className="h-3 bg-green-500"
                      style={{ flexGrow: statusSummary.counts.done }}
                      title={`Done ${statusSummary.counts.done} (${statusSummary.pct.done}%)`}
                    />
                  )}
                  {statusSummary.counts.inProgress > 0 && (
                    <div
                      className="h-3 bg-blue-500"
                      style={{ flexGrow: statusSummary.counts.inProgress }}
                      title={`In Progress ${statusSummary.counts.inProgress} (${statusSummary.pct.inProgress}%)`}
                    />
                  )}
                  {statusSummary.counts.inReview > 0 && (
                    <div
                      className="h-3 bg-yellow-500"
                      style={{ flexGrow: statusSummary.counts.inReview }}
                      title={`In Review ${statusSummary.counts.inReview} (${statusSummary.pct.inReview}%)`}
                    />
                  )}
                  {statusSummary.counts.todo > 0 && (
                    <div
                      className="h-3 bg-gray-400"
                      style={{ flexGrow: statusSummary.counts.todo }}
                      title={`To-Do ${statusSummary.counts.todo} (${statusSummary.pct.todo}%)`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-content-secondary">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    Done:{" "}
                    <span className="font-medium text-content-primary">
                      {statusSummary.counts.done}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    In Progress:{" "}
                    <span className="font-medium text-content-primary">
                      {statusSummary.counts.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                    In Review:{" "}
                    <span className="font-medium text-content-primary">
                      {statusSummary.counts.inReview}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                    To-Do:{" "}
                    <span className="font-medium text-content-primary">
                      {statusSummary.counts.todo}
                    </span>
                  </div>
                  <div className="ml-auto text-xs">
                    Total tasks:{" "}
                    <span className="font-medium text-content-primary">
                      {statusSummary.total}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portfolio health counts */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <div className="text-xs text-green-700">On Track</div>
                  <div className="text-lg font-semibold text-green-800">
                    {projectHealth.counts.onTrack}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-xs text-amber-700">Needs Attention</div>
                  <div className="text-lg font-semibold text-amber-800">
                    {projectHealth.counts.needsAttention}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-xs text-red-700">At Risk</div>
                  <div className="text-lg font-semibold text-red-800">
                    {projectHealth.counts.atRisk}
                  </div>
                </div>
              </div>

              {/* Top at-risk projects */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-content-primary">
                    Top At-Risk Projects
                  </h4>
                  <span className="text-xs text-content-secondary">
                    Showing up to 3
                  </span>
                </div>
                {projectHealth.topAtRisk.length === 0 ? (
                  <div className="text-sm text-content-tertiary">
                    No at-risk projects. Keep it up!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-32 overflow-auto pr-1">
                    {projectHealth.topAtRisk.map((p) => (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-content-primary truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            {p.overdue} overdue
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500 bg-red-500"
                            style={{ width: `${p.progress}%` }}
                            title={`Completion ${p.progress}%`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer stats */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-content-secondary">
                  <div className="flex justify-between items-center">
                    <span>Total Active Projects:</span>
                    <span className="font-semibold text-content-primary">
                      {projects.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>Average Completion Rate:</span>
                    <span className="font-semibold text-green-600">
                      {projects.length
                        ? Math.round(
                            projects
                              .map((p) => {
                                const projTasks = tasks.filter(
                                  (t) => t.projectId === p.id
                                );
                                const total = projTasks.length;
                                const done = projTasks.filter(
                                  (t) => t.status === "Done"
                                ).length;
                                return total > 0 ? (done / total) * 100 : 0;
                              })
                              .reduce((a, b) => a + b, 0) / projects.length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

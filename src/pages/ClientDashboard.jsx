import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuthContext } from "../context/useAuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  FaProjectDiagram,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaArrowRight,
} from "react-icons/fa";

export default function ClientDashboard() {
  const { user, userData, loading } = useAuthContext();
  const navigate = useNavigate();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);

    // Fetch tasks assigned to client
    const qTasks = query(
      collection(db, "tasks"),
      where("assigneeType", "==", "client"),
      where("assigneeId", "==", uid)
    );
    const unsubT = onSnapshot(qTasks, (snap) => {
      setTasks(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            status:
              data.status === "In Review" ? "In Progress" : data.status || "To-Do",
          };
        })
      );
      setLoadingData(false);
    });

    // Fetch events for client
    const qEvents = query(
      collection(db, "events"),
      where("clientId", "==", uid)
    );
    const unsubE = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Fetch projects for client
    const qProjects = query(
      collection(db, "projects"),
      where("clientId", "==", uid)
    );
    const unsubP = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubT();
      unsubE();
      unsubP();
    };
  }, [uid]);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const pendingTasks = tasks.filter(
    (t) => t.status === "To-Do" || t.status === "In Progress"
  ).length;
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.progress === 100 || p.status === "Completed").length;
  const upcomingEvents = events.filter((e) => {
    const eventDate = new Date(e.date || e.startDate || e.dueDate);
    return eventDate >= new Date();
  }).length;

  // Navigation handlers for KPI cards
  const handleProjectsClick = () => {
    navigate('/client/projects');
  };

  const handleTasksClick = () => {
    navigate('/client/tasks');
  };

  const handleCompletedClick = () => {
    // Navigate to projects page with completed filter
    navigate('/client/projects', { state: { showCompleted: true } });
  };

  const handlePendingClick = () => {
    // Navigate to tasks page with pending filter
    navigate('/client/tasks', { state: { filterStatus: 'pending' } });
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-content-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const welcomeTitle = `Welcome${userData?.name ? ", " + userData.name : ""}!`;

  return (
    <div>
      <PageHeader title={welcomeTitle}>
        Here's an overview of your projects, tasks, and upcoming events.
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={handleProjectsClick} className="cursor-pointer">
          <StatCard
            icon={<FaProjectDiagram className="h-5 w-5" />}
            label="Total Projects"
            value={String(totalProjects)}
            color="blue"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handleTasksClick} className="cursor-pointer">
          <StatCard
            icon={<FaTasks className="h-5 w-5" />}
            label="Total Tasks"
            value={String(totalTasks)}
            color="indigo"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handleCompletedClick} className="cursor-pointer">
          <StatCard
            icon={<FaCheckCircle className="h-5 w-5" />}
            label="Completed Projects"
            value={String(completedProjects)}
            color="green"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
        <div onClick={handlePendingClick} className="cursor-pointer">
          <StatCard
            icon={<FaClock className="h-5 w-5" />}
            label="Pending Tasks"
            value={String(pendingTasks)}
            color="amber"
            className="hover:shadow-lg transition-shadow"
          />
        </div>
      </div>

      {/* Recent Tasks and Upcoming Events */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">
              Recent Tasks
            </h3>
            <Link
              to="/client/tasks"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              View All <FaArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-content-tertiary">
              <FaTasks className="mx-auto text-4xl mb-2 text-gray-300" />
              <p>No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="p-3 border border-subtle rounded-lg hover:border-indigo-300 transition-colors bg-surface-subtle"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-content-primary">
                        {task.title || task.taskName || "Untitled Task"}
                      </p>
                      <p className="text-sm text-content-secondary mt-1">
                        {task.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        task.status === "Done"
                          ? "bg-success-100 text-success-600"
                          : task.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {task.status || "To-Do"}
                    </span>
                  </div>
                  {task.dueDate && (
                    <p className="text-xs text-content-tertiary mt-2">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">
              Upcoming Events
            </h3>
            <Link
              to="/client/calendar"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              View Calendar <FaArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingEvents === 0 ? (
            <div className="text-center py-8 text-content-tertiary">
              <FaCalendarAlt className="mx-auto text-4xl mb-2 text-gray-300" />
              <p>No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter((e) => {
                  const eventDate = new Date(
                    e.date || e.startDate || e.dueDate
                  );
                  return eventDate >= new Date();
                })
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border border-subtle rounded-lg hover:border-indigo-300 transition-colors bg-surface-subtle"
                  >
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <FaCalendarAlt className="text-indigo-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-content-primary">
                          {event.title || event.name || "Untitled Event"}
                        </p>
                        <p className="text-sm text-content-secondary mt-1">
                          {new Date(
                            event.date || event.startDate || event.dueDate
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* Active Projects */}
      <Card className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content-primary">
            Active Projects
          </h3>
          <Link
            to="/client/projects"
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
          >
            View All <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-content-tertiary">
            <FaProjectDiagram className="mx-auto text-4xl mb-2 text-gray-300" />
            <p>No projects assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="p-4 border border-subtle rounded-lg hover:border-indigo-300 hover:shadow-soft transition-all bg-surface-subtle"
              >
                <h4 className="font-semibold text-content-primary mb-2">
                  {project.name || project.projectName || "Untitled Project"}
                </h4>
                <p className="text-sm text-content-secondary mb-3 line-clamp-2">
                  {project.description || "No description available"}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === "Completed"
                        ? "bg-success-100 text-success-600"
                        : project.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {project.status || "Active"}
                  </span>
                  {project.progress !== undefined && (
                    <span className="text-xs text-content-tertiary">
                      {project.progress}% Complete
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

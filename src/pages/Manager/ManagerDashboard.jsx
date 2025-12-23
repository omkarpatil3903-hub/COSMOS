/**
 * Manager Dashboard Page
 * Shows only data relevant to the current manager:
 * - Only their managed projects
 * - Only team members assigned to their projects
 * - Only tasks from their projects
 */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { useAuthContext } from "../../context/useAuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    FaProjectDiagram,
    FaTasks,
    FaUsers,
    FaCheckCircle,
    FaClock,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaChartLine,
    FaArrowRight,
} from "react-icons/fa";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const { userData } = useAuthContext();
    const { accent } = useTheme();
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get current user's managed projects
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const q = query(
            collection(db, "projects"),
            where("projectManagerId", "==", currentUser.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                assigneeIds: d.data().assigneeIds || [],
                startDate: d.data().startDate?.toDate?.() || null,
                endDate: d.data().endDate?.toDate?.() || null,
            }));
            setProjects(list);
        });

        return () => unsub();
    }, []);

    // Get all users for team display
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setUsers(list);
        });
        return () => unsub();
    }, []);

    // Get tasks for managed projects
    useEffect(() => {
        if (!projects.length) {
            setLoading(false);
            return;
        }

        const projectIds = projects.map((p) => p.id);

        // Firestore 'in' query has a limit of 10, so we fetch all and filter
        const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
            const allTasks = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                dueDate: d.data().dueDate?.toDate?.() || null,
            }));
            const filtered = allTasks.filter((t) => projectIds.includes(t.projectId));
            setTasks(filtered);
            setLoading(false);
        });

        return () => unsub();
    }, [projects]);

    // Get team members from managed projects
    const teamMembers = useMemo(() => {
        const memberIds = new Set();
        projects.forEach((p) => {
            (p.assigneeIds || []).forEach((id) => memberIds.add(id));
        });
        return users.filter((u) => memberIds.has(u.id));
    }, [projects, users]);

    // Compute stats
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        const completedProjects = projects.filter((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            if (!projectTasks.length) return false;
            const done = projectTasks.filter((t) =>
                ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
            ).length;
            return done === projectTasks.length;
        }).length;

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) =>
            ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
        ).length;
        const inProgressTasks = tasks.filter((t) =>
            ["in progress", "in-progress"].includes((t.status || "").toLowerCase())
        ).length;
        const overdueTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            const status = (t.status || "").toLowerCase();
            if (["done", "completed", "complete"].includes(status)) return false;
            return t.dueDate < new Date();
        }).length;

        const teamSize = teamMembers.length;

        return {
            totalProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            teamSize,
        };
    }, [projects, tasks, teamMembers]);

    // Get upcoming deadlines
    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return tasks
            .filter((t) => {
                if (!t.dueDate) return false;
                const status = (t.status || "").toLowerCase();
                if (["done", "completed", "complete"].includes(status)) return false;
                return t.dueDate >= now && t.dueDate <= nextWeek;
            })
            .sort((a, b) => a.dueDate - b.dueDate)
            .slice(0, 5);
    }, [tasks]);

    // Recent projects with progress
    const projectsWithProgress = useMemo(() => {
        return projects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const total = projectTasks.length;
            const done = projectTasks.filter((t) =>
                ["done", "completed", "complete"].includes((t.status || "").toLowerCase())
            ).length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return { ...p, progress, taskCount: total, completedTasks: done };
        }).slice(0, 4);
    }, [projects, tasks]);

    const getAccentColor = () => {
        const colors = {
            purple: "from-purple-500 to-purple-600",
            blue: "from-sky-500 to-sky-600",
            pink: "from-pink-500 to-pink-600",
            violet: "from-violet-500 to-violet-600",
            orange: "from-amber-500 to-amber-600",
            teal: "from-teal-500 to-teal-600",
            indigo: "from-indigo-500 to-indigo-600",
        };
        return colors[accent] || colors.indigo;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Dashboard">Welcome back! Loading your dashboard...</PageHeader>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="space-y-3 flex-1">
                                    <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                    <div className="h-8 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16" />
                                    <div className="h-2 bg-gray-200 [.dark_&]:bg-white/10 rounded w-20" />
                                </div>
                                <div className="w-14 h-14 rounded-xl bg-gray-200 [.dark_&]:bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Two Column Layout Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Project Progress Skeleton */}
                    <Card title="Project Progress" className="h-full">
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-4">
                                    <div className="flex justify-between mb-2">
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-32" />
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-10" />
                                    </div>
                                    <div className="w-full bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-2 mb-2" />
                                    <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Upcoming Deadlines Skeleton */}
                    <Card title="Upcoming Deadlines (Next 7 Days)" className="h-full">
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-3">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-40" />
                                        <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                    </div>
                                    <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-20" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Team Overview Skeleton */}
                <Card title="Team Overview">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="text-center p-3 border border-gray-100 [.dark_&]:border-white/10 rounded-lg">
                                <div className="w-12 h-12 rounded-full bg-gray-200 [.dark_&]:bg-white/10 mx-auto mb-2" />
                                <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16 mx-auto mb-1" />
                                <div className="h-2 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12 mx-auto" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader title={`Welcome, ${userData?.name || "Manager"}!`}>
                Here's an overview of your projects and team performance.
            </PageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* My Projects */}
                <div
                    onClick={() => navigate("/manager/projects")}
                    className="cursor-pointer bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6 hover:shadow-md transition-all hover:border-indigo-200 [.dark_&]:hover:border-indigo-500/30"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">My Projects</p>
                            <p className="text-3xl font-bold text-gray-900 [.dark_&]:text-white mt-1">{stats.totalProjects}</p>
                            <p className="text-xs text-green-600 [.dark_&]:text-green-400 mt-1">
                                {stats.completedProjects} completed
                            </p>
                        </div>
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAccentColor()} flex items-center justify-center`}>
                            <FaProjectDiagram className="text-white text-xl" />
                        </div>
                    </div>
                </div>

                {/* Team Members */}
                <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">Team Members</p>
                            <p className="text-3xl font-bold text-gray-900 [.dark_&]:text-white mt-1">{stats.teamSize}</p>
                            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-1">Across all projects</p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <FaUsers className="text-white text-xl" />
                        </div>
                    </div>
                </div>

                {/* Tasks */}
                <div
                    onClick={() => navigate("/manager/tasks")}
                    className="cursor-pointer bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6 hover:shadow-md transition-all hover:border-indigo-200 [.dark_&]:hover:border-indigo-500/30"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">Total Tasks</p>
                            <p className="text-3xl font-bold text-gray-900 [.dark_&]:text-white mt-1">{stats.totalTasks}</p>
                            <p className="text-xs text-blue-600 [.dark_&]:text-blue-400 mt-1">
                                {stats.inProgressTasks} in progress
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <FaTasks className="text-white text-xl" />
                        </div>
                    </div>
                </div>

                {/* Overdue Tasks */}
                <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">Overdue Tasks</p>
                            <p className={`text-3xl font-bold mt-1 ${stats.overdueTasks > 0 ? "text-red-600 [.dark_&]:text-red-400" : "text-gray-900 [.dark_&]:text-white"}`}>
                                {stats.overdueTasks}
                            </p>
                            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-1">Need attention</p>
                        </div>
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stats.overdueTasks > 0
                            ? "bg-gradient-to-br from-red-500 to-red-600"
                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                            }`}>
                            <FaExclamationTriangle className="text-white text-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Progress */}
                <Card title="Project Progress" className="h-full">
                    <div className="space-y-4">
                        {projectsWithProgress.length === 0 ? (
                            <p className="text-gray-500 [.dark_&]:text-gray-400 text-center py-8">No projects assigned yet</p>
                        ) : (
                            projectsWithProgress.map((project) => (
                                <div key={project.id} className="border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-4 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-gray-900 [.dark_&]:text-white truncate flex-1">{project.projectName}</h4>
                                        <span className="text-sm font-semibold text-gray-600 [.dark_&]:text-gray-300 ml-2">{project.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 [.dark_&]:bg-gray-700 rounded-full h-2 mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${project.progress === 100 ? "bg-green-500" :
                                                project.progress > 50 ? "bg-blue-500" :
                                                    project.progress > 0 ? "bg-amber-500" : "bg-gray-400"
                                                }`}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                                        {project.completedTasks}/{project.taskCount} tasks completed
                                    </p>
                                </div>
                            ))
                        )}
                        {projects.length > 4 && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/manager/projects")}
                                className="w-full text-indigo-600"
                            >
                                View All Projects <FaArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Upcoming Deadlines */}
                <Card title="Upcoming Deadlines (Next 7 Days)" className="h-full">
                    <div className="space-y-3">
                        {upcomingDeadlines.length === 0 ? (
                            <div className="text-center py-8">
                                <FaCheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                                <p className="text-gray-500 [.dark_&]:text-gray-400">No upcoming deadlines!</p>
                            </div>
                        ) : (
                            upcomingDeadlines.map((task) => (
                                <div key={task.id} className="flex items-center justify-between border border-gray-100 [.dark_&]:border-white/10 rounded-lg p-3 hover:bg-gray-50 [.dark_&]:hover:bg-white/5">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 [.dark_&]:text-white truncate">{task.title}</h4>
                                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">{task.projectName || "No project"}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                                            {task.dueDate?.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Team Overview */}
            <Card title="Team Overview">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {teamMembers.length === 0 ? (
                        <p className="text-gray-500 [.dark_&]:text-gray-400 col-span-full text-center py-8">
                            No team members assigned to your projects yet.
                        </p>
                    ) : (
                        teamMembers.slice(0, 12).map((member) => (
                            <div key={member.id} className="text-center p-3 border border-gray-100 [.dark_&]:border-white/10 rounded-lg hover:bg-gray-50 [.dark_&]:hover:bg-white/5">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                                    {(member.name || member.fullName || "?").charAt(0).toUpperCase()}
                                </div>
                                <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white truncate">
                                    {member.name || member.fullName || "Unknown"}
                                </p>
                                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 truncate">
                                    {member.resourceRole || "Team Member"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}

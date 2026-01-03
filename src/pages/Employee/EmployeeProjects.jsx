import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, documentId } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import {
  FaProjectDiagram,
  FaCalendarAlt,
  FaCalendarPlus,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaEye,
  FaEyeSlash,
  FaCalendarCheck,
  FaClock,
  FaFlag,
  FaCheckCircle,
  FaTasks,
} from "react-icons/fa";

const EmployeeProjects = () => {
  const { user } = useAuthContext();

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Color palette for project cards - smooth, professional colors
  const projectColors = [
    {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40",
      text: "text-blue-900 dark:text-white",
      border: "border-blue-200 dark:border-blue-700",
    },
    {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40",
      text: "text-purple-900 dark:text-white",
      border: "border-purple-200 dark:border-purple-700",
    },
    {
      bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40",
      text: "text-green-900 dark:text-white",
      border: "border-green-200 dark:border-green-700",
    },
    {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40",
      text: "text-amber-900 dark:text-white",
      border: "border-amber-200 dark:border-amber-700",
    },
    {
      bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/40 dark:to-rose-800/40",
      text: "text-rose-900 dark:text-white",
      border: "border-rose-200 dark:border-rose-700",
    },
    {
      bg: "bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/40 dark:to-cyan-800/40",
      text: "text-cyan-900 dark:text-white",
      border: "border-cyan-200 dark:border-cyan-700",
    },
    {
      bg: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/40",
      text: "text-indigo-900 dark:text-white",
      border: "border-indigo-200 dark:border-indigo-700",
    },
    {
      bg: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/40 dark:to-teal-800/40",
      text: "text-teal-900 dark:text-white",
      border: "border-teal-200 dark:border-teal-700",
    },
    {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40",
      text: "text-orange-900 dark:text-white",
      border: "border-orange-200 dark:border-orange-700",
    },
    {
      bg: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/40 dark:to-pink-800/40",
      text: "text-pink-900 dark:text-white",
      border: "border-pink-200 dark:border-pink-700",
    },
  ];

  // Function to get color for a project based on its index
  const getProjectColor = (index) => {
    return projectColors[index % projectColors.length];
  };

  const [projects, setProjects] = useState([]);
  const [primaryTasks, setPrimaryTasks] = useState([]);
  const [multiTasks, setMultiTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]); // All tasks for progress calculation
  const [managerProjects, setManagerProjects] = useState([]); // Projects where user is manager
  const [teamProjects, setTeamProjects] = useState([]); // Projects where user is in assigneeIds
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none"); // none, name, progress, dueDate
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const [showCompleted, setShowCompleted] = useState(false);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Subscribe to tasks (both primary and multi-assignee) in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const qPrimary = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );
    const qMulti = query(
      collection(db, "tasks"),
      where("assigneeIds", "array-contains", user.uid)
    );

    const unsubPrimary = onSnapshot(qPrimary, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .filter((t) => t.assigneeType === "user");
      setPrimaryTasks(list);
    });
    const unsubMulti = onSnapshot(qMulti, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .filter((t) => t.assigneeType === "user");
      setMultiTasks(list);
    });

    return () => {
      unsubPrimary();
      unsubMulti();
    };
  }, [user]);

  // Merge tasks from both subscriptions (dedupe by id)
  useEffect(() => {
    const map = new Map();
    primaryTasks.forEach((t) => map.set(t.id, t));
    multiTasks.forEach((t) => map.set(t.id, t));
    setTasks(Array.from(map.values()));
  }, [primaryTasks, multiTasks]);

  // Subscribe to projects where user is the project manager
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "projects"),
      where("projectManagerId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setManagerProjects(list);
    });

    return () => unsub();
  }, [user]);

  // Subscribe to projects where user is in assigneeIds (team member)
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "projects"),
      where("assigneeIds", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setTeamProjects(list);
    });

    return () => unsub();
  }, [user]);

  // Manage project listeners for unique projectIds from tasks (chunked due to Firestore 'in' 10-limit)
  const projectUnsubsRef = useRef([]);
  useEffect(() => {
    // Cleanup previous project listeners
    projectUnsubsRef.current.forEach((fn) => {
      try { typeof fn === "function" && fn(); } catch { }
    });
    projectUnsubsRef.current = [];

    const ids = Array.from(new Set(tasks.map((t) => t.projectId).filter(Boolean)));
    if (ids.length === 0) {
      setProjects([]);
      return;
    }

    // Chunk into groups of 10 for Firestore 'in' operator
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

    // Aggregate results across chunks
    const aggregate = new Map();
    chunks.forEach((chunk) => {
      const q = query(collection(db, "projects"), where(documentId(), "in", chunk));
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          aggregate.set(d.id, { id: d.id, ...(d.data() || {}) });
        });
        // Keep order aligned with ids
        const list = ids.map((id) => aggregate.get(id)).filter(Boolean);
        setProjects(list);
      });
      projectUnsubsRef.current.push(unsub);
    });

    return () => {
      projectUnsubsRef.current.forEach((fn) => {
        try { typeof fn === "function" && fn(); } catch { }
      });
      projectUnsubsRef.current = [];
    };
  }, [tasks]);

  // Subscribe to all tasks for progress calculation (for projects where user is manager but not assignee)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        projectId: d.data().projectId || "",
        status: d.data().status || "To-Do",
      }));
      setAllTasks(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Combine all project sources into a merged list (dedupe by id)
  const mergedProjects = (() => {
    const projectMap = new Map();
    // Add projects from tasks
    projects.forEach((p) => projectMap.set(p.id, p));
    // Add projects where user is manager
    managerProjects.forEach((p) => projectMap.set(p.id, p));
    // Add projects where user is team member
    teamProjects.forEach((p) => projectMap.set(p.id, p));
    return Array.from(projectMap.values());
  })();

  // Get tasks assigned to current user for a project (for display purposes)
  const getProjectTasks = (projectId) => {
    return tasks.filter((t) => t.projectId === projectId);
  };

  // Get ALL tasks for a project (for accurate progress calculation)
  const getAllProjectTasks = (projectId) => {
    return allTasks.filter((t) => t.projectId === projectId);
  };

  const getProjectProgress = (projectId) => {
    const projectTasks = getAllProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(
      (t) => t.status === "Done"
    ).length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  // Filter and sort projects
  const filteredAndSortedProjects = mergedProjects
    .filter((project) => {
      const progress = getProjectProgress(project.id);

      // Filter by search term
      const matchesSearch =
        project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by completion status
      const isCompleted = progress === 100;
      const shouldShow = showCompleted ? isCompleted : !isCompleted;

      return matchesSearch && shouldShow;
    })
    .sort((a, b) => {
      // If sortBy is 'none', maintain original order (no sorting)
      if (sortBy === "none") {
        return 0;
      }

      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.projectName.toLowerCase();
          bValue = b.projectName.toLowerCase();
          break;
        case "progress":
          aValue = getProjectProgress(a.id);
          bValue = getProjectProgress(b.id);
          break;
        case "dueDate":
          // Use endDate as the due date for sorting
          aValue = a.endDate?.toDate?.() || new Date(a.endDate) || new Date(0);
          bValue = b.endDate?.toDate?.() || new Date(b.endDate) || new Date(0);
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Count completed projects
  const completedProjectsCount = mergedProjects.filter((project) => {
    const progress = getProjectProgress(project.id);
    return progress === 100;
  }).length;

  // New statistics calculations
  const totalProjects = mergedProjects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Projects" description="Your assigned projects" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 dark:bg-white/10 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <PageHeader
        title="My Projects"
        description="View projects you're working on"
        icon={<FaProjectDiagram />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects Card */}
        <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Total Projects
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {totalProjects}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <FaProjectDiagram className="text-blue-500 dark:text-blue-400 text-xl" />
            </div>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-purple-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Total Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
              <FaTasks className="text-purple-500 dark:text-purple-400 text-xl" />
            </div>
          </div>
        </div>

        {/* Completed Tasks Card */}
        <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Completed
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {tasks.filter((t) => t.status === "Done").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
              <FaCheckCircle className="text-green-500 dark:text-green-400 text-xl" />
            </div>
          </div>
        </div>

        {/* In Progress Tasks Card */}
        <div className="bg-white dark:bg-[#1e1e2d] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                In Progress
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {tasks.filter((t) => t.status === "In Progress").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <FaClock className="text-amber-500 dark:text-amber-400 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Search Bar - Full Width */}
        <div className="relative w-full mb-4">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {/* Sort and Filter Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side - Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="none">None</option>
                <option value="name">Name</option>
                <option value="progress">Progress</option>
                <option value="dueDate">Due Date</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors border border-gray-300 dark:border-gray-600 rounded-lg dark:hover:bg-gray-700"
                title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"
                  }`}
              >
                {sortOrder === "asc" ? (
                  <FaSortAmountUp className="h-4 w-4" />
                ) : (
                  <FaSortAmountDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {filteredAndSortedProjects.length} of {mergedProjects.length} projects
            </div>
          </div>

          {/* Right Side - Show Completed Projects Button */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCompleted
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            title={
              showCompleted
                ? "Hide completed projects"
                : "Show completed projects"
            }
          >
            <FaEye className="h-4 w-4" />
            {showCompleted
              ? "Hide Completed"
              : `View Completed (${completedProjectsCount})`}
          </button>
        </div>
      </div>

      {filteredAndSortedProjects.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              {showCompleted ? (
                <FaCheckCircle className="h-8 w-8 text-gray-400" />
              ) : (
                <FaProjectDiagram className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm
                ? "No Projects Found"
                : showCompleted
                  ? "No Completed Projects"
                  : "No Active Projects"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {searchTerm
                ? `No projects match your search "${searchTerm}". Try adjusting your search terms.`
                : showCompleted
                  ? "You don't have any completed projects yet. Keep working on your current projects to see them here once completed."
                  : "You don't have any active projects assigned at the moment. New projects will appear here when assigned to you."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {filteredAndSortedProjects.map((project, index) => {
            const projectTasks = getProjectTasks(project.id);
            const progress = getProjectProgress(project.id);
            const startDate =
              project.startDate?.toDate?.() || new Date(project.startDate);
            const endDate =
              project.endDate?.toDate?.() || new Date(project.endDate);
            const colorScheme = getProjectColor(index);

            return (
              <div key={project.id} className="w-full min-w-0">
                <Card
                  className="hover:shadow-lg transition-shadow h-full w-full flex-shrink-0 overflow-hidden"
                  style={{
                    minWidth: "280px",
                    width: "100%",
                    minHeight: "420px",
                  }}
                >
                  <div className="flex flex-col h-full">
                    {/* Top Content - Project Name Header with Color */}
                    <div className="flex-1 min-h-0">
                      <div
                        className={`mb-4 -mx-6 -mt-6 px-6 py-4 ${colorScheme.bg} border-b-2 ${colorScheme.border}`}
                      >
                        <h3
                          className={`text-lg font-semibold ${colorScheme.text} truncate min-w-0 flex-shrink-0`}
                          style={{ minHeight: "1.75rem", width: "100%" }}
                          onMouseEnter={(e) => {
                            setHoveredProject(project);
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredProject(null)}
                          onMouseMove={(e) => {
                            if (hoveredProject) {
                              setMousePosition({ x: e.clientX, y: e.clientY });
                            }
                          }}
                        >
                          {project.projectName}
                        </h3>

                        {/* Project Manager directly under project name */}
                        {project.projectManagerName && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-full bg-white/40 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-700">
                                {project.projectManagerName
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-white">
                              Manager: {project.projectManagerName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* OKRs (Objectives and Key Results) - Scrollable */}
                      {project.okrs && project.okrs.length > 0 && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            OKRs (Objectives & Key Results)
                          </p>
                          <div className="max-h-32 overflow-y-auto scrollbar-hide">
                            <div className="space-y-2">
                              {project.okrs.map((okr, okrIndex) => (
                                <div
                                  key={okrIndex}
                                  className="bg-gray-50 dark:bg-gray-800 p-2 rounded"
                                >
                                  <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                    {okrIndex + 1}.{" "}
                                    {okr.objective || "No objective"}
                                  </p>
                                  {okr.keyResults &&
                                    okr.keyResults.length > 0 && (
                                      <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-0.5 ml-2">
                                        {okr.keyResults.map((kr, krIndex) => (
                                          <li key={krIndex}>{kr}</li>
                                        ))}
                                      </ul>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Content - Fixed at bottom */}
                    <div className="mt-auto">
                      {/* Progress Section */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mb-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className="bg-indigo-600 h-1 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Task Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-3">
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Your Tasks</p>
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">
                            {projectTasks.length}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Completed</p>
                          <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                            {
                              projectTasks.filter((t) => t.status === "Done")
                                .length
                            }
                          </p>
                        </div>
                      </div>

                      {/* Project Dates */}
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-center gap-1">
                          <FaCalendarPlus className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium">Assigned:</span>
                          <span>{formatDateToDDMMYYYY(startDate)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <FaClock className="h-3 w-3 text-red-600 dark:text-red-400" />
                          <span className="font-medium">Due:</span>
                          <span>{formatDateToDDMMYYYY(endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple Tooltip for Project Name */}
      {hoveredProject && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: Math.min(
              mousePosition.x + 15,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 250
            ),
            top: mousePosition.y - 45,
            transform: "translateZ(0)", // Force hardware acceleration
          }}
        >
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl max-w-xs border border-gray-700">
            <p className="text-sm font-medium break-words whitespace-nowrap overflow-hidden text-ellipsis">
              {hoveredProject.projectName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProjects;

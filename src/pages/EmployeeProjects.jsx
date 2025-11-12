import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { FaProjectDiagram, FaCalendarAlt, FaCalendarPlus, FaSearch, FaSortAmountDown, FaSortAmountUp, FaEye, FaEyeSlash, FaCalendarCheck, FaClock, FaFlag, FaCheckCircle } from "react-icons/fa";

const EmployeeProjects = () => {
  const { user } = useAuthContext();

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : (date?.toDate?.() || new Date(date));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none"); // none, name, progress, dueDate
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const [showCompleted, setShowCompleted] = useState(false);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!user?.uid) return;

    // Get tasks assigned to this employee
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => task.assigneeType === "user");
      setTasks(taskData);

      // Get unique project IDs from tasks
      const projectIds = [
        ...new Set(taskData.map((t) => t.projectId).filter(Boolean)),
      ];

      // Get projects
      if (projectIds.length > 0) {
        const projectsQuery = query(
          collection(db, "projects"),
          where("__name__", "in", projectIds)
        );

        const unsubProjects = onSnapshot(projectsQuery, (projectSnapshot) => {
          const projectData = projectSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProjects(projectData);
          setLoading(false);
        });

        return () => {
          unsubProjects();
          unsubTasks();
        };
      } else {
        setProjects([]);
        setLoading(false);
      }
    });

    return () => unsubTasks();
  }, [user]);

  const getProjectTasks = (projectId) => {
    return tasks.filter((t) => t.projectId === projectId);
  };

  const getProjectProgress = (projectId) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(
      (t) => t.status === "Done"
    ).length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };


  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter(project => {
      const progress = getProjectProgress(project.id);
      const projectTasks = getProjectTasks(project.id);
      
      // Only show projects where user has tasks
      const hasUserTasks = projectTasks.length > 0;
      
      // Filter by search term
      const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by completion status
      const isCompleted = progress === 100;
      const shouldShow = showCompleted ? isCompleted : !isCompleted;
      
      return hasUserTasks && matchesSearch && shouldShow;
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

  // Count completed projects where user has tasks
  const completedProjectsCount = projects.filter(project => {
    const progress = getProjectProgress(project.id);
    const projectTasks = getProjectTasks(project.id);
    return progress === 100 && projectTasks.length > 0;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Projects" description="Your assigned projects" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 animate-pulse rounded-lg"
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

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Search Bar - Full Width */}
        <div className="relative w-full mb-4">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Sort and Filter Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side - Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
              >
                <option value="none">None</option>
                <option value="name">Name</option>
                <option value="progress">Progress</option>
                <option value="dueDate">Due Date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors border border-gray-300 rounded-lg"
                title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              >
                {sortOrder === "asc" ? <FaSortAmountUp className="h-4 w-4" /> : <FaSortAmountDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 whitespace-nowrap">
              {filteredAndSortedProjects.length} of {projects.length} projects
            </div>
          </div>

          {/* Right Side - Show Completed Projects Button */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCompleted 
                ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
            title={showCompleted ? 'Hide completed projects' : 'Show completed projects'}
          >
            <FaEye className="h-4 w-4" />
            {showCompleted ? 'Hide Completed' : `View Completed (${completedProjectsCount})`}
          </button>
        </div>

      </div>

      {filteredAndSortedProjects.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {showCompleted ? (
                <FaCheckCircle className="h-8 w-8 text-gray-400" />
              ) : (
                <FaProjectDiagram className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No Projects Found' : 
               showCompleted ? 'No Completed Projects' : 'No Active Projects'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm ? `No projects match your search "${searchTerm}". Try adjusting your search terms.` : 
               showCompleted ? 'You don\'t have any completed projects yet. Keep working on your current projects to see them here once completed.' : 
               'You don\'t have any active projects assigned at the moment. New projects will appear here when assigned to you.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {filteredAndSortedProjects.map((project) => {
            const projectTasks = getProjectTasks(project.id);
            const progress = getProjectProgress(project.id);
            const startDate =
              project.startDate?.toDate?.() || new Date(project.startDate);
            const endDate =
              project.endDate?.toDate?.() || new Date(project.endDate);

            return (
              <div key={project.id} className="w-full min-w-0">
                <Card
                  className="hover:shadow-lg transition-shadow h-full w-full flex-shrink-0"
                  style={{ minWidth: '280px', width: '100%', minHeight: '420px' }}
                >
                  <div className="flex flex-col h-full">
                    {/* Top Content - Project Name and OKRs */}
                    <div className="flex-1 min-h-0">
                      <div className="mb-4">
                        <h3 
                          className="text-lg font-semibold text-gray-900 truncate min-w-0 flex-shrink-0"
                          style={{ minHeight: '1.75rem', width: '100%' }}
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
                      </div>

                      {/* OKRs (Objectives and Key Results) - Scrollable */}
                      {project.okrs && project.okrs.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            OKRs (Objectives & Key Results)
                          </p>
                          <div className="max-h-32 overflow-y-auto scrollbar-hide">
                            <div className="space-y-2">
                              {project.okrs.map((okr, index) => (
                                <div key={index} className="bg-gray-50 p-2 rounded">
                                  <p className="text-xs font-medium text-gray-900 mb-1">
                                    {index + 1}. {okr.objective || "No objective"}
                                  </p>
                                  {okr.keyResults && okr.keyResults.length > 0 && (
                                    <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5 ml-2">
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
                      <div className="pt-4 border-t border-gray-200 mb-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold text-gray-900">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-indigo-600 h-1 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Task Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 mb-3">
                        <div className="text-center">
                          <p className="text-gray-500 text-xs">Your Tasks</p>
                          <p className="font-semibold text-gray-900 text-lg">
                            {projectTasks.length}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 text-xs">Completed</p>
                          <p className="font-semibold text-green-600 text-lg">
                            {projectTasks.filter((t) => t.status === "Done").length}
                          </p>
                        </div>
                      </div>

                      {/* Project Dates */}
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 text-xs text-gray-600">
                        <div className="flex items-center justify-center gap-1">
                          <FaCalendarPlus className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">Assigned:</span>
                          <span>{formatDateToDDMMYYYY(startDate)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <FaClock className="h-3 w-3 text-red-600" />
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
            left: Math.min(mousePosition.x + 15, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250),
            top: mousePosition.y - 45,
            transform: 'translateZ(0)', // Force hardware acceleration
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

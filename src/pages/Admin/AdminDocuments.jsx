import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { FaSearch, FaList, FaThLarge, FaSortAmountDown, FaCheck } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { formatDate } from "../../utils/formatDate";
import { useThemeStyles } from "../../hooks/useThemeStyles";

export default function Documents({ onlyMyManaged = false, onlyMyAssigned = false }) {
  const { iconColor, hoverAccentClass, hoverBorderClass } = useThemeStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/manager")
    ? "/manager/knowledge-management"
    : location.pathname.startsWith("/employee")
      ? "/employee/knowledge-management"
      : location.pathname.startsWith("/admin")
        ? "/admin/knowledge-management"
        : "/knowledge-management";

  useEffect(() => {
    if (location.pathname === "/knowledge-management") {
      document.title = "COSMOS | Knowldge Managment";
    }
  }, [location.pathname]);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Live Users Map
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.forEach(d => {
        map[d.id] = d.data();
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

  const [sortConfig, setSortConfig] = useState({
    key: "projectName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(location.state?.viewMode === "list" ? 10 : 1000);
  const [viewMode, setViewMode] = useState(location.state?.viewMode || "grid"); // 'grid' | 'list'
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSort(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Restore viewMode from location state when navigating back
  useEffect(() => {
    if (location.state?.viewMode) {
      setViewMode(location.state.viewMode);
    }
  }, [location.state?.viewMode]);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          projectName: data.projectName || "",
          clientName: data.clientName || "",
          clientId: data.clientId || "",
          projectManagerId: data.projectManagerId || "",
          projectManagerName: data.projectManagerName || "",
          progress: typeof data.progress === "number" ? data.progress : 0,
          startDate: data.startDate?.toDate
            ? data.startDate.toDate().toISOString().slice(0, 10)
            : data.startDate || "",
          endDate: data.endDate?.toDate
            ? data.endDate.toDate().toISOString().slice(0, 10)
            : data.endDate || "",
          okrs: data.okrs || [{ objective: "", keyResults: [""] }],
          createdAt: data.createdAt || null,
        };
      });
      setProjects(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          projectId: data.projectId || "",
          status: data.status || "To-Do",
          assigneeId: data.assigneeId || "",
          assigneeType: data.assigneeType || "",
        };
      });
      setTasks(list);
    });
    return () => unsub();
  }, []);

  const projectsWithProgress = useMemo(() => {
    if (!projects.length) return [];
    const normalizeStatus = (s) => {
      const x = String(s || "").trim().toLowerCase();
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

    const currentUser = auth.currentUser;

    return projects
      .filter((p) => {
        if (!onlyMyManaged) return true;
        if (!currentUser) return false;
        return p.projectManagerId === currentUser.uid;
      })
      .map((p) => {
        const projTasks = tasks.filter((t) => t.projectId === p.id);
        const total = projTasks.length;
        const done = projTasks.filter((t) => normalizeStatus(t.status) === "Done").length;
        const derived = total > 0 ? Math.round((done / total) * 100) : 0;
        return { ...p, progress: derived };
      });
  }, [projects, tasks, onlyMyManaged]);

  const assignedProjectIds = useMemo(() => {
    if (!onlyMyAssigned) return new Set();
    const u = auth.currentUser;
    if (!u) return new Set();
    const ids = tasks
      .filter((t) => t.assigneeId === u.uid && (t.assigneeType ? t.assigneeType === "user" : true))
      .map((t) => t.projectId)
      .filter(Boolean);
    return new Set(ids);
  }, [tasks, onlyMyAssigned]);

  const filteredProjects = useMemo(() => {
    let result = [...projectsWithProgress];

    if (onlyMyAssigned && assignedProjectIds.size) {
      result = result.filter((p) => assignedProjectIds.has(p.id));
    } else if (onlyMyAssigned) {
      result = [];
    }

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((project) => {
        return (
          (project.projectName || "").toLowerCase().includes(term) ||
          (project.clientName || "").toLowerCase().includes(term)
        );
      });
    }

    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;

      result.sort((a, b) => {
        let aValue = a[key];
        let bValue = b[key];

        // Handle specific keys if needed
        if (key === "date") { // Map 'date' to 'createdAt' if not already
          aValue = a.createdAt;
          bValue = b.createdAt;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * multiplier;
        }
        // Handle dates strings or nulls
        if (!aValue) return 1 * multiplier;
        if (!bValue) return -1 * multiplier;

        return String(aValue).localeCompare(String(bValue)) * multiplier;
      });
    }

    return result;
  }, [projectsWithProgress, searchTerm, sortConfig, onlyMyAssigned, assignedProjectIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / rowsPerPage));
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const currentRows = filteredProjects.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <Card
        title="Search & Actions"
        tone="muted"
        className="overflow-visible"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
              <FaSearch className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#1F2234] py-2 pl-9 pr-3 text-sm text-content-primary [.dark_&]:text-white placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
            />
          </div>
          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-3 py-2 bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors"
            >
              <FaSortAmountDown className="text-gray-400" />
              <span className="hidden sm:inline">Sort</span>
            </button>

            {showSort && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort By</div>
                {[
                  { label: 'Name', key: 'projectName' },
                  { label: 'Date', key: 'createdAt' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSortConfig(prev => ({ ...prev, key: option.key }));
                      setShowSort(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortConfig.key === option.key ? 'text-indigo-600 bg-indigo-50 [.dark_&]:bg-indigo-900/20' : 'text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5'}`}
                  >
                    {option.label}
                    {sortConfig.key === option.key && <FaCheck className="h-3 w-3" />}
                  </button>
                ))}
                <div className="border-t border-gray-100 [.dark_&]:border-white/10 my-1"></div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</div>
                <button
                  onClick={() => {
                    setSortConfig(prev => ({ ...prev, direction: 'asc' }));
                    setShowSort(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortConfig.direction === 'asc' ? 'text-indigo-600 bg-indigo-50 [.dark_&]:bg-indigo-900/20' : 'text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5'}`}
                >
                  Ascending
                  {sortConfig.direction === 'asc' && <FaCheck className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => {
                    setSortConfig(prev => ({ ...prev, direction: 'desc' }));
                    setShowSort(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortConfig.direction === 'desc' ? 'text-indigo-600 bg-indigo-50 [.dark_&]:bg-indigo-900/20' : 'text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5'}`}
                >
                  Descending
                  {sortConfig.direction === 'desc' && <FaCheck className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-gray-100 [.dark_&]:bg-white/5 rounded-lg p-1 border border-gray-200 [.dark_&]:border-white/10">
            <button
              onClick={() => {
                setViewMode("grid");
                setRowsPerPage(1000);
              }}
              className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? `bg-white [.dark_&]:bg-white/10 shadow-sm ${iconColor}` : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-gray-300"}`}
              title="Grid View"
            >
              <FaThLarge className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                setRowsPerPage(10);
              }}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? `bg-white [.dark_&]:bg-white/10 shadow-sm ${iconColor}` : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-gray-300"}`}
              title="List View"
            >
              <FaList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="Projects"
        tone="muted"
        afterTitle={
          <span className="text-xs text-content-tertiary">
            {indexOfFirstRow + 1}–{Math.min(indexOfLastRow, filteredProjects.length)} of {filteredProjects.length}
          </span>
        }
      >
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-2 gap-y-4">
            {currentRows.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  navigate(
                    `${basePath}/${encodeURIComponent(project.projectName || "")}`,
                    { state: { fromDocsTab: true, viewMode } }
                  )
                }
                className={`group flex flex-col items-center justify-center py-4 px-1 rounded-xl border border-transparent ${hoverAccentClass} ${hoverBorderClass} transition-all cursor-pointer text-center gap-1 relative`}
              >
                <div className="p-3 rounded-full text-6xl group-hover:scale-110 transition-transform">
                  <FcFolder />
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-semibold text-gray-900 [.dark_&]:text-white text-sm line-clamp-1 break-all px-2" title={project.projectName}>
                    {project.projectName}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // LIST VIEW - Table layout similar to Manage Projects
          <div className="overflow-x-auto rounded-lg border border-gray-200 [.dark_&]:border-white/10">
            <table className="w-full">
              <thead className="bg-gray-50 [.dark_&]:bg-white/5 border-b border-gray-100 [.dark_&]:border-white/10">
                <tr className="text-left text-xs font-bold text-gray-500 [.dark_&]:text-gray-300 uppercase tracking-wider">
                  <th className="px-6 py-4">SR. NO.</th>
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Project Manager</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 [.dark_&]:divide-white/5 bg-white [.dark_&]:bg-[#181B2A]">
                {currentRows.map((project, index) => (
                  <tr
                    key={project.id}
                    onClick={() =>
                      navigate(
                        `${basePath}/${encodeURIComponent(project.projectName || "")}`,
                        { state: { fromDocsTab: true, viewMode } }
                      )
                    }
                    className="hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {/* SR. NO. */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700 [.dark_&]:text-white">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 [.dark_&]:bg-white/5">
                        {indexOfFirstRow + index + 1}
                      </div>
                    </td>

                    {/* Project Name */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                      <span>{project.projectName}</span>
                    </td>

                    {/* Client Name */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                      <span>{project.clientName || '—'}</span>
                    </td>

                    {/* Project Manager */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                      <span
                        title={project.projectManagerName || "—"}
                        className="block max-w-[160px] truncate"
                      >
                        {project.projectManagerName || "—"}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-3 mr-3 min-w-[120px]">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${project.progress === 0
                              ? "bg-gray-400"
                              : project.progress < 30
                                ? "bg-red-500"
                                : project.progress < 70
                                  ? "bg-yellow-500"
                                  : project.progress < 100
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                              }`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-300 min-w-[40px]">
                          {project.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 [.dark_&]:text-gray-300">
                      <div className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></div>
                        {formatDate(project.startDate)}
                      </div>
                    </td>

                    {/* End Date */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 [.dark_&]:text-gray-300">
                      <div className="flex items-center bg-gray-50 [.dark_&]:bg-white/5 rounded-lg px-3 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></div>
                        {formatDate(project.endDate)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!currentRows.length && (
          <div className="text-center py-16 bg-white [.dark_&]:bg-[#181B2A] rounded-xl border border-dashed border-gray-300">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FaSearch className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 [.dark_&]:text-white">No Projects Found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search filters</p>
          </div>
        )}

        {/* Bottom Pagination */}
        {currentRows.length > 0 && viewMode === "list" && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
            <span className="text-sm font-medium text-content-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-secondary">
                Cards per page
              </label>
              <select
                className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
              >
                {(viewMode === "grid" ? [14, 28, 56] : [10, 20, 50]).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevPage}
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  disabled={currentPage === totalPages || !filteredProjects.length}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import { FaSearch } from "react-icons/fa";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  collectionGroup,
} from "firebase/firestore";
import { formatDate } from "../../utils/formatDate";

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "projectName", label: "Project Name", sortable: true },
  { key: "clientName", label: "Client Name", sortable: true },
  { key: "projectManagerName", label: "Project Manager", sortable: true },
  { key: "progress", label: "Progress", sortable: true },
  { key: "startDate", label: "Start Date", sortable: true },
  { key: "endDate", label: "End Date", sortable: true },
];

export default function Documents({ onlyMyManaged = false, onlyMyAssigned = false }) {
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
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  }, [projects, tasks]);

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
      // If user has no assigned projects via tasks, show none
      result = [];
    }

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((project) => {
        const statusLabel =
          project.progress === 0
            ? "Not Started"
            : project.progress === 100
              ? "Completed"
              : "In Progress";
        return (
          (project.projectName || "").toLowerCase().includes(term) ||
          (project.clientName || "").toLowerCase().includes(term) ||
          statusLabel.toLowerCase().includes(term)
        );
      });
    }

    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;

      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * multiplier;
        }

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
  const currentRows = filteredProjects.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }
      return {
        key: columnKey,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const sortIndicator = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Knowledge Management">
          View all projects as part of organizational knowledge.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Search & Actions" tone="muted">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
            </div>
          </Card>
          <Card title="Project List" tone="muted">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-subtle">
                  <tr>
                    {tableHeaders.map((header) => (
                      <th
                        key={header.key}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-content-tertiary"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {Array.from({ length: rowsPerPage }).map((_, index) => (
                    <SkeletonRow key={index} columns={tableHeaders.length} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Management">
        View all projects as part of organizational knowledge.
      </PageHeader>

      <Card
        title="Search"
        tone="muted"
        actions={
          <span className="text-sm font-medium text-content-secondary" aria-live="polite">
            Showing {filteredProjects.length} records
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
          <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
            Search by project name, client or status
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                <FaSearch className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                type="text"
                placeholder="e.g. Website Redesign or TechCorp or In Progress"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                spellCheck="true"
              />
            </div>
          </label>
        </div>
      </Card>

      <Card
        title="Project List"
        tone="muted"
        actions={
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium text-content-secondary"
              aria-live="polite"
            >
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </span>
            <label className="text-sm font-medium text-content-secondary">
              Rows per page
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrevPage}
                variant="secondary"
                className="px-3 py-1"
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                variant="secondary"
                className="px-3 py-1"
                disabled={currentPage === totalPages || !filteredProjects.length}
              >
                Next
              </Button>
            </div>
          </div>
        }
      >
        <div className="w-full overflow-x-auto rounded-lg border border-subtle shadow-sm">
          <table className="min-w-[1100px] divide-y divide-subtle bg-surface">
            <caption className="sr-only">
              Filtered project records with search and pagination controls
            </caption>
            <thead className="bg-surface-subtle">
              <tr>
                {tableHeaders.map((header) => {
                  const isActive = sortConfig.key === header.key;
                  const ariaSort = !header.sortable
                    ? "none"
                    : isActive
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";

                  return (
                    <th
                      key={header.key}
                      scope="col"
                      aria-sort={ariaSort}
                      className="group px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-content-secondary border-b border-subtle"
                    >
                      {header.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(header.key)}
                          className="flex items-center gap-2 text-left hover:text-indigo-600 transition-colors duration-200 transform hover:scale-105"
                        >
                          <span>{header.label}</span>
                          <span className="transition-transform duration-200">
                            {sortIndicator(header.key)}
                          </span>
                        </button>
                      ) : (
                        <span>{header.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface">
              {currentRows.map((project, index) => (
                <tr
                  key={project.id}
                  className="bg-surface hover:bg-surface-subtle transition-colors cursor-pointer"
                  onClick={() =>
                    navigate(
                      `${basePath}/${encodeURIComponent(project.projectName || "")}`,
                      { state: { fromDocsTab: true } }
                    )
                  }
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-content-tertiary">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-subtle">
                      {indexOfFirstRow + index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-content-primary">
                    <span>{project.projectName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-content-primary">
                    <span>{project.clientName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-content-primary">
                    <span
                      title={project.projectManagerName || "-"}
                      className="block max-w-[160px] truncate"
                    >
                      {project.projectManagerName || "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <div className="flex-1 bg-surface-subtle [.dark_&]:bg-gray-700 rounded-full h-3 mr-3 min-w-[120px]">
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
                      <span className="text-sm font-medium text-content-secondary min-w-[40px]">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-content-secondary">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></div>
                      {formatDate(project.startDate)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-content-secondary">
                    <div className="flex items-center bg-surface-subtle rounded-lg px-3 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></div>
                      {formatDate(project.endDate)}
                    </div>
                  </td>
                </tr>
              ))}
              {!currentRows.length && (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4 animate-pulse">
                        <FaSearch className="h-6 w-6 text-content-tertiary" />
                      </div>
                      <h3 className="text-lg font-semibold text-content-secondary mb-2">
                        No Projects Found
                      </h3>
                      <p className="text-sm text-content-tertiary">
                        No projects match the selected filters. Adjust your search or try resetting filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

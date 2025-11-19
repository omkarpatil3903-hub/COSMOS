// src/pages/ManageProjects.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTh,
  FaList,
} from "react-icons/fa";
import { HiOutlineArrowDownTray, HiMiniArrowPath } from "react-icons/hi2";
// Excel export not used on this page currently
import toast from "react-hot-toast";
import { db } from "../firebase";
import AddProjectModal from "../components/AddProjectModal";
import EditProjectModal from "../components/EditProjectModal";
import ViewProjectModal from "../components/ViewProjectModal";
import DeleteProjectModal from "../components/DeleteProjectModal";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

// Removed placeholder data; now loading projects from Firestore

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "projectName", label: "Project Name", sortable: true },
  { key: "clientName", label: "Client Name", sortable: true },
  { key: "progress", label: "Progress", sortable: true },
  { key: "startDate", label: "Start Date", sortable: true },
  { key: "endDate", label: "End Date", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];
// --- End Placeholder Data ---

function ManageProjects() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // State for search, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "projectName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("table"); // "table" or "kanban"

  // Form state
  const [formData, setFormData] = useState({
    projectName: "",
    clientId: "",
    clientName: "",
    startDate: "",
    endDate: "",
    okrs: [
      {
        objective: "",
        keyResults: [""],
      },
    ],
  });
  const [addErrors, setAddErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [initialEditData, setInitialEditData] = useState(null);

  // Subscribe to Firestore projects
  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          projectName: data.projectName || "",
          clientName: data.clientName || "",
          clientId: data.clientId || "",
          // Firestore progress is not used for display; we'll compute from tasks below
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

  // Subscribe to tasks to compute derived progress per project
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          projectId: data.projectId || "",
          status: data.status || "To-Do",
        };
      });
      setTasks(list);
    });
    return () => unsub();
  }, []);

  // Load clients for dropdown
  useEffect(() => {
    const cq = query(collection(db, "clients"), orderBy("companyName", "asc"));
    const unsub = onSnapshot(cq, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setClients(list);
    });
    return () => unsub();
  }, []);

  // Compute progress based on tasks: progress = done/total * 100, rounded
  const projectsWithDerived = useMemo(() => {
    if (!projects.length) return [];
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
    return projects.map((p) => {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(
        (t) => normalizeStatus(t.status) === "Done"
      ).length;
      const derived = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...p, progress: derived };
    });
  }, [projects, tasks]);

  const filteredProjects = useMemo(() => {
    let result = [...projectsWithDerived];

    if (searchTerm) {
      const normalisedTerm = searchTerm.trim().toLowerCase();
      result = result.filter((project) => {
        const statusLabel =
          (project.progress === 0
            ? "Not Started"
            : project.progress === 100
            ? "Completed"
            : "In Progress") || "";
        return (
          (project.projectName || "").toLowerCase().includes(normalisedTerm) ||
          (project.clientName || "").toLowerCase().includes(normalisedTerm) ||
          statusLabel.toLowerCase().includes(normalisedTerm)
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
  }, [projectsWithDerived, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredProjects.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const hasEditChanges = useMemo(() => {
    if (!initialEditData) return false;

    const next = formData || {};
    const initial = initialEditData || {};

    if ((next.projectName || "") !== (initial.projectName || "")) {
      return true;
    }
    if ((next.clientId || "") !== (initial.clientId || "")) {
      return true;
    }
    if ((next.clientName || "") !== (initial.clientName || "")) {
      return true;
    }
    if ((next.startDate || "") !== (initial.startDate || "")) {
      return true;
    }
    if ((next.endDate || "") !== (initial.endDate || "")) {
      return true;
    }

    const nextOkrs = Array.isArray(next.okrs) ? next.okrs : [];
    const initialOkrs = Array.isArray(initial.okrs) ? initial.okrs : [];
    if (JSON.stringify(nextOkrs) !== JSON.stringify(initialOkrs)) {
      return true;
    }

    return false;
  }, [formData, initialEditData]);

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

  // const handleReset = () => {
  //   setSearchTerm("");
  //   setSortConfig({ key: "projectName", direction: "asc" });
  //   setRowsPerPage(10);
  //   setCurrentPage(1);
  // };

  const validateProjectForm = (data) => {
    const errors = {};

    if (!data.projectName || !data.projectName.trim()) {
      errors.projectName = "Project name is required";
    } else if (data.projectName.trim().length < 3) {
      errors.projectName = "Project name must be at least 3 characters";
    }

    if (!data.clientId) {
      errors.clientId = "Company is required";
    }

    if (!data.startDate) {
      errors.startDate = "Start date is required";
    }

    if (!data.endDate) {
      errors.endDate = "End date is required";
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end < start
      ) {
        errors.endDate = "End date cannot be before start date";
      }
    }

    const hasValidOKR =
      Array.isArray(data.okrs) &&
      data.okrs.some(
        (okr) =>
          okr &&
          typeof okr.objective === "string" &&
          okr.objective.trim() &&
          Array.isArray(okr.keyResults) &&
          okr.keyResults.some((kr) => typeof kr === "string" && kr.trim())
      );
    if (!hasValidOKR) {
      errors.okrs = "Add at least one objective with at least one key result.";
    }

    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const errors = validateProjectForm(formData);
    setAddErrors(errors);
    if (Object.keys(errors).length) {
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    try {
      // derive clientName from selected client
      const selectedClient = clients.find((c) => c.id === formData.clientId);
      const clientName =
        selectedClient?.companyName || formData.clientName || "";
      await addDoc(collection(db, "projects"), {
        projectName: formData.projectName,
        clientName,
        clientId: formData.clientId,
        progress: parseInt(formData.progress) || 0,
        startDate: formData.startDate
          ? Timestamp.fromDate(new Date(formData.startDate))
          : null,
        endDate: formData.endDate
          ? Timestamp.fromDate(new Date(formData.endDate))
          : null,
        okrs: formData.okrs,
        createdAt: serverTimestamp(),
      });
      setFormData({
        projectName: "",
        clientId: "",
        clientName: "",
        progress: 0,
        startDate: "",
        endDate: "",
        okrs: [{ objective: "", keyResults: [""] }],
      });
      setAddErrors({});
      setShowAddForm(false);
    } catch (err) {
      console.error("Add project failed", err);
      toast.error("Failed to add project");
    }
  };

  const handleEdit = (id) => {
    const project = projects.find((p) => p.id === id);
    setSelectedProject(project);
    setFormData({
      projectName: project.projectName,
      clientId: project.clientId || "",
      clientName: project.clientName,
      startDate: project.startDate,
      endDate: project.endDate,
      okrs: project.okrs || [{ objective: "", keyResults: [""] }],
    });
    setInitialEditData({
      projectName: project.projectName || "",
      clientId: project.clientId || "",
      clientName: project.clientName || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      okrs: project.okrs || [{ objective: "", keyResults: [""] }],
    });
    setEditErrors({});
    setShowEditForm(true);
  };

  const sortIndicator = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }

    return sortConfig.direction === "asc" ? (
      <FaSortAmountUpAlt
        className="h-4 w-4 text-indigo-600"
        aria-hidden="true"
      />
    ) : (
      <FaSortAmountDownAlt
        className="h-4 w-4 text-indigo-600"
        aria-hidden="true"
      />
    );
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProject || !hasEditChanges) {
      return;
    }

    const errors = validateProjectForm(formData);
    setEditErrors(errors);
    if (Object.keys(errors).length) {
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    try {
      const ref = doc(db, "projects", selectedProject.id);
      const selectedClient = clients.find((c) => c.id === formData.clientId);
      const clientName =
        selectedClient?.companyName || formData.clientName || "";
      await updateDoc(ref, {
        projectName: formData.projectName,
        clientName,
        clientId: formData.clientId,
        startDate: formData.startDate
          ? Timestamp.fromDate(new Date(formData.startDate))
          : null,
        endDate: formData.endDate
          ? Timestamp.fromDate(new Date(formData.endDate))
          : null,
        okrs: formData.okrs,
      });
      setFormData({
        projectName: "",
        clientId: "",
        clientName: "",
        startDate: "",
        endDate: "",
        okrs: [{ objective: "", keyResults: [""] }],
      });
      setShowEditForm(false);
      setSelectedProject(null);
      setEditErrors({});
      toast.success("Project updated successfully!");
    } catch (err) {
      console.error("Update project failed", err);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteClick = (id) => {
    const project = projects.find((p) => p.id === id);
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const handleDelete = async (id) => {
    try {
      const projectRef = doc(db, "projects", id);
      await deleteDoc(projectRef);
      setShowDeleteModal(false);
      setSelectedProject(null);
      toast.success("Project deleted successfully!");
    } catch (err) {
      console.error("Delete project failed:", err);
      toast.error(`Failed to delete project: ${err.message}`);
    }
  };

  const handleView = (id) => {
    const project = projectsWithDerived.find((p) => p.id === id);
    setSelectedProject(project);
    setShowViewModal(true);
  };

  const KanbanView = () => {
    const statusColumns = {
      "Not Started": filteredProjects.filter((p) => p.progress === 0),
      "In Progress": filteredProjects.filter(
        (p) => p.progress > 0 && p.progress < 100
      ),
      Completed: filteredProjects.filter((p) => p.progress === 100),
    };

    const getStatusColor = (status) => {
      switch (status) {
        case "Completed":
          return "border-green-200 bg-green-50";
        case "In Progress":
          return "border-blue-200 bg-blue-50";
        case "Not Started":
          return "border-yellow-200 bg-yellow-50";
        default:
          return "border-gray-200 bg-gray-50";
      }
    };

    const getProgressColor = (progress) => {
      if (progress === 0) return "bg-gray-400";
      if (progress < 30) return "bg-red-500";
      if (progress < 70) return "bg-yellow-500";
      if (progress < 100) return "bg-blue-500";
      return "bg-green-500";
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(statusColumns).map(([status, projects]) => (
          <div
            key={status}
            className={`rounded-lg border-2 ${getStatusColor(
              status
            )} p-4 flex flex-col`}
          >
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between flex-shrink-0">
              {status}
              <span className="text-sm bg-white px-2 py-1 rounded-full">
                {projects.length}
              </span>
            </h3>
            <div
              className={`space-y-3 ${
                projects.length > 4
                  ? "max-h-[750px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  : ""
              }`}
            >
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex-shrink-0"
                >
                  <h4 className="font-medium text-gray-900 mb-2">
                    {project.projectName}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Client: {project.clientName}
                  </p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(
                          project.progress
                        )}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    <div>Start: {project.startDate}</div>
                    <div>End: {project.endDate}</div>
                    <div className="mt-1 text-gray-600 text-xs">
                      <strong>Obj:</strong>{" "}
                      {project.okrs?.[0]?.objective?.substring(0, 30) ||
                        "No objective"}
                      ...
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleView(project.id)}
                      className="p-1 rounded text-indigo-600 hover:bg-indigo-100"
                      title="View Details"
                    >
                      <FaEye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleEdit(project.id)}
                      className="p-1 rounded text-yellow-600 hover:bg-yellow-100"
                      title="Edit Project"
                    >
                      <FaEdit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project.id)}
                      className="p-1 rounded text-red-600 hover:bg-red-100"
                      title="Delete Project"
                    >
                      <FaTrash className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No projects in {status.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div>
        <PageHeader title="Manage Projects">
          Search and manage all company projects and their progress.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Search & Actions">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
            </div>
          </Card>
          <Card title="Project List">
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
    <>
      <div>
        <PageHeader title="Manage Projects">
          Search and manage all company projects and their progress.
        </PageHeader>

        <div className="space-y-6">
          <Card
            title="Search & Actions"
            actions={
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-medium text-content-secondary"
                  aria-live="polite"
                >
                  Showing {filteredProjects.length} records
                </span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded transition-colors ${
                      viewMode === "table"
                        ? "bg-white text-indigo-600 shadow"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    title="List View"
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-2 rounded transition-colors ${
                      viewMode === "kanban"
                        ? "bg-white text-indigo-600 shadow"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    title="Kanban View"
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                  <FaPlus className="h-4 w-4" aria-hidden="true" />
                  Add Project
                </Button>
              </div>
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
                  />
                </div>
              </label>
            </div>
            <div className="mt-4 flex gap-3 sm:hidden">
              <Button onClick={() => setShowAddForm(true)} className="flex-1">
                <FaPlus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
          </Card>

          {viewMode === "table" ? (
            <Card title="Project List">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
                <div className="text-sm text-content-secondary">
                  Page {Math.min(currentPage, totalPages)} of {totalPages}
                </div>
                <div className="flex items-center gap-3">
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
                      disabled={
                        currentPage === totalPages || !filteredProjects.length
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                  <caption className="sr-only">
                    Filtered project records with search and pagination controls
                  </caption>
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
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
                            className="group px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200"
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
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {currentRows.map((project, index) => (
                      <tr key={project.id} className="bg-white">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-500">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                            {indexOfFirstRow + index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          <span>{project.projectName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          <span>{project.clientName}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3 min-w-[120px]">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  project.progress === 0
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
                            <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                              {project.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></div>
                            {project.startDate}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></div>
                            {project.endDate}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleView(project.id)}
                              className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 shadow-md"
                              title="View Details"
                            >
                              <FaEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(project.id)}
                              className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md"
                              title="Edit Project"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(project.id)}
                              className="p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md"
                              title="Delete Project"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
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
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center mb-4 animate-pulse">
                              <FaSearch className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">
                              No Projects Found
                            </h3>
                            <p className="text-sm text-gray-500">
                              No projects match the selected filters. Adjust
                              your search or try resetting filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card title="Project Kanban Board">
              <KanbanView />
            </Card>
          )}

          {/* Modals */}
          <AddProjectModal
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            handleFormSubmit={handleFormSubmit}
            errors={addErrors}
            setErrors={setAddErrors}
          />

          <EditProjectModal
            showEditForm={showEditForm}
            setShowEditForm={setShowEditForm}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            handleEditSubmit={handleEditSubmit}
            errors={editErrors}
            setErrors={setEditErrors}
            hasChanges={hasEditChanges}
          />

          <ViewProjectModal
            showViewModal={showViewModal}
            setShowViewModal={setShowViewModal}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
          />

          <DeleteProjectModal
            showDeleteModal={showDeleteModal}
            setShowDeleteModal={setShowDeleteModal}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            handleDelete={handleDelete}
          />
        </div>
      </div>
    </>
  );
}

export default ManageProjects;

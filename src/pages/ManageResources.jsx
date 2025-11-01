// src/pages/FindVotersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaFilter,
  FaTimes,
} from "react-icons/fa";
import {
  HiOutlineArrowDownTray,
  HiMiniArrowPath,
  HiXMark,
} from "react-icons/hi2";
// Excel export not used on this page currently
import toast from "react-hot-toast";
import { db } from "../firebase";
import { app as primaryApp } from "../firebase";
import { getApps, getApp, initializeApp as initApp } from "firebase/app";
import {
  getAuth as getAuthMod,
  createUserWithEmailAndPassword,
  signOut as signOutMod,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

// Removed placeholder data; now loading users/resources from Firestore

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "fullName", label: "Full Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "mobile", label: "Mobile", sortable: true },
  { key: "resourceType", label: "Resource Type", sortable: true },
  { key: "joinDate", label: "Join Date", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];
// --- End Placeholder Data ---

function ManageResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  // State for search, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all"); // all, In-house, Outsourced
  const [sortConfig, setSortConfig] = useState({
    key: "fullName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    resourceType: "In-house",
  });

  // Subscribe to Firestore users collection
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Map to resource shape expected by UI
      const mapped = list.map((u) => ({
        id: u.id,
        fullName: u.name || u.fullName || "",
        email: u.email || "",
        mobile: u.mobile || u.phone || "",
        resourceType: u.resourceType || "In-house",
        joinDate: u.joinDate || "",
        status: u.status || "Active",
        department: u.department || "",
        skills: u.skills || "",
      }));
      setResources(mapped);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredResources = useMemo(() => {
    let result = [...resources];

    // Filter by search term
    if (searchTerm) {
      const normalisedTerm = searchTerm.trim().toLowerCase();
      result = result.filter(
        (resource) =>
          resource.fullName.toLowerCase().includes(normalisedTerm) ||
          resource.email.toLowerCase().includes(normalisedTerm)
      );
    }

    // Filter by resource type
    if (resourceTypeFilter !== "all") {
      result = result.filter(
        (resource) => resource.resourceType === resourceTypeFilter
      );
    }

    // Sort results
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
  }, [resources, searchTerm, resourceTypeFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, resourceTypeFilter, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResources.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredResources.slice(
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

  // const handleReset = () => {
  //   setSearchTerm("");
  //   setSortConfig({ key: "fullName", direction: "asc" });
  //   setRowsPerPage(10);
  //   setCurrentPage(1);
  // };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.mobile ||
      !formData.password
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      // Create Firebase Auth user on a secondary app to avoid switching admin session
      const secondaryName = "Secondary";
      const secondaryApp = getApps().some((a) => a.name === secondaryName)
        ? getApp(secondaryName)
        : initApp(primaryApp.options, secondaryName);
      const secondaryAuth = getAuthMod(secondaryApp);
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );
      const uid = cred.user.uid;

      // Create Firestore user profile with uid
      await setDoc(doc(db, "users", uid), {
        name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        resourceType: formData.resourceType,
        role: "resource", // Resources/employees
        status: "Active",
        joinDate: new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp(),
        // ⚠️ WARNING: Storing password in plain text - DEVELOPMENT ONLY!
        // Remove this field before deploying to production
        devPassword: formData.password,
      });

      // Sign out secondary session
      await signOutMod(secondaryAuth);

      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        resourceType: "In-house",
      });
      setShowAddForm(false);
      toast.success("Resource added successfully!");
    } catch (err) {
      console.error("Add user failed", err);
      toast.error("Failed to add resource");
    }
  };

  const handleEdit = (id) => {
    const resource = resources.find((r) => r.id === id);
    setSelectedResource(resource);
    setFormData({
      fullName: resource.fullName,
      email: resource.email,
      mobile: resource.mobile,
      password: "",
      resourceType: resource.resourceType,
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.mobile) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", selectedResource.id), {
        name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        resourceType: formData.resourceType,
        role: "resource", // Resources/employees
      });
      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        resourceType: "In-house",
      });
      setShowEditForm(false);
      setSelectedResource(null);
      toast.success("Resource updated successfully!");
    } catch (err) {
      console.error("Update user failed", err);
      toast.error("Failed to update resource");
    }
  };

  const handleDelete = (id) => {
    const resource = resources.find((r) => r.id === id);
    setSelectedResource(resource);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "users", selectedResource.id));
      setShowDeleteModal(false);
      setSelectedResource(null);
      toast.success("Resource deleted successfully!");
    } catch (err) {
      console.error("Delete user failed", err);
      toast.error("Failed to delete resource");
    }
  };

  const handleView = (id) => {
    const resource = resources.find((r) => r.id === id);
    setSelectedResource(resource);
    setShowViewModal(true);
  };

  // Export function intentionally omitted; add back if needed with ExcelJS

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

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div>
        <PageHeader title="Manage Resources">
          Search and manage all company resources/Emploeyees.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Search & Actions">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
            </div>
          </Card>
          <Card title="Resource List">
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
        <PageHeader title="Manage Resources">
          Search and manage all company resources and team members.
        </PageHeader>
        {/* Remove blur effect from main content */}
        <div className="space-y-6">
          <Card
            title="Search & Actions"
            actions={
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-medium text-content-secondary"
                  aria-live="polite"
                >
                  Showing {filteredResources.length} records
                </span>
                <Button onClick={() => setShowAddForm(true)}>
                  <FaPlus className="h-4 w-4" aria-hidden="true" />
                  Add Resource
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Search by name or email
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                    <FaSearch className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. John Doe or john@company.com"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Filter by Resource Type
                <select
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                  className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                >
                  <option value="all">All Resources</option>
                  <option value="In-house">In-house Only</option>
                  <option value="Outsourced">Outsourced Only</option>
                </select>
              </label>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || resourceTypeFilter !== "all") && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t mt-4">
                <FaFilter className="text-indigo-600 h-4 w-4" />
                <span className="text-sm font-medium text-gray-600">
                  Active filters:
                </span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm("")}
                      className="hover:bg-indigo-200 rounded-full p-0.5"
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {resourceTypeFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Type: {resourceTypeFilter}
                    <button
                      onClick={() => setResourceTypeFilter("all")}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setResourceTypeFilter("all");
                  }}
                  className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            <div className="mt-4 flex gap-3 sm:hidden">
              <Button onClick={() => setShowAddForm(true)} className="flex-1">
                <FaPlus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
          </Card>

          <Card title="Resource List">
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
                      currentPage === totalPages || !filteredResources.length
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
                  Filtered resource records with search and pagination controls
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
                  {currentRows.map((resource, index) => (
                    <tr key={resource.id} className="bg-white">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-500">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                          {indexOfFirstRow + index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        <span>{resource.fullName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                          {resource.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div>
                          {resource.mobile}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            resource.resourceType === "In-house"
                              ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300"
                              : "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              resource.resourceType === "In-house"
                                ? "bg-blue-500"
                                : "bg-orange-500"
                            }`}
                          ></div>
                          {resource.resourceType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></div>
                          {resource.joinDate}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleView(resource.id)}
                            className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 shadow-md"
                            title="View Details"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(resource.id)}
                            className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md"
                            title="Edit Resource"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md"
                            title="Delete Resource"
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
                            No Resources Found
                          </h3>
                          <p className="text-sm text-gray-500">
                            No resources match the selected filters. Adjust your
                            search or try resetting filters.
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
      </div>

      {/* All modals with fixed positioning using z-[9999] and bg-black/10 */}
      {showAddForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]">
            {/* Add Resource Modal Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-content-primary">
                  Add New Resource
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Full Name *
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Email *
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Mobile *
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Password *
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                    Resource Type
                    <select
                      value={formData.resourceType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resourceType: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    >
                      <option value="In-house">In-house</option>
                      <option value="Outsourced">Outsourced</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit">Add Resource</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Similar structure for edit, view, and delete modals */}
      {showEditForm && selectedResource && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]">
            {/* Edit Resource Modal Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-content-primary">
                  Edit Resource
                </h2>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedResource(null);
                    setFormData({
                      fullName: "",
                      email: "",
                      mobile: "",
                      password: "",
                      resourceType: "In-house",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Full Name *
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Email *
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Mobile *
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Password (leave blank to keep current)
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                    Resource Type
                    <select
                      value={formData.resourceType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resourceType: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    >
                      <option value="In-house">In-house</option>
                      <option value="Outsourced">Outsourced</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit">Update Resource</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedResource(null);
                      setFormData({
                        fullName: "",
                        email: "",
                        mobile: "",
                        password: "",
                        resourceType: "In-house",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedResource && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
            {/* View Resource Modal Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-content-primary">
                  Resource Details
                </h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedResource(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-content-secondary">
                      Full Name
                    </label>
                    <p className="text-content-primary font-medium">
                      {selectedResource.fullName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content-secondary">
                      Email
                    </label>
                    <p className="text-content-primary">
                      {selectedResource.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content-secondary">
                      Mobile
                    </label>
                    <p className="text-content-primary">
                      {selectedResource.mobile}
                    </p>
                  </div>
                  {selectedResource.devPassword && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                        <span>⚠️ Password (Dev Only)</span>
                      </label>
                      <p className="text-content-primary font-mono font-semibold">
                        {selectedResource.devPassword}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Remove this field before production deployment
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-content-secondary">
                      Resource Type
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedResource.resourceType === "In-house"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {selectedResource.resourceType}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content-secondary">
                      Join Date
                    </label>
                    <p className="text-content-primary">
                      {selectedResource.joinDate}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedResource(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Outside blurred container */}
      {showDeleteModal && selectedResource && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <DeleteConfirmationModal
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedResource(null);
            }}
            onConfirm={confirmDelete}
          />
        </div>
      )}
    </>
  );
}

export default ManageResources;

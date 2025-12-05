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
  FaCheckCircle,
  FaUsers,
  FaUserTie,
} from "react-icons/fa";
import { HiOutlineArrowDownTray, HiMiniArrowPath } from "react-icons/hi2";
// Excel export not used on this page currently
import toast from "react-hot-toast";
import { db, app as primaryApp } from "../../firebase";
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
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import AddResourceModal from "../../components/AddResourceModal";
import EditResourceModal from "../../components/EditResourceModal";
import ViewResourceModal from "../../components/ViewResourceModal";

// Removed placeholder data; now loading users/resources from Firestore

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "image", label: "Avatar", sortable: false },
  { key: "fullName", label: "Full Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "mobile", label: "Contact NO", sortable: false },
  { key: "resourceType", label: "Resource Type", sortable: true },
  { key: "resourceRole", label: "Resource Role", sortable: true },
  { key: "status", label: "Status", sortable: true },
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
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialEditData, setInitialEditData] = useState(null);

  // State for search, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all"); // all, In-house, Outsourced
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all"); // all, Full-time, Part-time
  const [statusFilter, setStatusFilter] = useState("all"); // all, Active, Inactive
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
    employmentType: "Full-time",
    resourceRole: "",
    resourceRoleType: "",
    status: "Active",
    imageUrl: "",
  });

  // State for image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // Server-side field errors for add resource flow
  const [createFieldErrors, setCreateFieldErrors] = useState({});

  // Add new state for active stat filter
  const [activeStatFilter, setActiveStatFilter] = useState(null);

  const anyModalOpen =
    showAddForm || showEditForm || showViewModal || showDeleteModal;

  useEffect(() => {
    if (anyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    document.body.style.overflow = "";
  }, [anyModalOpen]);

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
        employmentType: u.employmentType || "Full-time",
        resourceRole: u.resourceRole || "",
        resourceRoleType: u.resourceRoleType || "",
        imageUrl: u.imageUrl || "",
        devPassword: u.devPassword || "",
      }));
      setResources(mapped);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Update filteredResources useMemo to include stat filter
  const filteredResources = useMemo(() => {
    let result = [...resources];

    // Apply active stat filter first
    if (activeStatFilter === "active") {
      result = result.filter((resource) => resource.status === "Active");
    } else if (activeStatFilter === "in-house") {
      result = result.filter(
        (resource) => resource.resourceType === "In-house"
      );
    } else if (activeStatFilter === "outsourced") {
      result = result.filter(
        (resource) => resource.resourceType === "Outsourced"
      );
    }

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

    // Filter by employment type
    if (employmentTypeFilter !== "all") {
      result = result.filter(
        (resource) => resource.employmentType === employmentTypeFilter
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((resource) => resource.status === statusFilter);
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
  }, [
    resources,
    searchTerm,
    resourceTypeFilter,
    employmentTypeFilter,
    statusFilter,
    sortConfig,
    activeStatFilter,
  ]);

  // Clear active stat filter when other filters change
  useEffect(() => {
    if (
      searchTerm ||
      resourceTypeFilter !== "all" ||
      employmentTypeFilter !== "all" ||
      statusFilter !== "all"
    ) {
      setActiveStatFilter(null);
    }
  }, [searchTerm, resourceTypeFilter, employmentTypeFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    resourceTypeFilter,
    employmentTypeFilter,
    statusFilter,
    sortConfig,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResources.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredResources.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const hasEditChanges = useMemo(() => {
    if (!initialEditData) return false;
    const fields = [
      "fullName",
      "email",
      "mobile",
      "resourceType",
      "employmentType",
      "resourceRole",
      "resourceRoleType",
      "status",
      "imageUrl",
    ];
    const changed = fields.some((field) => {
      const nextValue = formData[field] ?? "";
      const initialValue = initialEditData[field] ?? "";
      return nextValue !== initialValue;
    });
    return changed || Boolean(imageFile);
  }, [formData, initialEditData, imageFile]);

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

  // Handle image file selection and convert to base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 1MB for Firestore)
      if (file.size > 1024 * 1024) {
        toast.error("Image size should be less than 1MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setImageFile(base64String); // Store base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const mapAuthError = (code) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email is already in use";
      case "auth/invalid-email":
        return "Enter a valid email address";
      case "auth/weak-password":
        return "Password is too weak";
      default:
        return "Failed to create account";
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setCreateFieldErrors({});

    try {
      // Use the existing Firebase app configuration
      let secondaryApp;

      // Get the config from the primary app
      const primaryAppConfig = primaryApp.options;

      try {
        secondaryApp = getApp("secondary");
      } catch (err) {
        // Initialize secondary app with the same config as primary
        secondaryApp = initApp(primaryAppConfig, "secondary");
      }

      const secondaryAuth = getAuthMod(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Sign out from secondary app immediately so it doesn't interfere
      await signOutMod(secondaryAuth);

      // 2. Create User Document in Firestore
      const newUser = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.mobile,
        resourceType: formData.resourceType,
        employmentType: formData.employmentType,
        resourceRole: formData.resourceRole,
        resourceRoleType: formData.resourceRoleType,
        status: formData.status,
        imageUrl: imageFile || "",
        role: "member",
        createdAt: serverTimestamp(),
        joinDate: new Date().toISOString().split("T")[0],
        devPassword: formData.password,
      };

      await setDoc(doc(db, "users", user.uid), newUser);

      toast.success("Resource added successfully");
      setShowAddForm(false);
      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        resourceType: "In-house",
        employmentType: "Full-time",
        resourceRole: "",
        resourceRoleType: "",
        status: "Active",
        imageUrl: "",
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error adding resource:", error);
      if (error.code && error.code.startsWith("auth/")) {
        const msg = mapAuthError(error.code);
        if (error.code === "auth/email-already-in-use") {
          setCreateFieldErrors((prev) => ({ ...prev, email: msg }));
        } else if (error.code === "auth/invalid-email") {
          setCreateFieldErrors((prev) => ({ ...prev, email: msg }));
        } else if (error.code === "auth/weak-password") {
          setCreateFieldErrors((prev) => ({ ...prev, password: msg }));
        } else {
          setCreateFieldErrors((prev) => ({ ...prev, _general: msg }));
        }
      } else {
        toast.error("Failed to add resource");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = (resource) => {
    setSelectedResource(resource);
    const editData = {
      fullName: resource.fullName,
      email: resource.email,
      mobile: resource.mobile,
      password: "", // Don't populate password
      resourceType: resource.resourceType,
      employmentType: resource.employmentType,
      resourceRole: resource.resourceRole,
      resourceRoleType: resource.resourceRoleType,
      status: resource.status,
      imageUrl: resource.imageUrl,
    };
    setFormData(editData);
    setInitialEditData(editData);
    setImagePreview(resource.imageUrl);
    setImageFile(null); // Reset new file
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;
    setIsUpdating(true);

    try {
      const userRef = doc(db, "users", selectedResource.id);
      const updates = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.mobile,
        resourceType: formData.resourceType,
        employmentType: formData.employmentType,
        resourceRole: formData.resourceRole,
        resourceRoleType: formData.resourceRoleType,
        status: formData.status,
        updatedAt: serverTimestamp(),
      };

      if (imageFile) {
        updates.imageUrl = imageFile;
      } else if (formData.imageUrl === "") {
        updates.imageUrl = ""; // Image removed
      }

      if (formData.password) {
        updates.devPassword = formData.password;
        // Note: Updating Auth password requires admin SDK or re-auth,
        // which is complex on client. For now just updating Firestore ref.
        toast(
          "Password updated in record only (Auth update requires re-login)",
          {
            icon: "ℹ️",
          }
        );
      }

      await updateDoc(userRef, updates);

      toast.success("Resource updated successfully");
      setShowEditForm(false);
      setSelectedResource(null);
      setInitialEditData(null);
    } catch (error) {
      console.error("Error updating resource:", error);
      toast.error("Failed to update resource");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (resource) => {
    setSelectedResource(resource);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedResource) return;
    setIsDeleting(true);

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "users", selectedResource.id));
      // Note: Cannot delete from Auth without Admin SDK
      toast.success("Resource deleted from database");
      setShowDeleteModal(false);
      setSelectedResource(null);
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (resource) => {
    setSelectedResource(resource);
    setShowViewModal(true);
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return (
        <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-50">
          ↕
        </span>
      );
    }
    return sortConfig.direction === "asc" ? (
      <FaSortAmountUpAlt className="ml-1 h-3 w-3 text-indigo-500" />
    ) : (
      <FaSortAmountDownAlt className="ml-1 h-3 w-3 text-indigo-500" />
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Manage Resources"
        description="Search and manage all company resources and team members."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Resources Card */}
        <div
          onClick={() => {
            setActiveStatFilter(null);
            setSearchTerm("");
            setResourceTypeFilter("all");
            setEmploymentTypeFilter("all");
            setStatusFilter("all");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total Resources
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {resources.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200/50 flex items-center justify-center">
                <FaPlus className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Card */}
        <div
          onClick={() => {
            setActiveStatFilter("active");
            setSearchTerm("");
            setResourceTypeFilter("all");
            setEmploymentTypeFilter("all");
            setStatusFilter("all");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {resources.filter((r) => r.status === "Active").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-200/50 flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* In-house Card */}
        <div
          onClick={() => {
            setActiveStatFilter("in-house");
            setSearchTerm("");
            setResourceTypeFilter("all");
            setEmploymentTypeFilter("all");
            setStatusFilter("all");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">In-house</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {
                    resources.filter((r) => r.resourceType === "In-house")
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-200/50 flex items-center justify-center">
                <FaUsers className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Outsourced Card */}
        <div
          onClick={() => {
            setActiveStatFilter("outsourced");
            setSearchTerm("");
            setResourceTypeFilter("all");
            setEmploymentTypeFilter("all");
            setStatusFilter("all");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-orange-500 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Outsourced
                </p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  {
                    resources.filter((r) => r.resourceType === "Outsourced")
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-200/50 flex items-center justify-center">
                <FaUserTie className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-6">
          <Card className="p-4">
            {/* Search & Actions Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Search & Actions
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Showing {filteredResources.length} records
                  </span>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center justify-center gap-2"
                  >
                    <FaPlus className="h-4 w-4" />
                    Add Resource
                  </Button>
                </div>
              </div>
              <hr className="border-gray-200" />
            </div>

            {/* Search and Filters Row */}
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by name or email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. John Doe or john@company.com"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Employment Type Filter */}
              <div className="w-full lg:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={employmentTypeFilter}
                  onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm"
                >
                  <option value="all">All Employment</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>

              {/* Resource Type Filter */}
              <div className="w-full lg:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type
                </label>
                <select
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm"
                >
                  <option value="all">All Types</option>
                  <option value="In-house">In-house</option>
                  <option value="Outsourced">Outsourced</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full lg:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm ||
              employmentTypeFilter !== "all" ||
              resourceTypeFilter !== "all" ||
              statusFilter !== "all") && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setEmploymentTypeFilter("all");
                    setResourceTypeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <FaTimes className="h-3 w-3" /> Clear Filters
                </button>
              </div>
            )}
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

            <div className="w-full max-h-[65vh] overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full divide-y divide-gray-200 bg-white">
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
                          className={`group px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 whitespace-nowrap align-middle ${
                            header.key === "actions"
                              ? "sticky right-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100"
                              : ""
                          }`}
                        >
                          {header.sortable ? (
                            <button
                              type="button"
                              onClick={() => handleSort(header.key)}
                              className="flex items-center gap-2 text-left hover:text-indigo-600 transition-colors duration-200"
                            >
                              <span>{header.label}</span>
                              <span className="transition-colors duration-200">
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
                    <tr
                      key={resource.id}
                      className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleView(resource)}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-500">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs">
                          {indexOfFirstRow + index + 1}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {resource.imageUrl ? (
                          <img
                            src={resource.imageUrl}
                            alt={resource.fullName}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                            {resource.fullName?.charAt(0)?.toUpperCase() || "R"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 max-w-xs">
                        <span
                          className="block truncate"
                          title={resource.fullName || ""}
                        >
                          {resource.fullName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-xs">
                        <div className="flex items-center max-w-xs">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                          <span
                            className="flex-1 min-w-0 truncate"
                            title={resource.email || ""}
                          >
                            {resource.email}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1">
                          {/* <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div> */}
                          {resource.mobile}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                            resource.resourceType === "In-house"
                              ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300"
                              : "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              resource.resourceType === "In-house"
                                ? "bg-blue-500"
                                : "bg-orange-500"
                            }`}
                          ></div>
                          {resource.resourceType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 max-w-xs">
                        <span
                          className="block truncate"
                          title={resource.resourceRole || "-"}
                        >
                          {resource.resourceRole || "-"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                            resource.status === "Active"
                              ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300"
                              : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              resource.status === "Active"
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }`}
                          ></div>
                          {resource.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm sticky right-0 z-10 bg-white">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(resource);
                            }}
                            className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md"
                            title="Edit Resource"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(resource);
                            }}
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

      {/* Modals */}
      <AddResourceModal
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleAddSubmit}
        onClose={() => setShowAddForm(false)}
        imagePreview={imagePreview}
        onImageChange={handleImageChange}
        onImageRemove={() => {
          setImageFile(null);
          setImagePreview(null);
        }}
        existingEmails={resources.map((r) => r.email.toLowerCase())}
        serverErrors={createFieldErrors}
        clearServerError={(field) =>
          setCreateFieldErrors((prev) => ({ ...prev, [field]: "" }))
        }
        isSubmitting={isAdding}
      />

      <EditResourceModal
        showEditForm={showEditForm}
        setShowEditForm={setShowEditForm}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setShowEditForm(false);
          setSelectedResource(null);
        }}
        imagePreview={imagePreview}
        onImageChange={handleImageChange}
        onImageRemove={() => {
          setImageFile(null);
          setImagePreview(null);
        }}
        existingEmails={resources
          .filter((r) => r.id !== selectedResource?.id)
          .map((r) => r.email.toLowerCase())}
        isSubmitting={isUpdating}
        hasChanges={hasEditChanges}
      />

      {selectedResource && showViewModal && (
        <ViewResourceModal
          resource={selectedResource}
          onClose={() => {
            setShowViewModal(false);
            setSelectedResource(null);
          }}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <DeleteConfirmationModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConfirm}
            title="Delete Resource"
            description={`Are you sure you want to delete ${selectedResource?.fullName}?`}
            permanentMessage="This action cannot be undone."
            isLoading={isDeleting}
            confirmLabel="Delete"
            cancelLabel="Cancel"
          />
        </div>
      )}
    </div>
  );
}

export default ManageResources;

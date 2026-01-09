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
import { db, app as primaryApp, functions, storage } from "../../firebase";
import { getApps, getApp, initializeApp as initApp } from "firebase/app";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
import { httpsCallable } from "firebase/functions";

// Reusable UI Components
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import AddResourceModal from "../../components/AddResourceModal";
import EditResourceModal from "../../components/EditResourceModal";
import ViewResourceModal from "../../components/ViewResourceModal";
import { useThemeStyles } from "../../hooks/useThemeStyles";

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

function ManageResources() {
  const { buttonClass } = useThemeStyles();
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
    imageStoragePath: "",
    mustChangePassword: true,
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
        imageStoragePath: u.imageStoragePath || "",
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
    const passwordChanged = formData.password && formData.password.trim() !== "";
    return changed || Boolean(imageFile) || passwordChanged;
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

  // Handle image file selection and convert to base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please select JPG, PNG, WebP or GIF');
      return;
    }

    // Allow up to 10MB
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setImageFile(base64String); // Store base64 string
    };
    reader.readAsDataURL(file);
  };

  // Remove current profile photo (mark change locally; commit on Update)
  const handleRemoveImage = () => {
    // Clear local preview and mark image as removed
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
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

    // Password validation regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setCreateFieldErrors((prev) => ({
        ...prev,
        password:
          "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-).",
      }));
      setIsAdding(false);
      return;
    }

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

      const normalisedEmail = formData.email?.toLowerCase().trim() || "";

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalisedEmail,
        formData.password
      );
      const user = userCredential.user;

      // Sign out from secondary app immediately so it doesn't interfere
      await signOutMod(secondaryAuth);

      // 2. Upload avatar to Storage (if provided) and create User Document in Firestore
      let uploadedUrl = "";
      let storagePath = "";
      if (imageFile) {
        try {
          const blob = await (await fetch(imageFile)).blob();
          const mime = blob.type || "image/png";
          const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png");
          const path = `profiles/resource/${normalisedEmail}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, blob, { contentType: mime });
          uploadedUrl = await getDownloadURL(storageRef);
          storagePath = path;
        } catch (uploadErr) {
          console.error("Failed to upload resource avatar:", uploadErr);
        }
      }

      const newUser = {
        name: formData.fullName,
        email: normalisedEmail,
        phone: formData.mobile,
        resourceType: formData.resourceType,
        employmentType: formData.employmentType,
        resourceRole: formData.resourceRole,
        resourceRoleType: formData.resourceRoleType,
        status: formData.status,
        imageUrl: uploadedUrl,
        imageStoragePath: storagePath,
        role: formData.resourceRoleType || "member",
        createdAt: serverTimestamp(),
        joinDate: serverTimestamp(),
        devPassword: formData.password,
        mustChangePassword: formData.mustChangePassword,
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
        imageStoragePath: "",
        mustChangePassword: true,
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
      imageStoragePath: resource.imageStoragePath || "",
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
      if (formData.password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
          toast.error("Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-).");
          setIsUpdating(false);
          return;
        }
      }

      const userRef = doc(db, "users", selectedResource.id);
      const normalisedEmail = formData.email?.toLowerCase().trim() || "";
      const updates = {
        name: formData.fullName,
        email: normalisedEmail,
        phone: formData.mobile,
        resourceType: formData.resourceType,
        employmentType: formData.employmentType,
        resourceRole: formData.resourceRole,
        resourceRoleType: formData.resourceRoleType,
        role: formData.resourceRoleType || "member", // Auto-update role based on hierarchy type
        status: formData.status,
        updatedAt: serverTimestamp(),
      };

      if (imageFile) {
        try {
          // Delete all existing profile image variants before uploading new one
          const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          for (const ext of extensions) {
            const oldPath = `profiles/resource/${normalisedEmail}.${ext}`;
            try {
              await deleteObject(ref(storage, oldPath));
              console.log(`Deleted old resource image: ${oldPath}`);
            } catch (err) {
              // Silently ignore - file might not exist
            }
          }

          const blob = await (await fetch(imageFile)).blob();
          const mime = blob.type || "image/png";
          const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png");
          const path = `profiles/resource/${normalisedEmail}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, blob, { contentType: mime });
          const url = await getDownloadURL(storageRef);
          updates.imageUrl = url;
          updates.imageStoragePath = path;
        } catch (uploadErr) {
          console.error("Failed to upload resource avatar:", uploadErr);
        }
      } else if (formData.imageUrl === "") {
        // Image removed: delete from Storage and clear Firestore fields
        const oldPath = selectedResource.imageStoragePath || formData.imageStoragePath || "";
        if (oldPath) {
          try { await deleteObject(ref(storage, oldPath)); } catch (delErr) { console.warn("Failed to delete avatar from storage:", delErr); }
        }
        updates.imageUrl = "";
        updates.imageStoragePath = "";
      }

      if (formData.password) {
        updates.devPassword = formData.password;

        // Call Cloud Function to update Auth password
        try {
          const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
          await updateUserPassword({ uid: selectedResource.id, password: formData.password });
          toast.success("Password updated in Auth system");
        } catch (authError) {
          console.error("Failed to update Auth password:", authError);
          toast.error(`Failed to update Auth password: ${authError.message}`);
        }
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
      // 1. Delete from Auth (Cloud Function)
      try {
        const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');
        await deleteUserAuth({ uid: selectedResource.id });
        console.log("Auth deletion successful");
      } catch (authError) {
        console.error("Auth deletion failed:", authError);
        // Continue to delete from Firestore even if Auth delete fails
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, "users", selectedResource.id));

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
          <div className="bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-blue-500/30 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">
                  Total Resources
                </p>
                <p className="text-3xl font-bold text-blue-900 [.dark_&]:text-blue-100 mt-1">
                  {resources.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 [.dark_&]:bg-blue-500/20 flex items-center justify-center">
                <FaPlus className="text-blue-600 [.dark_&]:text-blue-400 text-xl" />
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
          <div className="bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-green-500/30 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">Active</p>
                <p className="text-3xl font-bold text-green-900 [.dark_&]:text-green-100 mt-1">
                  {resources.filter((r) => r.status === "Active").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" />
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
          <div className="bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-purple-500/30 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">In-house</p>
                <p className="text-3xl font-bold text-purple-900 [.dark_&]:text-purple-100 mt-1">
                  {
                    resources.filter((r) => r.resourceType === "In-house")
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 [.dark_&]:bg-purple-500/20 flex items-center justify-center">
                <FaUsers className="text-purple-600 [.dark_&]:text-purple-400 text-xl" />
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
          <div className="bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-orange-500/30 border-l-4 border-l-orange-500 [.dark_&]:border-l-orange-400 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 [.dark_&]:text-orange-400">
                  Outsourced
                </p>
                <p className="text-3xl font-bold text-orange-900 [.dark_&]:text-orange-100 mt-1">
                  {
                    resources.filter((r) => r.resourceType === "Outsourced")
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 [.dark_&]:bg-orange-500/20 flex items-center justify-center">
                <FaUserTie className="text-orange-600 [.dark_&]:text-orange-400 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card
          title="Search & Actions"
          actions={
            <div className="flex items-center gap-4">
              <span className="text-sm text-content-tertiary">
                Showing {filteredResources.length} records
              </span>
              <Button
                variant="custom"
                onClick={() => {
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
                    imageStoragePath: "",
                    mustChangePassword: true,
                  });
                  setImageFile(null);
                  setImagePreview(null);
                  setCreateFieldErrors({});
                  setShowAddForm(true);
                }}
                className={`flex items-center justify-center gap-2 ${buttonClass}`}
              >
                <FaPlus className="h-4 w-4" />
                Add Resource
              </Button>
            </div>
          }
        >
          {/* Search & Actions Header */}
          {/* Search and Filters Row */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-white mb-2">
                Search by name or email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-content-tertiary" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. John Doe or john@company.com"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-subtle bg-surface rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Employment Type Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Employment Type
              </label>
              <select
                value={employmentTypeFilter}
                onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {/* Resource Type Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Resource Type
              </label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Resources</option>
                <option value="In-house">In-house</option>
                <option value="Outsourced">Outsourced</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Reset Button */}
            {/* <Button
              variant="secondary"
              onClick={handleReset}
              className="mb-[2px]"
            >
              <HiMiniArrowPath className="h-5 w-5" />
            </Button> */}
          </div>
        </Card>

        <Card title="Resource List">
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500 [.dark_&]:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-4">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          <div className="w-full max-h-[65vh] overflow-x-auto overflow-y-auto rounded-lg border border-subtle shadow-sm">
            <table className="w-full divide-y divide-subtle bg-surface">
              <caption className="sr-only">
                Filtered resource records with search and pagination controls
              </caption>
              <thead className="bg-surface-subtle [.dark_&]:bg-slate-800/60">
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
                        className={`group px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 [.dark_&]:text-gray-300 border-b border-subtle whitespace-nowrap align-middle ${header.key === "actions"
                          ? "sticky right-0 z-10 bg-surface-subtle [.dark_&]:bg-slate-800/60"
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
              <tbody className="divide-y divide-subtle bg-surface">
                {currentRows.map((resource, index) => (
                  <tr
                    key={resource.id}
                    className="bg-surface hover:bg-surface-subtle [.dark_&]:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => handleView(resource)}
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-700 [.dark_&]:text-white">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-subtle text-xs">
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
                    <td className="px-3 py-3 text-sm font-semibold text-gray-900 [.dark_&]:text-white max-w-xs">
                      <span
                        className="block truncate"
                        title={resource.fullName || ""}
                      >
                        {resource.fullName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300 max-w-xs">
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
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                      <div className="flex items-center bg-gray-50 [.dark_&]:bg-slate-700/50 rounded-lg px-3 py-1">
                        {/* <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div> */}
                        {resource.mobile}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm ${resource.resourceType === "In-house"
                          ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300"
                          : "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300"
                          }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${resource.resourceType === "In-house"
                            ? "bg-blue-500"
                            : "bg-orange-500"
                            }`}
                        ></div>
                        {resource.resourceType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 [.dark_&]:text-gray-300 max-w-xs">
                      <span
                        className="block truncate"
                        title={resource.resourceRole || "-"}
                      >
                        {resource.resourceRole || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm ${resource.status === "Active"
                          ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300"
                          : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300"
                          }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${resource.status === "Active"
                            ? "bg-green-500"
                            : "bg-gray-500"
                            }`}
                        ></div>
                        {resource.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm sticky right-0 z-10 bg-white [.dark_&]:bg-slate-900">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(resource);
                          }}
                          className="p-2 rounded-full text-yellow-600 [.dark_&]:text-yellow-400 hover:bg-yellow-100 [.dark_&]:hover:bg-yellow-500/20 shadow-md"
                          title="Edit Resource"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(resource);
                          }}
                          className="p-2 rounded-full text-red-600 [.dark_&]:text-red-400 hover:bg-red-100 [.dark_&]:hover:bg-red-500/20 shadow-md"
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
                        <h3 className="text-lg font-semibold text-gray-600 [.dark_&]:text-gray-300 mb-2">
                          No Resources Found
                        </h3>
                        <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
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

      {/* Modals */}
      <AddResourceModal
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleAddSubmit}
        onClose={() => {
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
            imageStoragePath: "",
          });
          setImageFile(null);
          setImagePreview(null);
          setCreateFieldErrors({});
        }}
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
          setInitialEditData(null);
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
            imageStoragePath: "",
          });
          setImageFile(null);
          setImagePreview(null);
        }}
        imagePreview={imagePreview}
        onImageChange={handleImageChange}
        onImageRemove={handleRemoveImage}
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

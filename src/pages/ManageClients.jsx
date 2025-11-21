// src/pages/ManageClients.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";
import { HiXMark } from "react-icons/hi2";
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
  Timestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

// Firestore collection reference
const CLIENTS_COLLECTION = "clients";

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "image", label: "Image", sortable: false },
  { key: "companyName", label: "Company Name", sortable: true },
  { key: "clientName", label: "Client Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "contactNo", label: "Contact No", sortable: true },
  { key: "typeOfBusiness", label: "Business Type", sortable: true },
  { key: "noOfEmployees", label: "Employees", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];
// --- End Placeholder Data ---

function ManageClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialEditData, setInitialEditData] = useState(null);

  // State for search, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "clientName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    clientName: "",
    email: "",
    password: "",
    contactNo: "",
    typeOfBusiness: "",
    address: "",
    noOfEmployees: "",
    imageUrl: "",
    role: "client",
  });

  // State for image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // Subscribe to clients from Firestore
  useEffect(() => {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy("companyName"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() || {};
          const joinDate =
            data.joinDate instanceof Timestamp ? data.joinDate.toDate() : null;
          return {
            id: d.id,
            companyName: data.companyName || "",
            clientName: data.clientName || "",
            email: data.email || "",
            contactNo: data.contactNo || "",
            typeOfBusiness: data.typeOfBusiness || "",
            address: data.address || "",
            devPassword: data.devPassword || "******",
            noOfEmployees: data.noOfEmployees || "",
            imageUrl: data.imageUrl || "",
            role: data.role || "client",
            status: data.status || "Active",
            joinDate, // Date | null
          };
        });
        setClients(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load clients:", err);
        toast.error("Failed to load clients");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);
  console.log("Client Data : ", clients);
  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (searchTerm) {
      const normalisedTerm = searchTerm.trim().toLowerCase();
      result = result.filter(
        (client) =>
          client.clientName.toLowerCase().includes(normalisedTerm) ||
          client.companyName.toLowerCase().includes(normalisedTerm) ||
          client.email.toLowerCase().includes(normalisedTerm)
      );
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
  }, [clients, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  useEffect(() => {
    const anyModalOpen =
      showAddForm || showEditForm || showViewModal || showDeleteModal;
    if (!anyModalOpen || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showAddForm, showEditForm, showViewModal, showDeleteModal]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredClients.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const hasEditChanges = useMemo(() => {
    if (!initialEditData) return false;
    const fieldsToCompare = [
      "companyName",
      "clientName",
      "email",
      "contactNo",
      "typeOfBusiness",
      "address",
      "noOfEmployees",
      "role",
      "imageUrl",
    ];
    const dataChanged = fieldsToCompare.some((field) => {
      const nextValue = formData[field] ?? "";
      const initialValue = initialEditData[field] ?? "";
      return nextValue !== initialValue;
    });
    return dataChanged || Boolean(imageFile);
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

  // Note: Reset/export actions omitted to keep UI focused; add as needed.

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
        setImageFile(base64String); // Store base64 string instead of file object
      };
      reader.readAsDataURL(file);
    }
  };

  const validateClientForm = (data, { mode }) => {
    const errors = {};

    if (!data.companyName || !data.companyName.trim()) {
      errors.companyName = "Company name is required";
    }

    if (!data.clientName || !data.clientName.trim()) {
      errors.clientName = "Client name is required";
    }

    if (!data.email || !data.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (!emailRegex.test(data.email)) {
        errors.email = "Enter a valid email address";
      }
    }

    const contactDigits = String(data.contactNo || "").replace(/\D/g, "");
    if (!contactDigits) {
      errors.contactNo = "Contact number is required";
    } else if (contactDigits.length !== 10) {
      errors.contactNo = "Enter a valid 10-digit contact number";
    }

    if (!data.typeOfBusiness || !data.typeOfBusiness.trim()) {
      errors.typeOfBusiness = "Business type is required";
    }

    if (!data.address || !data.address.trim()) {
      errors.address = "Address is required";
    }

    if (mode === "add") {
      if (!data.password) {
        errors.password = "Password is required";
      } else if (String(data.password).length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
    }

    if (data.noOfEmployees) {
      const n = Number(data.noOfEmployees);
      if (!Number.isFinite(n) || n < 0) {
        errors.noOfEmployees = "Enter a valid non-negative number of employees";
      }
    }

    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isAdding) return;
    const errors = validateClientForm(formData, { mode: "add" });
    setAddErrors(errors);
    if (Object.keys(errors).length) {
      const firstError = Object.values(errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    try {
      setIsAdding(true);
      // Create Firebase Auth user via a secondary app instance
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

      // Create Firestore client profile with uid as doc id
      await setDoc(doc(db, CLIENTS_COLLECTION, uid), {
        companyName: formData.companyName,
        clientName: formData.clientName,
        email: formData.email,
        contactNo: formData.contactNo,
        typeOfBusiness: formData.typeOfBusiness,
        address: formData.address,
        noOfEmployees: formData.noOfEmployees,
        imageUrl: imageFile || "",
        role: formData.role || "client",
        devPassword: formData.password || "******",
        status: "Active",
        joinDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uid,
      });

      // Sign out the secondary auth session
      await signOutMod(secondaryAuth);

      setFormData({
        companyName: "",
        clientName: "",
        email: "",
        password: "",
        contactNo: "",
        typeOfBusiness: "",
        address: "",
        noOfEmployees: "",
        imageUrl: "",
        role: "client",
      });
      setImageFile(null);
      setImagePreview(null);
      setShowAddForm(false);
      toast.success("Client added successfully!");
    } catch (error) {
      console.error("Failed to add client", error);
      toast.error("Failed to add client");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setFormData({
      companyName: client.companyName,
      clientName: client.clientName,
      email: client.email,
      contactNo: client.contactNo || "",
      typeOfBusiness: client.typeOfBusiness || "",
      address: client.address || "",
      noOfEmployees: client.noOfEmployees || "",
      imageUrl: client.imageUrl || "",
      role: client.role,
    });
    setInitialEditData({
      companyName: client.companyName || "",
      clientName: client.clientName || "",
      email: client.email || "",
      contactNo: client.contactNo || "",
      typeOfBusiness: client.typeOfBusiness || "",
      address: client.address || "",
      noOfEmployees: client.noOfEmployees || "",
      imageUrl: client.imageUrl || "",
      role: client.role || "client",
    });
    // Show existing image in preview
    setImagePreview(client.imageUrl || null);
    // Set imageFile to null - will only update if user selects new image
    setImageFile(null);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient || isUpdating || !hasEditChanges) return;

    const errors = validateClientForm(formData, { mode: "edit" });
    setEditErrors(errors);
    if (Object.keys(errors).length) {
      const firstError = Object.values(errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    try {
      setIsUpdating(true);
      await updateDoc(doc(db, CLIENTS_COLLECTION, selectedClient.id), {
        companyName: formData.companyName,
        clientName: formData.clientName,
        email: formData.email,
        contactNo: formData.contactNo,
        typeOfBusiness: formData.typeOfBusiness,
        address: formData.address,
        noOfEmployees: formData.noOfEmployees,
        imageUrl: imageFile || formData.imageUrl || "",
        role: formData.role || "client",
        updatedAt: serverTimestamp(),
      });

      setFormData({
        companyName: "",
        clientName: "",
        email: "",
        contactNo: "",
        typeOfBusiness: "",
        address: "",
        noOfEmployees: "",
        imageUrl: "",
        role: "client",
      });
      setImageFile(null);
      setImagePreview(null);
      setShowEditForm(false);
      setSelectedClient(null);
      setInitialEditData(null);
      toast.success("Client updated successfully!");
    } catch (error) {
      console.error("Failed to update client", error);
      toast.error("Failed to update client");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClient || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, CLIENTS_COLLECTION, selectedClient.id));
      setShowDeleteModal(false);
      setSelectedClient(null);
      toast.success("Client deleted successfully!");
    } catch (error) {
      console.error("Failed to delete client", error);
      toast.error("Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowViewModal(true);
  };

  // Export is currently disabled; re-enable with ExcelJS if needed.

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
        <PageHeader title="Manage Clients">
          Search and manage all company clients and organizations.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Search & Actions">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
            </div>
          </Card>
          <Card title="Client List">
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
        <PageHeader title="Manage Clients">
          Search and manage all company clients and organizations.
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
                  Showing {filteredClients.length} records
                </span>
                <Button onClick={() => setShowAddForm(true)}>
                  <FaPlus className="h-4 w-4" aria-hidden="true" />
                  Add Client
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
              <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                Search by company, client name or email
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                    <FaSearch className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. TechCorp or John Doe or john@company.com"
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

          <Card title="Client List">
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
                      currentPage === totalPages || !filteredClients.length
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full max-h-[65vh] overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 bg-white">
                <caption className="sr-only">
                  Filtered client records with search and pagination controls
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
                          className={`group px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 ${
                            header.key === "actions"
                              ? "sticky right-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100"
                              : ""
                          }`}
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
                  {currentRows.map((client, index) => (
                    <tr key={client.id} className="bg-white hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-500">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs">
                          {indexOfFirstRow + index + 1}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {client.imageUrl ? (
                          <img
                            src={client.imageUrl}
                            alt={client.companyName}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                            {client.companyName?.charAt(0)?.toUpperCase() ||
                              "C"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 max-w-xs">
                        <span
                          className="block truncate"
                          title={client.companyName || ""}
                        >
                          {client.companyName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 max-w-xs">
                        <span
                          className="block truncate"
                          title={client.clientName || ""}
                        >
                          {client.clientName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-xs">
                        <div className="flex items-center max-w-xs">
                          {/* <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div> */}
                          <span
                            className="flex-1 min-w-0 truncate"
                            title={client.email || ""}
                          >
                            {client.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {client.contactNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-xs">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 max-w-xs">
                          <span
                            className="block truncate"
                            title={client.typeOfBusiness || "Not specified"}
                          >
                            {client.typeOfBusiness || "Not specified"}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 text-center">
                        {client.noOfEmployees ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {client.noOfEmployees}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm sticky right-0 z-10 bg-white">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleView(client.id)}
                            className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 shadow-md"
                            title="View Details"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(client.id)}
                            className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md"
                            title="Edit Client"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md"
                            title="Delete Client"
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
                            No Clients Found
                          </h3>
                          <p className="text-sm text-gray-500">
                            No clients match the selected filters. Adjust your
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

      {/* Add Client Modal - Fixed positioning */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowAddForm(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowAddForm(false);
          }}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-content-primary">
                  Add New Client
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={handleFormSubmit}
                className="space-y-6"
                noValidate
              >
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                    Basic Info
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Company Name *
                      <input
                        type="text"
                        value={formData.companyName}
                        placeholder="e.g. Alpha Tech Pvt Ltd"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            companyName: e.target.value,
                          });
                          if (addErrors.companyName) {
                            setAddErrors((prev) => ({
                              ...prev,
                              companyName: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.companyName
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.companyName && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.companyName}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Client Name *
                      <input
                        type="text"
                        value={formData.clientName}
                        placeholder="e.g. John Doe"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            clientName: e.target.value,
                          });
                          if (addErrors.clientName) {
                            setAddErrors((prev) => ({
                              ...prev,
                              clientName: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.clientName
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.clientName && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.clientName}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Email *
                      <input
                        type="email"
                        value={formData.email}
                        placeholder="Enter your email (used for future logins)"
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (addErrors.email) {
                            setAddErrors((prev) => ({ ...prev, email: "" }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.email ? "border-red-500" : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.email && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.email}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Contact No *
                      <input
                        type="tel"
                        value={formData.contactNo}
                        placeholder="10-digit Mobile Number"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            contactNo: e.target.value,
                          });
                          if (addErrors.contactNo) {
                            setAddErrors((prev) => ({
                              ...prev,
                              contactNo: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.contactNo
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.contactNo && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.contactNo}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-4 border-t border-subtle pt-4">
                  <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                    Business Info
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Type of Business *
                      <input
                        type="text"
                        value={formData.typeOfBusiness}
                        placeholder="e.g. SaaS, FinTech"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            typeOfBusiness: e.target.value,
                          });
                          if (addErrors.typeOfBusiness) {
                            setAddErrors((prev) => ({
                              ...prev,
                              typeOfBusiness: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.typeOfBusiness
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.typeOfBusiness && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.typeOfBusiness}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      No of Employees
                      <input
                        type="number"
                        value={formData.noOfEmployees}
                        placeholder="e.g. 250"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            noOfEmployees: e.target.value,
                          });
                          if (addErrors.noOfEmployees) {
                            setAddErrors((prev) => ({
                              ...prev,
                              noOfEmployees: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          addErrors.noOfEmployees
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      />
                      {addErrors.noOfEmployees && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.noOfEmployees}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                      Address *
                      <textarea
                        value={formData.address}
                        placeholder="Registered business address"
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          if (addErrors.address) {
                            setAddErrors((prev) => ({
                              ...prev,
                              address: "",
                            }));
                          }
                        }}
                        rows="3"
                        className={`w-full rounded-lg border ${
                          addErrors.address ? "border-red-500" : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {addErrors.address && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.address}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                      Company Logo / Image
                      <p className="text-xs text-content-tertiary">
                        PNG/JPG, max 1MB. This logo will be used in the client
                        list and details.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      />
                      {imagePreview && (
                        <div className="mt-3 flex items-center gap-4">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-14 w-14 object-cover rounded-full border border-gray-200"
                          />
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              className="text-indigo-600 hover:underline"
                              onClick={() => {
                                setImagePreview(null);
                                setImageFile(null);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-4 border-t border-subtle pt-4">
                  <h3 className="text-sm font-bold text-content-secondary uppercase tracking-wide">
                    Account & Access
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Password *
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          placeholder="Create a password"
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            });
                            if (addErrors.password) {
                              setAddErrors((prev) => ({
                                ...prev,
                                password: "",
                              }));
                            }
                          }}
                          className={`w-full rounded-lg border ${
                            addErrors.password
                              ? "border-red-500"
                              : "border-subtle"
                          } bg-surface py-2 pl-3 pr-9 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                          required
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-2 flex items-center text-content-tertiary hover:text-content-primary"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-4 w-4" />
                          ) : (
                            <FaEye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-content-tertiary">
                        Minimum 6 characters.
                      </p>
                      {addErrors.password && (
                        <p className="text-xs text-red-600 mt-1">
                          {addErrors.password}
                        </p>
                      )}
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAdding}>
                    {isAdding && <FaSpinner className="h-4 w-4 animate-spin" />}
                    {isAdding ? "Adding..." : "Add Client"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal - Fixed positioning */}
      {showEditForm && selectedClient && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setShowEditForm(false);
            setSelectedClient(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowEditForm(false);
              setSelectedClient(null);
            }
          }}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-content-primary">
                  Edit Client
                </h2>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedClient(null);
                    setFormData({
                      companyName: "",
                      clientName: "",
                      email: "",
                      password: "",
                      contactNo: "",
                      typeOfBusiness: "",
                      address: "",
                      noOfEmployees: "",
                      imageUrl: "",
                      role: "client",
                    });
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={handleEditSubmit}
                className="space-y-6"
                noValidate
              >
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
                    Basic Info
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Company Name *
                      <input
                        type="text"
                        value={formData.companyName}
                        placeholder="e.g. Alpha Tech Pvt Ltd"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            companyName: e.target.value,
                          });
                          if (editErrors.companyName) {
                            setEditErrors((prev) => ({
                              ...prev,
                              companyName: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.companyName
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.companyName && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.companyName}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Client Name *
                      <input
                        type="text"
                        value={formData.clientName}
                        placeholder="e.g. John Doe"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            clientName: e.target.value,
                          });
                          if (editErrors.clientName) {
                            setEditErrors((prev) => ({
                              ...prev,
                              clientName: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.clientName
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.clientName && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.clientName}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Email *
                      <input
                        type="email"
                        value={formData.email}
                        placeholder="Primary contact email"
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (editErrors.email) {
                            setEditErrors((prev) => ({ ...prev, email: "" }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.email ? "border-red-500" : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.email && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.email}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Contact No *
                      <input
                        type="tel"
                        value={formData.contactNo}
                        placeholder="e.g. +91 98765 43210"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            contactNo: e.target.value,
                          });
                          if (editErrors.contactNo) {
                            setEditErrors((prev) => ({
                              ...prev,
                              contactNo: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.contactNo
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.contactNo && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.contactNo}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-4 border-t border-subtle pt-4">
                  <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
                    Business Info
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Type of Business *
                      <input
                        type="text"
                        value={formData.typeOfBusiness}
                        placeholder="e.g. SaaS, FinTech"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            typeOfBusiness: e.target.value,
                          });
                          if (editErrors.typeOfBusiness) {
                            setEditErrors((prev) => ({
                              ...prev,
                              typeOfBusiness: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.typeOfBusiness
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.typeOfBusiness && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.typeOfBusiness}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      No of Employees
                      <input
                        type="number"
                        value={formData.noOfEmployees}
                        placeholder="e.g. 250"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            noOfEmployees: e.target.value,
                          });
                          if (editErrors.noOfEmployees) {
                            setEditErrors((prev) => ({
                              ...prev,
                              noOfEmployees: "",
                            }));
                          }
                        }}
                        className={`w-full rounded-lg border ${
                          editErrors.noOfEmployees
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      />
                      {editErrors.noOfEmployees && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.noOfEmployees}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                      Address *
                      <textarea
                        value={formData.address}
                        placeholder="Registered business address"
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          if (editErrors.address) {
                            setEditErrors((prev) => ({ ...prev, address: "" }));
                          }
                        }}
                        rows="3"
                        className={`w-full rounded-lg border ${
                          editErrors.address
                            ? "border-red-500"
                            : "border-subtle"
                        } bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                        required
                      />
                      {editErrors.address && (
                        <p className="text-xs text-red-600 mt-1">
                          {editErrors.address}
                        </p>
                      )}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                      Company Logo / Image
                      <p className="text-xs text-content-tertiary">
                        PNG/JPG, max 1MB. This logo will be used in the client
                        list and details.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      />
                      {imagePreview && (
                        <div className="mt-3 flex items-center gap-4">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-14 w-14 object-cover rounded-full border border-gray-200"
                          />
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              className="text-indigo-600 hover:underline"
                              onClick={() => {
                                setImagePreview(null);
                                setImageFile(null);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-4 border-t border-subtle pt-4">
                  <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
                    Account & Access
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                      Role
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => {
                          setFormData({ ...formData, role: e.target.value });
                        }}
                        className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                        readOnly
                      />
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedClient(null);
                      setInitialEditData(null);
                      setFormData({
                        companyName: "",
                        clientName: "",
                        email: "",
                        password: "",
                        contactNo: "",
                        typeOfBusiness: "",
                        address: "",
                        noOfEmployees: "",
                        imageUrl: "",
                        role: "client",
                      });
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating || !hasEditChanges}
                  >
                    {isUpdating && (
                      <FaSpinner className="h-4 w-4 animate-spin" />
                    )}
                    {isUpdating
                      ? "Saving..."
                      : hasEditChanges
                      ? "Update Client"
                      : "No changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Client Modal - Fixed positioning */}
      {showViewModal && selectedClient && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setShowViewModal(false);
            setSelectedClient(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowViewModal(false);
              setSelectedClient(null);
            }
          }}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Client Details
                </h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <HiXMark className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-6">
                {/* Company Logo/Image Section */}
                <div className="flex items-center justify-center pb-4 border-b border-gray-200">
                  {selectedClient.imageUrl ? (
                    <img
                      src={selectedClient.imageUrl}
                      alt="Company Logo"
                      className="h-24 w-24 object-cover rounded-full border-4 border-indigo-100 shadow-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                      {selectedClient.companyName?.charAt(0)?.toUpperCase() ||
                        "C"}
                    </div>
                  )}
                </div>

                {/* Company Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Company Name
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {selectedClient.companyName}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Client Name
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {selectedClient.clientName}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email Address
                    </label>
                    <p className="text-gray-900 break-all text-sm">
                      {selectedClient.email}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Contact No
                    </label>
                    <p className="text-gray-900 font-medium">
                      {selectedClient.contactNo || "Not provided"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Type of Business
                    </label>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {selectedClient.typeOfBusiness || "Not specified"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Password
                    </label>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                      {selectedClient.devPassword || "Not provided"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      No of Employees
                    </label>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {selectedClient.noOfEmployees || "Not provided"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Adress
                    </label>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {selectedClient.address || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedClient(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Fixed positioning */}
      {showDeleteModal && selectedClient && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedClient(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowDeleteModal(false);
              setSelectedClient(null);
            }
          }}
          tabIndex={-1}
        >
          <div
            className="relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <DeleteConfirmationModal
              itemType="client profile"
              itemTitle={selectedClient.companyName}
              itemSubtitle={selectedClient.clientName}
              title="Delete Client"
              description="Are you sure you want to permanently delete this client profile?"
              permanentMessage="This will permanently remove this client profile and its associated access. This action cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete Client"
              isLoading={isDeleting}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedClient(null);
              }}
              onConfirm={confirmDelete}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ManageClients;

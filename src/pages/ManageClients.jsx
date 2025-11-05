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
  { key: "image", label: "Logo/Image", sortable: false },
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredClients.slice(
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.companyName ||
      !formData.clientName ||
      !formData.email ||
      !formData.password
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
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
    // Show existing image in preview
    setImagePreview(client.imageUrl || null);
    // Set imageFile to null - will only update if user selects new image
    setImageFile(null);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.clientName || !formData.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!selectedClient) return;

    try {
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
      toast.success("Client updated successfully!");
    } catch (error) {
      console.error("Failed to update client", error);
      toast.error("Failed to update client");
    }
  };

  const handleDelete = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    try {
      await deleteDoc(doc(db, CLIENTS_COLLECTION, selectedClient.id));
      setShowDeleteModal(false);
      setSelectedClient(null);
      toast.success("Client deleted successfully!");
    } catch (error) {
      console.error("Failed to delete client", error);
      toast.error("Failed to delete client");
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

            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
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
                          className="group px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200"
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
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                        <span>{client.companyName}</span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                        <span>{client.clientName}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                          {client.email}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {client.contactNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {client.typeOfBusiness || "Not specified"}
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
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <div className="flex items-center space-x-3">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
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
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Company Name *
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Client Name *
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clientName: e.target.value,
                        })
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
                    Contact No *
                    <input
                      type="tel"
                      value={formData.contactNo}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNo: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Type of Business *
                    <input
                      type="text"
                      value={formData.typeOfBusiness}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          typeOfBusiness: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    No of Employees
                    <input
                      type="number"
                      value={formData.noOfEmployees}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noOfEmployees: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
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
                    Address *
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows="3"
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                    Company Logo / Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit">Add Client</Button>
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

      {/* Edit Client Modal - Fixed positioning */}
      {showEditForm && selectedClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
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
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Company Name *
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Client Name *
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clientName: e.target.value,
                        })
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
                    Contact No *
                    <input
                      type="tel"
                      value={formData.contactNo}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNo: e.target.value })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Type of Business *
                    <input
                      type="text"
                      value={formData.typeOfBusiness}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          typeOfBusiness: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    No of Employees
                    <input
                      type="number"
                      value={formData.noOfEmployees}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noOfEmployees: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                    Address *
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows="3"
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary md:col-span-2">
                    Company Logo / Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit">Update Client</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedClient(null);
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

      {/* View Client Modal - Fixed positioning */}
      {showViewModal && selectedClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
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
                      No of Employees
                    </label>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {selectedClient.noOfEmployees || "Not provided"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Address
                    </label>
                    <p className="text-gray-900">
                      {selectedClient.address || "Not provided"}
                    </p>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10">
          <div className="relative z-[10000]">
            <DeleteConfirmationModal
              itemType="client"
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

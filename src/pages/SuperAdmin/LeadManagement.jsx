import React, { useEffect, useMemo, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
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
  FaUserTie,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaPhone,
  FaEnvelope,
  FaTimes,
  FaUser,
  FaBuilding,
  FaMapMarkerAlt,
  FaIndustry,
  FaBoxOpen,
  FaBullhorn,
  FaTag,
  FaFlag,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaBell,
} from "react-icons/fa";
import { HiXMark } from "react-icons/hi2";
import toast from "react-hot-toast";
import { db } from "../../firebase";
import { auth } from "../../firebase";
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
  writeBatch,
} from "firebase/firestore";

import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

const tableHeaders = [
  { key: "checkbox", label: "", sortable: false },
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "date", label: "Date", sortable: true },
  { key: "customerName", label: "Customer Name", sortable: true },
  { key: "companyName", label: "Company", sortable: true },
  { key: "contactInfo", label: "Contact", sortable: false },
  { key: "productOfInterest", label: "Product", sortable: true },
  { key: "followUpDate", label: "Follow-up", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

const LEAD_STATUSES = [
  "remaining",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "converted",
  "lost",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const PRODUCT_OF_INTEREST_OPTIONS = [
  "Hydraulic Good lift",
  "Scissor Lift",
  "Dock Leveler",
  "Goods Elevator",
  "Car Parking System",
  "Material Handling Equipment",
  "Other",
];

const SECTOR_OPTIONS = [
  "Foundry",
  "Automobile",
  "Manufacturing",
  "Pharma",
  "Food & Beverage",
  "Logistics",
  "Construction",
  "Other",
];

const SOURCE_OF_LEAD_OPTIONS = [
  "Digital Marketing",
  "Reference",
  "Cold Call",
  "Trade Show",
  "Website",
  "Social Media",
  "Email Campaign",
  "Other",
];

const PRODUCT_CATEGORY_OPTIONS = [
  "End User",
  "Dealer",
  "Distributor",
  "OEM",
  "Contractor",
  "Other",
];

function LeadManagement() {
  const { buttonClass, iconColor } = useThemeStyles();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [errors, setErrors] = useState({});

  // Search/Sort/Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("table");
  const [activeStatFilter, setActiveStatFilter] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: "",
    customerName: "",
    contactNumber: "",
    email: "",
    companyName: "",
    address: "",
    productOfInterest: "",
    sector: "",
    sourceOfLead: "",
    productCategory: "",
    status: "remaining",
    priority: "Medium",
    notes: "",
    followUpDate: "",
  });

  // Bulk Selection State
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("contacted");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // --- Fetch Leads ---
  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date || "",
          customerName: data.customerName || data.leadName || "",
          contactNumber: data.contactNumber || data.phone || "",
          email: data.email || "",
          companyName: data.companyName || "",
          address: data.address || "",
          productOfInterest: data.productOfInterest || "",
          sector: data.sector || "",
          sourceOfLead: data.sourceOfLead || data.source || "",
          productCategory: data.productCategory || "",
          status: data.status || "remaining",
          priority: data.priority || "Medium",
          notes: data.notes || "",
          followUpDate: data.followUpDate || "",
          createdAt: data.createdAt || null,
        };
      });
      setLeads(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Helper: Get Follow-up Status ---
  const getFollowUpStatus = (followUpDate) => {
    if (!followUpDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((followUp - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    return "upcoming";
  };

  // --- Filter/Sort Logic ---
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Stat Filters
    if (activeStatFilter === "converted")
      result = result.filter((l) => l.status === "converted");
    else if (activeStatFilter === "new")
      result = result.filter((l) => l.status === "remaining");
    else if (activeStatFilter === "active")
      result = result.filter((l) => !["converted", "lost"].includes(l.status));
    else if (activeStatFilter === "overdue")
      result = result.filter((l) => getFollowUpStatus(l.followUpDate) === "overdue");

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.customerName.toLowerCase().includes(q) ||
          l.companyName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.productOfInterest.toLowerCase().includes(q) ||
          l.status.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const mult = direction === "asc" ? 1 : -1;
      result.sort((a, b) => {
        const valA = a[key]?.toString().toLowerCase() || "";
        const valB = b[key]?.toString().toLowerCase() || "";
        return valA.localeCompare(valB) * mult;
      });
    }

    return result;
  }, [leads, searchTerm, sortConfig, activeStatFilter]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / rowsPerPage));
  const currentRows = filteredLeads.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // --- Handlers ---
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const validateForm = (data) => {
    const errs = {};
    if (!data.date) errs.date = "Date is required";
    if (!data.customerName.trim())
      errs.customerName = "Customer Name is required";
    if (!data.contactNumber.trim())
      errs.contactNumber = "Contact Number is required";
    if (!data.email.trim()) errs.email = "Email Address is required";
    if (!data.companyName.trim()) errs.companyName = "Company Name is required";
    if (!data.productOfInterest)
      errs.productOfInterest = "Product of Interest is required";
    if (!data.sector) errs.sector = "Sector is required";
    if (!data.sourceOfLead) errs.sourceOfLead = "Source of Lead is required";
    if (!data.productCategory)
      errs.productCategory = "Product Category is required";
    return errs;
  };

  const resetForm = () => {
    setFormData({
      date: "",
      customerName: "",
      contactNumber: "",
      email: "",
      companyName: "",
      address: "",
      productOfInterest: "",
      sector: "",
      sourceOfLead: "",
      productCategory: "",
      status: "remaining",
      priority: "Medium",
      notes: "",
      followUpDate: "",
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(formData);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await addDoc(collection(db, "leads"), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowAddForm(false);
      resetForm();
      toast.success("Lead added successfully");
    } catch (e) {
      toast.error("Failed to add lead");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(formData);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await updateDoc(doc(db, "leads", selectedLead.id), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      setShowEditForm(false);
      setSelectedLead(null);
      toast.success("Lead updated successfully");
    } catch (e) {
      toast.error("Failed to update lead");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "leads", selectedLead.id));
      setShowDeleteModal(false);
      setSelectedLead(null);
      toast.success("Lead deleted successfully");
    } catch (e) {
      toast.error("Failed to delete lead");
    }
  };

  // --- Bulk Operations ---
  const handleBulkStatusChange = async () => {
    if (selectedLeads.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        batch.update(leadRef, {
          status: bulkStatus,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success(`${selectedLeads.size} leads updated to "${bulkStatus}"`);
      setSelectedLeads(new Set());
      setShowBulkStatusModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update leads");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        batch.delete(leadRef);
      });
      await batch.commit();
      toast.success(`${selectedLeads.size} leads deleted`);
      setSelectedLeads(new Set());
      setShowBulkDeleteModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete leads");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const openEdit = (lead) => {
    setSelectedLead(lead);
    setFormData({ ...lead });
    setShowEditForm(true);
  };

  const openView = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  // --- Render Helpers ---
  const getStatusColor = (status) => {
    switch (status) {
      case "remaining":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "qualified":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "proposal":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "negotiation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "converted":
        return "bg-green-100 text-green-800 border-green-200";
      case "lost":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // --- Stats Computation ---
  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => l.status === "converted").length;
    const active = leads.filter(
      (l) => !["converted", "lost"].includes(l.status)
    ).length;
    const overdue = leads.filter(
      (l) => getFollowUpStatus(l.followUpDate) === "overdue"
    ).length;
    return { total, converted, active, overdue };
  }, [leads]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Lead Management" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Lead Management">
        Tracker for potential clients and business opportunities.
      </PageHeader>

      <div className="space-y-6 mt-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            onClick={() => setActiveStatFilter(null)}
            className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-blue-500/30 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 hover:shadow-md transition-shadow ${activeStatFilter === null ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">
                  Total Leads
                </p>
                <p className="text-3xl font-bold text-blue-900 [.dark_&]:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 [.dark_&]:bg-blue-500/20 flex items-center justify-center">
                <FaUserTie className="text-blue-600 [.dark_&]:text-blue-400 text-xl" />
              </div>
            </div>
          </div>
          <div
            onClick={() => setActiveStatFilter("active")}
            className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-purple-500/30 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 hover:shadow-md transition-shadow ${activeStatFilter === 'active' ? 'ring-2 ring-purple-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">
                  Active Leads
                </p>
                <p className="text-3xl font-bold text-purple-900 [.dark_&]:text-white mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 [.dark_&]:bg-purple-500/20 flex items-center justify-center">
                <FaClock className="text-purple-600 [.dark_&]:text-purple-400 text-xl" />
              </div>
            </div>
          </div>
          <div
            onClick={() => setActiveStatFilter("converted")}
            className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-green-500/30 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 hover:shadow-md transition-shadow ${activeStatFilter === 'converted' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">
                  Converted
                </p>
                <p className="text-3xl font-bold text-green-900 [.dark_&]:text-white mt-1">
                  {stats.converted}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" />
              </div>
            </div>
          </div>
          <div
            onClick={() => setActiveStatFilter("overdue")}
            className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-red-500/30 border-l-4 border-l-red-500 [.dark_&]:border-l-red-400 hover:shadow-md transition-shadow ${activeStatFilter === 'overdue' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-red-600 [.dark_&]:text-red-400">
                  Overdue Follow-ups
                </p>
                <p className="text-3xl font-bold text-red-900 [.dark_&]:text-white mt-1">
                  {stats.overdue}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 [.dark_&]:bg-red-500/20 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600 [.dark_&]:text-red-400 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <Card title="Search & Actions">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-subtle bg-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex bg-surface-subtle [.dark_&]:bg-slate-700/50 p-1 rounded-lg border border-subtle">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded ${viewMode === "table"
                    ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
                    : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
                    }`}
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`p-2 rounded ${viewMode === "kanban"
                    ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
                    : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
                    }`}
                >
                  <FaList />
                </button>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                className={buttonClass}
              >
                <FaPlus className="mr-2" /> Add Lead
              </Button>
            </div>
          </div>
        </Card>

        {/* Content */}
        {viewMode === "table" ? (
          <>
            {/* Bulk Actions Toolbar */}
            {selectedLeads.size > 0 && (
              <div className="bg-indigo-50 [.dark_&]:bg-indigo-900/30 border border-indigo-200 [.dark_&]:border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-700 [.dark_&]:text-indigo-300 font-medium">
                    {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setSelectedLeads(new Set())}
                    className="text-indigo-600 [.dark_&]:text-indigo-400 hover:underline text-sm"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowBulkStatusModal(true)}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <FaEdit className="text-sm" />
                    Change Status
                  </Button>
                  <Button
                    onClick={() => setShowBulkDeleteModal(true)}
                    variant="secondary"
                    className="flex items-center gap-2 text-red-600 [.dark_&]:text-red-400 border-red-200 [.dark_&]:border-red-500/30 hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                  >
                    <FaTrash className="text-sm" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
            <Card title="Leads List">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-subtle [.dark_&]:bg-slate-800/60 border-b border-subtle">
                    <tr>
                      {tableHeaders.map((h) => (
                        <th
                          key={h.key}
                          onClick={() => h.sortable && handleSort(h.key)}
                          className={`px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 [.dark_&]:text-gray-300 ${h.sortable ? 'cursor-pointer hover:bg-surface-strong' : ''} transition-colors`}
                        >
                          {h.key === "checkbox" ? (
                            <input
                              type="checkbox"
                              checked={currentRows.length > 0 && currentRows.every(l => selectedLeads.has(l.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeads(new Set(currentRows.map(l => l.id)));
                                } else {
                                  setSelectedLeads(new Set());
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {h.label}
                              {sortConfig.key === h.key &&
                                (sortConfig.direction === "asc" ? (
                                  <FaSortAmountUpAlt />
                                ) : (
                                  <FaSortAmountDownAlt />
                                ))}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {currentRows.map((lead, idx) => {
                      const followUpStatus = getFollowUpStatus(lead.followUpDate);
                      return (
                        <tr
                          key={lead.id}
                          className={`hover:bg-surface-subtle [.dark_&]:hover:bg-slate-700/30 transition-colors ${selectedLeads.has(lead.id) ? 'bg-indigo-50 [.dark_&]:bg-indigo-900/20' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeads.has(lead.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedLeads);
                                if (e.target.checked) {
                                  newSelected.add(lead.id);
                                } else {
                                  newSelected.delete(lead.id);
                                }
                                setSelectedLeads(newSelected);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 [.dark_&]:text-white">
                            {(currentPage - 1) * rowsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                            {lead.date || "-"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 [.dark_&]:text-white">
                            {lead.customerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                            {lead.companyName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                            <div className="flex flex-col gap-1">
                              {lead.email && (
                                <span className="flex items-center gap-1">
                                  <FaEnvelope className="text-xs" /> {lead.email}
                                </span>
                              )}
                              {lead.contactNumber && (
                                <span className="flex items-center gap-1">
                                  <FaPhone className="text-xs" />{" "}
                                  {lead.contactNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                            {lead.productOfInterest || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {lead.followUpDate ? (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${followUpStatus === "overdue"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : followUpStatus === "today"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                                  }`}
                              >
                                <FaBell className="text-xs" />
                                {lead.followUpDate}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                lead.status
                              )}`}
                            >
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                                lead.priority
                              )}`}
                            >
                              {lead.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openView(lead)}
                                className="text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-800 p-1"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => openEdit(lead)}
                                className="text-yellow-600 [.dark_&]:text-yellow-400 hover:text-yellow-800 p-1"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 [.dark_&]:text-red-400 hover:text-red-800 p-1"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {!currentRows.length && (
                      <tr>
                        <td
                          colSpan="11"
                          className="px-4 py-8 text-center text-gray-500 [.dark_&]:text-gray-400"
                        >
                          No leads found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls could be added here */}
            </Card>
          </>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {LEAD_STATUSES.map((status) => (
              <div
                key={status}
                className="min-w-[300px] bg-surface [.dark_&]:bg-slate-800/60 rounded-xl border border-subtle flex flex-col max-h-[700px]"
              >
                <div
                  className={`p-3 border-b border-subtle font-semibold flex justify-between items-center ${getStatusColor(
                    status
                  )} bg-opacity-20 [.dark_&]:text-white capitalize`}
                >
                  {status}
                  <span className="bg-white/50 [.dark_&]:bg-slate-700/50 px-2 py-1 rounded-full text-xs">
                    {filteredLeads.filter((l) => l.status === status).length}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto space-y-3 scrollbar-thin">
                  {filteredLeads
                    .filter((l) => l.status === status)
                    .map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-surface-strong [.dark_&]:bg-slate-700/50 p-3 rounded-lg shadow-sm border border-subtle hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => openView(lead)}
                      >
                        <h4 className="font-medium text-gray-900 [.dark_&]:text-white">
                          {lead.customerName}
                        </h4>
                        <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                          {lead.companyName}
                        </p>
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-1">
                          {lead.productOfInterest}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                              lead.priority
                            )}`}
                          >
                            {lead.priority}
                          </span>
                          <span className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                            {lead.date ||
                              (lead.createdAt?.toDate
                                ? lead.createdAt.toDate().toLocaleDateString()
                                : "Just now")}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 rounded-lg">
                  <FaUserTie className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                    Add New Lead
                  </h2>
                  <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                    Create a new lead entry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <HiXMark className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <form onSubmit={handleAddSubmit} noValidate>
                {/* Row 1: Date, Customer Name, Contact Number, Email */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className={`w-full rounded-lg border ${errors.date
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {errors.date && (
                      <p className="text-xs text-red-500">{errors.date}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.customerName
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500">
                        {errors.customerName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter number"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactNumber: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.contactNumber
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {errors.contactNumber && (
                      <p className="text-xs text-red-500">
                        {errors.contactNumber}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`w-full rounded-lg border ${errors.email
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Row 2: Company, Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Customer Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.companyName
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {errors.companyName && (
                      <p className="text-xs text-red-500">
                        {errors.companyName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Product of Interest, Sector, Source of Lead, Product Category */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Product of Interest{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productOfInterest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productOfInterest: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.productOfInterest
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    >
                      <option value="">Select product</option>
                      {PRODUCT_OF_INTEREST_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {errors.productOfInterest && (
                      <p className="text-xs text-red-500">
                        {errors.productOfInterest}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Sector <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sector}
                      onChange={(e) =>
                        setFormData({ ...formData, sector: e.target.value })
                      }
                      className={`w-full rounded-lg border ${errors.sector
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    >
                      <option value="">Select sector</option>
                      {SECTOR_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.sector && (
                      <p className="text-xs text-red-500">{errors.sector}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Source of Lead <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sourceOfLead}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sourceOfLead: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.sourceOfLead
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    >
                      <option value="">Select source</option>
                      {SOURCE_OF_LEAD_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.sourceOfLead && (
                      <p className="text-xs text-red-500">
                        {errors.sourceOfLead}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Product Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productCategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productCategory: e.target.value,
                        })
                      }
                      className={`w-full rounded-lg border ${errors.productCategory
                        ? "border-red-500"
                        : "border-gray-200 [.dark_&]:border-white/10"
                        } bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    >
                      <option value="">Select category</option>
                      {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.productCategory && (
                      <p className="text-xs text-red-500">
                        {errors.productCategory}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 4: Status, Priority, Follow-up, Notes */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all capitalize"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-1">
                      <FaBell className="text-xs" /> Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) =>
                        setFormData({ ...formData, followUpDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddForm(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className={buttonClass}>
                    Add Lead
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 [.dark_&]:bg-yellow-500/20 text-yellow-600 [.dark_&]:text-yellow-400 rounded-lg">
                  <FaEdit className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                    Edit Lead
                  </h2>
                  <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                    Update lead information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <HiXMark className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <form onSubmit={handleEditSubmit} noValidate>
                {/* Row 1: Date, Customer Name, Contact Number, Email */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter number"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactNumber: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Company, Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Customer Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Address
                    </label>
                    <textarea
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Row 3: Product of Interest, Sector, Source of Lead, Product Category */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Product of Interest{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productOfInterest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productOfInterest: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select product</option>
                      {PRODUCT_OF_INTEREST_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Sector <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sector}
                      onChange={(e) =>
                        setFormData({ ...formData, sector: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select sector</option>
                      {SECTOR_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Source of Lead <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sourceOfLead}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sourceOfLead: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select source</option>
                      {SOURCE_OF_LEAD_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Product Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productCategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productCategory: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select category</option>
                      {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Status, Priority, Follow-up, Notes */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all capitalize"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-1">
                      <FaBell className="text-xs" /> Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) =>
                        setFormData({ ...formData, followUpDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                  <Button
                    variant="secondary"
                    onClick={() => setShowEditForm(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className={buttonClass}>
                    Update Lead
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedLead && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 [.dark_&]:bg-blue-500/20 text-blue-600 [.dark_&]:text-blue-400 rounded-lg">
                  <FaEye className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white leading-tight">
                    {selectedLead.customerName}
                  </h2>
                  <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium">
                    Lead Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <HiXMark className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Row 1: Date, Customer Name, Contact Number, Email */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.date || "-"}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Customer Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.customerName}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Contact Number
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.contactNumber || "-"}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white truncate">
                    {selectedLead.email || "-"}
                  </p>
                </div>
              </div>

              {/* Row 2: Company, Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Company
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.companyName}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Address
                  </p>
                  <p className="text-sm text-gray-700 [.dark_&]:text-gray-300 truncate">
                    {selectedLead.address || "No address provided."}
                  </p>
                </div>
              </div>

              {/* Row 3: Product, Sector, Source, Category */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Product of Interest
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.productOfInterest || "-"}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Sector
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.sector || "-"}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Source of Lead
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.sourceOfLead || "-"}
                  </p>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Product Category
                  </p>
                  <p className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.productCategory || "-"}
                  </p>
                </div>
              </div>

              {/* Row 4: Status, Priority, Created At, Notes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Status
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(
                      selectedLead.status
                    )}`}
                  >
                    {selectedLead.status}
                  </span>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Priority
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                      selectedLead.priority
                    )}`}
                  >
                    {selectedLead.priority}
                  </span>
                </div>
                <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-2.5 md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-0.5">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700 [.dark_&]:text-gray-300 truncate">
                    {selectedLead.notes || "No notes."}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                <Button
                  variant="secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    openEdit(selectedLead);
                  }}
                  className={buttonClass}
                >
                  <FaEdit className="mr-2" /> Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          title="Delete Lead"
          message={`Are you sure you want to delete ${selectedLead?.customerName}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Bulk Status Change Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                Change Status
              </h2>
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mb-4">
                Update status for <strong>{selectedLeads.size}</strong> selected lead{selectedLeads.size > 1 ? "s" : ""}.
              </p>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white capitalize"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
              <Button variant="secondary" onClick={() => setShowBulkStatusModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkStatusChange}
                disabled={isBulkProcessing}
                className={buttonClass}
              >
                {isBulkProcessing ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
              <h2 className="text-lg font-bold text-red-600 [.dark_&]:text-red-400">
                Delete Selected Leads
              </h2>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 [.dark_&]:bg-red-500/20 rounded-full">
                  <FaExclamationTriangle className="text-red-600 [.dark_&]:text-red-400 text-xl" />
                </div>
                <div>
                  <p className="text-gray-900 [.dark_&]:text-white font-medium">
                    Are you sure?
                  </p>
                  <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                    This will permanently delete <strong>{selectedLeads.size}</strong> lead{selectedLeads.size > 1 ? "s" : ""}.
                  </p>
                </div>
              </div>
              <p className="text-sm text-red-600 [.dark_&]:text-red-400">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
              <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isBulkProcessing ? "Deleting..." : "Delete Leads"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadManagement;

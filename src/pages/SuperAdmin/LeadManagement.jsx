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
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaUser,
  FaUserPlus,
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
  FaHome,
  FaGripVertical,
} from "react-icons/fa";
import { HiXMark } from "react-icons/hi2";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  getDocs,
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

  // View Toggle: "leads" or "followups"
  const [activeView, setActiveView] = useState("leads");

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
    assignedTo: "",
  });

  // Bulk Selection State
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("contacted");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("details");

  // Follow-up State
  const [followups, setFollowups] = useState([]);
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    date: "",
    notes: "",
    status: "pending",
  });
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Follow-Up Manager States
  const [allFollowups, setAllFollowups] = useState([]);
  const [loadingAllFollowups, setLoadingAllFollowups] = useState(false);
  const [followupFilter, setFollowupFilter] = useState("all");
  const [showScheduleFollowup, setShowScheduleFollowup] = useState(false);
  const [scheduleFollowupLeadId, setScheduleFollowupLeadId] = useState("");
  const [scheduleFollowupForm, setScheduleFollowupForm] = useState({
    leadId: "",
    type: "phone_call",
    date: "",
    time: "",
    priority: "medium",
    notes: "",
  });
  const [savingScheduleFollowup, setSavingScheduleFollowup] = useState(false);

  // Lead Assignment State
  const [users, setUsers] = useState([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

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
          assignedTo: data.assignedTo || "",
          assignedToName: data.assignedToName || "",
          createdAt: data.createdAt || null,
        };
      });
      setLeads(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Fetch Users for Assignment ---
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      const usersList = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || d.data().displayName || d.data().email || "Unknown",
        email: d.data().email || "",
        role: d.data().role || "",
      }));
      setUsers(usersList);
    });
    return () => unsub();
  }, []);

  // --- Fetch All Follow-ups across all leads ---
  useEffect(() => {
    if (activeView !== "followups") return;

    const fetchAllFollowups = async () => {
      setLoadingAllFollowups(true);
      try {
        const followupsList = [];
        for (const lead of leads) {
          const followupsRef = collection(db, "leads", lead.id, "followups");
          const snapshot = await getDocs(followupsRef);
          snapshot.docs.forEach(doc => {
            followupsList.push({
              id: doc.id,
              leadId: lead.id,
              leadName: lead.customerName,
              leadCompany: lead.companyName,
              leadPriority: lead.priority,
              assignedTo: lead.assignedTo,
              assignedToName: lead.assignedToName,
              ...doc.data(),
            });
          });
        }
        // Sort by date (most recent first)
        followupsList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllFollowups(followupsList);
      } catch (e) {
        console.error("Error fetching all follow-ups:", e);
        toast.error("Failed to load follow-ups");
      } finally {
        setLoadingAllFollowups(false);
      }
    };

    if (leads.length > 0) {
      fetchAllFollowups();
    }
  }, [activeView, leads]);

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

  // --- Follow-up Stats ---
  const followupStats = useMemo(() => {
    const total = allFollowups.length;
    const pending = allFollowups.filter(f => f.status === "pending").length;
    const completed = allFollowups.filter(f => f.status === "completed").length;
    const rescheduled = allFollowups.filter(f => f.status === "rescheduled").length;
    const overdue = allFollowups.filter(f => f.status === "pending" && getFollowUpStatus(f.date) === "overdue").length;
    const today = allFollowups.filter(f => f.status === "pending" && getFollowUpStatus(f.date) === "today").length;
    return { total, pending, completed, rescheduled, overdue, today };
  }, [allFollowups]);

  // --- Filtered Follow-ups ---
  const filteredFollowups = useMemo(() => {
    switch (followupFilter) {
      case "pending":
        return allFollowups.filter(f => f.status === "pending");
      case "completed":
        return allFollowups.filter(f => f.status === "completed");
      case "rescheduled":
        return allFollowups.filter(f => f.status === "rescheduled");
      case "overdue":
        return allFollowups.filter(f => f.status === "pending" && getFollowUpStatus(f.date) === "overdue");
      case "today":
        return allFollowups.filter(f => f.status === "pending" && getFollowUpStatus(f.date) === "today");
      default:
        return allFollowups;
    }
  }, [allFollowups, followupFilter]);

  // --- Follow-up Actions ---
  const handleCompleteFollowup = async (followup) => {
    try {
      await updateDoc(doc(db, "leads", followup.leadId, "followups", followup.id), {
        status: "completed",
        completedAt: serverTimestamp(),
      });
      toast.success("Follow-up marked as completed");
      // Refresh follow-ups
      setAllFollowups(prev => prev.map(f =>
        f.id === followup.id ? { ...f, status: "completed" } : f
      ));
    } catch (e) {
      console.error(e);
      toast.error("Failed to complete follow-up");
    }
  };

  const handleRescheduleFollowup = async (followup, newDate) => {
    try {
      // Add new follow-up with rescheduled status for old one
      await updateDoc(doc(db, "leads", followup.leadId, "followups", followup.id), {
        status: "rescheduled",
        rescheduledAt: serverTimestamp(),
      });
      // Create new follow-up
      await addDoc(collection(db, "leads", followup.leadId, "followups"), {
        date: newDate,
        notes: `Rescheduled from ${followup.date}`,
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || "unknown",
      });
      // Update lead's follow-up date
      await updateDoc(doc(db, "leads", followup.leadId), {
        followUpDate: newDate,
        updatedAt: serverTimestamp(),
      });
      toast.success("Follow-up rescheduled");
      // Trigger refresh
      setActiveView("leads");
      setTimeout(() => setActiveView("followups"), 100);
    } catch (e) {
      console.error(e);
      toast.error("Failed to reschedule follow-up");
    }
  };

  const handleDeleteFollowup = async (followup) => {
    try {
      await deleteDoc(doc(db, "leads", followup.leadId, "followups", followup.id));
      toast.success("Follow-up deleted");
      setAllFollowups(prev => prev.filter(f => f.id !== followup.id));
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete follow-up");
    }
  };

  // --- Schedule New Follow-up ---
  const handleScheduleFollowup = async (e) => {
    e.preventDefault();
    if (!scheduleFollowupForm.leadId) {
      toast.error("Please select a lead");
      return;
    }
    if (!scheduleFollowupForm.date) {
      toast.error("Please select a date");
      return;
    }

    setSavingScheduleFollowup(true);
    try {
      // Add follow-up to lead's subcollection
      await addDoc(collection(db, "leads", scheduleFollowupForm.leadId, "followups"), {
        date: scheduleFollowupForm.date,
        time: scheduleFollowupForm.time || null,
        type: scheduleFollowupForm.type,
        priority: scheduleFollowupForm.priority,
        notes: scheduleFollowupForm.notes,
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || "unknown",
      });

      // Update lead's next follow-up date
      await updateDoc(doc(db, "leads", scheduleFollowupForm.leadId), {
        followUpDate: scheduleFollowupForm.date,
        updatedAt: serverTimestamp(),
      });

      toast.success("Follow-up scheduled successfully");
      setShowScheduleFollowup(false);
      setScheduleFollowupForm({
        leadId: "",
        type: "phone_call",
        date: "",
        time: "",
        priority: "medium",
        notes: "",
      });
      // Refresh follow-ups
      setActiveView("leads");
      setTimeout(() => setActiveView("followups"), 100);
    } catch (e) {
      console.error(e);
      toast.error("Failed to schedule follow-up");
    } finally {
      setSavingScheduleFollowup(false);
    }
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

    // Assignee Filter
    if (assigneeFilter) {
      result = result.filter((l) => l.assignedTo === assigneeFilter);
    }

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
      potentialValue: "",
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

  const handleBulkAssign = async () => {
    if (selectedLeads.size === 0 || !bulkAssignee) return;
    setIsBulkProcessing(true);
    try {
      const assignee = users.find((u) => u.id === bulkAssignee);
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        batch.update(leadRef, {
          assignedTo: bulkAssignee,
          assignedToName: assignee?.name || "Unknown",
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success(`${selectedLeads.size} leads assigned to ${assignee?.name}`);
      setSelectedLeads(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignee("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign leads");
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

  // --- Profile Modal & Follow-ups ---
  const openProfile = async (lead) => {
    setSelectedLead(lead);
    setActiveProfileTab("details");
    setShowProfileModal(true);
    setFollowups([]);
    setLoadingFollowups(true);

    // Fetch follow-ups for this lead
    try {
      const followupsRef = collection(db, "leads", lead.id, "followups");
      const followupsQuery = query(followupsRef, orderBy("date", "desc"));
      const snapshot = await getDocs(followupsQuery);
      const followupsList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setFollowups(followupsList);
    } catch (e) {
      console.error("Error fetching follow-ups:", e);
      toast.error("Failed to load follow-ups");
    } finally {
      setLoadingFollowups(false);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!followupForm.date || !followupForm.notes.trim()) {
      toast.error("Please fill in date and notes");
      return;
    }

    setSavingFollowup(true);
    try {
      const followupsRef = collection(db, "leads", selectedLead.id, "followups");
      await addDoc(followupsRef, {
        ...followupForm,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || "unknown",
      });

      // Also update the lead's followUpDate to the new date
      await updateDoc(doc(db, "leads", selectedLead.id), {
        followUpDate: followupForm.date,
        updatedAt: serverTimestamp(),
      });

      toast.success("Follow-up added successfully");
      setShowAddFollowup(false);
      setFollowupForm({ date: "", notes: "", status: "pending" });

      // Refresh follow-ups
      openProfile(selectedLead);
    } catch (e) {
      console.error("Error adding follow-up:", e);
      toast.error("Failed to add follow-up");
    } finally {
      setSavingFollowup(false);
    }
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

  // Kanban Drag & Drop Handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;

    // Optimistic Update (Optional: could rely on real-time listener, but this feels snappier)
    // For now we'll just fire the update and let the snapshot listener refresh the UI

    try {
      const leadRef = doc(db, "leads", draggableId);
      await updateDoc(leadRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Moved to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to move lead");
    }
  };

  // Helper to get initials
  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

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

      {/* View Toggle: Leads / Follow-ups */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex bg-surface-subtle [.dark_&]:bg-slate-700/50 p-1 rounded-lg border border-subtle">
          <button
            onClick={() => setActiveView("leads")}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeView === "leads"
              ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
              : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
              }`}
          >
            <FaUserTie className="text-sm" />
            Leads
          </button>
          <button
            onClick={() => setActiveView("followups")}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeView === "followups"
              ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
              : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
              }`}
          >
            <FaPhoneAlt className="text-sm" />
            Follow-ups
          </button>
        </div>
      </div>

      {/* Leads View */}
      {activeView === "leads" && (
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
                    <FaList />
                  </button>
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-2 rounded ${viewMode === "kanban"
                      ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
                      : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
                      }`}
                  >
                    <FaTh />
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
                      onClick={() => setShowBulkAssignModal(true)}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <FaUserPlus className="text-sm" />
                      Assign
                    </Button>
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
                                    <FaSortAmountUpAlt className="text-indigo-500" />
                                  ) : (
                                    <FaSortAmountDownAlt className="text-indigo-500" />
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
                              <button
                                onClick={() => openProfile(lead)}
                                className="text-indigo-600 [.dark_&]:text-indigo-400 hover:underline cursor-pointer text-left"
                              >
                                {lead.customerName}
                              </button>
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
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => {
                                    setScheduleFollowupForm({ ...scheduleFollowupForm, leadId: lead.id });
                                    setShowScheduleFollowup(true);
                                  }}
                                  className="text-purple-600 [.dark_&]:text-purple-400 hover:text-purple-800 p-1"
                                  title="Add Follow-up"
                                >
                                  <FaCalendarAlt />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setShowDeleteModal(true);
                                  }}
                                  className="text-red-600 [.dark_&]:text-red-400 hover:text-red-800 p-1"
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
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
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-250px)]">
                {LEAD_STATUSES.map((status) => {
                  const statusLeads = filteredLeads.filter((l) => l.status === status);
                  // Calculate Total Value
                  const statusValue = statusLeads.reduce((acc, l) => acc + (parseFloat(l.potentialValue) || 0), 0);

                  return (
                    <div
                      key={status}
                      className="min-w-[320px] w-[320px] flex flex-col h-full bg-surface-subtle [.dark_&]:bg-slate-800/40 rounded-xl border border-subtle overflow-hidden"
                    >
                      {/* Column Header */}
                      <div
                        className={`p-3 border-b border-subtle font-semibold flex justify-between items-center ${getStatusColor(
                          status
                        )} bg-opacity-20 [.dark_&]:text-white capitalize shrink-0`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{status}</span>
                          <span className="bg-white/50 [.dark_&]:bg-slate-700/50 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                            {statusLeads.length}
                          </span>
                        </div>
                        <span className="text-xs font-bold opacity-80 bg-white/30 px-2 py-1 rounded">
                          ₹{statusValue.toLocaleString()}
                        </span>
                      </div>

                      {/* Droppable Area */}
                      <Droppable droppableId={status}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-3 flex-1 overflow-y-auto scrollbar-thin space-y-3 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50 [.dark_&]:bg-indigo-900/10" : ""
                              }`}
                          >
                            {statusLeads.map((lead, index) => (
                              <Draggable
                                key={lead.id}
                                draggableId={lead.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`group relative bg-white [.dark_&]:bg-[#1E2235] p-3 rounded-lg border-[1.5px] transition-all cursor-move
                                      ${snapshot.isDragging ? "shadow-lg rotate-2 ring-2 ring-indigo-500 z-50" : ""}
                                      ${lead.priority === 'High' ? 'border-red-500' : lead.priority === 'Medium' ? 'border-yellow-500' : 'border-green-500'}
                                      hover:shadow-md
                                    `}
                                    onClick={() => openView(lead)}
                                    style={{
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 [.dark_&]:text-white line-clamp-2 text-sm">
                                          {lead.customerName}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide border ${getPriorityColor(lead.priority)}`}>
                                          <FaFlag /> {lead.priority}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500 [.dark_&]:text-gray-400 line-clamp-2">
                                      <span className="font-medium text-gray-700 [.dark_&]:text-gray-300">{lead.companyName}</span>
                                      {lead.notes && <span className="block mt-1 italic text-gray-400">"{lead.notes}"</span>}
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                      <span className="rounded px-1.5 py-0.5 bg-gray-100 [.dark_&]:bg-white/10 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1">
                                        <FaBoxOpen className="text-indigo-400" /> {lead.productOfInterest}
                                      </span>
                                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700`}>
                                        <FaCalendarAlt />
                                        {lead.date || "Just now"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {statusLeads.length === 0 && !snapshot.isDraggingOver && (
                              <div className="h-24 border-2 border-dashed border-gray-200 [.dark_&]:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                <span className="text-xs">No leads</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </div>
      )}

      {/* Follow-ups View */}
      {activeView === "followups" && (
        <div className="space-y-6 mt-6">
          {/* Stats Row - Matching Leads Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div
              onClick={() => setFollowupFilter("all")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-indigo-500/30 border-l-4 border-l-indigo-500 [.dark_&]:border-l-indigo-400 hover:shadow-md transition-shadow ${followupFilter === "all" ? "ring-2 ring-indigo-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-indigo-600 [.dark_&]:text-indigo-400">
                    Total Follow-ups
                  </p>
                  <p className="text-3xl font-bold text-indigo-900 [.dark_&]:text-white mt-1">
                    {followupStats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                  <FaPhoneAlt className="text-indigo-600 [.dark_&]:text-indigo-400 text-xl" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setFollowupFilter("pending")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-purple-500/30 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 hover:shadow-md transition-shadow ${followupFilter === "pending" ? "ring-2 ring-purple-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">
                    Pending
                  </p>
                  <p className="text-3xl font-bold text-purple-900 [.dark_&]:text-white mt-1">
                    {followupStats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 [.dark_&]:bg-purple-500/20 flex items-center justify-center">
                  <FaClock className="text-purple-600 [.dark_&]:text-purple-400 text-xl" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setFollowupFilter("overdue")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-orange-500/30 border-l-4 border-l-orange-500 [.dark_&]:border-l-orange-400 hover:shadow-md transition-shadow ${followupFilter === "overdue" ? "ring-2 ring-orange-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-orange-600 [.dark_&]:text-orange-400">
                    Overdue
                  </p>
                  <p className="text-3xl font-bold text-orange-900 [.dark_&]:text-white mt-1">
                    {followupStats.overdue}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 [.dark_&]:bg-orange-500/20 flex items-center justify-center">
                  <FaExclamationTriangle className="text-orange-600 [.dark_&]:text-orange-400 text-xl" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setFollowupFilter("rescheduled")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-blue-500/30 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 hover:shadow-md transition-shadow ${followupFilter === "rescheduled" ? "ring-2 ring-blue-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">
                    Rescheduled
                  </p>
                  <p className="text-3xl font-bold text-blue-900 [.dark_&]:text-white mt-1">
                    {followupStats.rescheduled}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 [.dark_&]:bg-blue-500/20 flex items-center justify-center">
                  <FaCalendarAlt className="text-blue-600 [.dark_&]:text-blue-400 text-xl" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setFollowupFilter("today")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-yellow-500/30 border-l-4 border-l-yellow-500 [.dark_&]:border-l-yellow-400 hover:shadow-md transition-shadow ${followupFilter === "today" ? "ring-2 ring-yellow-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-yellow-600 [.dark_&]:text-yellow-400">
                    Today
                  </p>
                  <p className="text-3xl font-bold text-yellow-900 [.dark_&]:text-white mt-1">
                    {followupStats.today}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 [.dark_&]:bg-yellow-500/20 flex items-center justify-center">
                  <FaBell className="text-yellow-600 [.dark_&]:text-yellow-400 text-xl" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setFollowupFilter("completed")}
              className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-green-500/30 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 hover:shadow-md transition-shadow ${followupFilter === "completed" ? "ring-2 ring-green-500" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-green-900 [.dark_&]:text-white mt-1">
                    {followupStats.completed}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                  <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Search & Actions - Matching Leads Style */}
          <Card title="Search & Actions">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search follow-ups..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-subtle bg-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                // Search functionality can be added later
                />
              </div>
              <Button
                onClick={() => setShowScheduleFollowup(true)}
                className={buttonClass}
              >
                <FaPlus className="mr-2" /> Schedule Follow-Up
              </Button>
            </div>
          </Card>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All", count: followupStats.total, icon: FaPhoneAlt, bgColor: "bg-indigo-500", textColor: "text-white" },
              { key: "pending", label: "Pending", count: followupStats.pending, icon: FaClock, bgColor: "bg-purple-100 [.dark_&]:bg-purple-500/20", textColor: "text-purple-700 [.dark_&]:text-purple-400" },
              { key: "today", label: "Today", count: followupStats.today, icon: FaCalendarAlt, bgColor: "bg-yellow-100 [.dark_&]:bg-yellow-500/20", textColor: "text-yellow-700 [.dark_&]:text-yellow-400" },
              { key: "overdue", label: "Overdue", count: followupStats.overdue, icon: FaExclamationTriangle, bgColor: "bg-orange-100 [.dark_&]:bg-orange-500/20", textColor: "text-orange-700 [.dark_&]:text-orange-400" },
              { key: "rescheduled", label: "Rescheduled", count: followupStats.rescheduled, icon: FaCalendarAlt, bgColor: "bg-blue-100 [.dark_&]:bg-blue-500/20", textColor: "text-blue-700 [.dark_&]:text-blue-400" },
              { key: "completed", label: "Completed", count: followupStats.completed, icon: FaCheckCircle, bgColor: "bg-green-100 [.dark_&]:bg-green-500/20", textColor: "text-green-700 [.dark_&]:text-green-400" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFollowupFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${followupFilter === tab.key
                  ? "bg-indigo-500 text-white shadow-md"
                  : `${tab.bgColor} ${tab.textColor} border border-gray-200 [.dark_&]:border-gray-700 hover:shadow-sm`
                  }`}
              >
                <tab.icon className="text-sm" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${followupFilter === tab.key
                  ? "bg-white/20"
                  : "bg-white [.dark_&]:bg-slate-700"
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>



          {/* Follow-up Cards */}
          {loadingAllFollowups ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredFollowups.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 [.dark_&]:bg-slate-700 flex items-center justify-center">
                  <FaPhoneAlt className="text-gray-400 [.dark_&]:text-gray-500 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-2">
                  No Follow-ups Found
                </h3>
                <p className="text-gray-500 [.dark_&]:text-gray-400 max-w-md mx-auto">
                  {followupFilter === "all"
                    ? "Schedule your first follow-up to get started."
                    : `No ${followupFilter} follow-ups at the moment.`}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFollowups.map((followup) => {
                const dateStatus = getFollowUpStatus(followup.date);
                return (
                  <div
                    key={followup.id}
                    className="bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Lead Info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-indigo-600 [.dark_&]:text-indigo-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 [.dark_&]:text-white">
                              {followup.leadName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(followup.leadPriority)}`}>
                              {followup.leadPriority}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 [.dark_&]:text-gray-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-xs" />
                              {followup.date}
                            </span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${followup.status === "completed"
                              ? "bg-green-100 text-green-800 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400"
                              : followup.status === "rescheduled"
                                ? "bg-blue-100 text-blue-800 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-400"
                                : dateStatus === "overdue"
                                  ? "bg-red-100 text-red-800 [.dark_&]:bg-red-500/20 [.dark_&]:text-red-400"
                                  : dateStatus === "today"
                                    ? "bg-yellow-100 text-yellow-800 [.dark_&]:bg-yellow-500/20 [.dark_&]:text-yellow-400"
                                    : "bg-purple-100 text-purple-800 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-400"
                              }`}>
                              {followup.status === "completed" ? "Completed" : followup.status === "rescheduled" ? "Rescheduled" : dateStatus === "overdue" ? "Overdue" : dateStatus === "today" ? "Today" : "Pending"}
                            </span>
                          </div>
                          {followup.notes && (
                            <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mt-2">
                              {followup.notes}
                            </p>
                          )}
                          {followup.assignedToName && (
                            <p className="text-xs text-gray-400 [.dark_&]:text-gray-500 mt-1">
                              Lead assigned to: {followup.assignedToName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {followup.status === "pending" && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleCompleteFollowup(followup)}
                            className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium flex items-center gap-1 transition-colors"
                          >
                            <FaCheckCircle className="text-xs" />
                            Complete
                          </button>
                          <button
                            onClick={() => {
                              const newDate = prompt("Enter new date (YYYY-MM-DD):", followup.date);
                              if (newDate) handleRescheduleFollowup(followup, newDate);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-1 transition-colors"
                          >
                            <FaCalendarAlt className="text-xs" />
                            Reschedule
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this follow-up?")) {
                                handleDeleteFollowup(followup);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-1 transition-colors"
                          >
                            <FaTrash className="text-xs" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {showScheduleFollowup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 rounded-lg">
                  <FaCalendarAlt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                    Schedule New Follow-Up
                  </h2>
                  <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                    Create a new follow-up reminder
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScheduleFollowup(false);
                  setScheduleFollowupForm({
                    leadId: "",
                    type: "phone_call",
                    date: "",
                    time: "",
                    priority: "medium",
                    notes: "",
                  });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 [.dark_&]:hover:bg-slate-700 text-gray-500 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleScheduleFollowup} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Select Lead */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaUserTie className="text-indigo-500" />
                    Select Lead <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheduleFollowupForm.leadId}
                    onChange={(e) => setScheduleFollowupForm({ ...scheduleFollowupForm, leadId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="">-- Select a Lead --</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.customerName} {lead.companyName && `(${lead.companyName})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 [.dark_&]:text-gray-500">{leads.length} leads available</p>
                </div>

                {/* Follow-Up Type */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaPhoneAlt className="text-purple-500" />
                    Follow-Up Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "phone_call", label: "Call", icon: FaPhone, color: "bg-purple-500" },
                      { value: "email", label: "Email", icon: FaEnvelope, color: "bg-blue-500" },
                      { value: "meeting", label: "Meeting", icon: FaUser, color: "bg-green-500" },
                      { value: "site_visit", label: "Site Visit", icon: FaBuilding, color: "bg-orange-500" },
                      { value: "demo", label: "Demo", icon: FaBullhorn, color: "bg-indigo-500" },
                      { value: "other", label: "Other", icon: FaTag, color: "bg-gray-500" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setScheduleFollowupForm({ ...scheduleFollowupForm, type: type.value })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${scheduleFollowupForm.type === type.value
                          ? `${type.color} text-white shadow-md`
                          : "bg-gray-100 [.dark_&]:bg-slate-700 text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600"
                          }`}
                      >
                        <type.icon className="text-xs" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaCalendarAlt className="text-blue-500" />
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleFollowupForm.date}
                    onChange={(e) => setScheduleFollowupForm({ ...scheduleFollowupForm, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaClock className="text-orange-500" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleFollowupForm.time}
                    onChange={(e) => setScheduleFollowupForm({ ...scheduleFollowupForm, time: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaFlag className="text-yellow-500" />
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "low", label: "Low", color: "bg-green-500", flagColor: "text-green-500" },
                      { value: "medium", label: "Medium", color: "bg-yellow-500", flagColor: "text-yellow-500" },
                      { value: "high", label: "High", color: "bg-red-500", flagColor: "text-red-500" },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setScheduleFollowupForm({ ...scheduleFollowupForm, priority: priority.value })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${scheduleFollowupForm.priority === priority.value
                          ? `${priority.color} text-white shadow-md`
                          : "bg-gray-100 [.dark_&]:bg-slate-700 text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600"
                          }`}
                      >
                        <FaFlag className={scheduleFollowupForm.priority === priority.value ? "text-white" : priority.flagColor} />
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                    <FaEdit className="text-green-500" />
                    Notes
                  </label>
                  <textarea
                    value={scheduleFollowupForm.notes}
                    onChange={(e) => setScheduleFollowupForm({ ...scheduleFollowupForm, notes: e.target.value })}
                    placeholder="Add follow-up notes..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                <button
                  type="submit"
                  disabled={savingScheduleFollowup}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <FaCheckCircle />
                  {savingScheduleFollowup ? "Scheduling..." : "Schedule Follow-Up"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleFollowup(false);
                    setScheduleFollowupForm({
                      leadId: "",
                      type: "phone_call",
                      date: "",
                      time: "",
                      priority: "medium",
                      notes: "",
                    });
                  }}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 [.dark_&]:bg-slate-700 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600 text-gray-700 [.dark_&]:text-gray-300 font-medium flex items-center gap-2 transition-colors"
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

                {/* Row 2: Company, Potential Value, Address */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5 md:col-span-1">
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
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Potential Value (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.potentialValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          potentialValue: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
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

                {/* Row 2: Company, Potential Value, Address */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1.5 md:col-span-1">
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
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                      Potential Value (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.potentialValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          potentialValue: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 [.dark_&]:focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
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

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                Assign Leads
              </h2>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mb-4">
                Assign <strong>{selectedLeads.size}</strong> lead{selectedLeads.size > 1 ? "s" : ""} to a team member.
              </p>
              <select
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2.5 px-4 text-sm text-gray-900 [.dark_&]:text-white"
              >
                <option value="">Select team member</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
              <Button variant="secondary" onClick={() => setShowBulkAssignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={isBulkProcessing || !bulkAssignee}
                className={buttonClass}
              >
                {isBulkProcessing ? "Assigning..." : "Assign Leads"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Profile Modal */}
      {showProfileModal && selectedLead && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                  <FaUser className="text-indigo-600 [.dark_&]:text-indigo-400 text-xl" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                    {selectedLead.customerName}
                  </h2>
                  <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                    {selectedLead.companyName}
                  </p>
                </div>
                <span
                  className={`ml-3 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    selectedLead.status
                  )}`}
                >
                  {selectedLead.status}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setShowAddFollowup(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 [.dark_&]:border-white/10">
              <button
                onClick={() => setActiveProfileTab("details")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${activeProfileTab === "details"
                  ? "text-indigo-600 [.dark_&]:text-indigo-400 border-b-2 border-indigo-600"
                  : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                  }`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveProfileTab("followups")}
                className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeProfileTab === "followups"
                  ? "text-indigo-600 [.dark_&]:text-indigo-400 border-b-2 border-indigo-600"
                  : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                  }`}
              >
                <FaBell className="text-xs" />
                Follow-ups
                {followups.length > 0 && (
                  <span className="bg-indigo-100 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                    {followups.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeProfileTab === "details" ? (
                /* Profile Details Tab */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Lead Date</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        {selectedLead.date || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Contact Number</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaPhone className="text-gray-400" />
                        {selectedLead.contactNumber || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Email</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaEnvelope className="text-gray-400" />
                        {selectedLead.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Address</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400" />
                        {selectedLead.address || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Product of Interest</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaBoxOpen className="text-gray-400" />
                        {selectedLead.productOfInterest || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Sector</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaIndustry className="text-gray-400" />
                        {selectedLead.sector || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Source of Lead</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaBullhorn className="text-gray-400" />
                        {selectedLead.sourceOfLead || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Priority</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedLead.priority)}`}>
                        {selectedLead.priority}
                      </span>
                    </div>
                  </div>
                  {selectedLead.notes && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-900 [.dark_&]:text-white bg-gray-50 [.dark_&]:bg-slate-800 p-3 rounded-lg">
                        {selectedLead.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Follow-ups Tab */
                <div>
                  {/* Add Follow-up Button */}
                  {!showAddFollowup && (
                    <button
                      onClick={() => setShowAddFollowup(true)}
                      className="mb-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <FaPlus className="text-xs" />
                      Add Follow-up
                    </button>
                  )}

                  {/* Add Follow-up Form */}
                  {showAddFollowup && (
                    <form onSubmit={handleAddFollowup} className="mb-6 p-4 bg-gray-50 [.dark_&]:bg-slate-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 [.dark_&]:text-white mb-3">
                        Schedule Follow-up
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                            Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={followupForm.date}
                            onChange={(e) => setFollowupForm({ ...followupForm, date: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                            Status
                          </label>
                          <select
                            value={followupForm.status}
                            onChange={(e) => setFollowupForm({ ...followupForm, status: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                          Notes <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={followupForm.notes}
                          onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                          placeholder="Enter follow-up notes..."
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={savingFollowup}
                          className={buttonClass}
                        >
                          {savingFollowup ? "Saving..." : "Save Follow-up"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setShowAddFollowup(false);
                            setFollowupForm({ date: "", notes: "", status: "pending" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Follow-up Timeline */}
                  {loadingFollowups ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : followups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 [.dark_&]:text-gray-400">
                      <FaBell className="text-4xl mx-auto mb-3 opacity-50" />
                      <p>No follow-ups scheduled yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                        Follow-up History
                      </h4>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 [.dark_&]:bg-gray-700"></div>

                        {followups.map((followup, index) => (
                          <div key={followup.id} className="relative pl-10 pb-6 last:pb-0">
                            {/* Timeline dot */}
                            <div className={`absolute left-2.5 w-3 h-3 rounded-full ${followup.status === "completed"
                              ? "bg-green-500"
                              : followup.status === "rescheduled"
                                ? "bg-yellow-500"
                                : "bg-indigo-500"
                              }`}></div>

                            <div className="bg-gray-50 [.dark_&]:bg-slate-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                  {followup.date}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${followup.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : followup.status === "rescheduled"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-indigo-100 text-indigo-800"
                                  }`}>
                                  {followup.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                                {followup.notes}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowAddFollowup(false);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowProfileModal(false);
                  openEdit(selectedLead);
                }}
                className={buttonClass}
              >
                <FaEdit className="mr-2" /> Edit Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadManagement;

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  FaCog,
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
  getDoc,
  setDoc,
} from "firebase/firestore";

import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import LeadFormModal from "../../components/LeadManagement/LeadFormModal";
import SettingsSection from "../../components/LeadManagement/SettingsSection";
import AddSettingModal from "../../components/LeadManagement/AddSettingModal";
import ScheduleFollowupModal from "../../components/LeadManagement/ScheduleFollowupModal";
import ViewLeadModal from "../../components/LeadManagement/ViewLeadModal";
import RescheduleFollowupModal from "../../components/LeadManagement/RescheduleFollowupModal";
import CompleteFollowupModal from "../../components/LeadManagement/CompleteFollowupModal";
import LeadList from "../../components/LeadManagement/LeadList";
import FollowupList from "../../components/LeadManagement/FollowupList";



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
  const navigate = useNavigate();
  const { buttonClass, iconColor } = useThemeStyles();

  // Authentication Check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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
    time: "10:00",
    notes: "",
    status: "pending",
  });
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleFollowup, setRescheduleFollowup] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: "",
    time: "",
    reason: "",
  });

  // Complete Follow-up Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeFollowup, setCompleteFollowup] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    outcome: "",
    completionNotes: "",
  });

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

  // Settings States
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [leadPriorities, setLeadPriorities] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [followupTypes, setFollowupTypes] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [settingType, setSettingType] = useState(""); // 'status', 'priority', 'source', 'followupType', 'sector', 'productCategory', 'product'
  const [newSettingValue, setNewSettingValue] = useState("");

  // Settings UI Enhancement States
  const [activeSettingsTab, setActiveSettingsTab] = useState("lead"); // 'lead', 'product', 'followup'
  const [editingItem, setEditingItem] = useState(null); // Format: 'type-index' e.g., 'status-0'
  const [editValue, setEditValue] = useState("");

  // Notification States (Reminders & Alerts)
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // --- Fetch Settings ---
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const settingsDoc = await getDoc(doc(db, "leadSettings", "config"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setLeadStatuses(data.statuses || ["New", "Contacted", "Qualified", "Negotiation", "Closed", "Lost"]);
          setLeadPriorities(data.priorities || ["Low", "Medium", "High", "Urgent"]);
          setLeadSources(data.sources || ["Website", "Referral", "Social Media", "Cold Call", "Trade Show", "Partner"]);
          setFollowupTypes(data.followupTypes || ["Phone Call", "Email", "Meeting", "Demo", "Proposal"]);
          setSectors(data.sectors || SECTOR_OPTIONS);
          setProductCategories(data.productCategories || PRODUCT_CATEGORY_OPTIONS);
          setProducts(data.products || PRODUCT_OF_INTEREST_OPTIONS);
        } else {
          // Initialize with defaults if doesn't exist
          const defaults = {
            statuses: ["New", "Contacted", "Qualified", "Negotiation", "Closed", "Lost"],
            priorities: ["Low", "Medium", "High", "Urgent"],
            sources: ["Website", "Referral", "Social Media", "Cold Call", "Trade Show", "Partner"],
            followupTypes: ["Phone Call", "Email", "Meeting", "Demo", "Proposal"],
            sectors: SECTOR_OPTIONS,
            productCategories: PRODUCT_CATEGORY_OPTIONS,
            products: PRODUCT_OF_INTEREST_OPTIONS, // Add this line
          };
          await setDoc(doc(db, "leadSettings", "config"), defaults);
          setLeadStatuses(defaults.statuses);
          setLeadPriorities(defaults.priorities);
          setLeadSources(defaults.sources);
          setFollowupTypes(defaults.followupTypes);
          setSectors(defaults.sectors);
          setProductCategories(defaults.productCategories);
          setProducts(defaults.products); // Add this line
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
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

  // --- Helper: Get Follow-up Notification Status ---
  const getFollowupNotificationStatus = (followupDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followup = new Date(followupDate);
    followup.setHours(0, 0, 0, 0);

    const diffTime = followup - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { type: 'overdue', days: Math.abs(diffDays), color: 'red', priority: 1 };
    if (diffDays === 0) return { type: 'today', days: 0, color: 'yellow', priority: 2 };
    if (diffDays === 1) return { type: 'tomorrow', days: 1, color: 'yellow', priority: 3 };
    if (diffDays <= 3) return { type: 'upcoming', days: diffDays, color: 'green', priority: 4 };
    return { type: 'future', days: diffDays, color: 'gray', priority: 5 };
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

  // --- Settings Usage Stats ---
  const settingsUsageStats = useMemo(() => {
    const stats = {
      status: {},
      priority: {},
      source: {},
      sector: {},
      productCategory: {},
      product: {},
      followupType: {}
    };

    leads.forEach(lead => {
      if (lead.status) stats.status[lead.status] = (stats.status[lead.status] || 0) + 1;
      if (lead.priority) stats.priority[lead.priority] = (stats.priority[lead.priority] || 0) + 1;
      if (lead.sourceOfLead) stats.source[lead.sourceOfLead] = (stats.source[lead.sourceOfLead] || 0) + 1;
      if (lead.sector) stats.sector[lead.sector] = (stats.sector[lead.sector] || 0) + 1;
      if (lead.productCategory) stats.productCategory[lead.productCategory] = (stats.productCategory[lead.productCategory] || 0) + 1;
      if (lead.productOfInterest) stats.product[lead.productOfInterest] = (stats.product[lead.productOfInterest] || 0) + 1;
    });

    if (allFollowups) {
      allFollowups.forEach(f => {
        if (f.type) stats.followupType[f.type] = (stats.followupType[f.type] || 0) + 1;
      });
    }

    return stats;
  }, [leads, allFollowups]);

  // --- Generate Notifications from Follow-ups ---
  useEffect(() => {
    const generateNotifications = () => {
      const alerts = [];

      allFollowups.forEach(followup => {
        if (followup.status !== 'completed') {
          const status = getFollowupNotificationStatus(followup.date);

          // Only show overdue, today, and tomorrow
          if (status.type === 'overdue' || status.type === 'today' || status.type === 'tomorrow') {
            alerts.push({
              id: followup.id,
              leadId: followup.leadId,
              leadName: followup.leadName || followup.customerName,
              companyName: followup.companyName,
              date: followup.date,
              time: followup.time,
              notes: followup.notes,
              type: followup.type,
              status: status,
              read: false
            });
          }
        }
      });

      // Sort: overdue first (priority 1), then today (priority 2), then tomorrow (priority 3)
      alerts.sort((a, b) => {
        if (a.status.priority !== b.status.priority) {
          return a.status.priority - b.status.priority;
        }
        return new Date(a.date) - new Date(b.date);
      });

      setNotifications(alerts);
      setUnreadCount(alerts.length);
    };

    if (allFollowups.length > 0) {
      generateNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
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

  const handleAddSubmit = async (e, submissionData) => {
    if (e) e.preventDefault();
    const dataToSubmit = submissionData || formData;
    const errs = validateForm(dataToSubmit);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await addDoc(collection(db, "leads"), {
        ...dataToSubmit,
        createdBy: auth.currentUser?.uid,
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

  const handleEditSubmit = async (e, submissionData) => {
    if (e) e.preventDefault();
    const dataToSubmit = submissionData || formData;
    const errs = validateForm(dataToSubmit);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await updateDoc(doc(db, "leads", selectedLead.id), {
        ...dataToSubmit,
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
      setFollowupForm({ date: "", time: "10:00", notes: "", status: "pending" });

      // Refresh follow-ups
      openProfile(selectedLead);
    } catch (e) {
      console.error("Error adding follow-up:", e);
      toast.error("Failed to add follow-up");
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleRescheduleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleForm.date) {
      toast.error("Please select a new date");
      return;
    }

    setSavingFollowup(true);
    try {
      // Update existing follow-up with new date and add to reschedule history
      const followupRef = doc(db, "leads", selectedLead.id, "followups", rescheduleFollowup.id);

      // Get existing reschedule history or initialize empty array
      const existingHistory = rescheduleFollowup.rescheduleHistory || [];

      // Add new history entry
      const historyEntry = {
        from: rescheduleFollowup.date,
        to: rescheduleForm.date,
        reason: rescheduleForm.reason || "Rescheduled",
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: auth.currentUser?.uid || "unknown",
      };

      await updateDoc(followupRef, {
        date: rescheduleForm.date,
        time: rescheduleForm.time || "10:00",
        status: "rescheduled",
        rescheduleHistory: [...existingHistory, historyEntry],
        updatedAt: serverTimestamp(),
      });

      // Also update the lead's followUpDate
      await updateDoc(doc(db, "leads", selectedLead.id), {
        followUpDate: rescheduleForm.date,
        updatedAt: serverTimestamp(),
      });

      toast.success("Follow-up rescheduled successfully");
      setShowRescheduleModal(false);
      setRescheduleForm({ date: "", time: "", reason: "" });
      setRescheduleFollowup(null);

      // Refresh follow-ups
      openProfile(selectedLead);
    } catch (e) {
      console.error("Error rescheduling follow-up:", e);
      toast.error("Failed to reschedule follow-up");
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleCompleteFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!completeForm.outcome) {
      toast.error("Please select an outcome");
      return;
    }

    setSavingFollowup(true);
    try {
      const followupRef = doc(db, "leads", selectedLead.id, "followups", completeFollowup.id);

      await updateDoc(followupRef, {
        status: "completed",
        outcome: completeForm.outcome,
        completionNotes: completeForm.completionNotes,
        completedAt: serverTimestamp(),
        completedBy: auth.currentUser?.uid || "unknown",
      });

      toast.success("Follow-up marked as completed");
      setShowCompleteModal(false);
      setCompleteForm({ outcome: "", completionNotes: "" });
      setCompleteFollowup(null);

      // Refresh follow-ups
      openProfile(selectedLead);
    } catch (e) {
      console.error("Error completing follow-up:", e);
      toast.error("Failed to complete follow-up");
    } finally {
      setSavingFollowup(false);
    }
  };

  // --- Settings Handlers ---
  const handleAddSetting = async () => {
    if (!newSettingValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const settingsDocRef = doc(db, "leadSettings", "config");
      const settingsDoc = await getDoc(settingsDocRef);
      const currentData = settingsDoc.data() || {};

      let updatedArray = [];
      let fieldName = "";

      switch (settingType) {
        case "status":
          fieldName = "statuses";
          updatedArray = [...(currentData.statuses || []), newSettingValue];
          setLeadStatuses(updatedArray);
          break;
        case "priority":
          fieldName = "priorities";
          updatedArray = [...(currentData.priorities || []), newSettingValue];
          setLeadPriorities(updatedArray);
          break;
        case "source":
          fieldName = "sources";
          updatedArray = [...(currentData.sources || []), newSettingValue];
          setLeadSources(updatedArray);
          break;
        case "sector":
          fieldName = "sectors";
          updatedArray = [...(currentData.sectors || []), newSettingValue];
          setSectors(updatedArray);
          break;
        case "productCategory":
          fieldName = "productCategories";
          updatedArray = [...(currentData.productCategories || []), newSettingValue];
          setProductCategories(updatedArray);
          break;
        case "product":
          fieldName = "products";
          updatedArray = [...(currentData.products || []), newSettingValue];
          setProducts(updatedArray);
          break;
        case "followupType":
          fieldName = "followupTypes";
          updatedArray = [...(currentData.followupTypes || []), newSettingValue];
          setFollowupTypes(updatedArray);
          break;
        default:
          break;
      }

      await updateDoc(settingsDocRef, { [fieldName]: updatedArray });
      toast.success("Setting added successfully");
      setShowAddSettingModal(false);
      setNewSettingValue("");
      setSettingType("");
    } catch (error) {
      console.error("Error adding setting:", error);
      toast.error("Failed to add setting");
    }
  };

  // --- Follow-up Handlers ---
  const handleDeleteProfileFollowup = async (followup) => {
    if (window.confirm("Delete this follow-up?")) {
      try {
        const followupRef = doc(db, "leads", selectedLead.id, "followups", followup.id);
        await deleteDoc(followupRef);
        toast.success("Follow-up deleted");

        // Refresh followups
        // We reuse openProfile to fetch fresh data
        openProfile(selectedLead);
      } catch (e) {
        console.error(e);
        toast.error("Failed to delete follow-up");
      }
    }
  };

  const handleDeleteGeneralFollowup = async (followup) => {
    if (window.confirm("Delete this follow-up?")) {
      try {
        if (!followup.leadId) {
          toast.error("Cannot delete: Lead ID missing on follow-up record");
          return;
        }
        const followupRef = doc(db, "leads", followup.leadId, "followups", followup.id);
        await deleteDoc(followupRef);
        toast.success("Follow-up deleted");

        // Update local state
        setAllFollowups(prev => prev.filter(f => f.id !== followup.id));
      } catch (e) {
        console.error(e);
        toast.error("Failed to delete follow-up");
      }
    }
  };

  const handleDeleteSetting = async (type, value) => {
    if (!window.confirm(`Delete "${value}"?`)) return;

    try {
      const settingsDocRef = doc(db, "leadSettings", "config");
      const settingsDoc = await getDoc(settingsDocRef);
      const currentData = settingsDoc.data() || {};

      let updatedArray = [];
      let fieldName = "";

      switch (type) {
        case "status":
          fieldName = "statuses";
          updatedArray = (currentData.statuses || []).filter(s => s !== value);
          setLeadStatuses(updatedArray);
          break;
        case "priority":
          fieldName = "priorities";
          updatedArray = (currentData.priorities || []).filter(p => p !== value);
          setLeadPriorities(updatedArray);
          break;
        case "source":
          fieldName = "sources";
          updatedArray = (currentData.sources || []).filter(s => s !== value);
          setLeadSources(updatedArray);
          break;
        case "sector":
          fieldName = "sectors";
          updatedArray = (currentData.sectors || []).filter(s => s !== value);
          setSectors(updatedArray);
          break;
        case "productCategory":
          fieldName = "productCategories";
          updatedArray = (currentData.productCategories || []).filter(p => p !== value);
          setProductCategories(updatedArray);
          break;
        case "product":
          fieldName = "products";
          updatedArray = (currentData.products || []).filter(p => p !== value);
          setProducts(updatedArray);
          break;
        case "followupType":
          fieldName = "followupTypes";
          updatedArray = (currentData.followupTypes || []).filter(t => t !== value);
          setFollowupTypes(updatedArray);
          break;
        default:
          break;
      }

      await updateDoc(settingsDocRef, { [fieldName]: updatedArray });
      toast.success("Setting deleted successfully");
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error("Failed to delete setting");
    }
  };

  // --- Inline Edit Setting ---
  const handleEditSetting = async (type, oldValue, newValue) => {
    if (!newValue.trim()) {
      toast.error("Value cannot be empty");
      setEditingItem(null);
      return;
    }

    if (oldValue === newValue) {
      setEditingItem(null);
      return;
    }

    try {
      const settingsRef = doc(db, "leadSettings", "config");
      const settingsDoc = await getDoc(settingsRef);
      const currentData = settingsDoc.data();

      let fieldName, updatedArray;
      switch (type) {
        case "status":
          fieldName = "statuses";
          updatedArray = (currentData.statuses || []).map(s => s === oldValue ? newValue : s);
          setLeadStatuses(updatedArray);
          break;
        case "priority":
          fieldName = "priorities";
          updatedArray = (currentData.priorities || []).map(p => p === oldValue ? newValue : p);
          setLeadPriorities(updatedArray);
          break;
        case "source":
          fieldName = "sources";
          updatedArray = (currentData.sources || []).map(s => s === oldValue ? newValue : s);
          setLeadSources(updatedArray);
          break;
        case "sector":
          fieldName = "sectors";
          updatedArray = (currentData.sectors || []).map(s => s === oldValue ? newValue : s);
          setSectors(updatedArray);
          break;
        case "productCategory":
          fieldName = "productCategories";
          updatedArray = (currentData.productCategories || []).map(p => p === oldValue ? newValue : p);
          setProductCategories(updatedArray);
          break;
        case "product":
          fieldName = "products";
          updatedArray = (currentData.products || []).map(p => p === oldValue ? newValue : p);
          setProducts(updatedArray);
          break;
        case "followupType":
          fieldName = "followupTypes";
          updatedArray = (currentData.followupTypes || []).map(t => t === oldValue ? newValue : t);
          setFollowupTypes(updatedArray);
          break;
        default:
          return;
      }

      await updateDoc(settingsRef, { [fieldName]: updatedArray });
      setEditingItem(null);
      toast.success("Updated successfully");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  // --- Reorder Settings (Drag & Drop) ---
  const handleReorderSettings = async (result, type) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    try {
      let items, setItems, fieldName;

      switch (type) {
        case "status":
          items = Array.from(leadStatuses);
          setItems = setLeadStatuses;
          fieldName = "statuses";
          break;
        case "priority":
          items = Array.from(leadPriorities);
          setItems = setLeadPriorities;
          fieldName = "priorities";
          break;
        case "source":
          items = Array.from(leadSources);
          setItems = setLeadSources;
          fieldName = "sources";
          break;
        case "sector":
          items = Array.from(sectors);
          setItems = setSectors;
          fieldName = "sectors";
          break;
        case "productCategory":
          items = Array.from(productCategories);
          setItems = setProductCategories;
          fieldName = "productCategories";
          break;
        case "product":
          items = Array.from(products);
          setItems = setProducts;
          fieldName = "products";
          break;
        case "followupType":
          items = Array.from(followupTypes);
          setItems = setFollowupTypes;
          fieldName = "followupTypes";
          break;
        default:
          return;
      }

      const [reorderedItem] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, reorderedItem);

      setItems(items);

      await updateDoc(doc(db, "leadSettings", "config"), {
        [fieldName]: items
      });

      toast.success("Order updated");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to update order");
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
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 [.dark_&]:text-gray-300">
            Tracker for potential clients and business opportunities.
          </span>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 [.dark_&]:text-gray-300 [.dark_&]:hover:text-white transition-colors rounded-lg hover:bg-gray-100 [.dark_&]:hover:bg-slate-700"
              title="Follow-up Reminders"
            >
              <FaBell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </PageHeader>

      {/* View Toggle: Leads / Follow-ups / Settings */}
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
          <button
            onClick={() => setActiveView("settings")}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeView === "settings"
              ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
              : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
              }`}
          >
            <FaCog className="text-sm" />
            Settings
          </button>
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />

          {/* Panel */}
          <div className="fixed top-20 right-4 z-50 w-96 bg-white [.dark_&]:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 [.dark_&]:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 [.dark_&]:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 [.dark_&]:from-slate-700 [.dark_&]:to-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                    <FaBell className="text-blue-600 [.dark_&]:text-blue-400" />
                    Follow-up Reminders
                  </h3>
                  <p className="text-xs text-gray-600 [.dark_&]:text-gray-300 mt-1">
                    {unreadCount} {unreadCount === 1 ? 'reminder' : 'reminders'} pending
                  </p>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <HiXMark className="h-5 w-5 text-gray-500 [.dark_&]:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 [.dark_&]:text-gray-400">
                  <FaCheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No pending follow-ups</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      const lead = leads.find(l => l.id === notif.leadId);
                      if (lead) {
                        openProfile(lead);
                        setShowNotifications(false);
                      }
                    }}
                    className={`p-4 border-b border-gray-100 [.dark_&]:border-slate-700 hover:bg-gray-50 [.dark_&]:hover:bg-slate-700/50 cursor-pointer transition-colors ${notif.status.type === 'overdue' ? 'bg-red-50 [.dark_&]:bg-red-900/10 border-l-4 border-l-red-500' :
                      notif.status.type === 'today' ? 'bg-yellow-50 [.dark_&]:bg-yellow-900/10 border-l-4 border-l-yellow-500' :
                        'bg-green-50 [.dark_&]:bg-green-900/10 border-l-4 border-l-green-500'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${notif.status.type === 'overdue' ? 'text-red-600 [.dark_&]:text-red-400' :
                        notif.status.type === 'today' ? 'text-yellow-600 [.dark_&]:text-yellow-400' :
                          'text-green-600 [.dark_&]:text-green-400'
                        }`}>
                        <FaBell className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 [.dark_&]:text-white truncate">
                          {notif.leadName}
                        </p>
                        {notif.companyName && (
                          <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 truncate">
                            {notif.companyName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs font-medium ${notif.status.type === 'overdue' ? 'text-red-700 [.dark_&]:text-red-300' :
                            notif.status.type === 'today' ? 'text-yellow-700 [.dark_&]:text-yellow-300' :
                              'text-green-700 [.dark_&]:text-green-300'
                            }`}>
                            {notif.status.type === 'overdue' && `⚠️ ${notif.status.days} day${notif.status.days > 1 ? 's' : ''} overdue`}
                            {notif.status.type === 'today' && '🔔 Due today'}
                            {notif.status.type === 'tomorrow' && '📅 Due tomorrow'}
                          </p>
                          <span className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                            • {notif.date} {notif.time && `at ${notif.time}`}
                          </span>
                        </div>
                        {notif.notes && (
                          <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-1 truncate">
                            {notif.notes}
                          </p>
                        )}
                      </div>

                      <button className="text-blue-600 [.dark_&]:text-blue-400 text-xs font-medium hover:underline">
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 [.dark_&]:border-slate-700 bg-gray-50 [.dark_&]:bg-slate-900/50">
                <button
                  onClick={() => {
                    setActiveView('followups');
                    setShowNotifications(false);
                  }}
                  className="w-full text-center text-sm text-blue-600 [.dark_&]:text-blue-400 hover:underline font-medium"
                >
                  View all follow-ups →
                </button>
              </div>
            )}
          </div>
        </>
      )}

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

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 [.dark_&]:border-gray-600 rounded-lg bg-white [.dark_&]:bg-slate-800 text-gray-900 [.dark_&]:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* View Toggle */}
            <div className="flex bg-surface-subtle [.dark_&]:bg-slate-700/50 p-1 rounded-lg border border-subtle">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${viewMode === "table"
                  ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
                  : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                  }`}
                title="Table View"
              >
                <FaList />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-md transition-all ${viewMode === "kanban"
                  ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400"
                  : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                  }`}
                title="Kanban View"
              >
                <FaTh />
              </button>
            </div>

            {/* Create Lead Button */}
            <Button
              onClick={() => {
                resetForm();
                setSelectedLead(null);
                setShowAddForm(true);
              }}
              className={buttonClass}
            >
              <FaPlus className="mr-2" />
              Create Lead
            </Button>
          </div>

          {/* Content */}
          <LeadList
            viewMode={viewMode}
            currentRows={currentRows}
            filteredLeads={filteredLeads}
            selectedLeads={selectedLeads}
            setSelectedLeads={setSelectedLeads}
            leadStatuses={leadStatuses || []} // Defaulting to empty if undefined
            LEAD_STATUSES={leadStatuses || []} // Reuse same settings
            sortConfig={sortConfig}
            handleSort={handleSort}
            handleDragEnd={onDragEnd}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            openProfile={openProfile}
            openView={openView}
            openEdit={openEdit}
            setShowScheduleFollowup={setShowScheduleFollowup}
            setScheduleFollowupForm={setScheduleFollowupForm}
            setSelectedLead={setSelectedLead}
            setShowDeleteModal={setShowDeleteModal}
            setShowBulkAssignModal={setShowBulkAssignModal}
            setShowBulkStatusModal={setShowBulkStatusModal}
            setShowBulkDeleteModal={setShowBulkDeleteModal}
            getFollowUpStatus={getFollowUpStatus}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
          />
        </div>
      )}

      {/* Follow-ups View */}
      {activeView === "followups" && (
        <div className="space-y-6 mt-6">
          <FollowupList
            followupStats={followupStats}
            followupFilter={followupFilter}
            setFollowupFilter={setFollowupFilter}
            loadingAllFollowups={loadingAllFollowups}
            filteredFollowups={filteredFollowups}
            setShowScheduleFollowup={setShowScheduleFollowup}
            getFollowupNotificationStatus={getFollowupNotificationStatus}
            getFollowUpStatus={getFollowUpStatus}
            handleCompleteFollowup={(followup) => {
              const lead = leads.find(l => l.id === followup.leadId);
              if (lead) {
                setSelectedLead(lead);
                setCompleteFollowup(followup);
                setCompleteForm({ outcome: "", completionNotes: "" });
                setShowCompleteModal(true);
              } else {
                toast.error("Lead not found for this follow-up");
              }
            }}
            handleRescheduleFollowup={(followup) => {
              const lead = leads.find(l => l.id === followup.leadId);
              if (lead) {
                setSelectedLead(lead);
                setRescheduleFollowup(followup);
                setRescheduleForm({
                  date: followup.date,
                  time: "10:00",
                  reason: ""
                });
                setShowRescheduleModal(true);
              } else {
                toast.error("Lead not found for this follow-up");
              }
            }}
            handleDeleteProfileFollowup={handleDeleteGeneralFollowup}
            getPriorityColor={(priority) => {
              switch (priority?.toLowerCase()) {
                case "high": return "text-red-600 bg-red-100 border-red-200";
                case "medium": return "text-yellow-600 bg-yellow-100 border-yellow-200";
                case "low": return "text-green-600 bg-green-100 border-green-200";
                default: return "text-gray-600 bg-gray-100 border-gray-200";
              }
            }}
          />
        </div>
      )}

      {/* Settings View */}
      {
        activeView === "settings" && (
          <div className="space-y-6 mt-6">
            <div className="bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 rounded-xl">
                  <FaCog className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 [.dark_&]:text-white">
                    Lead Management Settings
                  </h2>
                  <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                    Configure lead statuses, priorities, and other options
                  </p>
                </div>
              </div>

              {/* Tabbed Navigation */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 [.dark_&]:border-gray-700">
                <button
                  onClick={() => setActiveSettingsTab('lead')}
                  className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeSettingsTab === 'lead'
                    ? 'border-blue-600 text-blue-600 [.dark_&]:text-blue-400 bg-blue-50 [.dark_&]:bg-blue-900/20'
                    : 'border-transparent text-gray-600 [.dark_&]:text-gray-400 hover:text-gray-900 [.dark_&]:hover:text-white hover:bg-gray-50 [.dark_&]:hover:bg-slate-700/50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FaUserTie />
                    Lead Settings
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(leadStatuses.length + leadPriorities.length + leadSources.length) === 0
                      ? 'bg-red-100 text-red-700 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400'
                      : (leadStatuses.length + leadPriorities.length + leadSources.length) < 10
                        ? 'bg-yellow-100 text-yellow-700 [.dark_&]:bg-yellow-900/30 [.dark_&]:text-yellow-400'
                        : 'bg-green-100 text-green-700 [.dark_&]:bg-green-900/30 [.dark_&]:text-green-400'
                      }`}>
                      {leadStatuses.length + leadPriorities.length + leadSources.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveSettingsTab('product')}
                  className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeSettingsTab === 'product'
                    ? 'border-purple-600 text-purple-600 [.dark_&]:text-purple-400 bg-purple-50 [.dark_&]:bg-purple-900/20'
                    : 'border-transparent text-gray-600 [.dark_&]:text-gray-400 hover:text-gray-900 [.dark_&]:hover:text-white hover:bg-gray-50 [.dark_&]:hover:bg-slate-700/50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FaBoxOpen />
                    Product Settings
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(sectors.length + productCategories.length + products.length) === 0
                      ? 'bg-red-100 text-red-700 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400'
                      : (sectors.length + productCategories.length + products.length) < 10
                        ? 'bg-yellow-100 text-yellow-700 [.dark_&]:bg-yellow-900/30 [.dark_&]:text-yellow-400'
                        : 'bg-green-100 text-green-700 [.dark_&]:bg-green-900/30 [.dark_&]:text-green-400'
                      }`}>
                      {sectors.length + productCategories.length + products.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveSettingsTab('followup')}
                  className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeSettingsTab === 'followup'
                    ? 'border-indigo-600 text-indigo-600 [.dark_&]:text-indigo-400 bg-indigo-50 [.dark_&]:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 [.dark_&]:text-gray-400 hover:text-gray-900 [.dark_&]:hover:text-white hover:bg-gray-50 [.dark_&]:hover:bg-slate-700/50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FaPhoneAlt />
                    Follow-up Settings
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${followupTypes.length === 0
                      ? 'bg-red-100 text-red-700 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-400'
                      : followupTypes.length < 4
                        ? 'bg-yellow-100 text-yellow-700 [.dark_&]:bg-yellow-900/30 [.dark_&]:text-yellow-400'
                        : 'bg-green-100 text-green-700 [.dark_&]:bg-green-900/30 [.dark_&]:text-green-400'
                      }`}>
                      {followupTypes.length}
                    </span>
                  </div>
                </button>
              </div>

              {/* Settings Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEAD SETTINGS TAB */}
                {activeSettingsTab === 'lead' && (
                  <>
                    {/* Lead Statuses */}
                    <SettingsSection
                      title="Lead Statuses"
                      icon={FaFlag}
                      iconColor="text-blue-600 [.dark_&]:text-blue-400"
                      items={leadStatuses}
                      type="status"
                      description="Manage available lead status options"
                      emptyMessage="No statuses defined"
                      emptySuggestions="Add your first status to get started. Try: New, Contacted, Qualified"
                      onAdd={() => {
                        setSettingType('status');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-blue-500',
                        inputBg: 'bg-blue-50 [.dark_&]:bg-blue-900/20',
                        inputBorder: 'border-blue-300 [.dark_&]:border-blue-600'
                      }}
                      usageCounts={settingsUsageStats.status}
                    />

                    {/* Lead Priorities */}
                    <SettingsSection
                      title="Priority Levels"
                      icon={FaExclamationTriangle}
                      iconColor="text-orange-600 [.dark_&]:text-orange-400"
                      items={leadPriorities}
                      type="priority"
                      description="Configure priority levels for leads"
                      emptyMessage="No priorities defined"
                      emptySuggestions="Add priority levels. Try: Low, Medium, High, Urgent"
                      onAdd={() => {
                        setSettingType('priority');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-orange-500',
                        inputBg: 'bg-orange-50 [.dark_&]:bg-orange-900/20',
                        inputBorder: 'border-orange-300 [.dark_&]:border-orange-600'
                      }}
                      usageCounts={settingsUsageStats.priority}
                    />

                    {/* Lead Sources */}
                    <SettingsSection
                      title="Lead Sources"
                      icon={FaBullhorn}
                      iconColor="text-green-600 [.dark_&]:text-green-400"
                      items={leadSources}
                      type="source"
                      description="Manage where leads come from"
                      emptyMessage="No sources defined"
                      emptySuggestions="Add lead sources. Try: Website, Referral, Social Media"
                      onAdd={() => {
                        setSettingType('source');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-green-500',
                        inputBg: 'bg-green-50 [.dark_&]:bg-green-900/20',
                        inputBorder: 'border-green-300 [.dark_&]:border-green-600'
                      }}
                      usageCounts={settingsUsageStats.source}
                    />
                  </>
                )}

                {/* FOLLOW-UP SETTINGS TAB */}
                {activeSettingsTab === 'followup' && (
                  <>
                    {/* Follow-up Types */}
                    <SettingsSection
                      title="Follow-up Types"
                      icon={FaPhoneAlt}
                      iconColor="text-purple-600 [.dark_&]:text-purple-400"
                      items={followupTypes}
                      type="followupType"
                      description="Define types of follow-up activities"
                      emptyMessage="No follow-up types defined"
                      emptySuggestions="Add follow-up types. Try: Phone Call, Email, Meeting"
                      onAdd={() => {
                        setSettingType('followupType');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-purple-500',
                        inputBg: 'bg-purple-50 [.dark_&]:bg-purple-900/20',
                        inputBorder: 'border-purple-300 [.dark_&]:border-purple-600'
                      }}
                      usageCounts={settingsUsageStats.followupType}
                    />
                  </>
                )}

                {/* PRODUCT SETTINGS TAB */}
                {activeSettingsTab === 'product' && (
                  <>
                    {/* Sectors */}
                    <SettingsSection
                      title="Sectors"
                      icon={FaIndustry}
                      iconColor="text-cyan-600 [.dark_&]:text-cyan-400"
                      items={sectors}
                      type="sector"
                      description="Manage industry sectors for leads"
                      emptyMessage="No sectors defined"
                      emptySuggestions="Add sectors. Try: Manufacturing, Healthcare, Technology"
                      onAdd={() => {
                        setSettingType('sector');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-cyan-500',
                        inputBg: 'bg-cyan-50 [.dark_&]:bg-cyan-900/20',
                        inputBorder: 'border-cyan-300 [.dark_&]:border-cyan-600'
                      }}
                      usageCounts={settingsUsageStats.sector}
                    />

                    {/* Product Categories */}
                    <SettingsSection
                      title="Product Categories"
                      icon={FaTag}
                      iconColor="text-pink-600 [.dark_&]:text-pink-400"
                      items={productCategories}
                      type="productCategory"
                      description="Categorize products or services"
                      emptyMessage="No categories defined"
                      emptySuggestions="Add product categories. Try: Hardware, Software, Services"
                      onAdd={() => {
                        setSettingType('productCategory');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-pink-500',
                        inputBg: 'bg-pink-50 [.dark_&]:bg-pink-900/20',
                        inputBorder: 'border-pink-300 [.dark_&]:border-pink-600'
                      }}
                      usageCounts={settingsUsageStats.productCategory}
                    />

                    {/* Products of Interest */}
                    <SettingsSection
                      title="Products of Interest"
                      icon={FaBoxOpen}
                      iconColor="text-purple-600 [.dark_&]:text-purple-400"
                      items={products}
                      type="product"
                      description="Manage product offerings"
                      emptyMessage="No products defined"
                      emptySuggestions="Add products. Try: Hydraulic Lift, Scissor Lift, Conveyor"
                      onAdd={() => {
                        setSettingType('product');
                        setShowAddSettingModal(true);
                      }}
                      onEdit={handleEditSetting}
                      onDelete={handleDeleteSetting}
                      onReorder={handleReorderSettings}
                      editingItem={editingItem}
                      editValue={editValue}
                      setEditingItem={setEditingItem}
                      setEditValue={setEditValue}
                      colors={{
                        ring: 'ring-purple-500',
                        inputBg: 'bg-purple-50 [.dark_&]:bg-purple-900/20',
                        inputBorder: 'border-purple-300 [.dark_&]:border-purple-600'
                      }}
                      usageCounts={settingsUsageStats.product}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Schedule Follow-Up Modal */}
      <ScheduleFollowupModal
        isOpen={showScheduleFollowup}
        onClose={() => {
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
        form={scheduleFollowupForm}
        setForm={setScheduleFollowupForm}
        onSubmit={handleScheduleFollowup}
        isSubmitting={savingScheduleFollowup}
        leads={leads}
        followupTypes={followupTypes}
      />

      {/* Modals */}
      {/* Add/Edit Lead Modal - Unified Component */}
      <LeadFormModal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          resetForm();
        }}
        mode="add"
        onSubmit={(data) => {
          setFormData(data);
          handleAddSubmit(null, data);
        }}
        errors={errors}
        settings={{
          leadStatuses,
          leadPriorities,
          leadSources,
          sectors,
          productCategories,
          products,
        }}
        buttonClass={buttonClass}
      />
      {/* Edit Lead Modal - Unified Component */}
      <LeadFormModal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        mode="edit"
        initialData={selectedLead}
        onSubmit={(data) => {
          setFormData(data);
          handleEditSubmit(null, data);
        }}
        errors={errors}
        settings={{
          leadStatuses,
          leadPriorities,
          leadSources,
          sectors,
          productCategories,
          products,
        }}
        buttonClass={buttonClass}
      />

      {
        showViewModal && selectedLead && (
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
        )
      }

      {
        showDeleteModal && (
          <DeleteConfirmationModal
            title="Delete Lead"
            message={`Are you sure you want to delete ${selectedLead?.customerName}? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
          />
        )
      }

      {/* Bulk Status Change Modal */}
      {
        showBulkStatusModal && (
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
        )
      }

      {/* Bulk Delete Confirmation Modal */}
      {
        showBulkDeleteModal && (
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
        )
      }

      {/* Bulk Assign Modal */}
      {
        showBulkAssignModal && (
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
        )
      }

      {/* Lead Profile Modal */}
      <ViewLeadModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setShowAddFollowup(false);
          setActiveProfileTab("details");
        }}
        lead={selectedLead}
        activeTab={activeProfileTab}
        setActiveTab={setActiveProfileTab}
        followups={followups}
        loadingFollowups={loadingFollowups}
        showAddFollowup={showAddFollowup}
        setShowAddFollowup={setShowAddFollowup}
        followupForm={followupForm}
        setFollowupForm={setFollowupForm}
        onAddFollowup={handleAddFollowup}
        savingFollowup={savingFollowup}
        onDeleteFollowup={handleDeleteProfileFollowup}
        onReschedule={(followup) => {
          setRescheduleFollowup(followup);
          setRescheduleForm({
            date: followup.date,
            time: "10:00",
            reason: ""
          });
          setShowRescheduleModal(true);
        }}
        onComplete={(followup) => {
          setCompleteFollowup(followup);
          setCompleteForm({ outcome: "", completionNotes: "" });
          setShowCompleteModal(true);
        }}
        onEdit={(lead) => {
          setShowProfileModal(false);
          openEdit(lead);
        }}
        getStatusColor={getStatusColor}
        getPriorityColor={getPriorityColor}
      />

      {/* Reschedule Follow-up Modal */}
      <RescheduleFollowupModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setRescheduleFollowup(null);
          setRescheduleForm({ date: "", time: "", reason: "" });
        }}
        lead={selectedLead}
        rescheduleFollowup={rescheduleFollowup}
        rescheduleForm={rescheduleForm}
        setRescheduleForm={setRescheduleForm}
        onReschedule={handleRescheduleFollowupSubmit}
        isRescheduling={savingFollowup}
      />

      {/* Complete Follow-up Modal */}
      <CompleteFollowupModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setCompleteFollowup(null);
          setCompleteForm({ outcome: "", completionNotes: "" });
        }}
        lead={selectedLead}
        completeFollowup={completeFollowup}
        completeForm={completeForm}
        setCompleteForm={setCompleteForm}
        onComplete={handleCompleteFollowupSubmit}
        isCompleting={savingFollowup}
      />

      {/* Add Setting Modal */}
      <AddSettingModal
        isOpen={showAddSettingModal}
        onClose={() => {
          setShowAddSettingModal(false);
          setNewSettingValue("");
          setSettingType("");
        }}
        settingType={settingType}
        setSettingType={setSettingType}
        newSettingValue={newSettingValue}
        setNewSettingValue={setNewSettingValue}
        onAdd={handleAddSetting}
      />

      {/* Lead Form Modal - Add Mode */}
      <LeadFormModal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setErrors({});
        }}
        mode="add"
        initialData={{}}
        onSubmit={(data) => handleAddSubmit(null, data)}
        errors={errors}
        settings={{
          leadStatuses,
          leadPriorities,
          leadSources,
          sectors,
          productCategories,
          products,
        }}
        buttonClass={buttonClass}
      />

      {/* Lead Form Modal - Edit Mode */}
      <LeadFormModal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedLead(null);
          setErrors({});
        }}
        mode="edit"
        initialData={selectedLead || {}}
        onSubmit={(data) => handleEditSubmit(null, data)}
        errors={errors}
        settings={{
          leadStatuses,
          leadPriorities,
          leadSources,
          sectors,
          productCategories,
          products,
        }}
        buttonClass={buttonClass}
      />
    </div >
  );
}

export default LeadManagement;

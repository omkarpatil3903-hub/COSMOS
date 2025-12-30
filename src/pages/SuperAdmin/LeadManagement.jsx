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
} from "react-icons/fa";
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
} from "firebase/firestore";

import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

const tableHeaders = [
    { key: "srNo", label: "Sr. No.", sortable: false },
    { key: "leadName", label: "Lead Name", sortable: true },
    { key: "companyName", label: "Company", sortable: true },
    { key: "contactInfo", label: "Contact", sortable: false },
    { key: "status", label: "Status", sortable: true },
    { key: "source", label: "Source", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
];

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

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
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [viewMode, setViewMode] = useState("table");
    const [activeStatFilter, setActiveStatFilter] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        leadName: "",
        companyName: "",
        email: "",
        phone: "",
        status: "New",
        source: "",
        notes: "",
    });

    // --- Fetch Leads ---
    useEffect(() => {
        const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    leadName: data.leadName || "",
                    companyName: data.companyName || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    status: data.status || "New",
                    source: data.source || "",
                    notes: data.notes || "",
                    createdAt: data.createdAt || null,
                };
            });
            setLeads(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // --- Filter/Sort Logic ---
    const filteredLeads = useMemo(() => {
        let result = [...leads];

        // Stat Filters
        if (activeStatFilter === "won") result = result.filter(l => l.status === "Won");
        else if (activeStatFilter === "new") result = result.filter(l => l.status === "New");
        else if (activeStatFilter === "active") result = result.filter(l => !["Won", "Lost"].includes(l.status));

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(
                l =>
                    l.leadName.toLowerCase().includes(q) ||
                    l.companyName.toLowerCase().includes(q) ||
                    l.email.toLowerCase().includes(q) ||
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
    const currentRows = filteredLeads.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // --- Handlers ---
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
        }));
    };

    const validateForm = (data) => {
        const errs = {};
        if (!data.leadName.trim()) errs.leadName = "Lead Name is required";
        if (!data.companyName.trim()) errs.companyName = "Company Name is required";
        if (!data.email.trim() && !data.phone.trim()) errs.contact = "Email or Phone is required";
        return errs;
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
            setFormData({ leadName: "", companyName: "", email: "", phone: "", status: "New", source: "", notes: "" });
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
            case "New": return "bg-blue-100 text-blue-800 border-blue-200";
            case "Contacted": return "bg-purple-100 text-purple-800 border-purple-200";
            case "Qualified": return "bg-indigo-100 text-indigo-800 border-indigo-200";
            case "Proposal": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "Negotiation": return "bg-orange-100 text-orange-800 border-orange-200";
            case "Won": return "bg-green-100 text-green-800 border-green-200";
            case "Lost": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    // --- Stats Computation ---
    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === "Won").length;
        const active = leads.filter(l => !["Won", "Lost"].includes(l.status)).length;
        return { total, won, active };
    }, [leads]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <PageHeader title="Lead Management" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => setActiveStatFilter(null)} className="cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-blue-500/30 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">Total Leads</p>
                                <p className="text-3xl font-bold text-blue-900 [.dark_&]:text-white mt-1">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-100 [.dark_&]:bg-blue-500/20 flex items-center justify-center"><FaUserTie className="text-blue-600 [.dark_&]:text-blue-400 text-xl" /></div>
                        </div>
                    </div>
                    <div onClick={() => setActiveStatFilter("active")} className="cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-purple-500/30 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">Active Leads</p>
                                <p className="text-3xl font-bold text-purple-900 [.dark_&]:text-white mt-1">{stats.active}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-100 [.dark_&]:bg-purple-500/20 flex items-center justify-center"><FaClock className="text-purple-600 [.dark_&]:text-purple-400 text-xl" /></div>
                        </div>
                    </div>
                    <div onClick={() => setActiveStatFilter("won")} className="cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-green-500/30 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">Converted (Won)</p>
                                <p className="text-3xl font-bold text-green-900 [.dark_&]:text-white mt-1">{stats.won}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center"><FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" /></div>
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
                                <button onClick={() => setViewMode("table")} className={`p-2 rounded ${viewMode === "table" ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400" : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"}`}><FaTh /></button>
                                <button onClick={() => setViewMode("kanban")} className={`p-2 rounded ${viewMode === "kanban" ? "bg-white [.dark_&]:bg-slate-600 shadow text-indigo-600 [.dark_&]:text-indigo-400" : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"}`}><FaList /></button>
                            </div>
                            <Button onClick={() => setShowAddForm(true)} className={buttonClass}><FaPlus className="mr-2" /> Add Lead</Button>
                        </div>
                    </div>
                </Card>

                {/* Content */}
                {viewMode === "table" ? (
                    <Card title="Leads List">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-subtle [.dark_&]:bg-slate-800/60 border-b border-subtle">
                                    <tr>
                                        {tableHeaders.map(h => (
                                            <th key={h.key} onClick={() => h.sortable && handleSort(h.key)} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 [.dark_&]:text-gray-300 cursor-pointer hover:bg-surface-strong transition-colors">
                                                <div className="flex items-center gap-2">
                                                    {h.label}
                                                    {sortConfig.key === h.key && (sortConfig.direction === "asc" ? <FaSortAmountUpAlt /> : <FaSortAmountDownAlt />)}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-subtle">
                                    {currentRows.map((lead, idx) => (
                                        <tr key={lead.id} className="hover:bg-surface-subtle [.dark_&]:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-700 [.dark_&]:text-white">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900 [.dark_&]:text-white">{lead.leadName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">{lead.companyName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                                                <div className="flex flex-col gap-1">
                                                    {lead.email && <span className="flex items-center gap-1"><FaEnvelope className="text-xs" /> {lead.email}</span>}
                                                    {lead.phone && <span className="flex items-center gap-1"><FaPhone className="text-xs" /> {lead.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">{lead.source || "-"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openView(lead)} className="text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-800 p-1"><FaEye /></button>
                                                    <button onClick={() => openEdit(lead)} className="text-yellow-600 [.dark_&]:text-yellow-400 hover:text-yellow-800 p-1"><FaEdit /></button>
                                                    <button onClick={() => { setSelectedLead(lead); setShowDeleteModal(true); }} className="text-red-600 [.dark_&]:text-red-400 hover:text-red-800 p-1"><FaTrash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!currentRows.length && (
                                        <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500 [.dark_&]:text-gray-400">No leads found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls could be added here */}
                    </Card>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {LEAD_STATUSES.map(status => (
                            <div key={status} className="min-w-[300px] bg-surface [.dark_&]:bg-slate-800/60 rounded-xl border border-subtle flex flex-col max-h-[700px]">
                                <div className={`p-3 border-b border-subtle font-semibold flex justify-between items-center ${getStatusColor(status)} bg-opacity-20 [.dark_&]:text-white`}>
                                    {status}
                                    <span className="bg-white/50 [.dark_&]:bg-slate-700/50 px-2 py-1 rounded-full text-xs">{filteredLeads.filter(l => l.status === status).length}</span>
                                </div>
                                <div className="p-3 overflow-y-auto space-y-3 scrollbar-thin">
                                    {filteredLeads.filter(l => l.status === status).map(lead => (
                                        <div key={lead.id} className="bg-surface-strong [.dark_&]:bg-slate-700/50 p-3 rounded-lg shadow-sm border border-subtle hover:shadow-md transition-shadow cursor-pointer" onClick={() => openView(lead)}>
                                            <h4 className="font-medium text-gray-900 [.dark_&]:text-white">{lead.leadName}</h4>
                                            <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">{lead.companyName}</p>
                                            <div className="mt-2 text-xs text-gray-500 [.dark_&]:text-gray-400 flex items-center gap-2">
                                                <FaClock /> {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : 'Just now'}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-subtle">
                            <h3 className="text-lg font-semibold text-content-primary">Add New Lead</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-content-tertiary hover:text-content-primary"><FaTimesCircle /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Lead Name*</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.leadName} onChange={e => setFormData({ ...formData, leadName: e.target.value })} />
                                    {errors.leadName && <p className="text-red-500 text-xs mt-1">{errors.leadName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Company*</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                                    {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Email</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Phone</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Status</label>
                                    <select className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Source</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-content-secondary mb-1">Notes</label>
                                <textarea className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle h-24" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Add Lead</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-subtle">
                            <h3 className="text-lg font-semibold text-content-primary">Edit Lead</h3>
                            <button onClick={() => setShowEditForm(false)} className="text-content-tertiary hover:text-content-primary"><FaTimesCircle /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                            {/* Same fields as Add Form */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Lead Name*</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.leadName} onChange={e => setFormData({ ...formData, leadName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Company*</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Email</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Phone</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Status</label>
                                    <select className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-content-secondary mb-1">Source</label>
                                    <input className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-content-secondary mb-1">Notes</label>
                                <textarea className="w-full p-2 rounded-lg border border-subtle bg-surface-subtle h-24" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setShowEditForm(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Update Lead</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showViewModal && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-subtle">
                            <h3 className="text-lg font-semibold text-content-primary">{selectedLead.leadName}</h3>
                            <button onClick={() => setShowViewModal(false)} className="text-content-tertiary hover:text-content-primary"><FaTimesCircle /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-sm text-content-tertiary">Company</p><p className="font-medium text-content-primary">{selectedLead.companyName}</p></div>
                                <div><p className="text-sm text-content-tertiary">Status</p><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedLead.status)}`}>{selectedLead.status}</span></div>
                                <div><p className="text-sm text-content-tertiary">Email</p><p className="font-medium text-content-primary">{selectedLead.email || "-"}</p></div>
                                <div><p className="text-sm text-content-tertiary">Phone</p><p className="font-medium text-content-primary">{selectedLead.phone || "-"}</p></div>
                                <div><p className="text-sm text-content-tertiary">Source</p><p className="font-medium text-content-primary">{selectedLead.source || "-"}</p></div>
                                <div><p className="text-sm text-content-tertiary">Created At</p><p className="font-medium text-content-primary">{selectedLead.createdAt?.toDate ? selectedLead.createdAt.toDate().toLocaleDateString() : "-"}</p></div>
                            </div>
                            <div><p className="text-sm text-content-tertiary">Notes</p><p className="text-content-secondary mt-1 whitespace-pre-wrap">{selectedLead.notes || "No notes."}</p></div>
                        </div>
                        <div className="flex justify-end p-4 border-t border-subtle">
                            <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <DeleteConfirmationModal
                    title="Delete Lead"
                    message={`Are you sure you want to delete ${selectedLead?.leadName}? This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
}

export default LeadManagement;

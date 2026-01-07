/**
 * Manager Expense Management Page
 * Shows expenses from team members on projects managed by the current user
 * Allows approval/rejection of team expenses
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/useAuthContext";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import {
    FaMoneyCheckAlt,
    FaCheckCircle,
    FaRupeeSign,
    FaTimes,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaFileInvoice,
    FaMoneyBillWave,
    FaTag,
    FaProjectDiagram,
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
    FaEdit,
    FaTrash,
    FaUpload
} from "react-icons/fa";
import {
    subscribeToAllExpenses,
    approveExpense,
    rejectExpense,
    updateExpense,
    deleteExpense,
    uploadReceipt,
    createExpense
} from "../../services/expenseService";
import toast from "react-hot-toast";
import { EXPENSE_CATEGORIES, getStatusColorClass } from "../../config/expenseConfig";
import ExpenseDetailModal from "../../components/expenses/ExpenseDetailModal";
import ExpenseFormModal from "../../components/expenses/ExpenseFormModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";

export default function ManagerExpenses() {
    const { user, userData } = useAuthContext();
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [viewingExpense, setViewingExpense] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Edit/Delete State
    const [editingExpense, setEditingExpense] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingExpense, setDeletingExpense] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Get projects managed by current user
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const q = query(
            collection(db, "projects"),
            where("projectManagerId", "==", currentUser.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                assigneeIds: d.data().assigneeIds || [],
            }));
            setProjects(list);
        });

        return () => unsub();
    }, []);

    // Get all team member IDs from managed projects
    const teamMemberIds = useMemo(() => {
        const ids = new Set();
        projects.forEach((p) => {
            (p.assigneeIds || []).forEach((id) => ids.add(id));
        });
        return Array.from(ids);
    }, [projects]);

    // Subscribe to all expenses, then filter client-side for team members
    useEffect(() => {
        const unsub = subscribeToAllExpenses(
            statusFilter === "all" ? null : statusFilter,
            (items) => {
                setExpenses(items);
                setLoading(false);
            }
        );
        return unsub;
    }, [statusFilter]);

    // Filter expenses to only team members
    const teamExpenses = useMemo(() => {
        if (!teamMemberIds.length) return [];
        return expenses.filter((e) => teamMemberIds.includes(e.employeeId));
    }, [expenses, teamMemberIds]);

    const filtered = useMemo(() => {
        let result = [...teamExpenses];

        if (categoryFilter !== "all") {
            result = result.filter((e) => (e.category || "Other") === categoryFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.title?.toLowerCase().includes(q) ||
                    e.employeeName?.toLowerCase().includes(q) ||
                    e.description?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [teamExpenses, searchQuery, categoryFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, categoryFilter, statusFilter]);

    const stats = useMemo(() => {
        const total = teamExpenses.length;
        const submitted = teamExpenses.filter((e) => e.status === "Submitted").length;
        const approved = teamExpenses.filter((e) => e.status === "Approved").length;
        const approvedAmount = teamExpenses
            .filter((e) => e.status === "Approved")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return { total, submitted, approved, approvedAmount };
    }, [teamExpenses]);

    const handleApprove = async (id) => {
        try {
            await approveExpense(id, {
                uid: user?.uid,
                name: userData?.name,
                email: user?.email,
            });
            toast.success("Expense approved");
        } catch (err) {
            console.error("Failed to approve expense", err);
            toast.error("Failed to approve expense");
        }
    };

    const handleOpenReject = (id) => {
        setRejectingId(id);
        setRejectReason("");
    };



    const handleEdit = (expense) => {
        setEditingExpense(expense);
    };

    const handleSave = async (formData) => {
        if (!user?.uid) return;
        setIsSaving(true);
        try {
            let receiptUrl = null;
            if (formData.receipt) {
                receiptUrl = await uploadReceipt(formData.receipt, user.uid);
            }

            const payload = {
                ...formData,
                amount: Number(formData.amount),
            };
            // Remove complex objects or file objects from payload
            delete payload.receipt;

            if (receiptUrl) {
                payload.receiptUrl = receiptUrl;
            }

            // For manager, we are likely just updating details, not creating new ones usually?
            // But if we reuse this for creation later, we can check editingExpense.

            if (editingExpense) {
                await updateExpense(editingExpense.id, payload);
                toast.success("Expense updated");
            } else {
                // Fallback if we ever use this for creation
                // await createExpense({ ...payload, employeeId: user.uid, ... });
            }

            setEditingExpense(null);
        } catch (err) {
            console.error("Failed to save expense", err);
            toast.error("Failed to save expense");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (expense) => {
        setDeletingExpense(expense);
    };

    const handleConfirmDelete = async () => {
        if (!deletingExpense) return;
        setIsDeleting(true);
        try {
            await deleteExpense(deletingExpense.id);
            toast.success("Expense deleted");
            setDeletingExpense(null);
        } catch (err) {
            console.error("Failed to delete expense", err);
            toast.error("Failed to delete expense");
        } finally {
            setIsDeleting(false);
        }
    };



    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Team Expenses"
                    description="Review and approve expense claims from your team"
                    icon={<FaMoneyCheckAlt />}
                />

                {/* Stats Cards Skeleton */}
                <div className="grid gap-4 md:grid-cols-3 animate-pulse">
                    {[
                        { color: "indigo" },
                        { color: "amber" },
                        { color: "green" },
                    ].map((item, i) => (
                        <div key={i} className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-white/10 border-l-4 border-l-gray-300 p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-28" />
                                    <div className="h-8 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12" />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-gray-200 [.dark_&]:bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Skeleton */}
                <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                        <div>
                            <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12 mb-2" />
                            <div className="h-10 bg-gray-200 [.dark_&]:bg-white/10 rounded-lg" />
                        </div>
                        <div>
                            <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12 mb-2" />
                            <div className="h-10 bg-gray-200 [.dark_&]:bg-white/10 rounded-lg" />
                        </div>
                        <div>
                            <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16 mb-2" />
                            <div className="h-10 bg-gray-200 [.dark_&]:bg-white/10 rounded-lg" />
                        </div>
                    </div>
                </Card>

                {/* Table Skeleton */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 [.dark_&]:border-white/10 shadow-sm animate-pulse">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 [.dark_&]:bg-[#1F2234]">
                            <tr>
                                {["Sr.", "Employee", "Expense", "Category", "Amount", "Status", "Actions"].map((h) => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white [.dark_&]:bg-[#181B2A] divide-y divide-gray-200 [.dark_&]:divide-white/10">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-6" /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 [.dark_&]:bg-white/10" />
                                            <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-24" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-32" />
                                            <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-20" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 [.dark_&]:bg-white/10 rounded-md w-16" /></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-gray-200 [.dark_&]:bg-white/10 rounded-full w-16" /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2 justify-end">
                                            <div className="h-7 bg-gray-200 [.dark_&]:bg-white/10 rounded w-12" />
                                            <div className="h-7 bg-gray-200 [.dark_&]:bg-white/10 rounded w-16" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Expenses"
                description="Review and approve expense claims from your team members"
                icon={<FaMoneyCheckAlt />}
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-white/10 border-l-4 border-l-indigo-500 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600 [.dark_&]:text-indigo-400">Total Team Expenses</p>
                            <p className="text-3xl font-bold text-indigo-900 [.dark_&]:text-indigo-300 mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-200/50 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                            <FaMoneyCheckAlt className="text-indigo-600 [.dark_&]:text-indigo-400 text-xl" />
                        </div>
                    </div>
                </div>

                <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-white/10 border-l-4 border-l-amber-500 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-amber-600 [.dark_&]:text-amber-400">Pending Approval</p>
                            <p className="text-3xl font-bold text-amber-900 [.dark_&]:text-amber-300 mt-1">{stats.submitted}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-200/50 [.dark_&]:bg-amber-500/20 flex items-center justify-center">
                            <FaExclamationTriangle className="text-amber-600 [.dark_&]:text-amber-400 text-xl" />
                        </div>
                    </div>
                </div>

                <div className="bg-white [.dark_&]:bg-[#1F2234] rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-white/10 border-l-4 border-l-green-500 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">
                                Approved (₹{stats.approvedAmount.toFixed(0)})
                            </p>
                            <p className="text-3xl font-bold text-green-900 [.dark_&]:text-green-300 mt-1">{stats.approved}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-200/50 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                            <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">Search</label>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title or employee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-gray-200 [.dark_&]:border-white/10 rounded-lg bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full border border-gray-300 [.dark_&]:border-white/10 rounded-lg py-2 px-3 bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Submitted">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">Category</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full border border-gray-300 [.dark_&]:border-white/10 rounded-lg py-2 px-3 bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white"
                        >
                            <option value="all">All Categories</option>
                            {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 [.dark_&]:bg-white/5 text-gray-400 mb-4">
                        <FaFileInvoice className="text-3xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">No team expenses found</h3>
                    <p className="text-gray-500 [.dark_&]:text-gray-400 mt-1 max-w-sm mx-auto">
                        {teamMemberIds.length === 0
                            ? "You don't have any team members assigned to your projects yet."
                            : "No expenses match your current filters."}
                    </p>
                </div>
            ) : (
                <Card
                    title="Expense List"
                    tone="muted"
                    actions={
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Page {page} of {Math.ceil(filtered.length / rowsPerPage) || 1}
                            </span>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Rows per page
                            </label>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#181B2A] px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    variant="secondary"
                                    className="px-3 py-1"
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / rowsPerPage), p + 1))}
                                    variant="secondary"
                                    className="px-3 py-1"
                                    disabled={page >= Math.ceil(filtered.length / rowsPerPage)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="overflow-x-auto rounded-xl border border-gray-200 [.dark_&]:border-white/10 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 [.dark_&]:divide-white/10">
                            <thead className="bg-gray-50 [.dark_&]:bg-[#1F2234]">
                                <tr>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Sr No</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Project</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Category</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Document</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Approval</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 [.dark_&]:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white [.dark_&]:bg-[#181B2A] divide-y divide-gray-200 [.dark_&]:divide-white/10">
                                {filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((e, index) => (
                                    <tr
                                        key={e.id}
                                        onClick={() => setViewingExpense(e)}
                                        className="hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 text-center text-sm text-gray-500 [.dark_&]:text-gray-400">
                                            {(page - 1) * rowsPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center text-indigo-700 [.dark_&]:text-indigo-400 font-bold text-xs mr-3">
                                                    {e.employeeName ? e.employeeName.charAt(0).toUpperCase() : "?"}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                                    {e.employeeName || "Unknown"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">{e.title}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {e.projectName ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 [.dark_&]:bg-indigo-500/10 text-indigo-700 [.dark_&]:text-indigo-300 border border-indigo-200 [.dark_&]:border-indigo-500/20">
                                                    <FaProjectDiagram className="text-[10px] text-indigo-500 [.dark_&]:text-indigo-400" />
                                                    {e.projectName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No project</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-500 [.dark_&]:text-gray-400 flex items-center gap-1">
                                                <FaCalendarAlt className="text-gray-400" /> {e.date ? new Date(e.date).toLocaleDateString("en-GB") : "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 [.dark_&]:bg-white/10 text-gray-700 [.dark_&]:text-gray-300">
                                                <FaTag className="text-[10px] text-gray-500 [.dark_&]:text-gray-400" />
                                                {e.category || "Other"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-gray-900 [.dark_&]:text-white">
                                                ₹{e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {e.receiptUrl ? (
                                                <button
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        setViewingReceipt({
                                                            url: e.receiptUrl,
                                                            name: `Receipt - ${e.title}`,
                                                            fileType: "image/jpeg", // Assuming image/jpeg, adjust if needed
                                                            id: e.id
                                                        });
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium inline-flex items-center gap-1"
                                                >
                                                    <FaFileInvoice /> Receipt
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(e.status, false)}`}>
                                                {e.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {e.status === "Submitted" && (
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        size="xs"
                                                        onClick={(ev) => { ev.stopPropagation(); handleApprove(e.id); }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="secondary"
                                                        onClick={(ev) => { ev.stopPropagation(); handleOpenReject(e.id); }}
                                                        className="text-red-600 hover:bg-red-50 border-red-200"
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="xs" variant="ghost" onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }} title="Edit">
                                                    <FaEdit />
                                                </Button>
                                                <Button size="xs" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }} title="Delete">
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Reject Modal */}
            {
                rejectingId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white [.dark_&]:bg-[#1F2234] shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between border-b border-gray-100 [.dark_&]:border-white/10 px-6 py-4">
                                <h2 className="text-lg font-bold text-gray-800 [.dark_&]:text-white">Reject Expense</h2>
                                <button onClick={() => setRejectingId(null)} className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full text-gray-500 [.dark_&]:text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="px-6 py-6 space-y-4">
                                <div className="bg-amber-50 [.dark_&]:bg-amber-500/10 border border-amber-100 [.dark_&]:border-amber-500/20 rounded-xl p-4 flex gap-3">
                                    <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-amber-800 [.dark_&]:text-amber-300">
                                        The employee will be notified about this rejection.
                                    </p>
                                </div>
                                <textarea
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Reason for rejection..."
                                    className="w-full rounded-xl border-0 bg-gray-50 [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 ring-1 ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-red-500 resize-none"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 border-t border-gray-100 [.dark_&]:border-white/10 px-6 py-4 bg-gray-50/50 [.dark_&]:bg-white/5">
                                <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
                                <Button onClick={handleConfirmReject} className="bg-red-600 hover:bg-red-700 text-white">
                                    Reject Expense
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Modal */}
            {
                viewingExpense && (
                    <ExpenseDetailModal
                        expense={viewingExpense}
                        onClose={() => setViewingExpense(null)}
                        onViewReceipt={setViewingReceipt}
                    />
                )
            }

            {/* Edit Modal */}
            <ExpenseFormModal
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                onSubmit={handleSave}
                initialData={editingExpense}
                projects={projects}
                isSubmitting={isSaving}
                title="Edit Expense"
            />

            {/* Delete Confirmation Modal */}
            {deletingExpense && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <DeleteConfirmationModal
                        onClose={() => setDeletingExpense(null)}
                        onConfirm={handleConfirmDelete}
                        itemType="Expense"
                        itemTitle={deletingExpense.title}
                        title="Delete Expense"
                        message="Are you sure you want to delete this expense? This action cannot be undone."
                        confirmText="Delete Expense"
                        isDeleting={isDeleting}
                    />
                </div>
            )}

            <DocumentPreviewModal
                open={!!viewingReceipt}
                onClose={() => setViewingReceipt(null)}
                doc={viewingReceipt}
                showMetadata={false}
            />
        </div >
    );
}

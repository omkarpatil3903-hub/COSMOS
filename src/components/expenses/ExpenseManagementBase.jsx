/**
 * Shared Expense Management Component
 * Used by both SuperAdmin and Admin portals to avoid code duplication
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/useAuthContext";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
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
    FaHourglassHalf,
    FaChevronLeft,
    FaChevronRight,
    FaUpload,
    FaEdit,
    FaTrash,
    FaExternalLinkAlt,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import {
    subscribeToAllExpenses,
    approveExpense,
    rejectExpense,
    markExpensePaid,
    deleteExpense,
    updateExpense,
    uploadReceipt,
    createExpense
} from "../../services/expenseService";
import toast from "react-hot-toast";
import { EXPENSE_CATEGORIES, getStatusColorClass } from "../../config/expenseConfig";
import ExpenseDetailModal from "./ExpenseDetailModal";
import ExpenseFormModal from "./ExpenseFormModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";



export default function ExpenseManagementBase({ buttonClass = "", useDarkMode = true }) {
    const { buttonClass: themeButtonClass } = useThemeStyles();
    const finalButtonClass = buttonClass || themeButtonClass;
    const { user, userData } = useAuthContext();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [usersMap, setUsersMap] = useState({});
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [activeStatFilter, setActiveStatFilter] = useState(null);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [projects, setProjects] = useState([]);

    // Edit/Delete State
    const [editingExpense, setEditingExpense] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingExpense, setDeletingExpense] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch all projects for the dropdown
    useEffect(() => {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(list);
        });
        return () => unsub();
    }, []);

    // Fetch users for name mapping
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const snapshot = await getDocs(q);
                const map = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    map[doc.id] = data.name || data.displayName || data.email;
                });
                setUsersMap(map);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, []);

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

    const filtered = useMemo(() => {
        let result = [...expenses];

        if (activeStatFilter === "submitted") {
            result = result.filter((e) => e.status === "Submitted");
        } else if (activeStatFilter === "approved") {
            result = result.filter((e) => e.status === "Approved");
        } else if (activeStatFilter === "paid") {
            result = result.filter((e) => e.status === "Paid");
        }

        if (categoryFilter !== "all") {
            result = result.filter(
                (e) => (e.category || "Other") === categoryFilter
            );
        }

        if (fromDate && !activeStatFilter) {
            result = result.filter((e) => e.date && e.date >= fromDate);
        }
        if (toDate && !activeStatFilter) {
            result = result.filter((e) => e.date && e.date <= toDate);
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
    }, [expenses, searchQuery, categoryFilter, fromDate, toDate, activeStatFilter]);

    useEffect(() => {
        if (searchQuery || categoryFilter !== "all" || fromDate || toDate) {
            setActiveStatFilter(null);
        }
        setPage(1);
    }, [searchQuery, categoryFilter, fromDate, toDate]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

    const handleNextPage = () => {
        setPage((prev) => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        setPage((prev) => Math.max(prev - 1, 1));
    };

    useEffect(() => {
        setPage(1);
    }, [rowsPerPage, filtered.length]);

    const stats = useMemo(() => {
        const total = expenses.length;
        const submitted = expenses.filter((e) => e.status === "Submitted").length;
        const approved = expenses.filter((e) => e.status === "Approved").length;
        const paid = expenses.filter((e) => e.status === "Paid").length;
        const approvedAmount = expenses
            .filter((e) => e.status === "Approved")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const paidAmount = expenses
            .filter((e) => e.status === "Paid")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return { total, submitted, approved, paid, approvedAmount, paidAmount };
    }, [expenses]);

    const handleApprove = async (id) => {
        try {
            await approveExpense(id, { uid: user?.uid, name: userData?.name, email: user?.email });
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

    const handleConfirmReject = async () => {
        if (!rejectingId) return;
        try {
            await rejectExpense(
                rejectingId,
                { uid: user?.uid, name: userData?.name, email: user?.email },
                rejectReason || "Rejected by admin"
            );
            toast.success("Expense rejected");
            setRejectingId(null);
            setRejectReason("");
        } catch (err) {
            console.error("Failed to reject expense", err);
            toast.error("Failed to reject expense");
        }
    };

    const handleMarkPaid = async (id) => {
        try {
            await markExpensePaid(id);
            toast.success("Marked as paid");
        } catch (err) {
            console.error("Failed to mark paid", err);
            toast.error("Failed to mark as paid");
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
            // Local state update handled by subscription usually, but if needed:
            // setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
        } catch (err) {
            console.error("Failed to delete expense", err);
            toast.error("Failed to delete expense");
        } finally {
            setIsDeleting(false);
        }
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
            delete payload.receipt;

            if (receiptUrl) {
                payload.receiptUrl = receiptUrl;
            }

            if (editingExpense) {
                await updateExpense(editingExpense.id, payload);
                toast.success("Expense updated");
            }
            // Else create logic if we ever add 'Create' button here

            setEditingExpense(null);
        } catch (err) {
            console.error("Failed to save expense", err);
            toast.error("Failed to save expense");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filtered.map((x) => x.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleBulkApprove = async () => {
        if (!window.confirm(`Approve ${selectedIds.length} expenses?`)) return;
        try {
            await Promise.all(selectedIds.map((id) => approveExpense(id, { uid: user?.uid, name: userData?.name, email: user?.email })));
            toast.success("Selected expenses approved");
            setSelectedIds([]);
        } catch (err) {
            console.error("Bulk approve failed", err);
            toast.error("Failed to approve selected");
        }
    };

    const handleBulkPay = async () => {
        if (!window.confirm(`Mark ${selectedIds.length} expenses as paid?`)) return;
        try {
            await Promise.all(selectedIds.map((id) => markExpensePaid(id)));
            toast.success("Selected expenses marked paid");
            setSelectedIds([]);
        } catch (err) {
            console.error("Bulk pay failed", err);
            toast.error("Failed to mark selected paid");
        }
    };

    const handleExportCSV = () => {
        if (!filtered.length) return;
        const headers = [
            "ID", "Employee Name", "Employee ID", "Date", "Title", "Category",
            "Amount", "Currency", "Status", "Description", "Receipt URL",
        ];
        const csvContent = [
            headers.join(","),
            ...filtered.map((e) =>
                [
                    e.id, `"${e.employeeName || ""}"`, e.employeeId, e.date,
                    `"${e.title}"`, e.category, e.amount, e.currency, e.status,
                    `"${(e.description || "").replace(/"/g, '""')}"`, e.receiptUrl || "",
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    // Dark mode classes helper
    const dm = useDarkMode ? "[.dark_&]:" : "";

    return (
        <div className="space-y-6">
            <PageHeader
                title="Expense Management"
                description="Review and process employee reimbursement claims"
                icon={<FaMoneyCheckAlt />}
                actions={
                    <Button
                        onClick={handleExportCSV}
                        variant="custom"
                        className={`flex items-center gap-2 ${finalButtonClass}`}
                        disabled={filtered.length === 0}
                    >
                        <FaUpload className="h-3 w-3" />
                        Export Excel
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div
                    onClick={() => {
                        setActiveStatFilter(null);
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setFromDate("");
                        setToDate("");
                        setStatusFilter("all");
                    }}
                    className="cursor-pointer"
                >
                    <div className="bg-surface rounded-lg shadow-sm border border-subtle border-l-4 border-l-indigo-500 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total</p>
                                <p className="text-3xl font-bold text-content-primary mt-1">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-indigo-200/50 dark:bg-indigo-900/50 flex items-center justify-center">
                                <FaMoneyCheckAlt className="text-indigo-600 dark:text-indigo-400 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setActiveStatFilter("approved");
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setFromDate("");
                        setToDate("");
                        setStatusFilter("all");
                    }}
                    className="cursor-pointer"
                >
                    <div className="bg-surface rounded-lg shadow-sm border border-subtle border-l-4 border-l-green-500 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Approved (₹{stats.approvedAmount.toFixed(2)})
                                </p>
                                <p className="text-3xl font-bold text-content-primary mt-1">
                                    {stats.approved}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-200/50 dark:bg-green-900/50 flex items-center justify-center">
                                <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setActiveStatFilter("paid");
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setFromDate("");
                        setToDate("");
                        setStatusFilter("all");
                    }}
                    className="cursor-pointer"
                >
                    <div className="bg-surface rounded-lg shadow-sm border border-subtle border-l-4 border-l-purple-500 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    Paid (₹{stats.paidAmount.toFixed(2)})
                                </p>
                                <p className="text-3xl font-bold text-content-primary mt-1">
                                    {stats.paid}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-200/50 dark:bg-purple-900/50 flex items-center justify-center">
                                <FaRupeeSign className="text-purple-600 dark:text-purple-400 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <Card className="p-4">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-content-primary">
                            Search & Actions
                        </h2>
                        <span className="text-sm text-content-tertiary">
                            Showing {filtered.length} records
                        </span>
                    </div>
                    <hr className="border-subtle" />
                </div>

                {/* Search Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-content-secondary mb-2">
                        Search by title, employee, or description
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="h-4 w-4 text-content-tertiary" />
                        </div>
                        <input
                            type="text"
                            placeholder="e.g. Travel Expense or John Doe"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-subtle rounded-lg bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            {selectedIds.length} selected
                        </span>
                        <Button size="sm" onClick={handleBulkApprove}>
                            Approve Selected
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleBulkPay}>
                            Mark Paid
                        </Button>
                    </div>
                )}

                {/* Filters */}
                <div className="pt-4 border-t border-subtle">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-content-tertiary uppercase tracking-wide">
                            Filters:
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-content-secondary mb-2">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full text-sm border border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-surface text-content-primary shadow-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Draft">Draft</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-content-secondary mb-2">
                                Category
                            </label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full text-sm border border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-surface text-content-primary shadow-sm"
                            >
                                <option value="all">All Categories</option>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-content-secondary mb-2">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full text-sm border border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-surface text-content-primary shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-content-secondary mb-2">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full text-sm border border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-surface text-content-primary shadow-sm"
                            />
                        </div>
                    </div>

                    {(searchQuery || categoryFilter !== "all" || statusFilter !== "all" || fromDate || toDate) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setCategoryFilter("all");
                                    setStatusFilter("all");
                                    setFromDate("");
                                    setToDate("");
                                }}
                                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                            >
                                <FaTimes className="h-3 w-3" /> Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
                        <FaMoneyBillWave className="text-xl" />
                    </div>
                    <p className="text-content-tertiary font-medium">Loading expenses...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-subtle text-content-tertiary mb-4">
                        <FaFileInvoice className="text-3xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-content-primary">
                        No expenses found
                    </h3>
                    <p className="text-content-tertiary mt-1 max-w-sm mx-auto">
                        No expenses match your current filters.
                    </p>
                </div>
            ) : (
                <Card
                    title="Expense List"
                    tone="muted"
                    actions={
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-content-secondary">
                                Page {page} of {totalPages}
                            </span>
                            <label className="text-sm font-medium text-content-secondary">
                                Rows per page
                            </label>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
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
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    onClick={handleNextPage}
                                    variant="secondary"
                                    className="px-3 py-1"
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="overflow-x-auto rounded-xl border border-subtle shadow-sm">
                        <table className="min-w-full divide-y divide-subtle">
                            <thead className="bg-surface-subtle">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Sr. No.
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Document
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Approval
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-content-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-subtle">
                                {filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((e, index) => (
                                    <tr
                                        key={e.id}
                                        onClick={() => setViewingExpense(e)}
                                        className={`hover:bg-surface-subtle transition-colors group cursor-pointer ${selectedIds.includes(e.id) ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(e.id)}
                                                onChange={(e) => { e.stopPropagation(); handleSelectOne(e.id); }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-subtle text-content-secondary text-xs font-medium">
                                                {(page - 1) * rowsPerPage + index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs mr-3">
                                                    {(usersMap[e.employeeId] || e.employeeName) ? (usersMap[e.employeeId] || e.employeeName).charAt(0).toUpperCase() : "?"}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-content-primary">
                                                        {usersMap[e.employeeId] || e.employeeName || "Unknown"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-content-primary group-hover:text-indigo-600 transition-colors">
                                                {e.title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {e.projectName ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                                                    <FaProjectDiagram className="text-[10px] text-indigo-500 dark:text-indigo-400" />
                                                    {e.projectName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No project</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs text-content-tertiary mb-0.5">
                                                <FaCalendarAlt className="text-content-tertiary" />
                                                {e.date ? new Date(e.date).toLocaleDateString("en-GB") : "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                <FaTag className="text-[10px] text-gray-500 dark:text-gray-400" />
                                                {e.category || "Other"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-bold text-content-primary">
                                                {e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                                                <span className="text-xs font-medium text-content-tertiary ml-1">
                                                    {e.currency || "INR"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {e.receiptUrl ? (
                                                <button
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        setViewingReceipt({
                                                            url: e.receiptUrl,
                                                            name: `Receipt - ${e.title}`,
                                                            fileType: "image/jpeg",
                                                            id: e.id
                                                        });
                                                    }}
                                                    className={`inline-flex items-center gap-1 text-xs font-medium ${useDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-800"}`}
                                                >
                                                    <FaFileInvoice /> Receipt
                                                </button>
                                            ) : (
                                                <span className={`text-xs ${useDarkMode ? "text-gray-500" : "text-gray-400"}`}>-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(e.status, useDarkMode)}`}>
                                                {e.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex justify-center gap-2">
                                                {e.status === "Submitted" && (
                                                    <>
                                                        <Button
                                                            size="xs"
                                                            onClick={(ev) => { ev.stopPropagation(); handleApprove(e.id); }}
                                                            className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="secondary"
                                                            onClick={(ev) => { ev.stopPropagation(); handleOpenReject(e.id); }}
                                                            className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {e.status === "Approved" && (
                                                    <Button
                                                        size="xs"
                                                        onClick={(ev) => { ev.stopPropagation(); handleMarkPaid(e.id); }}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                                                    >
                                                        Mark Paid
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 items-center">
                                                <button
                                                    onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
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
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl border border-subtle overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b border-subtle px-6 py-4 bg-surface/80 backdrop-blur-md">
                            <div>
                                <h2 className="text-lg font-bold text-content-primary">
                                    Reject Expense
                                </h2>
                                <p className="text-xs text-content-tertiary font-medium mt-0.5">
                                    Provide a reason for rejection
                                </p>
                            </div>
                            <button
                                onClick={() => setRejectingId(null)}
                                className="p-2 hover:bg-surface-subtle rounded-full transition-colors text-content-tertiary hover:text-content-secondary"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-500/30 rounded-xl p-4 flex gap-3">
                                <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    The employee will be notified about this rejection. Please
                                    provide a clear reason to help them correct the issue.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-content-tertiary mb-1.5 uppercase tracking-wide">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Receipt is blurry, Amount mismatch..."
                                    className="w-full rounded-xl border-0 bg-surface-subtle py-3 px-4 text-sm font-medium text-content-primary ring-1 ring-inset ring-subtle placeholder:text-content-tertiary focus:ring-2 focus:ring-inset focus:ring-red-500 transition-all resize-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-subtle px-6 py-4 bg-surface-subtle/50">
                            <Button
                                variant="ghost"
                                onClick={() => setRejectingId(null)}
                                className="text-content-tertiary hover:text-content-secondary hover:bg-surface-subtle"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmReject}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-red-900/20"
                            >
                                Reject Expense
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewingExpense && (
                <ExpenseDetailModal
                    expense={viewingExpense}
                    onClose={() => setViewingExpense(null)}
                    onViewReceipt={setViewingReceipt}
                    useDarkMode={useDarkMode}
                />
            )}
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
                        description="Are you sure you want to delete this expense record?"
                        isLoading={isDeleting}
                        confirmLabel="Delete Expense"
                    />
                </div>
            )}

            <DocumentPreviewModal
                open={!!viewingReceipt}
                onClose={() => setViewingReceipt(null)}
                doc={viewingReceipt}
                showMetadata={false}
            />
        </div>
    );
}


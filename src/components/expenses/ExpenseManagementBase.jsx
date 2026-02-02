/**
 * ExpenseManagementBase Component
 *
 * Purpose: Shared expense management dashboard for admin portals.
 * Provides full CRUD operations, approval workflow, and reporting.
 *
 * Responsibilities:
 * - Display expense statistics (total, approved, paid amounts)
 * - List expenses in paginated table
 * - Filter by status, category, date range, search query
 * - Approve/reject individual expenses with reason
 * - Mark expenses as paid
 * - Bulk approve/pay selected expenses
 * - Edit/delete expense records
 * - Export filtered data to CSV
 * - View expense details in modal
 * - View receipts in document preview modal
 *
 * Dependencies:
 * - Firestore (expenses, users, projects collections)
 * - expenseService (CRUD operations)
 * - expenseConfig (categories, status colors)
 * - ExpenseDetailModal (expense view)
 * - ExpenseFormModal (expense edit)
 * - DeleteConfirmationModal (delete confirmation)
 * - DocumentPreviewModal (receipt viewer)
 * - Button, Card, PageHeader (UI components)
 *
 * Props:
 * - buttonClass: Custom button styling class
 * - useDarkMode: Boolean for dark mode styling adjustments
 *
 * Workflow States:
 * - Draft (not used in admin view)
 * - Submitted: Pending review
 * - Approved: Awaiting payment
 * - Rejected: Declined with reason
 * - Paid: Completed
 *
 * Stats Cards (clickable filters):
 * - Total: All expenses
 * - Approved: Approved amount total
 * - Paid: Paid amount total
 *
 * Bulk Operations:
 * - Select all / individual rows
 * - Approve Selected
 * - Mark Paid
 *
 * Filters:
 * - Status dropdown
 * - Category dropdown
 * - Date range (from/to)
 * - Search query (title, employee, description)
 *
 * Pagination:
 * - 10/25/50 rows per page
 * - Previous/Next navigation
 *
 * CSV Export:
 * - Exports filtered results
 * - Includes all fields
 *
 * Last Modified: 2026-01-10
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
    FaEye,
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
import ConfirmationModal from "../../components/ConfirmationModal";
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



    // Confirmation modal states
    const [approvingExpense, setApprovingExpense] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [markingPaidExpense, setMarkingPaidExpense] = useState(null);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);
    const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
    const [isBulkApproving, setIsBulkApproving] = useState(false);
    const [showBulkPayModal, setShowBulkPayModal] = useState(false);
    const [isBulkPaying, setIsBulkPaying] = useState(false);
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
        // Map "Pending" filter to "Approved" status in Firestore
        // User requested: "Pending" should show "status is approved but didnt mark as paid"
        const queryStatus = (statusFilter === "all") ? null : (statusFilter === "Pending" ? "Approved" : statusFilter);

        const unsub = subscribeToAllExpenses(
            queryStatus,
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
        } else if (activeStatFilter === "Pending") {
            result = result.filter((e) => e.status === "Approved");
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

        // Apply date filters (work alongside stat filters)
        if (fromDate) {
            result = result.filter((e) => e.date && e.date >= fromDate);
        }
        if (toDate) {
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

        const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const submittedAmount = expenses
            .filter((e) => e.status === "Submitted")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const approvedAmount = expenses
            .filter((e) => e.status === "Approved")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const paidAmount = expenses
            .filter((e) => e.status === "Paid")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        return { total, submitted, approved, paid, totalAmount, submittedAmount, approvedAmount, paidAmount };
    }, [expenses]);

    // Open approve confirmation modal
    const handleOpenApprove = (expense) => {
        setApprovingExpense(expense);
    };

    // Confirm single approve
    const handleConfirmApprove = async () => {
        if (!approvingExpense) return;
        setIsApproving(true);
        try {
            await approveExpense(approvingExpense.id, { uid: user?.uid, name: userData?.name, email: user?.email });
            toast.success("Expense approved");
            setApprovingExpense(null);
        } catch (err) {
            console.error("Failed to approve expense", err);
            toast.error("Failed to approve expense");
        } finally {
            setIsApproving(false);
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

    // Open mark paid confirmation modal
    const handleOpenMarkPaid = (expense) => {
        setMarkingPaidExpense(expense);
    };

    // Confirm single mark paid
    const handleConfirmMarkPaid = async () => {
        if (!markingPaidExpense) return;
        setIsMarkingPaid(true);
        try {
            await markExpensePaid(markingPaidExpense.id);
            toast.success("Marked as paid");
            setMarkingPaidExpense(null);
        } catch (err) {
            console.error("Failed to mark paid", err);
            toast.error("Failed to mark as paid");
        } finally {
            setIsMarkingPaid(false);
        }
    };

    // Open delete confirmation modal
    const handleOpenDelete = (expense) => {
        setDeletingExpense(expense);
    };

    // Confirm single delete
    const handleConfirmDelete = async () => {
        if (!deletingExpense) return;
        setIsDeleting(true);
        try {
            await deleteExpense(deletingExpense.id);
            toast.success("Expense deleted permanently");
            setDeletingExpense(null);
        } catch (err) {
            console.error("Failed to delete expense", err);
            toast.error("Failed to delete expense");
        } finally {
            setIsDeleting(false);
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

    // Confirm bulk approve
    const handleConfirmBulkApprove = async () => {
        setIsBulkApproving(true);
        try {
            await Promise.all(selectedIds.map((id) => approveExpense(id, { uid: user?.uid, name: userData?.name, email: user?.email })));
            toast.success("Selected expenses approved");
            setSelectedIds([]);
            setShowBulkApproveModal(false);
        } catch (err) {
            console.error("Bulk approve failed", err);
            toast.error("Failed to approve selected");
        } finally {
            setIsBulkApproving(false);
        }
    };

    // Confirm bulk mark paid
    const handleConfirmBulkPay = async () => {
        setIsBulkPaying(true);
        try {
            await Promise.all(selectedIds.map((id) => markExpensePaid(id)));
            toast.success("Selected expenses marked paid");
            setSelectedIds([]);
            setShowBulkPayModal(false);
        } catch (err) {
            console.error("Bulk pay failed", err);
            toast.error("Failed to mark selected paid");
        } finally {
            setIsBulkPaying(false);
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
                        Export CSV
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
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
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                    Total  (₹{stats.totalAmount.toFixed(2)})
                                </p>
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

                <div
                    onClick={() => {
                        setActiveStatFilter("Pending");
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setFromDate("");
                        setToDate("");
                        setStatusFilter("all");
                    }}
                    className="cursor-pointer"
                >
                    <div className="bg-surface rounded-lg shadow-sm border border-subtle border-l-4 border-l-amber-500 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                    Pending (₹{stats.approvedAmount.toFixed(2)})
                                </p>
                                <p className="text-3xl font-bold text-content-primary mt-1">
                                    {stats.approved}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-900/50 flex items-center justify-center">
                                <FaHourglassHalf className="text-amber-600 dark:text-amber-400 text-xl" />
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
                        <Button size="sm" onClick={() => setShowBulkApproveModal(true)}>
                            Approve Selected
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowBulkPayModal(true)}>
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
                                <option value="Pending">Pending</option>
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
                        <div className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">
                            Showing {filtered.length} records
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
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-content-secondary uppercase tracking-wider">
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(e.status === 'Paid' ? 'Approved' : e.status, useDarkMode)}`}>
                                                {e.status === 'Paid' ? 'Approved' : (e.status || "Unknown")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex justify-center gap-2">
                                                {e.status === "Submitted" && (
                                                    <>
                                                        <Button
                                                            size="xs"
                                                            onClick={(ev) => { ev.stopPropagation(); handleOpenApprove(e); }}
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
                                                        onClick={(ev) => { ev.stopPropagation(); handleOpenMarkPaid(e); }}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white border-transparent !py-1 !px-3 !text-xs"
                                                    >
                                                        Mark Paid
                                                    </Button>
                                                )}
                                                {e.status === "Paid" && (
                                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                                                        <FaCheckCircle /> Paid
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button
                                                onClick={(ev) => { ev.stopPropagation(); handleOpenDelete(e); }}
                                                className="text-gray-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                                                title="Delete Expense"
                                            >
                                                <FaTrash className="text-base" />
                                            </button>
                                        </td>
                                        {/* Actions column removed as Admins cannot edit/delete employee expenses */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mt-4">
                        <div className="text-sm font-medium text-content-secondary">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex items-center gap-3">
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


            <DocumentPreviewModal
                open={!!viewingReceipt}
                onClose={() => setViewingReceipt(null)}
                doc={viewingReceipt}
                showMetadata={false}
            />

            {/* Approve Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!approvingExpense}
                onClose={() => setApprovingExpense(null)}
                onConfirm={handleConfirmApprove}
                title="Approve Expense"
                description="Are you sure you want to approve this expense? This will mark it ready for payment."
                itemTitle={approvingExpense?.title}
                itemSubtitle={`₹${approvingExpense?.amount?.toFixed?.(2) || approvingExpense?.amount} · ${approvingExpense?.employeeName || 'Unknown'}`}
                confirmLabel="Approve"
                variant="success"
                isLoading={isApproving}
            />

            {/* Mark Paid Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!markingPaidExpense}
                onClose={() => setMarkingPaidExpense(null)}
                onConfirm={handleConfirmMarkPaid}
                title="Mark as Paid"
                description="Are you sure you want to mark this expense as paid? This confirms the reimbursement has been processed."
                itemTitle={markingPaidExpense?.title}
                itemSubtitle={`₹${markingPaidExpense?.amount?.toFixed?.(2) || markingPaidExpense?.amount} · ${markingPaidExpense?.employeeName || 'Unknown'}`}
                confirmLabel="Mark Paid"
                variant="purple"
                isLoading={isMarkingPaid}
            />

            {/* Bulk Approve Confirmation Modal */}
            <ConfirmationModal
                isOpen={showBulkApproveModal}
                onClose={() => setShowBulkApproveModal(false)}
                onConfirm={handleConfirmBulkApprove}
                title="Approve Selected Expenses"
                description="Are you sure you want to approve all selected expenses? This action will mark them ready for payment."
                count={selectedIds.length}
                confirmLabel="Approve All"
                variant="success"
                isLoading={isBulkApproving}
            />

            {/* Bulk Mark Paid Confirmation Modal */}
            <ConfirmationModal
                isOpen={showBulkPayModal}
                onClose={() => setShowBulkPayModal(false)}
                onConfirm={handleConfirmBulkPay}
                title="Mark Selected as Paid"
                description="Are you sure you want to mark all selected expenses as paid? This confirms reimbursements have been processed."
                count={selectedIds.length}
                confirmLabel="Mark All Paid"
                variant="purple"
                isLoading={isBulkPaying}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deletingExpense}
                onClose={() => setDeletingExpense(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Expense"
                description="Are you sure you want to delete this expense? This action cannot be undone."
                itemTitle={deletingExpense?.title}
                itemSubtitle={`₹${deletingExpense?.amount?.toFixed?.(2) || deletingExpense?.amount} · ${deletingExpense?.employeeName || 'Unknown'}`}
                confirmLabel="Delete Permanently"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}

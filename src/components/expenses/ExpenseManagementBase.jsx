/**
 * Shared Expense Management Component
 * Used by both SuperAdmin and Admin portals to avoid code duplication
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/useAuthContext";
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
    FaHourglassHalf,
    FaChevronLeft,
    FaChevronRight,
    FaDownload,
} from "react-icons/fa";
import {
    subscribeToAllExpenses,
    approveExpense,
    rejectExpense,
    markExpensePaid,
} from "../../services/expenseService";
import toast from "react-hot-toast";
import { EXPENSE_CATEGORIES, getStatusColorClass } from "../../config/expenseConfig";
import ExpenseDetailModal from "./ExpenseDetailModal";



export default function ExpenseManagementBase({ buttonClass = "", useDarkMode = true }) {
    const { user, userData } = useAuthContext();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [activeStatFilter, setActiveStatFilter] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

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
                        variant={buttonClass ? "custom" : "secondary"}
                        className={`flex items-center gap-2 ${buttonClass}`}
                        disabled={filtered.length === 0}
                    >
                        <FaDownload className="h-4 w-4" />
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
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-4 hover:shadow-md transition-shadow ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" : ""}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium text-indigo-600 ${useDarkMode ? "[.dark_&]:text-indigo-400" : ""}`}>Total</p>
                                <p className={`text-3xl font-bold text-indigo-900 mt-1 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                    {stats.total}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-indigo-200/50 flex items-center justify-center ${useDarkMode ? "[.dark_&]:bg-indigo-900/50" : ""}`}>
                                <FaMoneyCheckAlt className={`text-indigo-600 text-xl ${useDarkMode ? "[.dark_&]:text-indigo-400" : ""}`} />
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
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-4 hover:shadow-md transition-shadow ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" : ""}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium text-green-600 ${useDarkMode ? "[.dark_&]:text-green-400" : ""}`}>
                                    Approved (₹{stats.approvedAmount.toFixed(2)})
                                </p>
                                <p className={`text-3xl font-bold text-green-900 mt-1 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                    {stats.approved}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-green-200/50 flex items-center justify-center ${useDarkMode ? "[.dark_&]:bg-green-900/50" : ""}`}>
                                <FaCheckCircle className={`text-green-600 text-xl ${useDarkMode ? "[.dark_&]:text-green-400" : ""}`} />
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
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500 p-4 hover:shadow-md transition-shadow ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" : ""}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium text-purple-600 ${useDarkMode ? "[.dark_&]:text-purple-400" : ""}`}>
                                    Paid (₹{stats.paidAmount.toFixed(2)})
                                </p>
                                <p className={`text-3xl font-bold text-purple-900 mt-1 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                    {stats.paid}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-purple-200/50 flex items-center justify-center ${useDarkMode ? "[.dark_&]:bg-purple-900/50" : ""}`}>
                                <FaRupeeSign className={`text-purple-600 text-xl ${useDarkMode ? "[.dark_&]:text-purple-400" : ""}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <Card className="p-4">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`text-lg font-semibold text-gray-900 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                            Search & Actions
                        </h2>
                        <span className={`text-sm text-gray-500 ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                            Showing {filtered.length} records
                        </span>
                    </div>
                    <hr className={`border-gray-200 ${useDarkMode ? "[.dark_&]:border-white/10" : ""}`} />
                </div>

                {/* Search Input */}
                <div className="mb-4">
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                        Search by title, employee, or description
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="e.g. Travel Expense or John Doe"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white" : ""}`}
                        />
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className={`flex items-center gap-3 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 ${useDarkMode ? "[.dark_&]:bg-indigo-900/20 [.dark_&]:border-indigo-500/30" : ""}`}>
                        <span className={`text-sm font-medium text-indigo-700 ${useDarkMode ? "[.dark_&]:text-indigo-300" : ""}`}>
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
                <div className={`pt-4 border-t border-gray-200 ${useDarkMode ? "[.dark_&]:border-white/10" : ""}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-medium text-gray-500 uppercase tracking-wide ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                            Filters:
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className={`block text-sm font-medium text-gray-700 mb-2 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={`w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white" : ""}`}
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
                            <label className={`block text-sm font-medium text-gray-700 mb-2 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                                Category
                            </label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={`w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white" : ""}`}
                            >
                                <option value="all">All Categories</option>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium text-gray-700 mb-2 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className={`w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white" : ""}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium text-gray-700 mb-2 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                                To Date
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className={`w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white" : ""}`}
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
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-4 animate-pulse ${useDarkMode ? "[.dark_&]:bg-indigo-900/20 [.dark_&]:text-indigo-400" : ""}`}>
                        <FaMoneyBillWave className="text-xl" />
                    </div>
                    <p className={`text-gray-500 font-medium ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>Loading expenses...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4 ${useDarkMode ? "[.dark_&]:bg-white/5 [.dark_&]:text-gray-500" : ""}`}>
                        <FaFileInvoice className="text-3xl" />
                    </div>
                    <h3 className={`text-lg font-semibold text-gray-900 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                        No expenses found
                    </h3>
                    <p className={`text-gray-500 mt-1 max-w-sm mx-auto ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                        No expenses match your current filters.
                    </p>
                </div>
            ) : (
                <div className={`overflow-x-auto rounded-xl border border-gray-200 shadow-sm ${useDarkMode ? "[.dark_&]:border-white/10" : ""}`}>
                    <table className={`min-w-full divide-y divide-gray-200 ${useDarkMode ? "[.dark_&]:divide-white/5" : ""}`}>
                        <thead className={`bg-gray-50 ${useDarkMode ? "[.dark_&]:bg-[#1F2234]" : ""}`}>
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th scope="col" className={`px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Sr. No.
                                </th>
                                <th scope="col" className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Employee
                                </th>
                                <th scope="col" className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Expense Details
                                </th>
                                <th scope="col" className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Project
                                </th>
                                <th scope="col" className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Category
                                </th>
                                <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Amount
                                </th>
                                <th scope="col" className={`px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Status
                                </th>
                                <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className={`bg-white divide-y divide-gray-200 ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5" : ""}`}>
                            {filtered.slice((page - 1) * pageSize, page * pageSize).map((e, index) => (
                                <tr
                                    key={e.id}
                                    className={`hover:bg-gray-50 transition-colors group ${selectedIds.includes(e.id) ? `bg-indigo-50/50 ${useDarkMode ? "[.dark_&]:bg-indigo-900/20" : ""}` : `${useDarkMode ? "[.dark_&]:hover:bg-white/5" : ""}`}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(e.id)}
                                            onChange={() => handleSelectOne(e.id)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                            {(page - 1) * pageSize + index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3 ${useDarkMode ? "[.dark_&]:bg-indigo-900/50 [.dark_&]:text-indigo-300" : ""}`}>
                                                {e.employeeName ? e.employeeName.charAt(0).toUpperCase() : "?"}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium text-gray-900 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                                    {e.employeeName || "Unknown"}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                                                <FaCalendarAlt className="text-gray-400" />
                                                {e.date || "-"}
                                            </div>
                                            <span className={`text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                                {e.title}
                                            </span>
                                            {e.receiptUrl && (
                                                <a
                                                    href={e.receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 mt-1"
                                                >
                                                    <FaFileInvoice /> Receipt
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {e.projectName ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                <FaProjectDiagram className="text-[10px] text-indigo-500" />
                                                {e.projectName}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No project</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                            <FaTag className="text-[10px] text-gray-500" />
                                            {e.category || "Other"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className={`text-sm font-bold text-gray-900 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                            {e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                                            <span className={`text-xs font-medium text-gray-500 ml-1 ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                                {e.currency || "INR"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(e.status, useDarkMode)}`}>
                                            {e.status || "Unknown"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => setViewingExpense(e)}
                                                className="text-gray-500 hover:text-indigo-600"
                                            >
                                                View
                                            </Button>
                                            {e.status === "Submitted" && (
                                                <>
                                                    <Button
                                                        size="xs"
                                                        onClick={() => handleApprove(e.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="secondary"
                                                        onClick={() => handleOpenReject(e.id)}
                                                        className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {e.status === "Approved" && (
                                                <Button
                                                    size="xs"
                                                    onClick={() => handleMarkPaid(e.id)}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                                                >
                                                    Mark Paid
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
                <div className={`flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" : ""}`}>
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
                            disabled={page >= Math.ceil(filtered.length / pageSize)}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className={`text-sm text-gray-700 ${useDarkMode ? "[.dark_&]:text-gray-300" : ""}`}>
                                Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, filtered.length)}</span> to{" "}
                                <span className="font-medium">{Math.min(page * pageSize, filtered.length)}</span> of{" "}
                                <span className="font-medium">{filtered.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${useDarkMode ? "[.dark_&]:ring-white/10 [.dark_&]:hover:bg-white/5" : ""}`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <FaChevronLeft className="h-3 w-3" />
                                </button>
                                <span className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 ${useDarkMode ? "[.dark_&]:text-white [.dark_&]:ring-white/10" : ""}`}>
                                    {page} / {Math.ceil(filtered.length / pageSize) || 1}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
                                    disabled={page >= Math.ceil(filtered.length / pageSize)}
                                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${useDarkMode ? "[.dark_&]:ring-white/10 [.dark_&]:hover:bg-white/5" : ""}`}
                                >
                                    <span className="sr-only">Next</span>
                                    <FaChevronRight className="h-3 w-3" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 overflow-hidden flex flex-col ${useDarkMode ? "[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" : ""}`}>
                        <div className={`flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white/80 backdrop-blur-md ${useDarkMode ? "[.dark_&]:bg-[#181B2A]/80 [.dark_&]:border-white/10" : ""}`}>
                            <div>
                                <h2 className={`text-lg font-bold text-gray-800 ${useDarkMode ? "[.dark_&]:text-white" : ""}`}>
                                    Reject Expense
                                </h2>
                                <p className={`text-xs text-gray-500 font-medium mt-0.5 ${useDarkMode ? "[.dark_&]:text-gray-400" : ""}`}>
                                    Provide a reason for rejection
                                </p>
                            </div>
                            <button
                                onClick={() => setRejectingId(null)}
                                className={`p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 ${useDarkMode ? "[.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-gray-300" : ""}`}
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-800">
                                    The employee will be notified about this rejection. Please
                                    provide a clear reason to help them correct the issue.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Receipt is blurry, Amount mismatch..."
                                    className={`w-full rounded-xl border-0 bg-gray-50 py-3 px-4 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-500 transition-all resize-none ${useDarkMode ? "[.dark_&]:bg-[#1F2234] [.dark_&]:text-white [.dark_&]:ring-white/10" : ""}`}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className={`flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/50 ${useDarkMode ? "[.dark_&]:bg-[#1F2234]/50 [.dark_&]:border-white/10" : ""}`}>
                            <Button
                                variant="ghost"
                                onClick={() => setRejectingId(null)}
                                className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${useDarkMode ? "[.dark_&]:text-gray-400 [.dark_&]:hover:text-gray-300 [.dark_&]:hover:bg-white/10" : ""}`}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmReject}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
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
                    useDarkMode={useDarkMode}
                />
            )}
        </div>
    );
}

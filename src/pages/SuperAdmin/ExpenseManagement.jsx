import { useEffect, useMemo, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatCard from "../../components/StatCard";
import {
  FaMoneyCheckAlt,
  FaCheckCircle,
  FaRupeeSign,
  FaTimes,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaAlignLeft,
  FaStickyNote,
  FaFileInvoice,
  FaExternalLinkAlt,
  FaMoneyBillWave,
  FaTag,
  FaProjectDiagram,
  FaSearch,
  FaClock,
  FaHourglassHalf,
  FaUpload,
} from "react-icons/fa";
import {
  subscribeToAllExpenses,
  approveExpense,
  rejectExpense,
  markExpensePaid,
} from "../../services/expenseService";
import toast from "react-hot-toast";

const statusColors = {
  Draft: "bg-gray-100 text-gray-700 [.dark_&]:bg-gray-500/20 [.dark_&]:text-gray-300",
  Submitted: "bg-blue-100 text-blue-700 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-300",
  Approved: "bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-500/20 [.dark_&]:text-emerald-300",
  Rejected: "bg-red-100 text-red-700 [.dark_&]:bg-red-500/20 [.dark_&]:text-red-300",
  Paid: "bg-purple-100 text-purple-700 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-300",
};

const ExpenseManagement = () => {
  const { buttonClass } = useThemeStyles();
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

    if (!activeStatFilter) {
      if (categoryFilter !== "all") {
        result = result.filter(
          (e) => (e.category || "Other") === categoryFilter
        );
      }
    } else {
      if (categoryFilter !== "all") {
        result = result.filter(
          (e) => (e.category || "Other") === categoryFilter
        );
      }
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
  }, [
    expenses,
    searchQuery,
    categoryFilter,
    fromDate,
    toDate,
    activeStatFilter,
  ]);

  useEffect(() => {
    if (searchQuery || categoryFilter !== "all" || fromDate || toDate) {
      setActiveStatFilter(null);
    }
  }, [searchQuery, categoryFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = expenses.length;
    const submitted = expenses.filter((e) => e.status === "Submitted").length;
    const approved = expenses.filter((e) => e.status === "Approved").length;
    const paid = expenses.filter((e) => e.status === "Paid").length;
    const totalAmount = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
    return { total, submitted, approved, paid, totalAmount };
  }, [expenses]);

  const handleApprove = async (id) => {
    try {
      await approveExpense(id, window.currentUser || {});
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
        window.currentUser || {},
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
      await Promise.all(selectedIds.map((id) => approveExpense(id)));
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
      "ID",
      "Employee Name",
      "Employee ID",
      "Date",
      "Title",
      "Category",
      "Amount",
      "Currency",
      "Status",
      "Description",
      "Receipt URL",
    ];
    const csvContent = [
      headers.join(","),
      ...filtered.map((e) =>
        [
          e.id,
          `"${e.employeeName || ""}"`,
          e.employeeId,
          e.date,
          `"${e.title}"`,
          e.category,
          e.amount,
          e.currency,
          e.status,
          `"${(e.description || "").replace(/"/g, '""')}"`,
          e.receiptUrl || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_export_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
  };

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
            className={`flex items-center gap-2 ${buttonClass}`}
            disabled={filtered.length === 0}
          >
            <FaUpload className="h-4 w-4" />
            Export Excel
          </Button>
        }
      />

      {/* Stats Cards - Now Clickable Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Expenses Card */}
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 [.dark_&]:border-l-indigo-400 p-4 hover:shadow-md transition-shadow [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 [.dark_&]:text-indigo-400">Total</p>
                <p className="text-3xl font-bold text-indigo-900 mt-1 [.dark_&]:text-white">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-200/50 flex items-center justify-center [.dark_&]:bg-indigo-900/50">
                <FaMoneyCheckAlt className="text-indigo-600 text-xl [.dark_&]:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Submitted Card */}
        <div
          onClick={() => {
            setActiveStatFilter("submitted");
            setSearchQuery("");
            setCategoryFilter("all");
            setFromDate("");
            setToDate("");
            setStatusFilter("all");
          }}
          className="cursor-pointer"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 p-4 hover:shadow-md transition-shadow [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">Submitted</p>
                <p className="text-3xl font-bold text-blue-900 mt-1 [.dark_&]:text-white">
                  {stats.submitted}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200/50 flex items-center justify-center [.dark_&]:bg-blue-900/50">
                <FaHourglassHalf className="text-blue-600 text-xl [.dark_&]:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Approved Card */}
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 p-4 hover:shadow-md transition-shadow [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">Approved</p>
                <p className="text-3xl font-bold text-green-900 mt-1 [.dark_&]:text-white">
                  {stats.approved}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-200/50 flex items-center justify-center [.dark_&]:bg-green-900/50">
                <FaCheckCircle className="text-green-600 text-xl [.dark_&]:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Paid Card */}
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 p-4 hover:shadow-md transition-shadow [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">
                  Paid (₹{stats.totalAmount.toFixed(2)})
                </p>
                <p className="text-3xl font-bold text-purple-900 mt-1 [.dark_&]:text-white">
                  {stats.paid}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-200/50 flex items-center justify-center [.dark_&]:bg-purple-900/50">
                <FaRupeeSign className="text-purple-600 text-xl [.dark_&]:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-4">
        {/* Search & Actions Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
              Search & Actions
            </h2>
            <span className="text-sm text-gray-500 [.dark_&]:text-gray-400">
              Showing {filtered.length} records
            </span>
          </div>
          <hr className="border-gray-200 [.dark_&]:border-white/10" />
        </div>

        {/* Search Input with Label */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 [.dark_&]:text-gray-300">
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
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 [.dark_&]:bg-indigo-900/20 [.dark_&]:border-indigo-500/30">
            <span className="text-sm font-medium text-indigo-700 [.dark_&]:text-indigo-300">
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

        {/* Filters Section with Labels */}
        <div className="pt-4 border-t border-gray-200 [.dark_&]:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide [.dark_&]:text-gray-400">
              Filters:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 [.dark_&]:text-gray-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 [.dark_&]:text-gray-300">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
              >
                <option value="all">All Categories</option>
                <option value="Travel">Travel</option>
                <option value="Food">Food</option>
                <option value="Stay">Stay</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 [.dark_&]:text-gray-300">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 [.dark_&]:text-gray-300">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-white shadow-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
              />
            </div>
          </div>

          {/* Clear Filters Button Only */}
          {(searchQuery ||
            categoryFilter !== "all" ||
            statusFilter !== "all" ||
            fromDate ||
            toDate) && (
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

      {/* Table Section */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-4 animate-pulse [.dark_&]:bg-indigo-900/20 [.dark_&]:text-indigo-400">
            <FaMoneyBillWave className="text-xl" />
          </div>
          <p className="text-gray-500 font-medium [.dark_&]:text-gray-400">Loading expenses...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4 [.dark_&]:bg-white/5 [.dark_&]:text-gray-500">
            <FaFileInvoice className="text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
            No expenses found
          </h3>
          <p className="text-gray-500 mt-1 max-w-sm mx-auto [.dark_&]:text-gray-400">
            No expenses match your current filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm [.dark_&]:border-white/10">
          <table className="min-w-full divide-y divide-gray-200 [.dark_&]:divide-white/5">
            <thead className="bg-gray-50 [.dark_&]:bg-[#1F2234]">
              <tr>
                <th scope="col" className="px-6 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filtered.length > 0 &&
                      selectedIds.length === filtered.length
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Sr. No.
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Employee
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Expense Details
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Project
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider [.dark_&]:text-gray-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 [.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5">
              {filtered.map((e, index) => (
                <tr
                  key={e.id}
                  className={`hover:bg-gray-50 transition-colors group ${selectedIds.includes(e.id) ? "bg-indigo-50/50 [.dark_&]:bg-indigo-900/20" : "[.dark_&]:hover:bg-white/5"
                    }`}
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
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3 [.dark_&]:bg-indigo-900/50 [.dark_&]:text-indigo-300">
                        {e.employeeName
                          ? e.employeeName.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
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
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors [.dark_&]:text-white">
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
                      <span className="text-xs text-gray-400 italic">
                        No project
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      <FaTag className="text-[10px] text-gray-500" />
                      {e.category || "Other"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900 [.dark_&]:text-white">
                      {e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                      <span className="text-xs font-medium text-gray-500 ml-1 [.dark_&]:text-gray-400">
                        {e.currency || "INR"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[e.status] || "bg-gray-100 text-gray-800"
                        }`}
                    >
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

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 overflow-hidden flex flex-col [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white/80 backdrop-blur-md [.dark_&]:bg-[#181B2A]/80 [.dark_&]:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 [.dark_&]:text-white">
                  Reject Expense
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5 [.dark_&]:text-gray-400">
                  Provide a reason for rejection
                </p>
              </div>
              <button
                onClick={() => setRejectingId(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-gray-300"
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
                  className="w-full rounded-xl border-0 bg-gray-50 py-3 px-4 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-500 transition-all resize-none [.dark_&]:bg-[#1F2234] [.dark_&]:text-white [.dark_&]:ring-white/10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/50 [.dark_&]:bg-[#1F2234]/50 [.dark_&]:border-white/10">
              <Button
                variant="ghost"
                onClick={() => setRejectingId(null)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white/80 backdrop-blur-md [.dark_&]:bg-[#181B2A]/80 [.dark_&]:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 [.dark_&]:text-white">
                  Expense Details
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5 [.dark_&]:text-gray-400">
                  Full information about this claim
                </p>
              </div>
              <button
                onClick={() => setViewingExpense(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-gray-300"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Header Info */}
              <div className="flex items-start justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight [.dark_&]:text-white">
                    {viewingExpense.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 [.dark_&]:text-gray-400">
                    <span className="font-medium text-gray-700 [.dark_&]:text-gray-300">
                      {viewingExpense.category}
                    </span>
                    <span>•</span>
                    <span>{viewingExpense.date}</span>
                  </div>
                  {viewingExpense.projectName && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FaProjectDiagram className="text-[10px]" />
                        {viewingExpense.projectName}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">
                    {viewingExpense.amount?.toFixed(2)}{" "}
                    <span className="text-base font-medium text-gray-500">
                      {viewingExpense.currency}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${statusColors[viewingExpense.status]
                        }`}
                    >
                      {viewingExpense.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employee & Date Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-3 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <FaUser className="text-gray-400 text-xs" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide [.dark_&]:text-gray-400">
                      Employee
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 [.dark_&]:text-white">
                    {viewingExpense.employeeName}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <FaCalendarAlt className="text-gray-400 text-xs" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide [.dark_&]:text-gray-400">
                      Submitted On
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 [.dark_&]:text-white">
                    {viewingExpense.createdAt?.toDate
                      ? viewingExpense.createdAt.toDate().toLocaleDateString()
                      : "-"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 [.dark_&]:text-gray-400">
                    {viewingExpense.createdAt?.toDate
                      ? viewingExpense.createdAt
                        .toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingExpense.description && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <FaAlignLeft /> Description
                  </label>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 leading-relaxed [.dark_&]:bg-[#1F2234] [.dark_&]:text-gray-300 [.dark_&]:border-white/10">
                    {viewingExpense.description}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingExpense.notes && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <FaStickyNote /> Notes / Reference
                  </label>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 leading-relaxed [.dark_&]:bg-[#1F2234] [.dark_&]:text-gray-300 [.dark_&]:border-white/10">
                    {viewingExpense.notes}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {viewingExpense.rejectionReason && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <label className="block text-xs font-bold text-red-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <FaExclamationTriangle /> Rejection Reason
                  </label>
                  <div className="text-sm text-red-800 bg-red-50 p-4 rounded-xl border border-red-100 leading-relaxed shadow-sm">
                    {viewingExpense.rejectionReason}
                  </div>
                </div>
              )}

              {/* Receipt */}
              {viewingExpense.receiptUrl && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <FaFileInvoice /> Receipt Document
                  </label>
                  <a
                    href={viewingExpense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-3 rounded-xl border border-indigo-100 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                        <FaFileInvoice className="text-lg" />
                      </div>
                      <span>View Attached Receipt</span>
                    </div>
                    <FaExternalLinkAlt className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10">
              <Button
                variant="secondary"
                onClick={() => setViewingExpense(null)}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-gray-300 [.dark_&]:hover:bg-white/5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;

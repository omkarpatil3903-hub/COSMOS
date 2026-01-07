import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/useAuthContext";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatCard from "../../components/StatCard";
import {
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaFilter,
  FaSearch,
  FaPlus,
  FaTimes,
  FaTag,
  FaMoneyBill,
  FaFileUpload,
  FaFileInvoice,
  FaCalendarAlt,
  FaProjectDiagram,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import {
  subscribeToEmployeeExpenses,
  createExpense,
  uploadReceipt,
  updateExpense,
  deleteExpense,
} from "../../services/expenseService";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import toast from "react-hot-toast";
import VoiceInput from "../../components/Common/VoiceInput";
import { EXPENSE_CATEGORIES, getStatusColorClass } from "../../config/expenseConfig";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import ExpenseDetailModal from "../../components/expenses/ExpenseDetailModal";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";

const EmployeeExpenses = () => {
  const { user } = useAuthContext();
  const { buttonClass } = useThemeStyles();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  const [deletingExpense, setDeletingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    category: "Other",
    amount: "",
    currency: "INR",
    notes: "",
    status: "Submitted",
    receipt: null,
    projectId: "",
    projectName: "",
  });

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToEmployeeExpenses(user.uid, (items) => {
      setExpenses(items);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // Fetch projects assigned to employee
  useEffect(() => {
    if (!user?.uid) return;

    // Get tasks assigned to this employee to find their projects
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(tasksQuery, (taskSnapshot) => {
      const taskData = taskSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((task) => task.assigneeType === "user");

      // Get unique project IDs from tasks
      const projectIds = [
        ...new Set(taskData.map((t) => t.projectId).filter(Boolean)),
      ];

      if (projectIds.length > 0) {
        // Get projects
        const projectsQuery = query(
          collection(db, "projects"),
          where("__name__", "in", projectIds)
        );

        const unsubProjects = onSnapshot(projectsQuery, (projectSnapshot) => {
          const projectData = projectSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProjects(projectData);
          setAssignedProjects(projectData);
        });

        return () => {
          unsubProjects();
          unsubTasks();
        };
      } else {
        setProjects([]);
        setAssignedProjects([]);
      }
    });

    return () => unsubTasks();
  }, [user?.uid]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (
        categoryFilter !== "all" &&
        (e.category || "Other") !== categoryFilter
      )
        return false;

      if (fromDate && e.date && e.date < fromDate) return false;
      if (toDate && e.date && e.date > toDate) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    });
  }, [expenses, statusFilter, categoryFilter, fromDate, toDate, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, fromDate, toDate, searchQuery]);

  const stats = useMemo(() => {
    const total = expenses.length;
    const submitted = expenses.filter((e) => e.status === "Submitted").length;
    const approved = expenses.filter((e) => e.status === "Approved").length;
    const paid = expenses.filter((e) => e.status === "Paid").length;
    const approvedAmount = expenses
      .filter((e) => e.status === "Approved")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalAmount = expenses
      .filter((e) => e.status === "Paid")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { total, submitted, approved, paid, approvedAmount, totalAmount };
  }, [expenses]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      date: "",
      category: "Other",
      amount: "",
      currency: "INR",
      notes: "",
      status: "Submitted",
      receipt: null,
      projectId: "",
      projectName: "",
    });
    setEditingId(null);
  };

  const handleEdit = (expense) => {
    setForm({
      title: expense.title,
      description: expense.description || "",
      date: expense.date,
      category: expense.category || "Other",
      amount: expense.amount,
      currency: expense.currency || "INR",
      notes: expense.notes || "",
      status: expense.status,
      receipt: null,
      projectId: expense.projectId || "",
      projectName: expense.projectName || "",
    });
    setEditingId(expense.id);
    setShowModal(true);
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
      toast.error("Failed to delete draft");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (statusOverride) => {
    if (!user?.uid) return;
    const status = statusOverride || form.status || "Submitted";
    const newErrors = {};
    if (!form.title) newErrors.title = "Title is required";
    if (!form.date) newErrors.date = "Date is required";
    if (!form.amount || Number(form.amount) <= 0)
      newErrors.amount = "Enter a valid amount";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      let receiptUrl = null;
      if (form.receipt) {
        receiptUrl = await uploadReceipt(form.receipt, user.uid);
      }

      const selectedProject = assignedProjects.find(
        (p) => p.id === form.projectId
      );

      const payload = {
        employeeId: user.uid,
        employeeName: user.displayName || user.email || "Employee",
        title: form.title,
        description: form.description,
        date: form.date,
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency,
        notes: form.notes,
        status,
        projectId: form.projectId || null,
        projectName:
          selectedProject?.projectName || selectedProject?.name || null,
      };

      if (receiptUrl) {
        payload.receiptUrl = receiptUrl;
      }

      if (editingId) {
        await updateExpense(editingId, payload);
        if (form.status === "Rejected" && status === "Submitted") {
          toast.success("Expense resubmitted for approval");
        } else {
          toast.success(status === "Draft" ? "Draft updated" : "Expense updated");
        }
      } else {
        await createExpense({ ...payload, receiptUrl });
        toast.success(
          status === "Draft" ? "Draft saved" : "Expense submitted for approval"
        );
      }

      resetForm();
      setErrors({});
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save expense", err);
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expenses"
        description="Submit and track your reimbursement claims"
        icon={
          <div>
            <FaMoneyBillWave />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Claims"
          value={stats.total}
          icon={<FaMoneyBillWave className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Approved"
          value={`₹${stats.approvedAmount?.toFixed(2) || "0.00"}`}
          subValue={`${stats.approved} claim${stats.approved !== 1 ? "s" : ""}`}
          icon={<FaMoneyCheckAlt className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Paid"
          value={`₹${stats.totalAmount?.toFixed(2) || "0.00"}`}
          subValue={`${stats.paid} claim${stats.paid !== 1 ? "s" : ""}`}
          icon={<FaMoneyCheckAlt className="h-5 w-5" />}
          color="purple"
        />
      </div>

      <div className="bg-[#1e1e2d] p-4 rounded-2xl border border-gray-800 shadow-lg">
        {/* Row 1: Search + Add Expense Button */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-500 text-sm" />
            </div>
            <input
              type="text"
              placeholder="Search expenses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#2b2b40] py-2.5 pl-10 pr-3 text-sm text-gray-300 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>

          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            variant="custom"
            className={`flex items-center gap-2 ${buttonClass} px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md border-none`}
          >
            <FaPlus className="text-sm" /> Add Expense
          </Button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-500" />
            <span className="font-medium text-gray-300">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-[#2b2b40] py-2 px-3 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Paid">Paid</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-[#2b2b40] py-2 px-3 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Travel">Travel</option>
            <option value="Food">Food</option>
            <option value="Stay">Stay</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-2 bg-[#2b2b40] rounded-lg border border-gray-700 px-3 py-2">
            <span className="text-sm text-gray-500">Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-sm text-gray-300 border-none p-0 focus:ring-0 w-28"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-sm text-gray-300 border-none p-0 focus:ring-0 w-28"
            />
          </div>

          <div className="ml-auto text-sm font-medium text-gray-400">
            Showing {filtered.length} of {expenses.length} expenses
          </div>
        </div>
      </div>


      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
            <FaMoneyBillWave className="text-xl" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Loading your expenses...
          </p>
        </div>
      ) : (
        <Card
          title="Expense History"
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
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-[#1e1e2d]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sr No</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Document</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#181b2a] divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((e, index) => (
                  <tr
                    key={e.id}
                    onClick={() => setViewingExpense(e)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                      {(page - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {e.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {e.projectName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                          <FaProjectDiagram className="text-[10px] text-indigo-500 dark:text-indigo-400" />
                          {e.projectName}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No project</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
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
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
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
                              fileType: "image/jpeg", // Defaulting to image, modal handles detection
                              id: e.id
                            });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          <FaFileInvoice /> Receipt
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(e.status, false)}`}
                      >
                        {e.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-2">
                        {(e.status === "Draft" || e.status === "Rejected" || e.status === "Submitted") && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(ev) => ev.stopPropagation()}>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }}
                              title={e.status === "Rejected" ? "Edit & Resubmit" : "Edit"}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                              onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }}
                              title="Delete"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        )}
                        {e.status === "Rejected" && e.rejectionReason && (
                          <span className="group relative" onClick={(ev) => ev.stopPropagation()}>
                            <FaTimes className="text-red-500 cursor-help" />
                            <span className="absolute right-0 top-full mt-1 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 invisible group-hover:visible">
                              {e.rejectionReason}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1e1e2d] shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4 bg-white/80 dark:bg-[#1e1e2d] backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {editingId ? "Edit Expense" : "New Expense"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  {editingId
                    ? "Update expense details"
                    : "Submit a new reimbursement claim"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaTag />
                    </div>
                    <VoiceInput
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="e.g. Client Lunch"
                      className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                    />
                  </div>
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                      {errors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 px-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                    />
                  </div>
                  {errors.date && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                      {errors.date}
                    </p>
                  )}
                </div>
              </div>

              {/* Project Dropdown - New Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Project (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaProjectDiagram />
                  </div>
                  <select
                    value={form.projectId}
                    onChange={(e) => handleChange("projectId", e.target.value)}
                    className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
                  >
                    <option value="">Select Project</option>
                    {assignedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectName ||
                          project.name ||
                          "Untitled Project"}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </div>
                {assignedProjects.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    No projects assigned to you yet
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 px-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
                    >
                      <option>Travel</option>
                      <option>Food</option>
                      <option>Stay</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FaMoneyBill />
                      </div>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => handleChange("amount", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        {errors.amount}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      Currency
                    </label>
                    <div className="w-20 rounded-xl border-0 bg-gray-100 dark:bg-gray-700 py-2.5 px-3 text-sm font-bold text-gray-500 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 text-center cursor-not-allowed select-none">
                      INR
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Description
                </label>
                <VoiceInput
                  as="textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe the expense details..."
                  className="w-full rounded-xl border-0 bg-gray-50 dark:bg-gray-800 py-3 px-4 text-sm font-medium text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Receipt (Optional)
                </label>
                <div className="mt-1 flex justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800">
                  <div className="text-center">
                    <FaFileUpload className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-500" />
                    <div className="mt-2 flex text-sm leading-6 text-gray-600 dark:text-gray-300 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white dark:bg-transparent font-semibold text-indigo-600 dark:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) =>
                            handleChange("receipt", e.target.files[0])
                          }
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {form.receipt
                        ? form.receipt.name
                        : "PNG, JPG, PDF up to 1MB"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50/50 dark:bg-[#181b2a]">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => handleSubmit("Draft")}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 shadow-sm"
              >
                {editingId ? "Update Draft" : "Save as Draft"}
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmit("Submitted")}
                  disabled={saving}
                  variant="custom"
                  className={buttonClass}
                >
                  {saving ? "Saving..." : "Submit Expense"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <DeleteConfirmationModal
            onClose={() => setDeletingExpense(null)}
            onConfirm={handleConfirmDelete}
            itemType="Expense"
            itemTitle={deletingExpense.title}
            title="Delete Expense"
            description={`Are you sure you want to delete this ${deletingExpense.status.toLowerCase()} expense?`}
            isLoading={isDeleting}
            confirmLabel="Delete Expense"
          />
        </div>
      )}
      {viewingExpense && (
        <ExpenseDetailModal
          expense={viewingExpense}
          onClose={() => setViewingExpense(null)}
          onViewReceipt={setViewingReceipt}
          useDarkMode={true}
        />
      )}

      <DocumentPreviewModal
        open={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        doc={viewingReceipt}
        showMetadata={false}
      />
    </div>
  );
};

export default EmployeeExpenses;

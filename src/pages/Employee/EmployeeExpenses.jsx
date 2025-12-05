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

const statusColors = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Paid: "bg-purple-100 text-purple-700",
};

const EmployeeExpenses = () => {
  const { user } = useAuthContext();
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

  const stats = useMemo(() => {
    const total = expenses.length;
    const submitted = expenses.filter((e) => e.status === "Submitted").length;
    const approved = expenses.filter((e) => e.status === "Approved").length;
    const paid = expenses.filter((e) => e.status === "Paid").length;
    return { total, submitted, approved, paid };
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    try {
      await deleteExpense(id);
      toast.success("Draft deleted");
    } catch (err) {
      console.error("Failed to delete expense", err);
      toast.error("Failed to delete draft");
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
        receiptUrl = await uploadReceipt(form.receipt);
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
        toast.success(status === "Draft" ? "Draft updated" : "Expense updated");
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
          value={stats.approved}
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

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-content-tertiary" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-subtle bg-surface py-2 pl-8 pr-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <FaFilter className="text-content-tertiary" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-subtle bg-surface py-2 px-3 text-sm text-content-primary"
          >
            <option value="all">All Categories</option>
            <option value="Travel">Travel</option>
            <option value="Food">Food</option>
            <option value="Stay">Stay</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-content-secondary">
            <span>Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-subtle bg-surface py-1 px-2 text-xs text-content-primary"
            />
            <span>-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-subtle bg-surface py-1 px-2 text-xs text-content-primary"
            />
          </div>

          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="ml-auto flex items-center gap-2"
          >
            <FaPlus /> New Expense
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
              <FaMoneyBillWave className="text-xl" />
            </div>
            <p className="text-gray-500 font-medium">
              Loading your expenses...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
              <FaFileInvoice className="text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No expenses found
            </h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">
              You haven't submitted any expenses matching your filters yet.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="mt-6 mx-auto"
            >
              <FaPlus className="mr-2" /> Create New Claim
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Expense Details
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        {e.date || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {e.title}
                        </span>
                        {e.description && (
                          <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {e.description}
                          </span>
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
                      <div className="text-sm font-bold text-gray-900">
                        {e.amount?.toFixed ? e.amount.toFixed(2) : e.amount}
                        <span className="text-xs font-medium text-gray-500 ml-1">
                          {e.currency || "INR"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[e.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {e.status || "Unknown"}
                        </span>

                        {e.status === "Draft" && (
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(e)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white/80 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {editingId ? "Edit Expense" : "New Expense"}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {editingId
                    ? "Update expense details"
                    : "Submit a new reimbursement claim"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaTag />
                    </div>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="e.g. Client Lunch"
                      className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                    />
                  </div>
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {errors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      className="w-full rounded-xl border-0 bg-gray-50 py-2.5 px-3 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                    />
                  </div>
                  {errors.date && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {errors.date}
                    </p>
                  )}
                </div>
              </div>

              {/* Project Dropdown - New Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Project (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaProjectDiagram />
                  </div>
                  <select
                    value={form.projectId}
                    onChange={(e) => handleChange("projectId", e.target.value)}
                    className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
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
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
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
                  <p className="mt-1 text-xs text-gray-500">
                    No projects assigned to you yet
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="w-full rounded-xl border-0 bg-gray-50 py-2.5 px-3 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all appearance-none"
                    >
                      <option>Travel</option>
                      <option>Food</option>
                      <option>Stay</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
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
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
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
                        className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.amount}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Currency
                    </label>
                    <div className="w-20 rounded-xl border-0 bg-gray-100 py-2.5 px-3 text-sm font-bold text-gray-500 ring-1 ring-inset ring-gray-200 text-center cursor-not-allowed select-none">
                      INR
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe the expense details..."
                  className="w-full rounded-xl border-0 bg-gray-50 py-3 px-4 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Receipt (Optional)
                </label>
                <div className="mt-1 flex justify-center rounded-xl border border-dashed border-gray-300 px-6 py-4 hover:bg-gray-50 transition-colors bg-white">
                  <div className="text-center">
                    <FaFileUpload className="mx-auto h-8 w-8 text-gray-300" />
                    <div className="mt-2 flex text-sm leading-6 text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
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
                    <p className="text-xs leading-5 text-gray-500">
                      {form.receipt
                        ? form.receipt.name
                        : "PNG, JPG, PDF up to 1MB"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => handleSubmit("Draft")}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm"
              >
                {editingId ? "Update Draft" : "Save as Draft"}
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmit("Submitted")}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                >
                  {saving ? "Saving..." : "Submit Expense"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeExpenses;

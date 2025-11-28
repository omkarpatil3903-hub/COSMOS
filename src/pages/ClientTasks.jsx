// src/pages/ClientTasks.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/Card";
import { useAuthContext } from "../context/useAuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import CompletionCommentModal from "../components/CompletionCommentModal";
import ImageUploadModal from "../components/ImageUploadModal";
import {
  FaTasks,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaTh,
  FaList,
  FaCalendarAlt,
  FaFilter,
  FaTimes,
  FaFlag,
  FaUser,
  FaPlay,
  FaUpload,
  FaCheck,
  FaExclamationTriangle,
  FaRedo,
  FaChartBar,
} from "react-icons/fa";

// Circular Progress Component
const CircularProgress = ({ percentage, size = 16, strokeWidth = 2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
};

export default function ClientTasks() {
  const { user, userData } = useAuthContext();
  const location = useLocation();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [view, setView] = useState("list"); // 'board' or 'list'
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [progressDrafts, setProgressDrafts] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCompleted, setExpandedCompleted] = useState({});
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [sortBy, setSortBy] = useState("Sort by Due Date");
  const [uploadingImages, setUploadingImages] = useState({});
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState(null);

  // Handle navigation state from dashboard
  useEffect(() => {
    if (location.state?.filterStatus === "pending") {
      setFilterStatus("pending");
    }
  }, [location.state]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "tasks"),
      where("assigneeType", "==", "client"),
      where("assigneeId", "==", uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTasks(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            status:
              data.status === "In Review"
                ? "In Progress"
                : data.status || "To-Do",
          };
        })
      );
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  const commitProgress = async (taskId) => {
    try {
      const raw = progressDrafts[taskId];
      const value = Math.max(0, Math.min(100, parseInt(raw ?? 0)));
      const current = tasks.find((t) => t.id === taskId);
      if (current && (current.progressPercent ?? 0) === value) return;

      // Auto-complete task when progress reaches 100%
      if (value === 100 && current?.status !== "Done") {
        setCompletionTaskId(taskId);
        setShowCompletionModal(true);
        return;
      }

      await updateDoc(doc(db, "tasks", taskId), { progressPercent: value });
      toast.success("Progress updated");
      setProgressDrafts((prev) => {
        const { [taskId]: _omit, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const currentTask = tasks.find((t) => t.id === taskId);
      const updateData = { status: newStatus };

      // If changing from Done to another status, clear completion data and reset progress
      if (currentTask?.status === "Done" && newStatus !== "Done") {
        updateData.completedAt = null;
        updateData.completedBy = "";
        updateData.completedByType = "";
        updateData.progressPercent = 0;
      }

      // If changing to Done, set completion data
      if (newStatus === "Done" && currentTask?.status !== "Done") {
        updateData.completedAt = serverTimestamp();
        updateData.completedBy = uid || "";
        updateData.completedByType = "client";
        updateData.progressPercent = 100;
      }

      await updateDoc(doc(db, "tasks", taskId), updateData);
      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleSubmitCompletion = async (comment) => {
    if (!completionTaskId) {
      setShowCompletionModal(false);
      return;
    }
    try {
      await updateDoc(doc(db, "tasks", completionTaskId), {
        status: "Done",
        completedAt: serverTimestamp(),
        completedBy: uid || "",
        completedByType: "client",
        progressPercent: 100,
        ...(comment ? { completionComment: comment } : {}),
      });
      toast.success("Task marked as complete!");
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    } finally {
      setShowCompletionModal(false);
      setCompletionTaskId(null);
    }
  };

  const handleViewTaskDetails = (task) => {
    setSelectedTaskForDetails(task);
    setShowTaskDetailsModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Status");
    setPriorityFilter("All Priority");
    setSortBy("Sort by Due Date");
  };

  const handleImageUpload = async (taskId, file) => {
    if (!file) return;

    // Validate file type - only images allowed
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validImageTypes.includes(file.type)) {
      toast.error(
        "🚫 Error: Only upload images! Supported formats: JPG, PNG, GIF, WebP",
        {
          duration: 4000,
          style: {
            background: "#FEE2E2",
            color: "#DC2626",
            border: "1px solid #FECACA",
          },
        }
      );
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("🚫 Error: Image size must be less than 5MB", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#DC2626",
          border: "1px solid #FECACA",
        },
      });
      return;
    }

    try {
      setUploadingImages((prev) => ({ ...prev, [taskId]: true }));

      // Show uploading message
      toast.success("📸 Uploading image...", { duration: 2000 });

      // Get task details for better file organization
      const task = tasks.find((t) => t.id === taskId);
      const clientName = task.clientName || "unknown-client";
      const taskName = (task.title || task.taskName || "untitled-task").replace(
        /[^a-zA-Z0-9]/g,
        "-"
      );

      // Create organized storage path: uploads/clientId/clientName/taskName/
      const storagePath = `uploads/${uid}/${clientName}/${taskName}/${Date.now()}_${
        file.name
      }`;
      const imageRef = ref(storage, storagePath);

      // Upload the image
      const snapshot = await uploadBytes(imageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Create upload record for the uploads collection
      const uploadData = {
        fileName: file.name,
        originalName: file.name,
        url: downloadURL,
        storagePath: storagePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: serverTimestamp(),
        uploadedBy: uid,
        clientId: uid,
        clientName: clientName,
        taskId: taskId,
        taskTitle: task.title || task.taskName || "Untitled Task",
        projectId: task.projectId || null,
        projectName: task.projectName || null,
        status: "active",
        category: "task_attachment",
      };

      // Save to uploads collection
      const uploadDocRef = await addDoc(collection(db, "uploads"), uploadData);

      // Update the task with the image URL and upload reference
      const currentImages = task.images || [];
      const updatedImages = [
        ...currentImages,
        {
          name: file.name,
          url: downloadURL,
          storagePath: storagePath,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
          clientId: uid,
          clientName: clientName,
          taskId: taskId,
          taskName: task.title || task.taskName || "Untitled Task",
          type: file.type,
          size: file.size,
          uploadId: uploadDocRef.id, // Reference to the uploads collection document
        },
      ];

      await updateDoc(doc(db, "tasks", taskId), {
        images: updatedImages,
      });

      toast.success("✅ Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("❌ Failed to upload image");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleOpenImageUpload = (taskId) => {
    setSelectedTaskForUpload(taskId);
    setShowImageUploadModal(true);
  };

  const handleCloseImageUpload = () => {
    setShowImageUploadModal(false);
    setSelectedTaskForUpload(null);
  };

  const handleTaskStatusChangeFromModal = async (newStatus) => {
    if (!selectedTaskForDetails) return;

    try {
      const updateData = { status: newStatus };

      // If changing from Done to another status, clear completion data
      if (selectedTaskForDetails.status === "Done" && newStatus !== "Done") {
        updateData.completedAt = null;
        updateData.completedBy = "";
        updateData.completedByType = "";
        // Reset progress to 0 when restoring from Done to In Progress or To-Do
        updateData.progressPercent = 0;
      }

      // If changing to Done, set completion data
      if (newStatus === "Done" && selectedTaskForDetails.status !== "Done") {
        updateData.completedAt = serverTimestamp();
        updateData.completedBy = uid || "";
        updateData.completedByType = "client";
        updateData.progressPercent = 100;
      }

      await updateDoc(doc(db, "tasks", selectedTaskForDetails.id), updateData);
      toast.success("Task status updated successfully!");
      setShowTaskDetailsModal(false);
      setSelectedTaskForDetails(null);
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  // Filter and sort tasks
  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // ✅ 1. ADD THIS VISIBILITY CHECK
      // Get today's date as YYYY-MM-DD
      const todayISO = new Date().toISOString().split("T")[0];

      // If task has a "visibleFrom" date and it is in the future, HIDE IT
      if (task.visibleFrom && task.visibleFrom > todayISO) {
        return false;
      }
      // -----------------------------------------------------------

      const matchesSearch =
        !searchTerm ||
        (task.title || task.taskName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (task.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All Status" || (task.status || "") === statusFilter;

      const matchesPriority =
        priorityFilter === "All Priority" ||
        (task.priority || "") === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Apply sorting (Keep existing logic)
    if (sortBy === "Sort by Due Date") {
      filtered.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date("9999-12-31");
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date("9999-12-31");
        return dateA - dateB;
      });
    } else if (sortBy === "Sort by Priority") {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      filtered.sort(
        (a, b) =>
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );
    } else if (sortBy === "Sort by Status") {
      const statusOrder = { "To-Do": 1, "In Progress": 2, Done: 3 };
      filtered.sort(
        (a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
      );
    } else if (sortBy === "Sort by Created Date") {
      filtered.sort((a, b) => {
        const dateA = a.assignedDate ? new Date(a.assignedDate) : new Date(0);
        const dateB = b.assignedDate ? new Date(b.assignedDate) : new Date(0);
        return dateB - dateA; // Newest first
      });
    }

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortBy]);
  // Group tasks by status
  const todoTasks = filteredTasks.filter((t) => t.status === "To-Do");
  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === "In Progress"
  );
  const completedTasks = filteredTasks.filter((t) => t.status === "Done");
  const activeTasks = [...todoTasks, ...inProgressTasks];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const TaskCard = ({ task }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex-1 min-w-0">
          <span
            className="block truncate"
            title={task.title || task.taskName || "Untitled Task"}
          >
            {task.title || task.taskName || "Untitled Task"}
          </span>
        </h4>
        {task.priority && (
          <span
            className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
              task.priority === "High"
                ? "bg-red-100 text-red-800"
                : task.priority === "Medium"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {task.priority}
          </span>
        )}
      </div>

      <p
        className="text-sm text-gray-600 mb-3 line-clamp-2"
        title={task.description || "No description"}
      >
        {task.description || "No description"}
      </p>
      {task.status === "Done" && task.completionComment && (
        <p
          className="text-xs italic text-indigo-700 mb-2 line-clamp-1"
          title={task.completionComment}
        >
          💬 {task.completionComment}
        </p>
      )}

      <div className="flex items-center justify-between text-xs mb-3">
        {task.projectName && (
          <span
            className="text-indigo-600 block truncate max-w-[180px]"
            title={task.projectName}
          >
            {task.projectName}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              task.dueDate &&
              task.status !== "Done" &&
              task.dueDate < new Date().toISOString().slice(0, 10)
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <FaCalendarAlt className="text-current" />
            <span className="font-medium">Due:</span>
            <span>
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "No due"}
            </span>
          </span>
          {task.assignedDate && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              <FaCalendarAlt className="text-purple-600" />
              <span className="font-medium">Assigned:</span>
              <span>{new Date(task.assignedDate).toLocaleDateString()}</span>
            </span>
          )}
          {task.dueDate &&
            task.status !== "Done" &&
            task.dueDate < new Date().toISOString().slice(0, 10) && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                ⚠️ Overdue
              </span>
            )}
        </div>
      </div>

      {task.status === "In Progress" && (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Progress:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${task.progressPercent || 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
              {task.progressPercent || 0}%
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={progressDrafts[task.id] ?? (task.progressPercent || 0)}
              onChange={(e) =>
                setProgressDrafts((prev) => ({
                  ...prev,
                  [task.id]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") commitProgress(task.id);
              }}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <button
              onClick={() => commitProgress(task.id)}
              className="ml-2 px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Update
            </button>
          </div>
        </>
      )}

      <select
        value={task.status || "To-Do"}
        onChange={(e) => handleStatusChange(task.id, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="To-Do">To-Do</option>
        <option value="In Progress">In Progress</option>
        <option value="Done">Done</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">
          Manage and track all your assigned tasks
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-50 border-gray-200">
          <div className="flex items-center">
            <FaTasks className="text-gray-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">To-Do</p>
              <p className="text-2xl font-bold text-gray-900">
                {todoTasks.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <FaClock className="text-blue-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {inProgressTasks.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center">
            <FaCheckCircle className="text-green-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Done</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedTasks.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="space-y-4">
          {/* Search Bar - Full Width */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              spellCheck="true"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Filter Icon and Label */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <FaFilter className="text-gray-500" />
              <span>Filters:</span>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="All Status">All Status</option>
                <option value="To-Do">To-Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="All Priority">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="Sort by Due Date">Sort by Due Date</option>
                <option value="Sort by Priority">Sort by Priority</option>
                <option value="Sort by Status">Sort by Status</option>
                <option value="Sort by Created Date">
                  Sort by Created Date
                </option>
              </select>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaTimes className="text-xs" />
                Clear
              </button>

              {/* Task count */}
              <span className="text-gray-500 text-sm">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
                <button
                  onClick={() => setView("list")}
                  className={`p-2 rounded transition-colors ${
                    view === "list"
                      ? "bg-white text-indigo-600 shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="List View"
                >
                  <FaList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("board")}
                  className={`p-2 rounded transition-colors ${
                    view === "board"
                      ? "bg-white text-indigo-600 shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Kanban View"
                >
                  <FaTh className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FaTasks className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks found...
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== "all" || filterPriority !== "all"
                ? "Try adjusting your filters"
                : "No tasks have been assigned to you yet"}
            </p>
          </div>
        </Card>
      ) : view === "board" ? (
        // Kanban Board View - Similar to uploaded image
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* To-Do Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700 text-sm">To-Do</h3>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {todoTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Task Title */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">
                      <span
                        className="block truncate"
                        title={task.title || task.taskName || "Untitled Task"}
                      >
                        {task.title || task.taskName || "Untitled Task"}
                      </span>
                    </h4>
                    {/* Priority Badge */}
                    {task.priority && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          task.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p
                    className="text-xs text-gray-500 mb-3 line-clamp-2"
                    title={task.description || "No description"}
                  >
                    {task.description || "No description"}
                  </p>

                  {/* Project/Resource */}
                  <div className="text-xs text-gray-400 mb-2">
                    {task.projectName || "General Task"}
                  </div>

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center text-xs text-blue-600 mb-2">
                      <FaCalendarAlt className="mr-1" />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Assigned Date */}
                  {task.assignedDate && (
                    <div className="flex items-center text-xs text-purple-600 mb-3">
                      <FaUser className="mr-1" />
                      Assigned:{" "}
                      {new Date(task.assignedDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Upload Image Icon */}
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenImageUpload(task.id)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="Upload Image"
                    >
                      <FaUpload className="text-sm" />
                    </button>
                    {task.images && task.images.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.images.slice(0, 3).map((img, index) => (
                          <a
                            key={index}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded truncate max-w-[120px]"
                            title={img.name}
                          >
                            🖼️ {img.name.substring(0, 15)}...
                          </a>
                        ))}
                        {task.images.length > 3 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            +{task.images.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={task.status || "To-Do"}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="To-Do">To-Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              ))}
              {todoTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">
                  No tasks
                </p>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700 text-sm">In Progress</h3>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Task Title */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">
                      <span
                        className="block truncate"
                        title={task.title || task.taskName || "Untitled Task"}
                      >
                        {task.title || task.taskName || "Untitled Task"}
                      </span>
                    </h4>
                    {/* Priority Badge */}
                    {task.priority && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          task.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p
                    className="text-xs text-gray-500 mb-3 line-clamp-2"
                    title={task.description || "No description"}
                  >
                    {task.description || "No description"}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-blue-600">
                        {task.progressPercent || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progressPercent || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Project/Resource */}
                  <div className="text-xs text-gray-400 mb-2">
                    {task.projectName || "General Task"}
                  </div>

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center text-xs text-red-600 mb-2">
                      <FaCalendarAlt className="mr-1" />
                      Dues: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Assigned Date */}
                  {task.assignedDate && (
                    <div className="flex items-center text-xs text-purple-600 mb-3">
                      <FaUser className="mr-1" />
                      Assigned:{" "}
                      {new Date(task.assignedDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Progress Update */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={
                        progressDrafts[task.id] ?? (task.progressPercent || 0)
                      }
                      onChange={(e) =>
                        setProgressDrafts((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitProgress(task.id);
                      }}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <button
                      onClick={() => commitProgress(task.id)}
                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>

                  {/* Upload Image Icon */}
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenImageUpload(task.id)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="Upload Image"
                    >
                      <FaUpload className="text-sm" />
                    </button>
                    {task.images && task.images.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.images.slice(0, 3).map((img, index) => (
                          <a
                            key={index}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded truncate max-w-[120px]"
                            title={img.name}
                          >
                            🖼️ {img.name.substring(0, 15)}...
                          </a>
                        ))}
                        {task.images.length > 3 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            +{task.images.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <select
                    value={task.status || "In Progress"}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="To-Do">To-Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              ))}
              {inProgressTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">
                  No tasks
                </p>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700 text-sm">Done</h3>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                {completedTasks.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Task Title */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">
                      <span
                        className="block truncate"
                        title={task.title || task.taskName || "Untitled Task"}
                      >
                        {task.title || task.taskName || "Untitled Task"}
                      </span>
                    </h4>
                    {/* Priority Badge */}
                    {task.priority && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          task.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p
                    className="text-xs text-gray-500 mb-3 line-clamp-2"
                    title={task.description || "No description"}
                  >
                    {task.description || "No description"}
                  </p>

                  {/* Project/Resource */}
                  <div className="text-xs text-gray-400 mb-2">
                    {task.projectName || "General Task"}
                  </div>

                  {/* Completion Comment */}
                  {task.completionComment && (
                    <div className="text-xs text-blue-600 mb-2 italic">
                      💬 {task.completionComment}
                    </div>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center text-xs text-blue-600 mb-2">
                      <FaCalendarAlt className="mr-1" />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Assigned Date */}
                  {task.assignedDate && (
                    <div className="flex items-center text-xs text-purple-600 mb-3">
                      <FaUser className="mr-1" />
                      Assigned:{" "}
                      {new Date(task.assignedDate).toLocaleDateString()}
                    </div>
                  )}

                  {/* Upload Image Icon */}
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenImageUpload(task.id)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="Upload Image"
                    >
                      <FaUpload className="text-sm" />
                    </button>
                    {task.images && task.images.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.images.slice(0, 3).map((img, index) => (
                          <a
                            key={index}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded truncate max-w-[120px]"
                            title={img.name}
                          >
                            🖼️ {img.name.substring(0, 15)}...
                          </a>
                        ))}
                        {task.images.length > 3 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            +{task.images.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleViewTaskDetails(task)}
                      className="w-full px-3 py-2 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      View Task Details
                    </button>
                    <select
                      value={task.status || "Done"}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="To-Do">To-Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
              {completedTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">
                  No tasks
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Active Tasks ({activeTasks.length})
                </h3>
              </div>
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all bg-white relative"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 pr-32 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 flex-1 min-w-0">
                            <span
                              className="block truncate"
                              title={
                                task.title || task.taskName || "Untitled Task"
                              }
                            >
                              {task.title || task.taskName || "Untitled Task"}
                            </span>
                          </h4>
                        </div>

                        {/* Right corner badges */}
                        <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2 max-w-[280px]">
                          {/* Priority */}
                          {task.priority && (
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                                task.priority === "High"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : task.priority === "Medium"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : "bg-green-100 text-green-800 border border-green-200"
                              }`}
                            >
                              <FaFlag className="text-xs" />
                              {task.priority}
                            </span>
                          )}

                          {/* Status */}
                          {task.status === "In Progress" ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200">
                              <CircularProgress
                                percentage={task.progressPercent || 0}
                                size={12}
                                strokeWidth={2}
                              />
                              In Progress
                            </span>
                          ) : task.status === "Done" ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-green-100 text-green-800 border border-green-200">
                              <FaCheck className="text-xs" />
                              Done
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-gray-100 text-gray-800 border border-gray-200">
                              <FaClock className="text-xs" />
                              To-Do
                            </span>
                          )}

                          {/* Due Date */}
                          {task.dueDate && (
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                                task.dueDate &&
                                task.status !== "Done" &&
                                task.dueDate <
                                  new Date().toISOString().slice(0, 10)
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              <FaCalendarAlt className="text-xs" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}

                          {/* Assigned Date */}
                          {task.assignedDate && (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200">
                              <FaCalendarAlt className="text-xs" />
                              Assigned:{" "}
                              {new Date(task.assignedDate).toLocaleDateString()}
                            </span>
                          )}

                          {/* Overdue */}
                          {task.dueDate &&
                            task.status !== "Done" &&
                            task.dueDate <
                              new Date().toISOString().slice(0, 10) && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                                Overdue
                              </span>
                            )}
                        </div>

                        <p
                          className="text-sm text-gray-600 mb-3 line-clamp-2"
                          title={task.description || "No description"}
                        >
                          {task.description || "No description"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          {task.dueDate && (
                            <span className="flex items-center">
                              <FaClock className="mr-1" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.projectName && (
                            <span className="text-indigo-600">
                              📁 {task.projectName}
                            </span>
                          )}
                        </div>

                        {task.status === "In Progress" && (
                          <>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Progress:
                              </span>
                              <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${task.progressPercent || 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                                {task.progressPercent || 0}%
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={
                                  progressDrafts[task.id] ??
                                  (task.progressPercent || 0)
                                }
                                onChange={(e) =>
                                  setProgressDrafts((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    commitProgress(task.id);
                                }}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => commitProgress(task.id)}
                                className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                Update
                              </button>
                            </div>
                          </>
                        )}

                        {/* Upload Image Icon */}
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenImageUpload(task.id)}
                            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                            title="Upload Image"
                          >
                            <FaUpload className="text-sm" />
                          </button>
                          {task.images && task.images.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.images.slice(0, 4).map((img, index) => (
                                <a
                                  key={index}
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded truncate max-w-[140px]"
                                  title={img.name}
                                >
                                  🖼️ {img.name.substring(0, 18)}...
                                </a>
                              ))}
                              {task.images.length > 4 && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  +{task.images.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <label className="text-xs font-medium text-gray-700">
                            Status:
                          </label>
                          <select
                            value={task.status || "To-Do"}
                            onChange={(e) =>
                              handleStatusChange(task.id, e.target.value)
                            }
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="To-Do">To-Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Completed ({completedTasks.length})
                </h3>
                <button
                  onClick={() => setShowCompleted((s) => !s)}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {showCompleted ? "Hide" : "Show"}
                </button>
              </div>
              {showCompleted && (
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 border border-gray-200 rounded-lg bg-white relative"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 pr-32 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 flex-1 min-w-0">
                              <span
                                className="block truncate"
                                title={
                                  task.title || task.taskName || "Untitled Task"
                                }
                              >
                                {task.title || task.taskName || "Untitled Task"}
                              </span>
                            </h4>
                          </div>

                          {/* Right corner badges */}
                          <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2 max-w-[280px]">
                            {/* Priority */}
                            {task.priority && (
                              <span
                                className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                                  task.priority === "High"
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : task.priority === "Medium"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                    : "bg-green-100 text-green-800 border border-green-200"
                                }`}
                              >
                                <FaFlag className="text-xs" />
                                {task.priority}
                              </span>
                            )}

                            {/* Status - Done */}
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-green-100 text-green-800 border border-green-200">
                              <FaCheck className="text-xs" />
                              Done
                            </span>

                            {/* Due Date */}
                            {task.dueDate && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-red-100 text-red-800 border border-red-200">
                                <FaCalendarAlt className="text-xs" />
                                Due:{" "}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}

                            {/* Assigned Date */}
                            {task.assignedDate && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200">
                                <FaCalendarAlt className="text-xs" />
                                Assigned:{" "}
                                {new Date(
                                  task.assignedDate
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <p
                            className="text-sm text-gray-600 mb-2 line-clamp-2"
                            title={task.description || "No description"}
                          >
                            {task.description || "No description"}
                          </p>
                          {task.completionComment && (
                            <p
                              className="text-xs italic text-indigo-700 mb-1 line-clamp-1"
                              title={task.completionComment}
                            >
                              💬 {task.completionComment}
                            </p>
                          )}
                          <div className="text-xs text-gray-500">
                            Completed on{" "}
                            {(
                              task.completedAt?.toDate?.() ||
                              new Date(task.completedAt)
                            ).toLocaleDateString()}
                          </div>
                          <div className="mt-2">
                            <button
                              onClick={() => handleViewTaskDetails(task)}
                              className="rounded-md bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
                            >
                              View Task
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {completedTasks.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-4">
                      No completed tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Task Details Modal */}
      {showTaskDetailsModal && selectedTaskForDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowTaskDetailsModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
              <button
                onClick={() => setShowTaskDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedTaskForDetails.title ||
                        selectedTaskForDetails.taskName ||
                        "Untitled Task"}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                          selectedTaskForDetails.status === "Done"
                            ? "bg-green-100 text-green-800"
                            : selectedTaskForDetails.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span>{selectedTaskForDetails.status}</span>
                      </span>
                      {selectedTaskForDetails.priority && (
                        <span
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                            selectedTaskForDetails.priority === "High"
                              ? "bg-red-100 text-red-800"
                              : selectedTaskForDetails.priority === "Medium"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          <span>{selectedTaskForDetails.priority}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <p className="mt-1 text-gray-900">
                  {selectedTaskForDetails.description || "No description"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.projectName || "—"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Assigned To
                  </label>
                  <p className="mt-1 text-gray-900">You (Client)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.priority || "—"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Progress
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.progressPercent || 0}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Assigned Date
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.assignedDate
                      ? new Date(
                          selectedTaskForDetails.assignedDate
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.dueDate
                      ? new Date(
                          selectedTaskForDetails.dueDate
                        ).toLocaleDateString()
                      : "No due date"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {selectedTaskForDetails.completedAt
                      ? "Completed At"
                      : "Completion Date"}
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedTaskForDetails.completedAt
                      ? new Date(
                          selectedTaskForDetails.completedAt.toDate?.() ||
                            selectedTaskForDetails.completedAt
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedTaskForDetails.completionComment && (
                <div className="rounded-md bg-indigo-50 p-3">
                  <div className="text-sm font-medium text-indigo-800">
                    Completion Comment
                  </div>
                  <p className="mt-1 text-indigo-900">
                    {selectedTaskForDetails.completionComment}
                  </p>
                </div>
              )}

              {/* Status Change Section */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Status
                </label>
                <select
                  value={selectedTaskForDetails.status || "To-Do"}
                  onChange={(e) =>
                    handleTaskStatusChangeFromModal(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="To-Do">To-Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Changing the status will move the task to the appropriate
                  column
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTaskDetailsModal(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <CompletionCommentModal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletionTaskId(null);
        }}
        onSubmit={handleSubmitCompletion}
        title="Mark Task as Done"
        confirmLabel="Mark Done"
        minLength={5}
        maxLength={300}
      />

      <ImageUploadModal
        isOpen={showImageUploadModal}
        onClose={handleCloseImageUpload}
        onSave={handleImageUpload}
        taskId={selectedTaskForUpload}
        uploading={uploadingImages[selectedTaskForUpload]}
      />
    </div>
  );
}

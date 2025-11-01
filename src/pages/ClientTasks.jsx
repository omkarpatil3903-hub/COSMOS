// src/pages/ClientTasks.jsx
import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import { useAuthContext } from "../context/useAuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  FaTasks,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaTh,
  FaList,
} from "react-icons/fa";

export default function ClientTasks() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [view, setView] = useState("board"); // 'board' or 'list'

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "tasks"),
      where("assigneeType", "==", "client"),
      where("assigneeId", "==", uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task status");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchTerm ||
      (task.title || task.taskName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (task.status || "").toLowerCase() === filterStatus.toLowerCase();

    const matchesPriority =
      filterPriority === "all" ||
      (task.priority || "").toLowerCase() === filterPriority.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group tasks by status
  const todoTasks = filteredTasks.filter((t) => t.status === "To-Do");
  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === "In Progress"
  );
  const inReviewTasks = filteredTasks.filter((t) => t.status === "In Review");
  const completedTasks = filteredTasks.filter((t) => t.status === "Done");

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
        <h4 className="font-semibold text-gray-900 flex-1">
          {task.title || task.taskName || "Untitled Task"}
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

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {task.description || "No description"}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        {task.dueDate && (
          <span className="flex items-center">
            <FaClock className="mr-1" />
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.projectName && (
          <span className="text-indigo-600">{task.projectName}</span>
        )}
      </div>

      <select
        value={task.status || "To-Do"}
        onChange={(e) => handleStatusChange(task.id, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="To-Do">To-Do</option>
        <option value="In Progress">In Progress</option>
        <option value="In Review">In Review</option>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <FaExclamationCircle className="text-yellow-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {inReviewTasks.length}
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

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="to-do">To-Do</option>
              <option value="in progress">In Progress</option>
              <option value="in review">In Review</option>
              <option value="done">Done</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex justify-end">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
      </Card>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FaTasks className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== "all" || filterPriority !== "all"
                ? "Try adjusting your filters"
                : "No tasks have been assigned to you yet"}
            </p>
          </div>
        </Card>
      ) : view === "board" ? (
        // Kanban Board View
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* To-Do Column */}
          <div>
            <div className="bg-gray-100 px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FaTasks className="mr-2 text-gray-600" />
                To-Do ({todoTasks.length})
              </h3>
            </div>
            <div className="space-y-3 mt-3">
              {todoTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {todoTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No tasks
                </p>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div>
            <div className="bg-blue-100 px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FaClock className="mr-2 text-blue-600" />
                In Progress ({inProgressTasks.length})
              </h3>
            </div>
            <div className="space-y-3 mt-3">
              {inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {inProgressTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No tasks
                </p>
              )}
            </div>
          </div>

          {/* In Review Column */}
          <div>
            <div className="bg-yellow-100 px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FaExclamationCircle className="mr-2 text-yellow-600" />
                In Review ({inReviewTasks.length})
              </h3>
            </div>
            <div className="space-y-3 mt-3">
              {inReviewTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {inReviewTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No tasks
                </p>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div>
            <div className="bg-green-100 px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FaCheckCircle className="mr-2 text-green-600" />
                Done ({completedTasks.length})
              </h3>
            </div>
            <div className="space-y-3 mt-3">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {completedTasks.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No tasks
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // List View
        <Card>
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 flex-1">
                        {task.title || task.taskName || "Untitled Task"}
                      </h4>
                      {task.priority && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
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
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          task.status === "Done"
                            ? "bg-green-100 text-green-800"
                            : task.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : task.status === "In Review"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {task.status || "To-Do"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
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

                    <div className="flex items-center gap-2">
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
                        <option value="In Review">In Review</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

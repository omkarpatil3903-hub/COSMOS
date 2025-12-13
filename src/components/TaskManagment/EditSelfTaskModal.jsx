import React, { useState, useEffect } from "react";
import { FaTasks, FaTimes } from "react-icons/fa";
import { updateDoc, doc, serverTimestamp, onSnapshot, collection } from "firebase/firestore";
import { db } from "../../firebase";
import { logTaskActivity } from "../../services/taskService";
import toast from "react-hot-toast";

const EditSelfTaskModal = ({ isOpen, onClose, task, projects, user }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [status, setStatus] = useState("To-Do");
    const [projectId, setProjectId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assignedDate, setAssignedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusOptions, setStatusOptions] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "settings", "task-statuses-name", "items"),
            (snap) => {
                const list = snap.docs
                    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
                    .map((d) => d.name || d.label || d.value || "")
                    .filter(Boolean);
                setStatusOptions(list.length > 0 ? list : ["To-Do", "In Progress", "Done"]);
            },
            () => {
                setStatusOptions(["To-Do", "In Progress", "Done"]);
            }
        );
        return () => unsub();
    }, []);

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setPriority(task.priority || "Medium");
            setStatus(task.status || "To-Do");
            setProjectId(task.projectId || "");

            if (task.dueDate) {
                const d = task.dueDate?.toDate?.() || new Date(task.dueDate);
                setDueDate(d.toISOString().split("T")[0]);
            } else {
                setDueDate("");
            }

            if (task.assignedDate) {
                const d = task.assignedDate?.toDate?.() || new Date(task.assignedDate);
                setAssignedDate(d.toISOString().split("T")[0]);
            } else {
                const d = new Date();
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                setAssignedDate(`${y}-${m}-${day}`);
            }
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        try {
            setIsSubmitting(true);
            const due = dueDate ? new Date(dueDate) : null;
            const assigned = assignedDate ? new Date(assignedDate) : null;
            const selectedProject = projects.find((p) => p.id === projectId);

            const collectionName =
                task.collectionName ||
                (task.source === "self" ? "selfTasks" : "tasks");

            const updateData = {
                title: title.trim(),
                description: description.trim() || "",
                priority,
                // For Admin tasks, we DO NOT update global status here. We update assigneeStatus below.
                // For Self tasks, we update global status.
                ...(collectionName === "selfTasks" ? { status } : {}),

                ...(projectId ? { projectId } : { projectId: null }),
                ...(selectedProject ? { projectName: selectedProject.name } : { projectName: null }),
                ...(due ? { dueDate: due } : { dueDate: null }),
                ...(assigned ? { assignedDate: assigned } : { assignedDate: null }),
                updatedAt: serverTimestamp(),
            };

            // If Admin Task, update Assignee Status
            if (collectionName === "tasks") {
                const updateKey = `assigneeStatus.${user.uid}`;
                updateData[`${updateKey}.status`] = status;

                if (status === "Done") {
                    updateData[`${updateKey}.completedAt`] = serverTimestamp();
                    updateData[`${updateKey}.progressPercent`] = 100;
                    updateData[`${updateKey}.completedBy`] = user.uid;
                } else if (status === "In Progress") {
                    updateData[`${updateKey}.progressPercent`] = 0; // Reset if moving back
                }
            } else {
                // Self Task Logic
                if (status === "Done") {
                    updateData.completedAt = serverTimestamp();
                    updateData.progressPercent = 100;
                } else if (status === "In Progress") {
                    updateData.progressPercent = 0;
                }
            }

            await updateDoc(doc(db, collectionName, task.id), updateData);

            logTaskActivity(
                task.id,
                "task_updated",
                "Task details updated",
                user,
                collectionName
            );

            toast.success("Task updated successfully");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Failed to update task");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <FaTasks className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Edit Task
                            </h3>
                            <p className="text-xs text-gray-500">
                                Update task details
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Column 1 - Details & Classification */}
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
                                    Details & Classification
                                </h4>

                                <div className="space-y-4">
                                    {/* Task Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Task Title
                                        </label>
                                        <input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                            placeholder="Enter task title"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm h-24 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
                                            placeholder="Add a detailed description..."
                                        />
                                    </div>

                                    {/* Project */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Project
                                        </label>
                                        <select
                                            value={projectId}
                                            onChange={(e) => setProjectId(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Priority
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        >
                                            {(statusOptions.length ? statusOptions : ["To-Do", "In Progress", "Done"]).map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2 - Assignment & Schedule */}
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
                                    Assignment & Schedule
                                </h4>

                                <div className="space-y-4">
                                    {/* Assignee Info - Read Only for Employee */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Assigned To
                                        </label>
                                        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-600">
                                            {user?.name || "You"}
                                        </div>
                                    </div>

                                    {/* Assigned Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Assigned Date
                                        </label>
                                        <input
                                            type="date"
                                            value={assignedDate}
                                            onChange={(e) => setAssignedDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        />
                                    </div>

                                    {/* Due Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white px-6 py-3.5 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="text-xs text-gray-500">
                        {task.source === "self" ? (
                            <span>No changes made</span>
                        ) : (
                            <span>Limited editing for admin tasks</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditSelfTaskModal;

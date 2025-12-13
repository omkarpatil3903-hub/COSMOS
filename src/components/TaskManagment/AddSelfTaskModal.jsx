import React, { useState, useEffect } from "react";
import { FaTasks, FaTimes } from "react-icons/fa";
import { addDoc, collection, serverTimestamp, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase";
import toast from "react-hot-toast";

const AddSelfTaskModal = ({ isOpen, onClose, projects, user }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [status, setStatus] = useState("To-Do");
    const [projectId, setProjectId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assignedDate, setAssignedDate] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusOptions, setStatusOptions] = useState([]);

    // Load task statuses from settings/task-statuses (document with array field 'statuses')
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "task-statuses"), (snap) => {
            const data = snap.data() || {};
            const arr = Array.isArray(data.statuses) ? data.statuses : [];
            const list = arr
                .map((item) => (typeof item === "string" ? item : item?.name || item?.label || item?.value || ""))
                .filter(Boolean);
            setStatusOptions(list.length > 0 ? list : ["To-Do", "In Progress", "Done"]);
        }, () => {
            setStatusOptions(["To-Do", "In Progress", "Done"]);
        });
        return () => unsub();
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        try {
            setIsSubmitting(true);
            const due = dueDate ? new Date(dueDate) : null;
            const assigned = assignedDate ? new Date(assignedDate) : null;
            const selectedProject = projects.find((p) => p.id === projectId);

            await addDoc(collection(db, "selfTasks"), {
                userId: user?.uid,
                assigneeId: user?.uid,
                assigneeType: "user",
                title: title.trim(),
                description: description.trim() || "",
                priority,
                status,
                progressPercent: status === "Done" ? 100 : 0,
                ...(projectId ? { projectId } : {}),
                ...(selectedProject ? { projectName: selectedProject.name } : {}),
                ...(due ? { dueDate: due } : {}),
                ...(assigned ? { assignedDate: assigned } : {}),
                createdAt: serverTimestamp(),
            });

            toast.success("Task created successfully");
            onClose();

            // Reset form
            setTitle("");
            setDescription("");
            setPriority("Medium");
            setStatus("To-Do");
            setProjectId("");
            setDueDate("");
            setAssignedDate(() => {
                const d = new Date();
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
            });
        } catch (e) {
            console.error(e);
            toast.error("Failed to create task");
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
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
                                Create New Self Task
                            </h3>
                            <p className="text-xs text-gray-500">
                                Add a new Self task to project
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                            placeholder="Enter task title..."
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
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
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
                                    {/* Resource Tab (Read Only) */}
                                    <div>
                                        <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
                                            <button className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">
                                                Resource
                                            </button>
                                            <button
                                                disabled
                                                className="px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                                            >
                                                Client
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3.5 py-2 border border-gray-200">
                                            Assigned to: {user?.name || "You"}
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
                    <div className="text-xs text-gray-500">Unsaved changes</div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddSelfTaskModal;

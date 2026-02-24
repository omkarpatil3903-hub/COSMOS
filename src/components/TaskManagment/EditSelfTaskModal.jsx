/**
 * EditSelfTaskModal Component
 *
 * Purpose: Modal form for editing self-tasks and limited admin task edits.
 * UI matches the TaskModal design for visual consistency.
 *
 * Responsibilities:
 * - Edit task title, description, priority, status
 * - Update project association
 * - Modify assigned and due dates
 * - Handle status differently for self vs admin tasks
 * - Log activity on updates
 *
 * Dependencies:
 * - Firestore (selfTasks/tasks collections)
 * - taskService (logTaskActivity)
 * - VoiceInput (speech-to-text)
 * - useThemeStyles (themed button/icon classes)
 * - useTheme (accent color for themed header)
 * - react-hot-toast (notifications)
 * - Button component (footer actions)
 *
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close callback
 * - task: Task object to edit
 * - projects: Array of available projects
 * - user: Current user object
 *
 * Last Modified: 2026-02-23
 */

import React, { useState, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaEdit } from "react-icons/fa";
import { FaLayerGroup } from "react-icons/fa";
import VoiceInput from "../Common/VoiceInput";
import Button from "../Button";
import { updateDoc, doc, serverTimestamp, onSnapshot, collection } from "firebase/firestore";
import { db } from "../../firebase";
import { logTaskActivity } from "../../services/taskService";
import toast from "react-hot-toast";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { useTheme } from "../../context/ThemeContext";

const EditSelfTaskModal = ({ isOpen, onClose, task, projects, user }) => {
    const { buttonClass, iconColor } = useThemeStyles();
    const { accent } = useTheme();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [status, setStatus] = useState("To-Do");
    const [projectId, setProjectId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assignedDate, setAssignedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusOptions, setStatusOptions] = useState([]);

    // Theme styles matching TaskModal
    const getThemeStyles = () => {
        const styles = {
            purple: { button: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500', iconBg: 'bg-purple-50', iconText: 'text-purple-600' },
            blue: { button: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500', iconBg: 'bg-sky-50', iconText: 'text-sky-600' },
            pink: { button: 'bg-pink-600 hover:bg-pink-700 focus-visible:ring-pink-500', iconBg: 'bg-pink-50', iconText: 'text-pink-600' },
            violet: { button: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
            orange: { button: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
            teal: { button: 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
            bronze: { button: 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-600', iconBg: 'bg-amber-50', iconText: 'text-amber-700' },
            mint: { button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
            black: { button: 'bg-gray-800 hover:bg-gray-900 focus-visible:ring-gray-600', iconBg: 'bg-gray-100', iconText: 'text-gray-800' },
            indigo: { button: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
        };
        return styles[accent] || styles.indigo;
    };

    const themeStyles = getThemeStyles();

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

    const handleSave = async (e) => {
        e?.preventDefault();
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
                ...(selectedProject ? { projectName: selectedProject.name || selectedProject.projectName } : { projectName: null }),
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[90vw] xl:max-w-7xl max-h-[90vh] flex flex-col bg-white [.dark_&]:bg-[#181B2A] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Matching TaskModal */}
                <div className="shrink-0 px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] backdrop-blur-md flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${themeStyles.iconBg} ${themeStyles.iconText}`}>
                            <FaEdit className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 [.dark_&]:text-white tracking-tight">
                                Edit Task
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                                Update task details
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full transition-all duration-200 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300"
                    >
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSave} noValidate className="p-6 lg:p-8 space-y-8">
                        {/* 2-Column Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Column 1: Details & Classification */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                                    <FaLayerGroup className={`${iconColor} [.dark_&]:text-opacity-80`} />
                                    <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                                        Details & Classification
                                    </h3>
                                </div>

                                {/* Task Title */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                        Task Title <span className="text-red-500">*</span>
                                    </label>
                                    <VoiceInput
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter task title"
                                        className="block w-full rounded-xl border-0 bg-white [.dark_&]:bg-white/5 px-4 py-3 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                        Description
                                    </label>
                                    <VoiceInput
                                        as="textarea"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={6}
                                        placeholder="Add a detailed description..."
                                        className="block w-full rounded-xl border-0 bg-white [.dark_&]:bg-white/5 px-4 py-3 text-sm text-gray-700 [.dark_&]:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Project */}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Project
                                        </label>
                                        <select
                                            value={projectId}
                                            onChange={(e) => setProjectId(e.target.value)}
                                            className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name || p.projectName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Priority
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Status
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                            >
                                                {(statusOptions.length
                                                    ? statusOptions
                                                    : ["To-Do", "In Progress", "Done"])
                                                    .filter((s) => s !== "Done")
                                                    .map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                            </select>

                                            {statusOptions.includes("Done") && (
                                                <button
                                                    type="button"
                                                    onClick={() => setStatus("Done")}
                                                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap ${status === "Done"
                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 opacity-70 hover:opacity-100 cursor-pointer [.dark_&]:bg-emerald-900/30 [.dark_&]:text-emerald-400 [.dark_&]:border-emerald-700 [.dark_&]:hover:bg-emerald-900/50"
                                                        }`}
                                                >
                                                    Done
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Assignment & Schedule */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 [.dark_&]:border-white/10">
                                    <FaCalendarAlt className={`${iconColor} [.dark_&]:text-opacity-80`} />
                                    <h3 className="text-sm font-bold text-gray-900 [.dark_&]:text-white uppercase tracking-wide">
                                        Assignment & Schedule
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Assignee Info - Read Only */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Assigned To
                                        </label>
                                        <div className="block w-full rounded-lg border-0 bg-gray-50 [.dark_&]:bg-white/5 px-3 py-2.5 text-sm text-gray-600 [.dark_&]:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10">
                                            {user?.name || user?.displayName || "You"}
                                        </div>
                                    </div>

                                    {/* Assigned Date */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Assigned Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={assignedDate}
                                                onChange={(e) => setAssignedDate(e.target.value)}
                                                className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Due Date */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 [.dark_&]:text-gray-300 mb-1.5">
                                            Due Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="block w-full rounded-lg border-0 bg-white [.dark_&]:bg-[#181B2A] px-3 py-2.5 text-sm text-gray-900 [.dark_&]:text-white shadow-sm ring-1 ring-inset ring-gray-200 [.dark_&]:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer - Matching TaskModal */}
                <div className="shrink-0 px-6 py-3.5 border-t border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A] flex items-center justify-between">
                    <div className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                        {task.source === "self" ? (
                            <span>Editing self task</span>
                        ) : (
                            <span>Limited editing for admin tasks</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className={`px-8 text-white rounded-lg transition-colors ${themeStyles.button} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditSelfTaskModal;

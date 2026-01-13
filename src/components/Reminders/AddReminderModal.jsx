/**
 * AddReminderModal Component
 *
 * Purpose: Modal form for creating and editing reminders.
 * Supports personal reminders and task-linked reminders.
 *
 * Responsibilities:
 * - Create new reminders with title, date, time
 * - Edit existing reminder details
 * - Handle optional description field
 * - Validate required fields before submission
 * - Show loading state during submission
 *
 * Dependencies:
 * - Firestore (reminders collection)
 * - Firebase Auth (current user for ownership)
 * - Button (UI component)
 * - react-hot-toast (notifications)
 *
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close callback
 * - initialData: { title?, relatedTaskId? } for create mode
 * - reminderToEdit: Existing reminder for edit mode
 * - onSuccess: Callback after successful save
 *
 * Form Fields:
 * - title: Required, reminder subject
 * - date: Required, due date
 * - time: Required, due time
 * - description: Optional, additional details
 *
 * Default Values (Create Mode):
 * - Date: Today
 * - Time: Next hour (rounded)
 *
 * Reminder Types:
 * - "task": Linked to a task via relatedTaskId
 * - "personal": Standalone reminder
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useEffect } from "react";
import { FaBell, FaCalendarAlt, FaClock, FaTimes, FaSpinner } from "react-icons/fa";
import Button from "../Button";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import toast from "react-hot-toast";

const AddReminderModal = ({
    isOpen,
    onClose,
    initialData = {}, // { title, relatedTaskId }
    reminderToEdit = null, // If provided, we are in "Edit" mode
    onSuccess
}) => {
    const { user } = useAuthContext();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (reminderToEdit) {
                // Edit Mode: Populate from existing reminder
                setTitle(reminderToEdit.title || "");
                setDescription(reminderToEdit.description || "");

                if (reminderToEdit.dueAt) {
                    const dueAtDate = reminderToEdit.dueAt.toDate ? reminderToEdit.dueAt.toDate() : new Date(reminderToEdit.dueAt);
                    const yyyy = dueAtDate.getFullYear();
                    const mm = String(dueAtDate.getMonth() + 1).padStart(2, "0");
                    const dd = String(dueAtDate.getDate()).padStart(2, "0");
                    setDate(`${yyyy}-${mm}-${dd}`);

                    const hh = String(dueAtDate.getHours()).padStart(2, "0");
                    const min = String(dueAtDate.getMinutes()).padStart(2, "0");
                    setTime(`${hh}:${min}`);
                }
            } else {
                // Create Mode: Default values
                setTitle(initialData.title || "");
                setDescription(initialData.description || "");

                // Default to today and next hour
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                const dd = String(now.getDate()).padStart(2, "0");
                setDate(`${yyyy}-${mm}-${dd}`);

                const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
                const hh = String(nextHour.getHours()).padStart(2, "0");
                const min = String(nextHour.getMinutes()).padStart(2, "0");
                setTime(`${hh}:${min}`);
            }
        }
    }, [isOpen, reminderToEdit]); // Re-run if modal opens or reminderToEdit changes

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !date || !time) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const dueAt = new Date(`${date}T${time}`);

            if (reminderToEdit) {
                // Update existing reminder
                await updateDoc(doc(db, "reminders", reminderToEdit.id), {
                    title,
                    description,
                    dueAt,
                    updatedAt: serverTimestamp(),
                });
                toast.success("Reminder updated successfully!");
            } else {
                // Create new reminder
                await addDoc(collection(db, "reminders"), {
                    userId: user.uid,
                    title,
                    description,
                    dueAt,
                    type: initialData.relatedTaskId ? "task" : "personal",
                    relatedTaskId: initialData.relatedTaskId || null,
                    isRead: false,
                    status: "pending",
                    createdAt: serverTimestamp(),
                });
                toast.success("Reminder set successfully!");
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving reminder:", error);
            toast.error("Failed to save reminder");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FaBell className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {reminderToEdit ? "Edit Reminder" : "Set Reminder"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What do you want to be reminded about?"
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Time <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add any additional details..."
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="shadow-lg shadow-indigo-200"
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    {reminderToEdit ? "Updating..." : "Set Reminder"}
                                </>
                            ) : (
                                reminderToEdit ? "Update Reminder" : "Set Reminder"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddReminderModal;

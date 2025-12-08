import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../context/useAuthContext";
import { FaBell, FaPlus, FaTrash, FaCheck, FaClock, FaEdit, FaHourglassHalf, FaChevronDown, FaChevronRight } from "react-icons/fa";
import Card from "../Card";
import Button from "../Button";
import AddReminderModal from "./AddReminderModal";
import toast from "react-hot-toast";

const RemindersList = () => {
    const { user } = useAuthContext();
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [reminderToEdit, setReminderToEdit] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({
        overdue: true,
        today: true,
        upcoming: true
    });

    useEffect(() => {
        if (!user?.uid) return;

        // Removing orderBy to avoid potential index issues and ensure real-time updates work reliably
        const q = query(
            collection(db, "reminders"),
            where("userId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sorting
            data.sort((a, b) => {
                const dateA = a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt);
                const dateB = b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt);
                return dateA - dateB;
            });

            console.log("Reminders updated:", data.length);
            setReminders(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reminders:", error);
            toast.error("Failed to load reminders");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this reminder?")) return;
        try {
            await deleteDoc(doc(db, "reminders", id));
            toast.success("Reminder deleted");
        } catch (error) {
            console.error("Error deleting reminder:", error);
            toast.error("Failed to delete reminder");
        }
    };

    const handleComplete = async (id) => {
        try {
            await updateDoc(doc(db, "reminders", id), {
                status: "completed"
            });
            toast.success("Reminder marked as done");
        } catch (error) {
            console.error("Error completing reminder:", error);
            toast.error("Failed to update reminder");
        }
    };

    const handleSnooze = async (id, durationStr) => {
        try {
            const now = new Date();
            let newDueAt = new Date();

            if (durationStr === "1h") {
                newDueAt.setHours(now.getHours() + 1);
            } else if (durationStr === "tomorrow") {
                newDueAt.setDate(now.getDate() + 1);
                newDueAt.setHours(9, 0, 0, 0); // 9 AM tomorrow
            } else if (durationStr === "nextWeek") {
                newDueAt.setDate(now.getDate() + 7);
                newDueAt.setHours(9, 0, 0, 0); // 9 AM next week
            }

            await updateDoc(doc(db, "reminders", id), {
                dueAt: newDueAt
            });
            toast.success(`Snoozed until ${newDueAt.toLocaleString()}`);
        } catch (error) {
            console.error("Error snoozing reminder:", error);
            toast.error("Failed to snooze reminder");
        }
    };

    const handleEdit = (reminder) => {
        setReminderToEdit(reminder);
        setShowAddModal(true);
    };

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const formatDueTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Today at ${timeStr}`;
        return `${date.toLocaleDateString()} at ${timeStr}`;
    };

    // Grouping Logic
    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const groupedReminders = {
        overdue: [],
        today: [],
        upcoming: []
    };

    reminders.forEach(reminder => {
        const dueAt = reminder.dueAt?.toDate ? reminder.dueAt.toDate() : new Date(reminder.dueAt);
        if (dueAt < now) {
            groupedReminders.overdue.push(reminder);
        } else if (dueAt <= todayEnd) {
            groupedReminders.today.push(reminder);
        } else {
            groupedReminders.upcoming.push(reminder);
        }
    });

    const renderReminderItem = (reminder) => (
        <div
            key={reminder.id}
            className="group p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm hover:border-indigo-100 transition-all duration-200"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                        {reminder.title}
                    </h4>
                    <p className={`text-xs mt-1 flex items-center gap-1 ${new Date(reminder.dueAt?.toDate ? reminder.dueAt.toDate() : reminder.dueAt) < new Date()
                            ? "text-red-600 font-medium"
                            : "text-indigo-600"
                        }`}>
                        <FaClock className="text-[10px]" />
                        {formatDueTime(reminder.dueAt)}
                    </p>
                    {reminder.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {reminder.description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative group/snooze">
                        <button
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Snooze"
                        >
                            <FaHourglassHalf className="h-3 w-3" />
                        </button>
                        {/* Snooze Dropdown */}
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 hidden group-hover/snooze:block z-10">
                            <button onClick={() => handleSnooze(reminder.id, "1h")} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">1 Hour</button>
                            <button onClick={() => handleSnooze(reminder.id, "tomorrow")} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">Tomorrow</button>
                            <button onClick={() => handleSnooze(reminder.id, "nextWeek")} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">Next Week</button>
                        </div>
                    </div>

                    <button
                        onClick={() => handleEdit(reminder)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                    >
                        <FaEdit className="h-3 w-3" />
                    </button>
                    <button
                        onClick={() => handleComplete(reminder.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Mark as done"
                    >
                        <FaCheck className="h-3 w-3" />
                    </button>
                    <button
                        onClick={() => handleDelete(reminder.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                    >
                        <FaTrash className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderGroup = (title, items, groupKey, colorClass) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-4">
                <div
                    className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                    onClick={() => toggleGroup(groupKey)}
                >
                    {expandedGroups[groupKey] ? <FaChevronDown className="text-gray-400 text-xs" /> : <FaChevronRight className="text-gray-400 text-xs" />}
                    <span className={`text-xs font-bold uppercase ${colorClass}`}>{title}</span>
                    <span className="text-gray-400 text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                {expandedGroups[groupKey] && (
                    <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                        {items.map(renderReminderItem)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <FaBell className="text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-900">My Reminders</h3>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            setReminderToEdit(null);
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-1"
                    >
                        <FaPlus className="text-xs" /> Add
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : reminders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <FaClock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No upcoming reminders</p>
                        </div>
                    ) : (
                        <>
                            {renderGroup("Overdue", groupedReminders.overdue, "overdue", "text-red-600")}
                            {renderGroup("Today", groupedReminders.today, "today", "text-indigo-600")}
                            {renderGroup("Upcoming", groupedReminders.upcoming, "upcoming", "text-gray-600")}
                        </>
                    )}
                </div>
            </Card>

            <AddReminderModal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setReminderToEdit(null);
                }}
                reminderToEdit={reminderToEdit}
            />
        </>
    );
};

export default RemindersList;

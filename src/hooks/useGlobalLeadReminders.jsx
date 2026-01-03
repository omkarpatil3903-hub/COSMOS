// src/hooks/useGlobalLeadReminders.js
import { useEffect, useRef } from "react";
import { collection, getDocs, collectionGroup, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";

/**
 * Global hook to check for lead follow-up reminders on app initialization.
 * Shows toast notifications for overdue and today's follow-ups.
 */
const useGlobalLeadReminders = () => {
    const hasChecked = useRef(false);

    useEffect(() => {
        // Only run once per session
        if (hasChecked.current) return;

        const checkFollowups = async () => {
            console.log("🔔 Global Reminder Hook: Checking...");
            try {
                // Use collectionGroup to query all followups across all leads
                // significantly more efficient than iterating through leads
                const q = query(
                    collectionGroup(db, 'followups'),
                    where('status', '==', 'pending')
                );

                const snapshot = await getDocs(q);
                console.log(`🔔 Global Reminder Hook: Found ${snapshot.size} pending follow-ups`);

                const allFollowups = [];
                // We need to fetch the parent lead data for names
                // This might be expensive if many different leads, but better than sequential
                // For now, let's try to get data from the followup doc itself if available
                // or just show "Lead" if name is missing to avoid N+1 parent fetches for notification

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Basic data
                    allFollowups.push({
                        id: doc.id,
                        leadId: doc.ref.parent.parent?.id, // Get parent lead ID
                        ...data
                    });
                });

                // Check for overdue and today's follow-ups
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdue = [];
                const dueToday = [];

                // Helper to get lead name - for better performance we might need to 
                // store leadName on the followup document or do a quick lookup
                const getLeadInfo = async (followups) => {
                    const results = [];
                    for (const f of followups) {
                        try {
                            if (f.leadId) {
                                const leadDoc = await getDoc(doc(db, 'leads', f.leadId));
                                const leadData = leadDoc.data();
                                results.push({
                                    ...f,
                                    leadName: leadData?.customerName || "Unknown Lead"
                                });
                            } else {
                                results.push({ ...f, leadName: "Lead" });
                            }
                        } catch (e) {
                            results.push({ ...f, leadName: "Lead" });
                        }
                    }
                    return results;
                };

                for (const followup of allFollowups) {
                    if (!followup.date) continue;

                    const followUpDate = new Date(followup.date);
                    followUpDate.setHours(0, 0, 0, 0);

                    const diffDays = Math.floor(
                        (followUpDate - today) / (1000 * 60 * 60 * 24)
                    );

                    if (diffDays < 0) {
                        overdue.push(followup);
                    } else if (diffDays === 0) {
                        dueToday.push(followup);
                    }
                }

                console.log(`🔔 Global Reminder Hook: ${overdue.length} overdue, ${dueToday.length} today`);

                // Enrich with lead names
                const enrichLeads = async (list) => {
                    const enriched = await getLeadInfo(list);
                    return enriched;
                };

                const renderToast = (type, count, leads, t) => {
                    const isOverdue = type === 'overdue';
                    const bgColor = isOverdue ? 'bg-red-50' : 'bg-amber-50';
                    const iconColor = isOverdue ? 'text-red-500' : 'text-amber-500';
                    const iconBg = isOverdue ? 'bg-red-100' : 'bg-amber-100';
                    const titleColor = isOverdue ? 'text-red-800' : 'text-amber-800';
                    const buttonBg = isOverdue
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500';

                    return (
                        <div
                            className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
                            max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden`}
                        >
                            <div className={`flex-1 w-0 p-4`}>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center`}>
                                            {isOverdue ? (
                                                <FaExclamationTriangle className={`h-5 w-5 ${iconColor}`} />
                                            ) : (
                                                <FaBell className={`h-5 w-5 ${iconColor}`} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className={`text-sm font-bold ${titleColor}`}>
                                            {count} {isOverdue ? "Overdue Follow-up" : "Follow-up Due Today"}{count > 1 ? "s" : ""}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                            {leads.slice(0, 3).map((f) => f.leadName).join(", ")}
                                            {count > 3 && ` +${count - 3} more`}
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    toast.dismiss(t.id);
                                                    window.location.href = "/admin/leads?view=followups";
                                                }}
                                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                                            >
                                                View Action Items
                                            </button>
                                            <button
                                                onClick={() => toast.dismiss(t.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`flex border-l border-gray-200`}>
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    );
                };

                // Trigger Toasts
                if (overdue.length > 0) {
                    const leads = await enrichLeads(overdue);
                    toast.custom((t) => renderToast('overdue', overdue.length, leads, t), { duration: 10000 });
                }

                if (dueToday.length > 0) {
                    const leads = await enrichLeads(dueToday);
                    toast.custom((t) => renderToast('today', dueToday.length, leads, t), { duration: 8000 });
                }

                hasChecked.current = true;
            } catch (error) {
                console.error("Error checking lead follow-ups:", error);
            }
        };

        // Delay slightly to allow app to stabilize
        const timer = setTimeout(checkFollowups, 2000);
        return () => clearTimeout(timer);
    }, []);
};

export default useGlobalLeadReminders;

/**
 * useGlobalLeadReminders Hook
 *
 * Purpose: Monitors lead follow-ups across the entire application and displays
 * toast notifications for overdue and due-today follow-ups on app initialization.
 *
 * Responsibilities:
 * - Queries all pending follow-ups using Firestore collectionGroup (efficient cross-lead query)
 * - Categorizes follow-ups into 'overdue' and 'due today' buckets
 * - Enriches follow-up data with parent lead names for better UX
 * - Displays role-aware toast notifications with actionable links
 * - Runs only once per session to avoid notification fatigue
 *
 * Dependencies:
 * - Firestore (collectionGroup query on 'followups' subcollections)
 * - react-hot-toast (custom toast rendering)
 * - React Router (navigation to follow-ups view)
 * - AuthContext (for role-based navigation paths)
 *
 * Last Modified: 2026-01-10
 */

import { useEffect, useRef } from "react";
import { collection, getDocs, collectionGroup, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

/**
 * Global hook for lead follow-up reminder notifications.
 *
 * Business Logic:
 * - Uses collectionGroup to query all 'followups' subcollections across all leads
 *   (more efficient than iterating through each lead document)
 * - Filters for 'pending' status only (completed follow-ups are ignored)
 * - Compares follow-up dates against today to determine overdue vs due-today
 * - Fetches parent lead data for customer names (N+1 query, but acceptable for notifications)
 * - Shows custom styled toasts with action buttons for quick navigation
 *
 * Side Effects:
 * - Queries Firestore on mount (delayed by 2s for app stabilization)
 * - Displays toast notifications
 * - Sets hasChecked ref to prevent duplicate runs in same session
 *
 * Performance Notes:
 * - 2-second delay allows app to stabilize before making queries
 * - hasChecked ref ensures single execution per session even with StrictMode
 * - Lead name enrichment is sequential to avoid rate limiting
 */
const useGlobalLeadReminders = () => {
    // SESSION GUARD: Prevent multiple checks in same session (important for StrictMode)
    const hasChecked = useRef(false);
    const navigate = useNavigate();
    const { userData } = useAuthContext();

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

                // DATE COMPARISON LOGIC: Categorize follow-ups by urgency
                // Business Rule: Normalize to midnight for accurate day comparison
                // (ignores time of day - only date matters for follow-up scheduling)
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdue = [];    // Follow-ups with date before today
                const dueToday = [];   // Follow-ups scheduled for today

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
                    const accentColor = isOverdue ? 'bg-red-500' : 'bg-amber-500';
                    const textColor = isOverdue ? 'text-red-600' : 'text-amber-600';

                    return (
                        <div
                            className={`${t.visible ? 'animate-in fade-in slide-in-from-top-2 duration-200' : 'opacity-0'} 
                            max-w-xs w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden`}
                        >
                            {/* Top accent bar */}
                            <div className={`h-1 ${accentColor}`} />

                            <div className="px-3 py-2.5">
                                {/* Header row */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
                                            {isOverdue ? (
                                                <FaExclamationTriangle className={`w-3 h-3 ${textColor}`} />
                                            ) : (
                                                <FaBell className={`w-3 h-3 ${textColor}`} />
                                            )}
                                        </div>
                                        <span className={`text-sm font-semibold ${textColor}`}>
                                            {count} Overdue Follow-up{count > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Lead names */}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {leads.slice(0, 3).map((f) => f.leadName).join(", ")}
                                    {count > 3 && ` +${count - 3} more`}
                                </p>

                                {/* Action buttons */}
                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            const role = userData?.role || "superadmin";
                                            const basePath = role === 'admin' ? "/admin/lead-management" : "/lead-management";
                                            navigate(`${basePath}?view=followups`);
                                        }}
                                        className={`flex-1 px-2.5 py-1 text-xs font-medium rounded-md text-white ${isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} transition-colors`}
                                    >
                                        View Action Items
                                    </button>
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        className="px-2.5 py-1 text-xs font-medium rounded-md text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                };

                // TOAST NOTIFICATIONS: Display follow-up reminders
                // Business Decision: Overdue shown longer (10s) as they're more critical
                // Due-today shown for 8s - important but less urgent
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

        // DELAYED EXECUTION: Wait 2 seconds before checking
        // Reason: Allows React app to fully hydrate (auth context, routing, etc.)
        // Prevents race conditions with auth state and improves initial load performance
        const timer = setTimeout(checkFollowups, 2000);
        return () => clearTimeout(timer);
    }, [navigate, userData]); // Dependencies: re-run if navigation or user changes
};

export default useGlobalLeadReminders;

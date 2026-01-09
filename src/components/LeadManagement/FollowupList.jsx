import React, { useState, useMemo, useEffect } from 'react';
import {
    FaPhoneAlt,
    FaClock,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaSearch,
    FaPlus,
    FaUser,
    FaBuilding,
    FaBell,
    FaList,
    FaThLarge,
    FaStream,
    FaChevronLeft,
    FaChevronRight,
    FaStickyNote
} from 'react-icons/fa';
import Button from '../Button';
import Card from '../Card';

const FollowupList = ({
    followupStats,
    followupFilter,
    setFollowupFilter,
    loadingAllFollowups,
    filteredFollowups,
    allFollowups,
    setShowScheduleFollowup,
    getFollowupNotificationStatus,
    getFollowUpStatus,
    getFollowupColor,
    handleCompleteFollowup,
    handleRescheduleFollowup,
    handleDeleteProfileFollowup,
    getPriorityColor,
    buttonClass = "bg-indigo-600 hover:bg-indigo-700 text-white",
    themeColors = {}
}) => {
    const [viewMode, setViewMode] = useState('card'); // 'card', 'agenda', 'calendar'
    const [calendarViewDays, setCalendarViewDays] = useState(7); // 7, 14, or 30
    const [showCompleted, setShowCompleted] = useState(false); // Show/hide completed in calendar

    // --- Date Helper: Local YYYY-MM-DD ---
    const toLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize strip start to the start of the current week (Sunday or Monday? Let's do Monday for business focus, or Sunday standard)
    // Standard JS getDay() 0=Sun. Let's start strip on the current Date's week start.
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0); // Normalize time
        const day = d.getDay(); // 0 is Sunday
        // We want Sunday to be start? Or Monday?
        // Let's standard on Sunday start for now.
        const diff = d.getDate() - day;
        d.setDate(diff);
        return d;
    };

    // Calendar State
    const [stripStartDate, setStripStartDate] = useState(getStartOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

    // Helper to get calendar button classes based on theme
    const getCalendarButtonClass = (isActive) => {
        if (!isActive) return 'bg-gray-100 [.dark_&]:bg-slate-700 text-gray-600 [.dark_&]:text-gray-300 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600';

        // Extract base color from buttonClass or themeColors
        if (buttonClass.includes('bg-purple')) return 'bg-purple-600 text-white shadow-sm';
        if (buttonClass.includes('bg-sky')) return 'bg-sky-600 text-white shadow-sm';
        if (buttonClass.includes('bg-pink')) return 'bg-pink-600 text-white shadow-sm';
        if (buttonClass.includes('bg-violet')) return 'bg-violet-600 text-white shadow-sm';
        if (buttonClass.includes('bg-amber')) return 'bg-amber-600 text-white shadow-sm';
        if (buttonClass.includes('bg-teal')) return 'bg-teal-600 text-white shadow-sm';
        if (buttonClass.includes('bg-emerald')) return 'bg-emerald-600 text-white shadow-sm';
        if (buttonClass.includes('bg-blue')) return 'bg-blue-600 text-white shadow-sm';
        return 'bg-indigo-600 text-white shadow-sm'; // default
    };

    const getCalendarSelectedClass = () => {
        if (buttonClass.includes('bg-purple')) return 'bg-purple-600';
        if (buttonClass.includes('bg-sky')) return 'bg-sky-600';
        if (buttonClass.includes('bg-pink')) return 'bg-pink-600';
        if (buttonClass.includes('bg-violet')) return 'bg-violet-600';
        if (buttonClass.includes('bg-amber')) return 'bg-amber-600';
        if (buttonClass.includes('bg-teal')) return 'bg-teal-600';
        if (buttonClass.includes('bg-emerald')) return 'bg-emerald-600';
        if (buttonClass.includes('bg-blue')) return 'bg-blue-600';
        return 'bg-indigo-600'; // default
    };

    const getTodayRingClass = () => {
        if (buttonClass.includes('bg-purple')) return 'ring-purple-500';
        if (buttonClass.includes('bg-sky')) return 'ring-sky-500';
        if (buttonClass.includes('bg-pink')) return 'ring-pink-500';
        if (buttonClass.includes('bg-violet')) return 'ring-violet-500';
        if (buttonClass.includes('bg-amber')) return 'ring-amber-500';
        if (buttonClass.includes('bg-teal')) return 'ring-teal-500';
        if (buttonClass.includes('bg-emerald')) return 'ring-emerald-500';
        if (buttonClass.includes('bg-blue')) return 'ring-blue-500';
        return 'ring-indigo-500'; // default
    };

    const getHeatMapClass = (level) => {
        // level: 'heavy', 'medium', 'light'
        if (buttonClass.includes('bg-purple')) {
            if (level === 'heavy') return 'bg-purple-200 [.dark_&]:bg-purple-500/40';
            if (level === 'medium') return 'bg-purple-100 [.dark_&]:bg-purple-500/20';
            return 'bg-purple-50 [.dark_&]:bg-purple-500/10';
        }
        if (buttonClass.includes('bg-sky')) {
            if (level === 'heavy') return 'bg-sky-200 [.dark_&]:bg-sky-500/40';
            if (level === 'medium') return 'bg-sky-100 [.dark_&]:bg-sky-500/20';
            return 'bg-sky-50 [.dark_&]:bg-sky-500/10';
        }
        if (buttonClass.includes('bg-pink')) {
            if (level === 'heavy') return 'bg-pink-200 [.dark_&]:bg-pink-500/40';
            if (level === 'medium') return 'bg-pink-100 [.dark_&]:bg-pink-500/20';
            return 'bg-pink-50 [.dark_&]:bg-pink-500/10';
        }
        if (buttonClass.includes('bg-violet')) {
            if (level === 'heavy') return 'bg-violet-200 [.dark_&]:bg-violet-500/40';
            if (level === 'medium') return 'bg-violet-100 [.dark_&]:bg-violet-500/20';
            return 'bg-violet-50 [.dark_&]:bg-violet-500/10';
        }
        if (buttonClass.includes('bg-amber')) {
            if (level === 'heavy') return 'bg-amber-200 [.dark_&]:bg-amber-500/40';
            if (level === 'medium') return 'bg-amber-100 [.dark_&]:bg-amber-500/20';
            return 'bg-amber-50 [.dark_&]:bg-amber-500/10';
        }
        if (buttonClass.includes('bg-teal')) {
            if (level === 'heavy') return 'bg-teal-200 [.dark_&]:bg-teal-500/40';
            if (level === 'medium') return 'bg-teal-100 [.dark_&]:bg-teal-500/20';
            return 'bg-teal-50 [.dark_&]:bg-teal-500/10';
        }
        if (buttonClass.includes('bg-emerald')) {
            if (level === 'heavy') return 'bg-emerald-200 [.dark_&]:bg-emerald-500/40';
            if (level === 'medium') return 'bg-emerald-100 [.dark_&]:bg-emerald-500/20';
            return 'bg-emerald-50 [.dark_&]:bg-emerald-500/10';
        }
        if (buttonClass.includes('bg-blue')) {
            if (level === 'heavy') return 'bg-blue-200 [.dark_&]:bg-blue-500/40';
            if (level === 'medium') return 'bg-blue-100 [.dark_&]:bg-blue-500/20';
            return 'bg-blue-50 [.dark_&]:bg-blue-500/10';
        }
        // default indigo
        if (level === 'heavy') return 'bg-indigo-200 [.dark_&]:bg-indigo-500/40';
        if (level === 'medium') return 'bg-indigo-100 [.dark_&]:bg-indigo-500/20';
        return 'bg-indigo-50 [.dark_&]:bg-indigo-500/10';
    };

    const getBadgeClass = () => {
        if (buttonClass.includes('bg-purple')) return 'bg-purple-100 text-purple-700 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-300';
        if (buttonClass.includes('bg-sky')) return 'bg-sky-100 text-sky-700 [.dark_&]:bg-sky-500/20 [.dark_&]:text-sky-300';
        if (buttonClass.includes('bg-pink')) return 'bg-pink-100 text-pink-700 [.dark_&]:bg-pink-500/20 [.dark_&]:text-pink-300';
        if (buttonClass.includes('bg-violet')) return 'bg-violet-100 text-violet-700 [.dark_&]:bg-violet-500/20 [.dark_&]:text-violet-300';
        if (buttonClass.includes('bg-amber')) return 'bg-amber-100 text-amber-700 [.dark_&]:bg-amber-500/20 [.dark_&]:text-amber-300';
        if (buttonClass.includes('bg-teal')) return 'bg-teal-100 text-teal-700 [.dark_&]:bg-teal-500/20 [.dark_&]:text-teal-300';
        if (buttonClass.includes('bg-emerald')) return 'bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-500/20 [.dark_&]:text-emerald-300';
        if (buttonClass.includes('bg-blue')) return 'bg-blue-100 text-blue-700 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-300';
        return 'bg-indigo-100 text-indigo-700 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-300';
    };

    const getDotClass = () => {
        if (buttonClass.includes('bg-purple')) return 'bg-purple-500';
        if (buttonClass.includes('bg-sky')) return 'bg-sky-500';
        if (buttonClass.includes('bg-pink')) return 'bg-pink-500';
        if (buttonClass.includes('bg-violet')) return 'bg-violet-500';
        if (buttonClass.includes('bg-amber')) return 'bg-amber-500';
        if (buttonClass.includes('bg-teal')) return 'bg-teal-500';
        if (buttonClass.includes('bg-emerald')) return 'bg-emerald-500';
        if (buttonClass.includes('bg-blue')) return 'bg-blue-500';
        return 'bg-indigo-500';
    };




    // --- Helper to get relative date ---
    const getRelativeDate = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const followupDate = new Date(dateString);
        followupDate.setHours(0, 0, 0, 0);

        const diffTime = followupDate - today;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        if (diffDays === -1) return "Yesterday";
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays <= 7) return `In ${diffDays} days`;
        return dateString; // Fallback to actual date
    };

    // --- Helper to Render Follow-up Item ---
    const RenderFollowupItem = ({ followup, compact = false }) => {
        const dateStatus = getFollowUpStatus(followup.date);
        const relativeDate = getRelativeDate(followup.date);

        return (
            <div
                className={`bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-gray-700 p-4 hover:shadow-md transition-shadow ${compact ? 'flex items-center justify-between gap-4' : ''}`}
            >
                <div className={`flex ${compact ? 'items-center gap-4 flex-1' : 'flex-col md:flex-row md:items-center justify-between gap-4'}`}>
                    {/* Lead Info */}
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full ${themeColors.bgLight || 'bg-indigo-100 [.dark_&]:bg-indigo-500/20'} flex items-center justify-center flex-shrink-0 ${compact ? 'hidden md:flex' : ''}`}>
                            <span className={`font-bold text-sm ${themeColors.iconColor || 'text-indigo-600 [.dark_&]:text-indigo-400'}`}>
                                {followup.leadName?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900 [.dark_&]:text-white truncate">
                                    {followup.leadName}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(followup.leadPriority)}`}>
                                    {followup.leadPriority}
                                </span>
                            </div>
                            {/* Company Name */}
                            {followup.leadCompany && (
                                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                    <FaBuilding className="text-xs" />
                                    {followup.leadCompany}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 [.dark_&]:text-gray-400 mt-1 flex-wrap">
                                <span className="flex items-center gap-1" title={followup.date}>
                                    <FaCalendarAlt className="text-xs" />
                                    <span className="font-medium text-gray-700 [.dark_&]:text-gray-200">{relativeDate}</span>
                                </span>
                                {/* Time */}
                                {followup.time && (
                                    <span className="flex items-center gap-1">
                                        <FaClock className="text-xs" />
                                        {followup.time}
                                    </span>
                                )}
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${followup.status === "completed"
                                    ? "bg-green-100 text-green-800 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400"
                                    : followup.status === "rescheduled"
                                        ? "bg-blue-100 text-blue-800 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-400"
                                        : dateStatus === "overdue"
                                            ? "bg-red-100 text-red-800 [.dark_&]:bg-red-500/20 [.dark_&]:text-red-400"
                                            : dateStatus === "today"
                                                ? "bg-yellow-100 text-yellow-800 [.dark_&]:bg-yellow-500/20 [.dark_&]:text-yellow-400"
                                                : "bg-purple-100 text-purple-800 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-400"
                                    }`}>
                                    {followup.status === "completed" ? "Completed" : followup.status === "rescheduled" ? "Rescheduled" : dateStatus === "overdue" ? "Overdue" : dateStatus === "today" ? "Due Today" : "Pending"}
                                </span>
                                {/* Reschedule Warning Badge */}
                                {followup.rescheduleHistory && followup.rescheduleHistory.length > 2 && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 [.dark_&]:bg-orange-500/20 [.dark_&]:text-orange-400 border border-orange-200 [.dark_&]:border-orange-500/30">
                                        <FaExclamationTriangle className="text-[10px]" />
                                        Rescheduled {followup.rescheduleHistory.length}×
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 flex-shrink-0">
                        {(followup.status === "pending" || followup.status === "rescheduled") && (
                            <>
                                <button
                                    onClick={() => handleCompleteFollowup(followup)}
                                    className="p-2 md:px-3 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                    title="Complete"
                                >
                                    <FaCheckCircle className="text-sm" />
                                    <span className="hidden lg:inline">Complete</span>
                                </button>
                                <button
                                    onClick={() => handleRescheduleFollowup(followup)}
                                    className="p-2 md:px-3 md:py-2 border-2 border-blue-600 text-blue-600 [.dark_&]:border-blue-500 [.dark_&]:text-blue-400 hover:bg-blue-50 [.dark_&]:hover:bg-blue-500/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                                    title="Reschedule"
                                >
                                    <FaClock className="text-sm" />
                                    <span className="hidden lg:inline">Reschedule</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleDeleteProfileFollowup(followup)}
                            className="p-2 md:px-3 md:py-2 border border-red-300 [.dark_&]:border-red-500/30 bg-red-50 [.dark_&]:bg-red-500/10 text-red-600 [.dark_&]:text-red-400 hover:bg-red-100 [.dark_&]:hover:bg-red-500/20 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                            title="Delete"
                        >
                            <span className="hidden lg:inline">Delete</span>
                            <span className="lg:hidden">✕</span>
                        </button>
                    </div>
                </div>

                {!compact && (
                    <>
                        <div className="mt-3 pt-3 border-t border-gray-100 [.dark_&]:border-gray-700">
                            <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 flex items-start gap-2">
                                <FaStickyNote className="text-gray-400 mt-0.5" />
                                {followup.notes || <span className="text-gray-400 italic">No notes added</span>}
                            </p>
                        </div>
                        {followup.rescheduleHistory && followup.rescheduleHistory.length > 0 && (
                            <div className="mt-3 pl-3 ml-1 border-l-2 border-orange-200 bg-orange-50 [.dark_&]:bg-orange-500/10 p-2 rounded text-xs text-gray-600 [.dark_&]:text-gray-400">
                                <p className="font-semibold text-orange-800 [.dark_&]:text-orange-300 mb-2 flex items-center gap-1">
                                    <FaClock className="text-xs" /> Reschedule History:
                                </p>
                                <div className="space-y-1.5">
                                    {followup.rescheduleHistory.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <div className="flex items-center gap-1 font-medium font-mono text-gray-700 [.dark_&]:text-gray-300">
                                                <span>{item.from}</span>
                                                <span className="text-gray-400">→</span>
                                                <span>{item.to}</span>
                                            </div>
                                            {item.reason && (
                                                <span className="text-gray-500 [.dark_&]:text-gray-500 italic truncate max-w-xs">
                                                    — {item.reason}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completion Details */}
                        {followup.status === 'completed' && followup.outcome && (
                            <div className="mt-3 pl-3 ml-1 border-l-2 border-green-200 bg-green-50 [.dark_&]:bg-green-500/10 p-2 rounded text-xs text-gray-600 [.dark_&]:text-gray-400">
                                <p className="font-bold text-green-800 [.dark_&]:text-green-300 mb-1 flex items-center gap-1">
                                    <FaCheckCircle className="text-xs" /> Outcome: <span className="uppercase font-normal ml-1">{followup.outcome.replace('_', ' ')}</span>
                                </p>
                                {followup.completionNotes && (
                                    <p className="mt-1 text-gray-700 [.dark_&]:text-gray-300 italic">
                                        "{followup.completionNotes}"
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    // Calculate Agenda Buckets from *allFollowups*
    const agendaBuckets = useMemo(() => {
        if (!allFollowups) return { overdue: [], today: [], upcoming: [] };

        const overdue = [];
        const today = [];
        const upcoming = [];

        allFollowups.forEach(f => {
            if (f.status === 'completed') return;
            const status = getFollowUpStatus(f.date);
            if (status === 'overdue') overdue.push(f);
            else if (status === 'today') today.push(f);
            else upcoming.push(f);
        });

        const sorter = (a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "");

        return {
            overdue: overdue.sort(sorter),
            today: today.sort(sorter),
            upcoming: upcoming.sort(sorter)
        };
    }, [allFollowups, getFollowUpStatus]);

    // Calendar Helper Data
    const calendarData = useMemo(() => {
        if (!allFollowups) return {};
        const data = {};
        allFollowups.forEach(f => {
            if (!showCompleted && f.status === 'completed') return;
            // f.date should already be YYYY-MM-DD from the input[type=date]
            if (!data[f.date]) data[f.date] = { count: 0, priority: 'low' };
            data[f.date].count++;
            if (f.leadPriority === 'urgent' || f.leadPriority === 'high') data[f.date].priority = 'high';
        });
        return data;
    }, [allFollowups, showCompleted]);

    // Calendar Strip Navigation
    const nextWeek = () => {
        const d = new Date(stripStartDate);
        d.setDate(d.getDate() + 7);
        setStripStartDate(d);
    };

    const prevWeek = () => {
        const d = new Date(stripStartDate);
        d.setDate(d.getDate() - 7);
        setStripStartDate(d);
    };

    const goToToday = () => {
        const today = new Date();
        setStripStartDate(getStartOfWeek(today));
        setSelectedDate(toLocalDateString(today));
    };

    // Generate days for the strip (7, 14, or 30)
    const stripDays = useMemo(() => {
        const days = [];
        const d = new Date(stripStartDate);
        for (let i = 0; i < calendarViewDays; i++) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return days;
    }, [stripStartDate, calendarViewDays]);

    // Calendar Selected Day Followups
    const selectedDayFollowups = useMemo(() => {
        if (!allFollowups) return [];
        return allFollowups.filter(f => {
            if (f.date !== selectedDate) return false;
            if (!showCompleted && f.status === 'completed') return false;
            return true;
        });
    }, [allFollowups, selectedDate, showCompleted]);

    // Auto-scroll to today when switching to calendar view
    useEffect(() => {
        if (viewMode === 'calendar') {
            const todayDate = toLocalDateString(new Date());
            setSelectedDate(todayDate);
            // Adjust strip to show current week
            setStripStartDate(getStartOfWeek(new Date()));
        }
    }, [viewMode]);


    return (
        <div className="space-y-6 mt-6">
            {/* Stats Row - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                    { key: "all", label: "Total Follow-ups", count: followupStats.total, icon: FaPhoneAlt, color: "indigo" },
                    { key: "pending", label: "Pending", count: followupStats.pending, icon: FaClock, color: "purple" },
                    { key: "today", label: "Today", count: followupStats.today, icon: FaBell, color: "yellow" },
                    { key: "overdue", label: "Overdue", count: followupStats.overdue, icon: FaExclamationTriangle, color: "orange" },
                    { key: "rescheduled", label: "Rescheduled", count: followupStats.rescheduled, icon: FaCalendarAlt, color: "blue" },
                    { key: "completed", label: "Completed", count: followupStats.completed, icon: FaCheckCircle, color: "green" },
                ].map((stat) => (
                    <div
                        key={stat.key}
                        onClick={() => setFollowupFilter(stat.key)}
                        className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-${stat.color}-500/30 border-l-4 border-l-${stat.color}-500 [.dark_&]:border-l-${stat.color}-400 hover:shadow-md transition-shadow ${followupFilter === stat.key && viewMode === 'card' ? `ring-2 ring-${stat.color}-500` : ""}`}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-sm font-medium text-${stat.color}-600 [.dark_&]:text-${stat.color}-400`}>
                                    {stat.label}
                                </p>
                                <p className={`text-3xl font-bold text-${stat.color}-900 [.dark_&]:text-white mt-1`}>
                                    {stat.count}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-${stat.color}-100 [.dark_&]:bg-${stat.color}-500/20 flex items-center justify-center`}>
                                <stat.icon className={`text-${stat.color}-600 [.dark_&]:text-${stat.color}-400 text-xl`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Actions & VIEW TOGGLE */}
            <Card title="Search & Actions">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search follow-ups..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-subtle bg-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* View Toggle */}
                        <div className="flex bg-gray-100 [.dark_&]:bg-slate-700/50 p-1 rounded-lg border border-gray-200 [.dark_&]:border-white/10">
                            <button
                                onClick={() => setViewMode("card")}
                                className={`p-2 rounded-md transition-all ${viewMode === "card"
                                    ? `bg-white [.dark_&]:bg-slate-600 shadow ${themeColors.iconColor || 'text-indigo-600 [.dark_&]:text-indigo-400'}`
                                    : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                                    }`}
                                title="Card View"
                            >
                                <FaThLarge />
                            </button>
                            <button
                                onClick={() => setViewMode("agenda")}
                                className={`p-2 rounded-md transition-all ${viewMode === "agenda"
                                    ? `bg-white [.dark_&]:bg-slate-600 shadow ${themeColors.iconColor || 'text-indigo-600 [.dark_&]:text-indigo-400'}`
                                    : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                                    }`}
                                title="Agenda View"
                            >
                                <FaStream />
                            </button>
                            <button
                                onClick={() => setViewMode("calendar")}
                                className={`p-2 rounded-md transition-all ${viewMode === "calendar"
                                    ? `bg-white [.dark_&]:bg-slate-600 shadow ${themeColors.iconColor || 'text-indigo-600 [.dark_&]:text-indigo-400'}`
                                    : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                                    }`}
                                title="Calendar View"
                            >
                                <FaCalendarAlt />
                            </button>
                        </div>

                        <Button
                            variant="custom"
                            onClick={() => setShowScheduleFollowup(true)}
                            className={buttonClass}
                        >
                            <FaPlus className="mr-2" /> Schedule Follow-Up
                        </Button>
                    </div>
                </div>
            </Card>

            {/* View Content */}
            {viewMode === 'card' ? (
                /* CARD VIEW */
                <>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: "all", label: "All", count: followupStats.total, icon: FaPhoneAlt, activeColor: "bg-indigo-500 text-white" },
                            { key: "pending", label: "Pending", count: followupStats.pending, icon: FaClock, activeColor: "bg-purple-500 text-white" },
                            { key: "today", label: "Today", count: followupStats.today, icon: FaCalendarAlt, activeColor: "bg-yellow-500 text-white" },
                            { key: "overdue", label: "Overdue", count: followupStats.overdue, icon: FaExclamationTriangle, activeColor: "bg-orange-500 text-white" },
                            { key: "rescheduled", label: "Rescheduled", count: followupStats.rescheduled, icon: FaCalendarAlt, activeColor: "bg-blue-500 text-white" },
                            { key: "completed", label: "Completed", count: followupStats.completed, icon: FaCheckCircle, activeColor: "bg-green-500 text-white" },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFollowupFilter(tab.key)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${followupFilter === tab.key
                                    ? `${tab.activeColor} shadow-md`
                                    : "bg-gray-100 [.dark_&]:bg-slate-700 text-gray-600 [.dark_&]:text-gray-300 border border-gray-200 [.dark_&]:border-gray-600 hover:shadow-sm"
                                    }`}
                            >
                                <tab.icon className="text-sm" />
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${followupFilter === tab.key
                                    ? "bg-white/20 text-white"
                                    : "bg-white [.dark_&]:bg-slate-600 text-gray-700 [.dark_&]:text-gray-200"
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {loadingAllFollowups ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredFollowups.length === 0 ? (
                        <Card>
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 [.dark_&]:bg-slate-700 flex items-center justify-center">
                                    <FaPhoneAlt className="text-gray-400 [.dark_&]:text-gray-500 text-2xl" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-2">
                                    No Follow-ups Found
                                </h3>
                                <p className="text-gray-500 [.dark_&]:text-gray-400 max-w-md mx-auto">
                                    {followupFilter === "all"
                                        ? "Schedule your first follow-up to get started."
                                        : `No ${followupFilter} follow-ups at the moment.`}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredFollowups.map((followup) => (
                                <RenderFollowupItem key={followup.id} followup={followup} />
                            ))}
                        </div>
                    )}
                </>
            ) : viewMode === 'agenda' ? (
                /* AGENDA VIEW */
                <div className="space-y-8 animate-in fade-in duration-300">
                    {agendaBuckets.overdue.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-red-600 [.dark_&]:text-red-400">
                                <FaExclamationTriangle />
                                Overdue ({agendaBuckets.overdue.length})
                            </h3>
                            <div className="space-y-3 pl-4 border-l-2 border-red-200 [.dark_&]:border-red-900/50">
                                {agendaBuckets.overdue.map(followup => (
                                    <RenderFollowupItem key={followup.id} followup={followup} compact={true} />
                                ))}
                            </div>
                        </div>
                    )}

                    {agendaBuckets.today.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-yellow-600 [.dark_&]:text-yellow-400">
                                <FaBell />
                                Today ({agendaBuckets.today.length})
                            </h3>
                            <div className="space-y-3 pl-4 border-l-2 border-yellow-200 [.dark_&]:border-yellow-900/50">
                                {agendaBuckets.today.map(followup => (
                                    <RenderFollowupItem key={followup.id} followup={followup} compact={true} />
                                ))}
                            </div>
                        </div>
                    )}

                    {agendaBuckets.upcoming.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-blue-600 [.dark_&]:text-blue-400">
                                <FaCalendarAlt />
                                Upcoming
                            </h3>
                            <div className="space-y-3 pl-4 border-l-2 border-blue-200 [.dark_&]:border-blue-900/50">
                                {agendaBuckets.upcoming.map(followup => (
                                    <RenderFollowupItem key={followup.id} followup={followup} compact={true} />
                                ))}
                            </div>
                        </div>
                    )}

                    {agendaBuckets.overdue.length === 0 && agendaBuckets.today.length === 0 && agendaBuckets.upcoming.length === 0 && (
                        <div className="text-center py-12 bg-white [.dark_&]:bg-slate-800/50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">No active follow-ups found. You're all caught up!</p>
                        </div>
                    )}
                </div>
            ) : (
                /* CALENDAR STRIP VIEW */
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Width Control and Strip */}
                    <div className="bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-gray-700 p-4">
                        {/* Header: Month & Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            {/* Month/Year Picker */}
                            <input
                                type="month"
                                value={`${stripStartDate.getFullYear()}-${String(stripStartDate.getMonth() + 1).padStart(2, '0')}`}
                                onChange={(e) => {
                                    const [year, month] = e.target.value.split('-');
                                    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                                    setStripStartDate(getStartOfWeek(newDate));
                                }}
                                className="text-lg font-bold text-gray-900 [.dark_&]:text-white cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 [.dark_&]:hover:bg-slate-700 transition-colors bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={prevWeek} className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-slate-700 rounded-full transition-colors text-gray-600 [.dark_&]:text-gray-400">
                                    <FaChevronLeft />
                                </button>
                                <button onClick={goToToday} className={`text-sm font-semibold ${themeColors.iconColor || 'text-indigo-600 [.dark_&]:text-indigo-400'} hover:underline px-3 py-1.5 rounded-lg ${themeColors.bgLight ? `hover:${themeColors.bgLight.replace('bg-', 'bg-').replace('100', '50')}` : 'hover:bg-indigo-50'} [.dark_&]:hover:bg-indigo-500/10 transition-colors`}>
                                    Today
                                </button>
                                <button onClick={nextWeek} className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-slate-700 rounded-full transition-colors text-gray-600 [.dark_&]:text-gray-400">
                                    <FaChevronRight />
                                </button>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mr-2">View:</span>
                            {[
                                { days: 7, label: '7 Days' },
                                { days: 14, label: '2 Weeks' },
                                { days: 30, label: 'Month' }
                            ].map((option) => (
                                <button
                                    key={option.days}
                                    onClick={() => setCalendarViewDays(option.days)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${getCalendarButtonClass(calendarViewDays === option.days)}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                            <span className="mx-2 h-4 w-px bg-gray-300 [.dark_&]:bg-gray-600"></span>
                            <button
                                onClick={() => setShowCompleted(!showCompleted)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${showCompleted
                                    ? 'bg-green-100 text-green-700 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400'
                                    : 'bg-gray-100 text-gray-600 [.dark_&]:bg-slate-700 [.dark_&]:text-gray-300'
                                    }`}
                            >
                                <FaCheckCircle className="text-xs" />
                                {showCompleted ? 'Hide' : 'Show'} Completed
                            </button>
                        </div>

                        {/* Horizontal Day Strip */}
                        <div className={`grid gap-2 ${calendarViewDays === 7 ? 'grid-cols-7' : calendarViewDays === 14 ? 'grid-cols-7' : 'grid-cols-10'}`}>
                            {stripDays.map((date, idx) => {
                                // USE LOCAL DATE HELPER
                                const isoDate = toLocalDateString(date);
                                const isSelected = selectedDate === isoDate;
                                const isToday = isoDate === toLocalDateString(new Date());
                                const hasEvents = calendarData[isoDate];
                                const dayName = date.toLocaleDateString('default', { weekday: 'short' });
                                const dayNum = date.getDate();

                                // Heat map calculation
                                const followupCount = hasEvents ? hasEvents.count : 0;
                                let heatMapClass = '';
                                if (!isSelected) {
                                    if (followupCount >= 6) {
                                        heatMapClass = getHeatMapClass('heavy');
                                    } else if (followupCount >= 3) {
                                        heatMapClass = getHeatMapClass('medium');
                                    } else if (followupCount >= 1) {
                                        heatMapClass = getHeatMapClass('light');
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(isoDate)}
                                        className={`
                                            flex flex-col items-center justify-center p-3 rounded-lg transition-all relative
                                            ${isSelected
                                                ? `${getCalendarSelectedClass()} text-white shadow-lg scale-105 z-10`
                                                : `${heatMapClass || 'hover:bg-gray-50 [.dark_&]:hover:bg-slate-700'} text-gray-700 [.dark_&]:text-gray-300`}
                                            ${isToday && !isSelected ? `ring-2 ${getTodayRingClass()} ${themeColors.iconColor || 'text-indigo-600'}` : ''}
                                        `}
                                    >
                                        <span className={`text-xs font-medium uppercase mb-1 ${isSelected ? 'text-indigo-200' : 'text-gray-500'}`}>
                                            {dayName}
                                        </span>
                                        <span className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                                            {dayNum}
                                        </span>

                                        {/* Count Badge */}
                                        {hasEvents && (
                                            <span className={`absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${isSelected
                                                ? 'bg-white/20 text-white'
                                                : getBadgeClass()
                                                }`}>
                                                {calendarData[isoDate].count}
                                            </span>
                                        )}

                                        {/* Dot Indicator - now below the number */}
                                        {hasEvents && !isSelected && (
                                            <div className="absolute bottom-1.5 flex gap-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${hasEvents.priority === 'high' ? 'bg-red-500' : getDotClass()}`} />
                                            </div>
                                        )}
                                        {/* Simple White Dot if selected */}
                                        {hasEvents && isSelected && (
                                            <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-white/80" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detailed List for Selected Date */}
                    <div className="min-h-[300px]">
                        <div className="flex items-center gap-3 mb-4">
                            <h4 className="text-xl font-bold text-gray-900 [.dark_&]:text-white">
                                {new Date(selectedDate).toLocaleString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                            <span className="bg-gray-100 [.dark_&]:bg-slate-700 text-gray-600 [.dark_&]:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                                {selectedDayFollowups.length} Tasks
                            </span>
                        </div>

                        {selectedDayFollowups.length > 0 ? (
                            <div className="space-y-4">
                                {selectedDayFollowups.map(followup => (
                                    <RenderFollowupItem key={followup.id} followup={followup} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 [.dark_&]:border-gray-700">
                                <div className="w-12 h-12 mx-auto bg-gray-50 [.dark_&]:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                    <FaCalendarAlt className="text-gray-400" />
                                </div>
                                <p className="text-gray-500">No tasks scheduled for this day.</p>
                                <Button
                                    variant="custom"
                                    onClick={() => setShowScheduleFollowup(true)}
                                    className={buttonClass}
                                >
                                    + Schedule New Follow-Up
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowupList;

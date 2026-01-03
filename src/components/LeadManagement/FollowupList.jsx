import React from 'react';
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
    FaBell
} from 'react-icons/fa';
import Button from '../Button';
import Card from '../Card';

const FollowupList = ({
    followupStats,
    followupFilter,
    setFollowupFilter,
    loadingAllFollowups,
    filteredFollowups,
    setShowScheduleFollowup,
    getFollowupNotificationStatus,
    getFollowUpStatus,
    getFollowupColor,
    handleCompleteFollowup,
    handleRescheduleFollowup,
    handleDeleteProfileFollowup,
    getPriorityColor
}) => {

    const buttonClass = "bg-[#4f46e5] hover:bg-[#4338ca] text-white transition-colors duration-200 shadow-sm hover:shadow-md flex items-center";

    return (
        <div className="space-y-6 mt-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div
                    onClick={() => setFollowupFilter("all")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-indigo-500/30 border-l-4 border-l-indigo-500 [.dark_&]:border-l-indigo-400 hover:shadow-md transition-shadow ${followupFilter === "all" ? "ring-2 ring-indigo-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-indigo-600 [.dark_&]:text-indigo-400">
                                Total Follow-ups
                            </p>
                            <p className="text-3xl font-bold text-indigo-900 [.dark_&]:text-white mt-1">
                                {followupStats.total}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                            <FaPhoneAlt className="text-indigo-600 [.dark_&]:text-indigo-400 text-xl" />
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setFollowupFilter("pending")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-purple-500/30 border-l-4 border-l-purple-500 [.dark_&]:border-l-purple-400 hover:shadow-md transition-shadow ${followupFilter === "pending" ? "ring-2 ring-purple-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-purple-600 [.dark_&]:text-purple-400">
                                Pending
                            </p>
                            <p className="text-3xl font-bold text-purple-900 [.dark_&]:text-white mt-1">
                                {followupStats.pending}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-100 [.dark_&]:bg-purple-500/20 flex items-center justify-center">
                            <FaClock className="text-purple-600 [.dark_&]:text-purple-400 text-xl" />
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setFollowupFilter("today")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-yellow-500/30 border-l-4 border-l-yellow-500 [.dark_&]:border-l-yellow-400 hover:shadow-md transition-shadow ${followupFilter === "today" ? "ring-2 ring-yellow-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-yellow-600 [.dark_&]:text-yellow-400">
                                Today
                            </p>
                            <p className="text-3xl font-bold text-yellow-900 [.dark_&]:text-white mt-1">
                                {followupStats.today}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-yellow-100 [.dark_&]:bg-yellow-500/20 flex items-center justify-center">
                            <FaBell className="text-yellow-600 [.dark_&]:text-yellow-400 text-xl" />
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setFollowupFilter("overdue")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-orange-500/30 border-l-4 border-l-orange-500 [.dark_&]:border-l-orange-400 hover:shadow-md transition-shadow ${followupFilter === "overdue" ? "ring-2 ring-orange-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-orange-600 [.dark_&]:text-orange-400">
                                Overdue
                            </p>
                            <p className="text-3xl font-bold text-orange-900 [.dark_&]:text-white mt-1">
                                {followupStats.overdue}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-orange-100 [.dark_&]:bg-orange-500/20 flex items-center justify-center">
                            <FaExclamationTriangle className="text-orange-600 [.dark_&]:text-orange-400 text-xl" />
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setFollowupFilter("rescheduled")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-blue-500/30 border-l-4 border-l-blue-500 [.dark_&]:border-l-blue-400 hover:shadow-md transition-shadow ${followupFilter === "rescheduled" ? "ring-2 ring-blue-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-blue-600 [.dark_&]:text-blue-400">
                                Rescheduled
                            </p>
                            <p className="text-3xl font-bold text-blue-900 [.dark_&]:text-white mt-1">
                                {followupStats.rescheduled}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 [.dark_&]:bg-blue-500/20 flex items-center justify-center">
                            <FaCalendarAlt className="text-blue-600 [.dark_&]:text-blue-400 text-xl" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setFollowupFilter("completed")}
                    className={`cursor-pointer bg-white [.dark_&]:bg-slate-800/60 [.dark_&]:backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-200 [.dark_&]:border-green-500/30 border-l-4 border-l-green-500 [.dark_&]:border-l-green-400 hover:shadow-md transition-shadow ${followupFilter === "completed" ? "ring-2 ring-green-500" : ""}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-green-600 [.dark_&]:text-green-400">
                                Completed
                            </p>
                            <p className="text-3xl font-bold text-green-900 [.dark_&]:text-white mt-1">
                                {followupStats.completed}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                            <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400 text-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Actions */}
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
                    <Button
                        onClick={() => setShowScheduleFollowup(true)}
                        className={buttonClass}
                    >
                        <FaPlus className="mr-2" /> Schedule Follow-Up
                    </Button>
                </div>
            </Card>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: "all", label: "All", count: followupStats.total, icon: FaPhoneAlt, bgColor: "bg-indigo-500", textColor: "text-white" },
                    { key: "pending", label: "Pending", count: followupStats.pending, icon: FaClock, bgColor: "bg-purple-100 [.dark_&]:bg-purple-500/20", textColor: "text-purple-700 [.dark_&]:text-purple-400" },
                    { key: "today", label: "Today", count: followupStats.today, icon: FaCalendarAlt, bgColor: "bg-yellow-100 [.dark_&]:bg-yellow-500/20", textColor: "text-yellow-700 [.dark_&]:text-yellow-400" },
                    { key: "overdue", label: "Overdue", count: followupStats.overdue, icon: FaExclamationTriangle, bgColor: "bg-orange-100 [.dark_&]:bg-orange-500/20", textColor: "text-orange-700 [.dark_&]:text-orange-400" },
                    { key: "rescheduled", label: "Rescheduled", count: followupStats.rescheduled, icon: FaCalendarAlt, bgColor: "bg-blue-100 [.dark_&]:bg-blue-500/20", textColor: "text-blue-700 [.dark_&]:text-blue-400" },
                    { key: "completed", label: "Completed", count: followupStats.completed, icon: FaCheckCircle, bgColor: "bg-green-100 [.dark_&]:bg-green-500/20", textColor: "text-green-700 [.dark_&]:text-green-400" },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFollowupFilter(tab.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${followupFilter === tab.key
                            ? "bg-indigo-500 text-white shadow-md"
                            : `${tab.bgColor} ${tab.textColor} border border-gray-200 [.dark_&]:border-gray-700 hover:shadow-sm`
                            }`}
                    >
                        <tab.icon className="text-sm" />
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${followupFilter === tab.key
                            ? "bg-white/20"
                            : "bg-white [.dark_&]:bg-slate-700"
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Follow-up Cards */}
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
                    {filteredFollowups.map((followup) => {
                        const dateStatus = getFollowUpStatus(followup.date);
                        return (
                            <div
                                key={followup.id}
                                className="bg-white [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-gray-700 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Lead Info */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                            <FaUser className="text-indigo-600 [.dark_&]:text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-semibold text-gray-900 [.dark_&]:text-white">
                                                    {followup.leadName}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(followup.leadPriority)}`}>
                                                    {followup.leadPriority}
                                                </span>
                                            </div>
                                            {/* Company Name */}
                                            {followup.leadCompany && (
                                                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <FaBuilding className="text-xs" />
                                                    {followup.leadCompany}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-gray-500 [.dark_&]:text-gray-400 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <FaCalendarAlt className="text-xs" />
                                                    {followup.date}
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

                                                {/* Notification Badge */}
                                                {followup.status !== 'completed' && (() => {
                                                    const notifStatus = getFollowupNotificationStatus(followup.date);
                                                    if (notifStatus.type === 'overdue') {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 [.dark_&]:bg-red-500/20 [.dark_&]:text-red-300">
                                                                ⚠️ {notifStatus.days}d overdue
                                                            </span>
                                                        );
                                                    }
                                                    if (notifStatus.type === 'today') {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 [.dark_&]:bg-yellow-500/20 [.dark_&]:text-yellow-300">
                                                                🔔 Due today
                                                            </span>
                                                        );
                                                    }
                                                    if (notifStatus.type === 'tomorrow') {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-300">
                                                                📅 Due tomorrow
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        {(followup.status === "pending" || followup.status === "rescheduled") && (
                                            <>
                                                <button
                                                    onClick={() => handleCompleteFollowup(followup)}
                                                    className="flex-1 md:flex-none px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <FaCheckCircle className="text-sm" />
                                                    <span className="hidden sm:inline">Complete</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRescheduleFollowup(followup)}
                                                    className="flex-1 md:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <FaClock className="text-sm" />
                                                    <span className="hidden sm:inline">Reschedule</span>
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() =>
                                                handleDeleteProfileFollowup(followup)
                                            }
                                            className="flex-1 md:flex-none px-3 py-2 bg-red-100 hover:bg-red-200 [.dark_&]:bg-red-500/20 [.dark_&]:hover:bg-red-500/30 text-red-700 [.dark_&]:text-red-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Notes if any */}
                                {followup.notes && (
                                    <div className="mt-3 pl-13 ml-13 border-t border-gray-100 [.dark_&]:border-gray-700 pt-2">
                                        <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 flex items-start gap-2">
                                            <span className="text-gray-400 mt-0.5">📝</span>
                                            {followup.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FollowupList;

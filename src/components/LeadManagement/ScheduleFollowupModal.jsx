import React from 'react';
import { FaCalendarAlt, FaTimes, FaUserTie, FaPhoneAlt, FaClock, FaFlag, FaEdit, FaCheckCircle } from 'react-icons/fa';

const ScheduleFollowupModal = ({
    isOpen,
    onClose,
    form,
    setForm,
    onSubmit,
    isSubmitting,
    leads,
    followupTypes,
    priorities,
    headerIconClass = "bg-indigo-50 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400",
    buttonClass = "bg-indigo-600 hover:bg-indigo-700 text-white"
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 bg-gray-50/50 [.dark_&]:bg-[#181B2A]">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${headerIconClass}`}>
                            <FaCalendarAlt className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                                Schedule New Follow-Up
                            </h2>
                            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                                Create a new follow-up reminder
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 [.dark_&]:hover:bg-slate-700 text-gray-500 transition-colors"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={onSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Select Lead */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaUserTie className="text-indigo-500" />
                                Select Lead <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.leadId}
                                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                                required
                            >
                                <option value="">-- Select a Lead --</option>
                                {leads.map((lead) => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.customerName} {lead.companyName && `(${lead.companyName})`}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 [.dark_&]:text-gray-500">{leads.length} leads available</p>
                        </div>

                        {/* Follow-Up Type */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaPhoneAlt className="text-purple-500" />
                                Follow-Up Type
                            </label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                            >
                                {followupTypes.length > 0 ? (
                                    followupTypes.map((type) => (
                                        <option key={type} value={type.toLowerCase().replace(/ /g, '_')}>
                                            {type}
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="phone_call">Phone Call</option>
                                        <option value="email">Email</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="demo">Demo</option>
                                        <option value="proposal">Proposal</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaCalendarAlt className="text-blue-500" />
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaClock className="text-orange-500" />
                                Time
                            </label>
                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                            />
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaFlag className="text-yellow-500" />
                                Priority
                            </label>
                            <select
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all capitalize"
                            >
                                {(priorities && priorities.length > 0 ? priorities : ["Low", "Medium", "High", "Urgent"]).map((priority) => {
                                    const priorityValue = typeof priority === 'string' ? priority.toLowerCase() : priority.value;
                                    const priorityLabel = typeof priority === 'string' ? priority : priority.label;
                                    return (
                                        <option key={priorityValue} value={priorityValue}>
                                            {priorityLabel}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaEdit className="text-green-500" />
                                Notes
                            </label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Add follow-up notes..."
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-gray-600 bg-gray-50 [.dark_&]:bg-slate-700/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-5 py-2.5 rounded-lg ${buttonClass} font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm`}
                        >
                            <FaCheckCircle />
                            {isSubmitting ? "Scheduling..." : "Schedule Follow-Up"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg bg-gray-100 [.dark_&]:bg-slate-700 hover:bg-gray-200 [.dark_&]:hover:bg-slate-600 text-gray-700 [.dark_&]:text-gray-300 font-medium flex items-center gap-2 transition-colors"
                        >
                            <FaTimes />
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleFollowupModal;

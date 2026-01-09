import React from 'react';
import { FaClock, FaFlag } from 'react-icons/fa';
import { HiXMark } from 'react-icons/hi2';

const RescheduleFollowupModal = ({
    isOpen,
    onClose,
    lead,
    rescheduleFollowup,
    rescheduleForm,
    setRescheduleForm,
    onReschedule,
    isRescheduling,
    priorities,
    headerIconClass = "bg-indigo-50 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400",
    buttonClass = "bg-indigo-600 hover:bg-indigo-700 text-white",
    themeColors = {}
}) => {
    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
                    <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${headerIconClass}`}>
                            <FaClock className="h-4 w-4" />
                        </span>
                        Reschedule Follow-up
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onReschedule}>
                    {/* Customer Info */}
                    <div className={`px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10 ${themeColors.bgLight || 'bg-indigo-50 [.dark_&]:bg-indigo-900/20'}`}>
                        <h3 className="text-base font-semibold text-gray-900 [.dark_&]:text-white">
                            {lead.customerName}
                        </h3>
                        <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                            Follow-up scheduled
                        </p>
                        {/* Reschedule Warning */}
                        {rescheduleFollowup && rescheduleFollowup.rescheduleHistory && rescheduleFollowup.rescheduleHistory.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-orange-600 [.dark_&]:text-orange-400">
                                <span className="text-base">⚠</span>
                                <span className="text-sm font-medium">
                                    Already rescheduled {rescheduleFollowup.rescheduleHistory.length} time(s)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 space-y-4">
                        {/* New Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                                New Date
                            </label>
                            <input
                                type="date"
                                value={rescheduleForm.date}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                value={rescheduleForm.time}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white"
                            />
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
                                <FaFlag className="text-yellow-500" />
                                Priority
                            </label>
                            <select
                                value={rescheduleForm.priority}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, priority: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white capitalize"
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

                        {/* Reason (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                                Reason <span className="text-gray-400">(Optional)</span>
                            </label>
                            <textarea
                                placeholder="Why are you rescheduling?"
                                value={rescheduleForm.reason}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                                rows={4}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
                        <button
                            type="submit"
                            disabled={isRescheduling}
                            className={`flex-1 ${buttonClass} px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50`}
                        >
                            <FaClock />
                            {isRescheduling ? "Rescheduling..." : "Reschedule"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 [.dark_&]:bg-gray-700 [.dark_&]:hover:bg-gray-600 text-gray-700 [.dark_&]:text-gray-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RescheduleFollowupModal;

/**
 * ViewLeadModal Component
 *
 * Purpose: Read-only modal for viewing lead details and follow-up history.
 * Provides tabbed interface for profile and follow-ups.
 *
 * Responsibilities:
 * - Display lead header with avatar, name, company, status
 * - Tab: Profile Details (contact info, source, priority, notes)
 * - Tab: Follow-ups (timeline with history, actions)
 * - Inline add follow-up form
 * - Complete/Reschedule/Delete follow-up actions
 * - Edit lead button in footer
 *
 * Dependencies:
 * - react-icons (FaUser, FaTimes, FaBell, etc.)
 * - HiXMark (close icon)
 * - Button (UI component)
 *
 * Props:
 * - isOpen: Modal visibility state
 * - onClose: Close handler
 * - lead: Lead object to display
 * - activeTab: 'details' | 'followups'
 * - setActiveTab: Tab switch handler
 * - followups: Array of follow-ups for this lead
 * - loadingFollowups: Loading state
 * - showAddFollowup/setShowAddFollowup: Add form toggle
 * - followupForm/setFollowupForm: Add form state
 * - onAddFollowup: Add form submit handler
 * - savingFollowup: Add form loading state
 * - onDeleteFollowup/onReschedule/onComplete: Follow-up actions
 * - onEdit: Open edit lead modal
 * - getStatusColor/getPriorityColor: Color helpers
 *
 * Profile Details Section:
 * - Lead Date, Contact Number, Email, Address
 * - Source of Lead, Priority
 * - Notes (if present)
 *
 * Follow-ups Section:
 * - Add Follow-up button + inline form
 * - Follow-up timeline with:
 *   - Date, time, status badge
 *   - Notes
 *   - Reschedule history (if any)
 *   - Completion outcome/notes (if completed)
 *   - Complete/Reschedule/Delete buttons
 *
 * Last Modified: 2026-01-10
 */

import React from 'react';
import {
    FaUser, FaTimes, FaBell, FaCalendarAlt, FaPhone,
    FaEnvelope, FaMapMarkerAlt, FaBoxOpen, FaIndustry,
    FaBullhorn, FaPlus, FaClock, FaCheckCircle, FaTrash, FaEdit, FaStickyNote
} from 'react-icons/fa';
import { HiXMark } from 'react-icons/hi2';
import Button from '../../components/Button';

const ViewLeadModal = ({
    isOpen,
    onClose,
    lead,
    activeTab,
    setActiveTab,
    followups,
    loadingFollowups,
    showAddFollowup,
    setShowAddFollowup,
    followupForm,
    setFollowupForm,
    onAddFollowup,
    savingFollowup,
    onDeleteFollowup,
    onReschedule,
    onComplete,
    onEdit,
    getStatusColor,
    getPriorityColor
}) => {
    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                            <FaUser className="text-indigo-600 [.dark_&]:text-indigo-400 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white">
                                {lead.customerName}
                            </h2>
                            <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                                {lead.companyName}
                            </p>
                        </div>
                        <span
                            className={`ml-3 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                lead.status
                            )}`}
                        >
                            {lead.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 [.dark_&]:border-white/10">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === "details"
                            ? "text-indigo-600 [.dark_&]:text-indigo-400 border-b-2 border-indigo-600"
                            : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                            }`}
                    >
                        Profile Details
                    </button>
                    <button
                        onClick={() => setActiveTab("followups")}
                        className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "followups"
                            ? "text-indigo-600 [.dark_&]:text-indigo-400 border-b-2 border-indigo-600"
                            : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700"
                            }`}
                    >
                        <FaBell className="text-xs" />
                        Follow-ups
                        {followups.length > 0 && (
                            <span className="bg-indigo-100 [.dark_&]:bg-indigo-500/20 text-indigo-600 [.dark_&]:text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                                {followups.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "details" ? (
                        /* Profile Details Tab */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Lead Date</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                                        <FaCalendarAlt className="text-gray-400" />
                                        {lead.date || "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Contact Number</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                                        <FaPhone className="text-gray-400" />
                                        {lead.contactNumber || "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Email</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                                        <FaEnvelope className="text-gray-400" />
                                        {lead.email || "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Address</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-gray-400" />
                                        {lead.address || "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Source of Lead</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                                        <FaBullhorn className="text-gray-400" />
                                        {lead.sourceOfLead || "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Priority</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(lead.priority)}`}>
                                        {lead.priority}
                                    </span>
                                </div>
                            </div>
                            {lead.notes && (
                                <div className="md:col-span-2">
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1">Notes</p>
                                    <p className="text-sm text-gray-900 [.dark_&]:text-white bg-gray-50 [.dark_&]:bg-slate-800 p-3 rounded-lg">
                                        {lead.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Follow-ups Tab */
                        <div>
                            {/* Add Follow-up Button */}
                            {!showAddFollowup && (
                                <button
                                    onClick={() => setShowAddFollowup(true)}
                                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <FaPlus className="text-xs" />
                                    Add Follow-up
                                </button>
                            )}

                            {/* Add Follow-up Form */}
                            {showAddFollowup && (
                                <form onSubmit={onAddFollowup} className="mb-6 p-4 bg-gray-50 [.dark_&]:bg-slate-800 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-900 [.dark_&]:text-white mb-3">
                                        Schedule Follow-up
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                                                Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={followupForm.date}
                                                onChange={(e) => setFollowupForm({ ...followupForm, date: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                                                Time
                                            </label>
                                            <input
                                                type="time"
                                                value={followupForm.time}
                                                onChange={(e) => setFollowupForm({ ...followupForm, time: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                                                Status
                                            </label>
                                            <select
                                                value={followupForm.status}
                                                onChange={(e) => setFollowupForm({ ...followupForm, status: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="rescheduled">Rescheduled</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-1 block">
                                            Notes <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followupForm.notes}
                                            onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                                            placeholder="Enter follow-up notes..."
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            disabled={savingFollowup}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {savingFollowup ? "Saving..." : "Save Follow-up"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setShowAddFollowup(false);
                                                setFollowupForm({ date: "", notes: "", status: "pending" });
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Follow-up Timeline */}
                            {loadingFollowups ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : followups.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 [.dark_&]:text-gray-400">
                                    <FaBell className="text-4xl mx-auto mb-3 opacity-50" />
                                    <p>No follow-ups scheduled yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                                        Follow-up History
                                    </h4>
                                    <div className="relative">
                                        {followups.map((followup, index) => (
                                            <div key={followup.id} className="bg-white [.dark_&]:bg-slate-800/60 border border-gray-200 [.dark_&]:border-white/10 rounded-xl p-5 mb-4 last:mb-0 hover:shadow-md transition-shadow">
                                                {/* Header - Date, Status, and Time */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                                            <FaCalendarAlt className="text-gray-400 text-xs" />
                                                            {followup.date}
                                                        </div>
                                                        {followup.createdAt && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 [.dark_&]:text-gray-400">
                                                                <FaClock className="text-xs" />
                                                                {new Date(followup.createdAt.seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${followup.status === "completed"
                                                        ? "bg-green-100 text-green-700 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400"
                                                        : followup.status === "rescheduled"
                                                            ? "bg-yellow-100 text-yellow-700 [.dark_&]:bg-yellow-500/20 [.dark_&]:text-yellow-400"
                                                            : "bg-orange-100 text-orange-700 [.dark_&]:bg-orange-500/20 [.dark_&]:text-orange-400"
                                                        }`}>
                                                        {followup.status}
                                                    </span>
                                                </div>

                                                {/* Follow-up Notes */}
                                                <div className="mb-3">
                                                    <p className="text-sm text-gray-700 [.dark_&]:text-gray-300 flex items-center gap-1">
                                                        <FaStickyNote className="text-gray-400" />
                                                        {followup.notes || <span className="text-gray-400 italic">No notes added</span>}
                                                    </p>
                                                </div>

                                                {/* Reschedule History */}
                                                {followup.rescheduleHistory && followup.rescheduleHistory.length > 0 && (
                                                    <div className="mb-3 bg-orange-50 [.dark_&]:bg-orange-900/20 border border-orange-200 [.dark_&]:border-orange-500/30 rounded-lg p-3">
                                                        <h6 className="text-xs font-semibold text-orange-800 [.dark_&]:text-orange-400 mb-2 flex items-center gap-1">
                                                            📋 Reschedule History ({followup.rescheduleHistory.length})
                                                        </h6>
                                                        <div className="space-y-2">
                                                            {followup.rescheduleHistory.map((history, idx) => (
                                                                <div key={idx} className="text-xs text-orange-700 [.dark_&]:text-orange-300">
                                                                    <div className="font-medium">
                                                                        <span className="text-orange-600 [.dark_&]:text-orange-400">From:</span> {history.from} →
                                                                        <span className="text-orange-600 [.dark_&]:text-orange-400"> To:</span> {history.to}
                                                                    </div>
                                                                    <div className="ml-4 text-orange-600 [.dark_&]:text-orange-400">
                                                                        Reason: {history.reason}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Completion Details */}
                                                {followup.status === 'completed' && followup.outcome && (
                                                    <div className="mb-3 bg-green-50 [.dark_&]:bg-green-900/20 border border-green-200 [.dark_&]:border-green-500/30 rounded-lg p-3">
                                                        <h6 className="text-xs font-bold text-green-800 [.dark_&]:text-green-400 mb-1 flex items-center gap-1">
                                                            <FaCheckCircle /> Outcome: <span className="uppercase font-normal ml-1">{followup.outcome.replace('_', ' ')}</span>
                                                        </h6>
                                                        {followup.completionNotes && (
                                                            <p className="text-xs text-green-700 [.dark_&]:text-green-300 italic">
                                                                "{followup.completionNotes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-2">
                                                    {(followup.status === "pending" || followup.status === "rescheduled") && (
                                                        <>
                                                            <button
                                                                onClick={() => onComplete(followup)}
                                                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                            >
                                                                <FaCheckCircle className="text-sm" />
                                                                <span className="hidden sm:inline">Complete</span>
                                                            </button>
                                                            <button
                                                                onClick={() => onReschedule(followup)}
                                                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                            >
                                                                <FaClock className="text-sm" />
                                                                <span className="hidden sm:inline">Reschedule</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* Delete button always visible */}
                                                    <button
                                                        onClick={() => onDeleteFollowup(followup)}
                                                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ml-auto"
                                                    >
                                                        <FaTrash className="text-sm" />
                                                        <span className="hidden sm:inline">Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={() => {
                            onClose();
                            onEdit(lead);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <FaEdit className="mr-2" /> Edit Lead
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ViewLeadModal;

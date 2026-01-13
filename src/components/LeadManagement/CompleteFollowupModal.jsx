/**
 * CompleteFollowupModal Component
 *
 * Purpose: Modal for completing a scheduled follow-up with outcome.
 * Records the result of a follow-up interaction.
 *
 * Responsibilities:
 * - Display customer name and follow-up context
 * - Collect outcome selection (required)
 * - Collect closing/completion notes (optional)
 * - Submit completion with loading state
 *
 * Dependencies:
 * - react-icons (FaCheckCircle)
 * - HiXMark (close icon)
 *
 * Props:
 * - isOpen: Modal visibility state
 * - onClose: Close handler
 * - lead: Parent lead object (for customer name)
 * - completeFollowup: Follow-up being completed
 * - completeForm: Form state { outcome, completionNotes }
 * - setCompleteForm: Update form state
 * - onComplete: Submit handler
 * - isCompleting: Loading state
 *
 * Outcome Options:
 * - "successful" → Deal Closed
 * - "interested" → Follow-up Required
 * - "not_interested" → Not Interested
 * - "no_response" → No Response
 * - "needs_analysis" → Needs more analysis
 *
 * Form Fields:
 * - outcome: Required dropdown
 * - completionNotes: Optional textarea
 *
 * Last Modified: 2026-01-10
 */

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { HiXMark } from 'react-icons/hi2';

const CompleteFollowupModal = ({
    isOpen,
    onClose,
    lead,
    completeFollowup,
    completeForm,
    setCompleteForm,
    onComplete,
    isCompleting
}) => {
    if (!isOpen || !lead || !completeFollowup) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
                    <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 [.dark_&]:bg-green-500/20 flex items-center justify-center">
                            <FaCheckCircle className="text-green-600 [.dark_&]:text-green-400" />
                        </div>
                        Complete Follow-up
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onComplete}>
                    {/* Customer Info */}
                    <div className="bg-gray-50 [.dark_&]:bg-gray-800/50 px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
                        <h3 className="text-base font-semibold text-gray-900 [.dark_&]:text-white">
                            {lead.customerName}
                        </h3>
                        <p className="text-sm text-gray-600 [.dark_&]:text-gray-300">
                            Follow-up scheduled
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 space-y-4">
                        {/* Outcome Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                                Outcome
                            </label>
                            <select
                                value={completeForm.outcome}
                                onChange={(e) => setCompleteForm({ ...completeForm, outcome: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white"
                                required
                            >
                                <option value="">Select outcome...</option>
                                <option value="successful">Successful - Deal Closed</option>
                                <option value="interested">Interested - Follow-up Required</option>
                                <option value="not_interested">Not Interested</option>
                                <option value="no_response">No Response</option>
                                <option value="needs_analysis">Needs more analysis</option>
                            </select>
                        </div>

                        {/* Closing Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                                Closing Notes
                            </label>
                            <textarea
                                placeholder="What happened during the interaction?"
                                value={completeForm.completionNotes}
                                onChange={(e) => setCompleteForm({ ...completeForm, completionNotes: e.target.value })}
                                rows={4}
                                className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
                        <button
                            type="submit"
                            disabled={isCompleting}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FaCheckCircle />
                            {isCompleting ? "Completing..." : "Complete Follow-up"}
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

export default CompleteFollowupModal;

/**
 * LeadRow Component
 *
 * Purpose: Grid-based row component for the grouped view.
 * Displays lead info with inline status change and action buttons.
 *
 * Responsibilities:
 * - Display lead in 7-column grid layout
 * - Show selection checkbox
 * - Show customer name and company
 * - Display contact info (phone, email)
 * - Show follow-up date with status badge
 * - Render inline status dropdown
 * - Show priority badge
 * - Provide action buttons (view, edit, schedule, delete)
 *
 * Dependencies:
 * - react-icons (FaEye, FaEdit, FaBell, etc.)
 *
 * Props:
 * - lead: Lead object to display
 * - isSelected: Checkbox state
 * - onToggleSelect: Selection toggle
 * - onView/onEdit/onDelete/onScheduleFollowup/onStatusChange: Actions
 * - getFollowUpStatus/getPriorityColor/formatFollowUpDate: Helpers
 * - leadStatuses: Available status options
 * - showActions: Show action column (default: true)
 *
 * Grid Columns (7):
 * 1. Checkbox (30px)
 * 2. Customer/Company (1fr, clickable)
 * 3. Contact info (150px)
 * 4. Follow-up date badge (120px)
 * 5. Status dropdown (110px)
 * 6. Priority badge (80px, centered)
 * 7. Action buttons (80px, optional)
 *
 * Status Color Mapping:
 * - remaining/new → blue
 * - contacted → purple
 * - qualified → indigo
 * - proposal → yellow
 * - negotiation → orange
 * - converted → green
 * - lost → red
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import {
    FaEye,
    FaEdit,
    FaBell,
    FaPhone,
    FaEnvelope,
    FaFlag,
    FaBuilding,
    FaUser,
    FaCalendarPlus,
    FaTrash,
} from "react-icons/fa";

// Status color function
const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "remaining" || s === "new") return "bg-blue-100 text-blue-800 border-blue-200 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-400 [.dark_&]:border-blue-500/30";
    if (s === "contacted") return "bg-purple-100 text-purple-800 border-purple-200 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-400 [.dark_&]:border-purple-500/30";
    if (s === "qualified") return "bg-indigo-100 text-indigo-800 border-indigo-200 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-400 [.dark_&]:border-indigo-500/30";
    if (s === "proposal") return "bg-yellow-100 text-yellow-800 border-yellow-200 [.dark_&]:bg-yellow-500/20 [.dark_&]:text-yellow-400 [.dark_&]:border-yellow-500/30";
    if (s === "negotiation") return "bg-orange-100 text-orange-800 border-orange-200 [.dark_&]:bg-orange-500/20 [.dark_&]:text-orange-400 [.dark_&]:border-orange-500/30";
    if (s === "converted") return "bg-green-100 text-green-800 border-green-200 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-400 [.dark_&]:border-green-500/30";
    if (s === "lost") return "bg-red-100 text-red-800 border-red-200 [.dark_&]:bg-red-500/20 [.dark_&]:text-red-400 [.dark_&]:border-red-500/30";
    return "bg-gray-100 text-gray-800 border-gray-200 [.dark_&]:bg-gray-500/20 [.dark_&]:text-gray-400 [.dark_&]:border-gray-500/30";
};

const DEFAULT_STATUSES = ['remaining', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'];

const LeadRow = ({
    lead,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onDelete,
    onScheduleFollowup,
    onStatusChange,
    getFollowUpStatus,
    getPriorityColor,
    formatFollowUpDate,
    leadStatuses,
    showActions = true,
}) => {
    const followUpStatus = lead.followUpDate ? getFollowUpStatus(lead.followUpDate) : null;
    const statuses = leadStatuses && leadStatuses.length > 0 ? leadStatuses : DEFAULT_STATUSES;

    return (
        <div
            className={`grid ${showActions
                ? "grid-cols-[30px_1fr_150px_120px_110px_80px_80px]"
                : "grid-cols-[30px_1fr_150px_120px_110px_80px]"
                } gap-4 px-4 py-3 border-b border-gray-100 [.dark_&]:border-white/5 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors items-center`}
        >
            {/* Checkbox */}
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
            </div>

            {/* Customer & Company */}
            <div
                className="min-w-0 cursor-pointer"
                onClick={() => onView(lead)}
            >
                <p className="font-medium text-gray-900 [.dark_&]:text-white truncate text-sm">
                    {lead.customerName}
                </p>
                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 truncate flex items-center gap-1">
                    <FaBuilding className="text-[10px]" />
                    {lead.companyName || "No company"}
                </p>
            </div>

            {/* Contact Info */}
            <div className="text-xs text-gray-600 [.dark_&]:text-gray-300 space-y-1">
                {lead.contactNumber && (
                    <p className="flex items-center gap-1 truncate">
                        <FaPhone className="text-[10px] text-gray-400" />
                        {lead.contactNumber}
                    </p>
                )}
                {lead.email && (
                    <p className="flex items-center gap-1 truncate">
                        <FaEnvelope className="text-[10px] text-gray-400" />
                        {lead.email}
                    </p>
                )}
            </div>

            {/* Next Follow-up */}
            <div>
                {lead.followUpDate ? (
                    <span
                        className={`px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 w-fit ${followUpStatus === "overdue"
                            ? "bg-red-100 text-red-800 border-red-200 [.dark_&]:bg-red-500/10 [.dark_&]:text-red-400 [.dark_&]:border-red-500/30"
                            : followUpStatus === "today"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200 [.dark_&]:bg-yellow-500/10 [.dark_&]:text-yellow-400 [.dark_&]:border-yellow-500/30"
                                : "bg-green-100 text-green-800 border-green-200 [.dark_&]:bg-green-500/10 [.dark_&]:text-green-400 [.dark_&]:border-green-500/30"
                            }`}
                    >
                        <FaBell className="text-[8px]" />
                        {formatFollowUpDate(lead.followUpDate)}
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">-</span>
                )}
            </div>

            {/* Status Dropdown */}
            <div>
                <select
                    value={lead.status || ''}
                    onChange={(e) => {
                        e.stopPropagation();
                        if (onStatusChange) {
                            onStatusChange(lead.id, e.target.value);
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border cursor-pointer transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none capitalize ${getStatusColor(lead.status)}`}
                >
                    {statuses.map((s) => (
                        <option key={s} value={s.toLowerCase()} className="capitalize">
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            {/* Priority */}
            <div className="flex justify-center">
                <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 ${getPriorityColor(lead.priority)}`}
                >
                    <FaFlag className="text-[8px]" />
                    {lead.priority}
                </span>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onView(lead); }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-500/10 transition-colors"
                        title="View Details"
                    >
                        <FaEye className="text-xs" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 [.dark_&]:hover:bg-blue-500/10 transition-colors"
                        title="Edit Lead"
                    >
                        <FaEdit className="text-xs" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onScheduleFollowup(lead); }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 [.dark_&]:hover:bg-amber-500/10 transition-colors"
                        title="Add Follow-up"
                    >
                        <FaCalendarPlus className="text-xs" />
                    </button>
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 [.dark_&]:hover:bg-red-500/10 transition-colors"
                            title="Delete Lead"
                        >
                            <FaTrash className="text-xs" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadRow;

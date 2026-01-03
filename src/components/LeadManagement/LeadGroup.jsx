// src/components/LeadManagement/LeadGroup.jsx
import React, { useState, useEffect, useRef } from "react";
import {
    FaCaretDown,
    FaCaretRight,
    FaPlus,
    FaUser,
    FaPhone,
    FaBell,
    FaFlag,
    FaRupeeSign,
} from "react-icons/fa";
import LeadRow from "./LeadRow";

// Status color mapping
const getStatusHeaderColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "remaining" || s === "new") return { bg: "bg-blue-500", border: "border-blue-600" };
    if (s === "contacted") return { bg: "bg-purple-500", border: "border-purple-600" };
    if (s === "qualified") return { bg: "bg-indigo-500", border: "border-indigo-600" };
    if (s === "proposal") return { bg: "bg-yellow-500", border: "border-yellow-600" };
    if (s === "negotiation") return { bg: "bg-orange-500", border: "border-orange-600" };
    if (s === "converted") return { bg: "bg-green-500", border: "border-green-600" };
    if (s === "lost") return { bg: "bg-red-500", border: "border-red-600" };
    return { bg: "bg-gray-500", border: "border-gray-600" };
};

const LeadGroup = ({
    status,
    leads,
    selectedLeads,
    onToggleSelect,
    onView,
    onEdit,
    onScheduleFollowup,
    onAddLead,
    onStatusChange,
    onDelete,
    getFollowUpStatus,
    getPriorityColor,
    formatFollowUpDate,
    leadStatuses,
    showActions = true,
}) => {
    // Only expand by default if there are leads in this group
    const [isExpanded, setIsExpanded] = useState(leads && leads.length > 0);

    // Track previous leads length to auto-expand on addition
    const prevLeadsLength = useRef(leads ? leads.length : 0);

    useEffect(() => {
        // If leads count increased, expand the group
        if (leads && leads.length > prevLeadsLength.current) {
            setIsExpanded(true);
        }
        prevLeadsLength.current = leads ? leads.length : 0;
    }, [leads]);

    const colors = getStatusHeaderColor(status);

    // Calculate total potential value
    const totalValue = leads.reduce((acc, lead) => acc + (parseFloat(lead.potentialValue) || 0), 0);

    return (
        <div className="mb-6">
            {/* Group Header */}
            <div
                className="flex items-center justify-between mb-2 rounded hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center w-full">
                    <div
                        className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 flex-1"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span className="text-gray-400 text-xs">
                            {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
                        </span>
                        <span
                            className={`px-3 py-1 rounded text-xs font-bold uppercase text-white ${colors.bg}`}
                        >
                            {status}
                        </span>
                        <span className="bg-gray-200 [.dark_&]:bg-gray-700 px-2 py-0.5 rounded-full text-xs font-bold text-gray-600 [.dark_&]:text-gray-300">
                            {leads.length}
                        </span>
                        {totalValue > 0 && (
                            <span className="ml-2 bg-green-100 [.dark_&]:bg-green-500/20 text-green-700 [.dark_&]:text-green-400 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                <FaRupeeSign className="text-[10px]" />
                                {totalValue.toLocaleString()}
                            </span>
                        )}
                    </div>

                    {/* Add Lead Button */}
                    {onAddLead && (
                        <button
                            type="button"
                            title="Add Lead"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddLead(status);
                            }}
                            className="p-2 mr-2 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-500/10 transition-colors"
                        >
                            <FaPlus className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Group Body */}
            {isExpanded && (
                <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg shadow-sm overflow-hidden">
                    {/* Column Headers */}
                    <div
                        className={`grid ${showActions
                            ? "grid-cols-[30px_1fr_150px_120px_110px_80px_80px]"
                            : "grid-cols-[30px_1fr_150px_120px_110px_80px]"
                            } gap-4 px-4 py-3 bg-gray-50 [.dark_&]:bg-white/5 border-b border-gray-100 [.dark_&]:border-white/10 text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider`}
                    >
                        <div></div>
                        <div className="flex items-center gap-2">
                            <FaUser className="text-gray-400" />
                            <span>Customer / Company</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FaPhone className="text-gray-400" />
                            <span>Contact</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FaBell className="text-gray-400" />
                            <span>Follow-up</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Status</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <FaFlag className="text-gray-400" />
                            <span>Priority</span>
                        </div>
                        {showActions && (
                            <div className="flex items-center justify-center text-gray-400">
                                <span>Actions</span>
                            </div>
                        )}
                    </div>

                    {/* Lead Rows */}
                    {leads.length > 0 ? (
                        leads.map((lead) => (
                            <LeadRow
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedLeads.has(lead.id)}
                                onToggleSelect={onToggleSelect}
                                onView={onView}
                                onEdit={onEdit}
                                onScheduleFollowup={onScheduleFollowup}
                                onStatusChange={onStatusChange}
                                onDelete={onDelete}
                                getFollowUpStatus={getFollowUpStatus}
                                getPriorityColor={getPriorityColor}
                                formatFollowUpDate={formatFollowUpDate}
                                leadStatuses={leadStatuses}
                                showActions={showActions}
                            />
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-400 [.dark_&]:text-gray-500 text-sm">
                            No leads in this status
                        </div>
                    )}

                    {/* Quick Add Button */}
                    {onAddLead && (
                        <div
                            onClick={() => onAddLead(status)}
                            className="flex items-center gap-2 px-10 py-2 text-sm text-gray-400 [.dark_&]:text-gray-500 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 cursor-pointer transition-colors border-t border-gray-50 [.dark_&]:border-white/5"
                        >
                            <FaPlus className="text-xs" />
                            <span>New Lead</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadGroup;

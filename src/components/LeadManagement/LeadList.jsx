/**
 * LeadList Component
 *
 * Purpose: Multi-view component for displaying leads.
 * Supports table, kanban, and grouped view modes.
 *
 * Responsibilities:
 * - Render Table View with sortable columns and bulk actions
 * - Render Kanban View with drag-and-drop between statuses
 * - Render Grouped View with collapsible status groups
 * - Handle lead selection for bulk operations
 * - Provide inline status change dropdown
 * - Format follow-up dates from various input types
 *
 * Dependencies:
 * - @hello-pangea/dnd (drag and drop for kanban)
 * - react-icons (various)
 * - Button, Card (UI components)
 * - LeadGroup (grouped view component)
 *
 * Props:
 * - viewMode: 'table' | 'kanban' | 'grouped'
 * - currentRows: Paginated leads for table
 * - filteredLeads: All filtered leads
 * - selectedLeads: Set of selected IDs
 * - setSelectedLeads: Update selection
 * - leadStatuses/LEAD_STATUSES: Dynamic status options
 * - sortConfig: { key, direction }
 * - handleSort/handleDragEnd: Event handlers
 * - currentPage/rowsPerPage: Pagination state
 * - openProfile/openView/openEdit: Open handlers
 * - setShowScheduleFollowup/setScheduleFollowupForm: Follow-up handlers
 * - setSelectedLead/setShowDeleteModal: Delete handlers
 * - setShowBulkStatusModal/setShowBulkDeleteModal: Bulk action handlers
 * - getFollowUpStatus/getStatusColor/getPriorityColor: Color helpers
 * - onStatusChange: Inline status update handler
 * - onAddLeadWithStatus: Add lead with pre-set status
 *
 * Table Headers:
 * 1. Checkbox
 * 2. No. (index)
 * 3. Date (sortable)
 * 4. Customer Name (sortable, clickable)
 * 5. Company (sortable)
 * 6. Contact Info (email + phone)
 * 7. Next Follow-up (sortable)
 * 8. Status (sortable, inline dropdown)
 * 9. Priority (sortable)
 * 10. Actions
 *
 * Kanban Features:
 * - Drag-and-drop between columns
 * - Status-colored headers
 * - Total value per column
 * - Priority-colored left border
 *
 * Last Modified: 2026-01-10
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    FaSortAmountUpAlt,
    FaSortAmountDownAlt,
    FaEnvelope,
    FaPhone,
    FaBell,
    FaEye,
    FaEdit,
    FaCalendarAlt,
    FaTrash,
    FaFlag,
    FaBoxOpen,
    FaUserPlus,
    FaUser,
    FaBuilding
} from 'react-icons/fa';
import Button from '../Button';
import Card from '../Card';
import LeadGroup from './LeadGroup';

// Define table headers
const TABLE_HEADERS = [
    { key: "checkbox", label: "", sortable: false },
    { key: "index", label: "No.", sortable: false },
    { key: "date", label: "Date", sortable: true },
    { key: "customerName", label: "Customer Name", sortable: true },
    { key: "companyName", label: "Company", sortable: true },
    { key: "contact", label: "Contact Info", sortable: false }, // Combined email/phone
    // { key: "productOfInterest", label: "Product", sortable: true },
    { key: "followUpDate", label: "Next Follow-up", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "priority", label: "Priority", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
];

const LeadList = ({
    viewMode,
    currentRows,
    filteredLeads,
    selectedLeads,
    setSelectedLeads,
    leadStatuses,
    LEAD_STATUSES, // Pass the array of status strings
    sortConfig,
    handleSort,
    handleDragEnd,
    currentPage,
    rowsPerPage,

    // Handlers
    openProfile,
    openView,
    openEdit,
    setShowScheduleFollowup,
    setScheduleFollowupForm,
    setSelectedLead,
    setShowDeleteModal,
    setShowBulkStatusModal,
    setShowBulkDeleteModal,

    // Helpers
    getFollowUpStatus,
    getStatusColor,
    getPriorityColor,
    onStatusChange, // handler for inline status change
    onAddLeadWithStatus // handler for adding lead with pre-set status
}) => {
    // Helper to format followUpDate - handles Firestore Timestamp, Date object, or string
    const formatFollowUpDate = (date) => {
        if (!date) return '-';
        // Handle Firestore Timestamp (has seconds and nanoseconds)
        if (typeof date === 'object' && typeof date.seconds === 'number') {
            return new Date(date.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        // Handle Firestore Timestamp with toDate method
        if (typeof date?.toDate === 'function') {
            return date.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        // Handle Date object
        if (date instanceof Date) {
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        // Already a string, return as-is
        return String(date);
    };

    if (viewMode === "table") {
        return (
            <>
                {/* Bulk Actions Toolbar */}
                {selectedLeads.size > 0 && (
                    <div className="bg-indigo-50 [.dark_&]:bg-indigo-900/30 border border-indigo-200 [.dark_&]:border-indigo-500/30 rounded-xl p-4 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-indigo-700 [.dark_&]:text-indigo-300 font-medium">
                                {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected
                            </span>
                            <button
                                onClick={() => setSelectedLeads(new Set())}
                                className="text-indigo-600 [.dark_&]:text-indigo-400 hover:underline text-sm"
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowBulkStatusModal(true)}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <FaEdit className="text-sm" />
                                Change Status
                            </Button>
                            <Button
                                onClick={() => setShowBulkDeleteModal(true)}
                                variant="secondary"
                                className="flex items-center gap-2 text-red-600 [.dark_&]:text-red-400 border-red-200 [.dark_&]:border-red-500/30 hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                            >
                                <FaTrash className="text-sm" />
                                Delete Selected
                            </Button>
                        </div>
                    </div>
                )}

                <Card
                    title="Leads List"
                    actions={
                        <div className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">
                            Showing {filteredLeads?.length || 0} records
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-subtle [.dark_&]:bg-slate-800/60 border-b border-subtle">
                                <tr>
                                    {TABLE_HEADERS.map((h) => (
                                        <th
                                            key={h.key}
                                            onClick={() => h.sortable && handleSort(h.key)}
                                            className={`px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 [.dark_&]:text-gray-300 ${h.sortable ? 'cursor-pointer hover:bg-surface-strong' : ''} transition-colors`}
                                        >
                                            {h.key === "checkbox" ? (
                                                <input
                                                    type="checkbox"
                                                    checked={currentRows.length > 0 && currentRows.every(l => selectedLeads.has(l.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedLeads(new Set(currentRows.map(l => l.id)));
                                                        } else {
                                                            setSelectedLeads(new Set());
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {h.label}
                                                    {sortConfig.key === h.key &&
                                                        (sortConfig.direction === "asc" ? (
                                                            <FaSortAmountUpAlt className="text-indigo-500" />
                                                        ) : (
                                                            <FaSortAmountDownAlt className="text-indigo-500" />
                                                        ))}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-subtle">
                                {currentRows.map((lead, idx) => {
                                    const followUpStatus = getFollowUpStatus(lead.followUpDate);
                                    return (
                                        <tr
                                            key={lead.id}
                                            className={`hover:bg-surface-subtle [.dark_&]:hover:bg-slate-700/30 transition-colors ${selectedLeads.has(lead.id) ? 'bg-indigo-50 [.dark_&]:bg-indigo-900/20' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.has(lead.id)}
                                                    onChange={(e) => {
                                                        const newSelected = new Set(selectedLeads);
                                                        if (e.target.checked) {
                                                            newSelected.add(lead.id);
                                                        } else {
                                                            newSelected.delete(lead.id);
                                                        }
                                                        setSelectedLeads(newSelected);
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 [.dark_&]:text-white">
                                                {(currentPage - 1) * rowsPerPage + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                                                {lead.date || "-"}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 [.dark_&]:text-white">
                                                <button
                                                    onClick={() => openProfile(lead)}
                                                    className="text-indigo-600 [.dark_&]:text-indigo-400 hover:underline cursor-pointer text-left"
                                                >
                                                    {lead.customerName}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                                                {lead.companyName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                                                <div className="flex flex-col gap-1">
                                                    {lead.email && (
                                                        <span className="flex items-center gap-1">
                                                            <FaEnvelope className="text-xs" /> {lead.email}
                                                        </span>
                                                    )}
                                                    {lead.contactNumber && (
                                                        <span className="flex items-center gap-1">
                                                            <FaPhone className="text-xs" />{" "}
                                                            {lead.contactNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* <td className="px-4 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                                                {lead.productOfInterest || "-"}
                                            </td> */}
                                            <td className="px-4 py-3">
                                                {lead.followUpDate ? (
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${followUpStatus === "overdue"
                                                            ? "bg-red-100 text-red-800 border-red-200"
                                                            : followUpStatus === "today"
                                                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                                                : "bg-green-100 text-green-800 border-green-200"
                                                            }`}
                                                    >
                                                        <FaBell className="text-xs" />
                                                        {formatFollowUpDate(lead.followUpDate)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={lead.status || ''}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        if (onStatusChange) {
                                                            onStatusChange(lead.id, e.target.value);
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none capitalize ${getStatusColor(lead.status)}`}
                                                >
                                                    {(LEAD_STATUSES && LEAD_STATUSES.length > 0
                                                        ? LEAD_STATUSES
                                                        : ['remaining', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost']
                                                    ).map((s) => (
                                                        <option key={s} value={s.toLowerCase()} className="capitalize">
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                                                        lead.priority
                                                    )}`}
                                                >
                                                    {lead.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openView(lead)}
                                                        className="text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-800 p-1"
                                                        title="Quick View"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(lead)}
                                                        className="text-yellow-600 [.dark_&]:text-yellow-400 hover:text-yellow-800 p-1"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // We need to pass the schedule form updater or handle this upstream
                                                            // Ideally, pass a handler 'onScheduleFollowup(leadId)'
                                                            setScheduleFollowupForm(prev => ({ ...prev, leadId: lead.id }));
                                                            setShowScheduleFollowup(true);
                                                        }}
                                                        className="text-purple-600 [.dark_&]:text-purple-400 hover:text-purple-800 p-1"
                                                        title="Add Follow-up"
                                                    >
                                                        <FaCalendarAlt />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLead(lead);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="text-red-600 [.dark_&]:text-red-400 hover:text-red-800 p-1"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!currentRows.length && (
                                    <tr>
                                        <td
                                            colSpan="11"
                                            className="px-4 py-8 text-center text-gray-500 [.dark_&]:text-gray-400"
                                        >
                                            No leads found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </>
        );
    } else if (viewMode === "kanban") {
        // KANBAN VIEW
        // Default statuses if none are configured
        const DEFAULT_STATUSES = ['remaining', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'];
        const kanbanStatuses = LEAD_STATUSES && LEAD_STATUSES.length > 0
            ? LEAD_STATUSES.map(s => s.toLowerCase())
            : DEFAULT_STATUSES;

        return (
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-250px)]">
                    {kanbanStatuses.map((status) => {
                        const statusLeads = filteredLeads.filter((l) => l.status?.toLowerCase() === status.toLowerCase());
                        // Calculate Total Value
                        const statusValue = statusLeads.reduce((acc, l) => acc + (parseFloat(l.potentialValue) || 0), 0);

                        return (
                            <div
                                key={status}
                                className="min-w-[300px] w-[300px] flex flex-col h-full bg-white/50 [.dark_&]:bg-slate-800/60 rounded-xl border border-gray-200 [.dark_&]:border-white/10 overflow-hidden shadow-sm"
                            >
                                {/* Column Header */}
                                <div
                                    className={`p-3 border-b font-semibold flex justify-between items-center shrink-0
                                        ${status === 'remaining' || status === 'new' ? 'bg-blue-500 border-blue-600' :
                                            status === 'contacted' ? 'bg-purple-500 border-purple-600' :
                                                status === 'qualified' ? 'bg-indigo-500 border-indigo-600' :
                                                    status === 'proposal' ? 'bg-yellow-500 border-yellow-600' :
                                                        status === 'negotiation' ? 'bg-orange-500 border-orange-600' :
                                                            status === 'converted' ? 'bg-green-500 border-green-600' :
                                                                status === 'lost' ? 'bg-red-500 border-red-600' :
                                                                    'bg-gray-500 border-gray-600'}
                                        text-white
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="capitalize text-sm font-bold">{status}</span>
                                        <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-bold">
                                            {statusLeads.length}
                                        </span>
                                    </div>
                                    {statusValue > 0 && (
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                                            ₹{statusValue.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {/* Droppable Area */}
                                <Droppable droppableId={status}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`p-3 flex-1 overflow-y-auto scrollbar-thin space-y-3 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50 [.dark_&]:bg-indigo-900/10" : ""
                                                }`}
                                        >
                                            {statusLeads.map((lead, index) => (
                                                <Draggable
                                                    key={lead.id}
                                                    draggableId={lead.id}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`group relative bg-white [.dark_&]:bg-[#1E2235] p-4 rounded-xl border-l-4 border transition-all cursor-move shadow-sm
                                ${snapshot.isDragging ? "shadow-xl ring-2 ring-indigo-500 z-50 rotate-1" : ""}
                                ${lead.priority === 'Urgent' ? 'border-l-red-600 border-red-200 [.dark_&]:border-red-500/30' :
                                                                    lead.priority === 'High' ? 'border-l-orange-500 border-orange-200 [.dark_&]:border-orange-500/30' :
                                                                        lead.priority === 'Medium' ? 'border-l-yellow-500 border-yellow-200 [.dark_&]:border-yellow-500/30' :
                                                                            'border-l-green-500 border-green-200 [.dark_&]:border-green-500/30'}
                                hover:shadow-md hover:translate-y-[-2px]
                              `}
                                                            onClick={() => openView(lead)}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                            }}
                                                        >
                                                            {/* Header: Name + Priority */}
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-gray-900 [.dark_&]:text-white text-sm truncate">
                                                                        {lead.customerName}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                                                        <FaBuilding className="text-[10px]" />
                                                                        {lead.companyName || 'No company'}
                                                                    </p>
                                                                </div>
                                                                <span className={`shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] uppercase font-bold tracking-wide ${getPriorityColor(lead.priority)}`}>
                                                                    <FaFlag className="text-[8px]" /> {lead.priority}
                                                                </span>
                                                            </div>

                                                            {/* Contact Info */}
                                                            <div className="flex flex-wrap items-center gap-2 text-[11px] mb-2">
                                                                {lead.contactNumber && (
                                                                    <span className="rounded-md px-2 py-1 bg-gray-50 [.dark_&]:bg-gray-700/50 text-gray-600 [.dark_&]:text-gray-300 flex items-center gap-1 font-medium">
                                                                        <FaPhone className="text-[10px]" />
                                                                        <span className="truncate max-w-[100px]">{lead.contactNumber}</span>
                                                                    </span>
                                                                )}
                                                                <span className="rounded-md px-2 py-1 bg-blue-50 [.dark_&]:bg-blue-500/10 text-blue-600 [.dark_&]:text-blue-400 flex items-center gap-1 font-medium ml-auto">
                                                                    <FaCalendarAlt className="text-[10px]" />
                                                                    {lead.date || "Just now"}
                                                                </span>
                                                            </div>

                                                            {/* Next Follow-up Date */}
                                                            {lead.followUpDate && (
                                                                <div className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 mb-2 ${getFollowUpStatus(lead.followUpDate) === 'overdue'
                                                                    ? 'bg-red-50 [.dark_&]:bg-red-500/10 text-red-600 [.dark_&]:text-red-400'
                                                                    : getFollowUpStatus(lead.followUpDate) === 'today'
                                                                        ? 'bg-amber-50 [.dark_&]:bg-amber-500/10 text-amber-600 [.dark_&]:text-amber-400'
                                                                        : 'bg-green-50 [.dark_&]:bg-green-500/10 text-green-600 [.dark_&]:text-green-400'
                                                                    }`}>
                                                                    <FaBell className="text-[10px]" />
                                                                    <span className="font-medium">Follow-up: {formatFollowUpDate(lead.followUpDate)}</span>
                                                                </div>
                                                            )}

                                                            {/* Potential Value & Quick Actions */}
                                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 [.dark_&]:border-white/5">
                                                                {lead.potentialValue && parseFloat(lead.potentialValue) > 0 ? (
                                                                    <span className="text-xs font-bold text-green-600 [.dark_&]:text-green-400">
                                                                        ₹{parseFloat(lead.potentialValue).toLocaleString()}
                                                                    </span>
                                                                ) : (
                                                                    <span></span>
                                                                )}

                                                                {/* Quick Actions - show on hover */}
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openView(lead); }}
                                                                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-500/10 transition-colors"
                                                                        title="View Details"
                                                                    >
                                                                        <FaEye className="text-xs" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openEdit(lead); }}
                                                                        className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 [.dark_&]:hover:bg-blue-500/10 transition-colors"
                                                                        title="Edit Lead"
                                                                    >
                                                                        <FaEdit className="text-xs" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedLead(lead);
                                                                            setScheduleFollowupForm({ leadId: lead.id });
                                                                            setShowScheduleFollowup(true);
                                                                        }}
                                                                        className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 [.dark_&]:hover:bg-amber-500/10 transition-colors"
                                                                        title="Schedule Follow-up"
                                                                    >
                                                                        <FaBell className="text-xs" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {statusLeads.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="h-24 border-2 border-dashed border-gray-200 [.dark_&]:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                                    <span className="text-xs">No leads</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        );
    } else if (viewMode === "grouped") {
        // GROUPED VIEW
        // Default statuses if none are configured
        const DEFAULT_STATUSES = ['remaining', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'];
        const groupedStatuses = LEAD_STATUSES && LEAD_STATUSES.length > 0
            ? LEAD_STATUSES.map(s => s.toLowerCase())
            : DEFAULT_STATUSES;

        // Helper function to handle schedule follow-up for grouped view
        const handleScheduleFollowup = (lead) => {
            setSelectedLead(lead);
            setScheduleFollowupForm({ leadId: lead.id });
            setShowScheduleFollowup(true);
        };

        const handleDeleteLead = (lead) => {
            setSelectedLead(lead);
            setShowDeleteModal(true);
        };

        return (
            <div className="space-y-4">
                {/* Bulk Actions Toolbar */}
                {selectedLeads.size > 0 && (
                    <div className="bg-indigo-50 [.dark_&]:bg-indigo-900/30 border border-indigo-200 [.dark_&]:border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-indigo-700 [.dark_&]:text-indigo-300 font-medium">
                                {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected
                            </span>
                            <button
                                onClick={() => setSelectedLeads(new Set())}
                                className="text-indigo-600 [.dark_&]:text-indigo-400 hover:underline text-sm"
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowBulkStatusModal(true)}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <FaEdit className="text-sm" />
                                Change Status
                            </Button>
                            <Button
                                onClick={() => setShowBulkDeleteModal(true)}
                                variant="secondary"
                                className="flex items-center gap-2 text-red-600 [.dark_&]:text-red-400 border-red-200 [.dark_&]:border-red-500/30 hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                            >
                                <FaTrash className="text-sm" />
                                Delete Selected
                            </Button>
                        </div>
                    </div>
                )}

                {/* Grouped Lead Lists */}
                {groupedStatuses.map((status) => {
                    const statusLeads = filteredLeads.filter((l) => l.status?.toLowerCase() === status.toLowerCase());

                    if (statusLeads.length === 0) return null;

                    return (
                        <LeadGroup
                            key={status}
                            status={status}
                            leads={statusLeads}
                            selectedLeads={selectedLeads}
                            onToggleSelect={(id) => {
                                const newSelected = new Set(selectedLeads);
                                if (newSelected.has(id)) {
                                    newSelected.delete(id);
                                } else {
                                    newSelected.add(id);
                                }
                                setSelectedLeads(newSelected);
                            }}
                            onView={openView}
                            onEdit={openEdit}
                            onScheduleFollowup={handleScheduleFollowup}
                            onAddLead={onAddLeadWithStatus}
                            onStatusChange={onStatusChange}
                            onDelete={handleDeleteLead}
                            getFollowUpStatus={getFollowUpStatus}
                            getPriorityColor={getPriorityColor}
                            formatFollowUpDate={formatFollowUpDate}
                            leadStatuses={LEAD_STATUSES}
                            showActions={true}
                        />
                    );
                })}
            </div>
        );
    }
};

export default LeadList;

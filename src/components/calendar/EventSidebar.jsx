/**
 * EventSidebar Component
 *
 * Purpose: Displays detailed event list for a selected date in the calendar.
 * Shows event cards with actions for edit, delete, approve, and cancel.
 *
 * Responsibilities:
 * - Display formatted date header
 * - Show list of events for selected date
 * - Provide action buttons for event management
 * - Show priority badges and client information
 * - Display empty state when no events
 *
 * Dependencies:
 * - colorMaps (getPriorityBadge for priority styling)
 * - react-icons (action icons)
 *
 * Props:
 * - selectedDate: Date object for the displayed day
 * - events: Array of events for the selected date
 * - onEdit: Callback to edit an event
 * - onDelete: Callback to delete an event
 * - onApprove: Callback to approve a pending event
 * - onCancel: Callback to cancel an event
 *
 * Event Card Contents:
 * - Title and time
 * - Event type badge
 * - Client name (if applicable)
 * - Priority badge
 * - Description (truncated)
 * - Approval actions (for pending non-task events)
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { FaCalendarAlt, FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import { getPriorityBadge } from "../../utils/colorMaps";

const EventSidebar = ({
    selectedDate,
    events,
    onEdit,
    onDelete,
    onApprove,
    onCancel
}) => {
    // FORMAT: Display date in readable format
    const formattedDate = selectedDate
        ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
        : "Select a date";

    // EMPTY STATE: Show prompt when no date selected
    if (!selectedDate) {
        return (
            <div className="p-4 text-center text-gray-500">
                <FaCalendarAlt size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a date to view details</p>
            </div>
        );
    }

    return (
        <div className="p-4 h-full flex flex-col">
            {/* DATE HEADER */}
            <h3 className="font-semibold text-lg mb-4 border-b pb-2">{formattedDate}</h3>

            {/* EVENT LIST */}
            <div className="space-y-3 flex-1 overflow-y-auto">
                {events.length === 0 ? (
                    // EMPTY STATE: No events for this date
                    <div className="text-center py-8 text-gray-500">
                        No events on this date.
                    </div>
                ) : (
                    events.map((event) => {
                        const isTask = event.isTask;
                        const isAdmin = event.createdBy === "admin";

                        return (
                            <div key={event.id} className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                                {/* EVENT HEADER: Title and actions */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-sm">{event.title}</h4>
                                        <span className="text-xs text-gray-500 block">
                                            {event.time} • {event.type}
                                        </span>
                                    </div>
                                    {/* ACTIONS: Edit/Delete for non-task events */}
                                    {!isTask && (
                                        <div className="flex gap-1">
                                            <button onClick={() => onEdit(event)} className="text-blue-600 p-1 hover:bg-blue-50 rounded" title="Edit">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => onDelete(event.id)} className="text-red-600 p-1 hover:bg-red-50 rounded" title="Delete">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* EVENT DETAILS */}
                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    {event.clientName && <div>Client: {event.clientName}</div>}
                                    {/* PRIORITY BADGE */}
                                    {event.priority && (
                                        <span className={`inline-block px-2 py-0.5 rounded ${getPriorityBadge(event.priority)}`}>
                                            {event.priority}
                                        </span>
                                    )}
                                    {/* DESCRIPTION: Truncated to 2 lines */}
                                    {event.description && (
                                        <p className="text-gray-500 italic mt-1 line-clamp-2">{event.description}</p>
                                    )}
                                </div>

                                {/* APPROVAL ACTIONS: For pending events only */}
                                {/* BUSINESS RULE: Tasks and admin-created events don't need approval */}
                                {event.status === "pending" && !isTask && !isAdmin && (
                                    <div className="flex gap-2 mt-2 pt-2 border-t">
                                        <button onClick={() => onApprove(event.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200">
                                            <FaCheck /> Approve
                                        </button>
                                        <button onClick={() => onCancel(event.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-red-200">
                                            <FaTimes /> Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default EventSidebar;
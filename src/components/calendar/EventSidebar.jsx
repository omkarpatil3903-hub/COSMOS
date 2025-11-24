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
    const formattedDate = selectedDate
        ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
        : "Select a date";

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
            <h3 className="font-semibold text-lg mb-4 border-b pb-2">{formattedDate}</h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
                {events.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No events on this date.
                    </div>
                ) : (
                    events.map((event) => {
                        const isTask = event.isTask;
                        const isAdmin = event.createdBy === "admin";

                        return (
                            <div key={event.id} className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-sm">{event.title}</h4>
                                        <span className="text-xs text-gray-500 block">
                                            {event.time} • {event.type}
                                        </span>
                                    </div>
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

                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    {event.clientName && <div>Client: {event.clientName}</div>}
                                    {event.priority && (
                                        <span className={`inline-block px-2 py-0.5 rounded ${getPriorityBadge(event.priority)}`}>
                                            {event.priority}
                                        </span>
                                    )}
                                    {event.description && (
                                        <p className="text-gray-500 italic mt-1 line-clamp-2">{event.description}</p>
                                    )}
                                </div>

                                {/* Approval Actions for Pending Events */}
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
/**
 * ClientTableRow Component
 *
 * Purpose: Renders a single row in the clients table.
 * Displays client info with edit/delete action buttons.
 *
 * Responsibilities:
 * - Display client avatar (image or initial)
 * - Show client details in table cells
 * - Handle row click for view modal
 * - Provide edit/delete action buttons
 *
 * Dependencies:
 * - react-icons (edit, trash icons)
 *
 * Props:
 * - client: Client object to display
 * - index: Row index for numbering
 * - onEdit: Edit callback with client ID
 * - onDelete: Delete callback with client ID
 * - onView: View callback with client ID
 *
 * Table Columns:
 * - #: Row number (1-indexed)
 * - Avatar: Image or initial badge
 * - Company Name: Truncated text
 * - Client Name: Truncated text
 * - Email: Truncated text
 * - Contact No: Phone number
 * - Business Type: Badge with truncated text
 * - Employees: Green badge with count
 * - Actions: Edit/Delete buttons (sticky right)
 *
 * Interactions:
 * - Row click triggers onView
 * - Edit/Delete buttons stop propagation
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { FaEdit, FaEye, FaTrash } from "react-icons/fa";

const ClientTableRow = ({ client, index, onEdit, onDelete, onView }) => {
    return (
        <tr
            className="bg-white [.dark_&]:bg-[#181B2A] hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer transition-colors"
            onClick={() => onView(client.id)}
        >
            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 [.dark_&]:bg-white/10 text-xs text-gray-700 [.dark_&]:text-gray-300">
                    {index + 1}
                </div>
            </td>
            <td className="whitespace-nowrap px-2 py-3">
                {client.imageUrl ? (
                    <img
                        src={client.imageUrl}
                        alt={client.companyName}
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 [.dark_&]:border-white/10"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs border border-white/20">
                        {client.companyName?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                )}
            </td>
            <td className="px-3 py-3 text-sm font-semibold text-gray-900 [.dark_&]:text-white max-w-xs">
                <span className="block truncate" title={client.companyName || ""}>
                    {client.companyName}
                </span>
            </td>
            <td className="px-3 py-3 text-sm font-semibold text-gray-900 [.dark_&]:text-white max-w-xs">
                <span className="block truncate" title={client.clientName || ""}>
                    {client.clientName}
                </span>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300 max-w-xs">
                <div className="flex items-center max-w-xs">
                    <span className="flex-1 min-w-0 truncate" title={client.email || ""}>
                        {client.email}
                    </span>
                </div>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300">
                {client.contactNo || "-"}
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300 max-w-xs">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-300 max-w-xs">
                    <span
                        className="block truncate"
                        title={client.typeOfBusiness || "Not specified"}
                    >
                        {client.typeOfBusiness || "Not specified"}
                    </span>
                </span>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 [.dark_&]:text-gray-300 text-center">
                {client.noOfEmployees ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-300">
                        {client.noOfEmployees}
                    </span>
                ) : (
                    "-"
                )}
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-sm sticky right-0 z-10 bg-white [.dark_&]:bg-[#181B2A]">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(client.id);
                        }}
                        className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 [.dark_&]:hover:bg-yellow-500/10 shadow-md"
                        title="Edit Client"
                    >
                        <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(client.id);
                        }}
                        className="p-2 rounded-full text-red-600 hover:bg-red-100 [.dark_&]:hover:bg-red-500/10 shadow-md"
                        title="Delete Client"
                    >
                        <FaTrash className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default ClientTableRow;
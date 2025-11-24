import React from "react";
import { FaEdit, FaEye, FaTrash } from "react-icons/fa";

const ClientTableRow = ({ client, index, onEdit, onDelete, onView }) => {
    return (
        <tr className="bg-white hover:bg-gray-50">
            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-500">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs">
                    {index + 1}
                </div>
            </td>
            <td className="whitespace-nowrap px-2 py-3">
                {client.imageUrl ? (
                    <img
                        src={client.imageUrl}
                        alt={client.companyName}
                        className="h-10 w-10 rounded-full object-cover border border-gray-200"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                        {client.companyName?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                )}
            </td>
            <td className="px-3 py-3 text-sm font-semibold text-gray-900 max-w-xs">
                <span className="block truncate" title={client.companyName || ""}>
                    {client.companyName}
                </span>
            </td>
            <td className="px-3 py-3 text-sm font-semibold text-gray-900 max-w-xs">
                <span className="block truncate" title={client.clientName || ""}>
                    {client.clientName}
                </span>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 max-w-xs">
                <div className="flex items-center max-w-xs">
                    <span className="flex-1 min-w-0 truncate" title={client.email || ""}>
                        {client.email}
                    </span>
                </div>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600">
                {client.contactNo || "-"}
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 max-w-xs">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 max-w-xs">
                    <span
                        className="block truncate"
                        title={client.typeOfBusiness || "Not specified"}
                    >
                        {client.typeOfBusiness || "Not specified"}
                    </span>
                </span>
            </td>
            <td className="px-3 py-3 text-sm text-gray-600 text-center">
                {client.noOfEmployees ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {client.noOfEmployees}
                    </span>
                ) : (
                    "-"
                )}
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-sm sticky right-0 z-10 bg-white">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onView(client.id)}
                        className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 shadow-md"
                        title="View Details"
                    >
                        <FaEye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onEdit(client.id)}
                        className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md"
                        title="Edit Client"
                    >
                        <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(client.id)}
                        className="p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md"
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
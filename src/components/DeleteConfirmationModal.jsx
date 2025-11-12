// src/components/DeleteConfirmationModal.jsx
import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

function DeleteConfirmationModal({ onClose, onConfirm, itemType = "item" }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <FaExclamationTriangle className="text-red-600 text-xl" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h2>
          <p className="text-gray-600 text-sm">
            Are you sure you want to delete this {itemType}?
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="py-2 px-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;

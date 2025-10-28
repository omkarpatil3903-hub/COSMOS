// src/components/DeleteConfirmationModal.jsx
import React from "react";

function DeleteConfirmationModal({ onClose, onConfirm, itemType = "item" }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-4">
      <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h2>
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this {itemType}? This action cannot be
        undone.
      </p>
      <div className="flex justify-end gap-4">
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
          className="py-2 px-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;

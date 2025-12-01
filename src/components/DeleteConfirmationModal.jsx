// src/components/DeleteConfirmationModal.jsx
import React from "react";
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";

function DeleteConfirmationModal({
  onClose,
  onConfirm,
  itemType = "item",
  title,
  description,
  itemTitle,
  itemSubtitle,
  cancelLabel = "Cancel",
  confirmLabel = "Delete",
  permanentMessage,
  isLoading = false,
}) {
  const heading = title || "Confirm Deletion";
  const mainDescription =
    description || `Are you sure you want to delete this ${itemType}?`;
  const secondaryMessage = permanentMessage || "This action cannot be undone.";

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <FaExclamationTriangle className="text-red-600 text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{heading}</h2>
          {itemTitle && (
            <div className="mb-2 max-w-full">
              <p className="text-sm font-semibold text-gray-900 truncate" title={itemTitle}>
                {itemTitle}
              </p>
              {itemSubtitle && (
                <p className="text-xs text-gray-600 mt-0.5 truncate" title={itemSubtitle}>
                  {itemSubtitle}
                </p>
              )}
            </div>
          )}
          <p className="text-gray-600 text-sm break-words">{mainDescription}</p>
          <p className="text-gray-500 text-xs mt-2 break-words">{secondaryMessage}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="py-2 px-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading && (
            <FaSpinner className="inline-block mr-2 h-4 w-4 animate-spin" />
          )}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;

// src/components/CategoryModal.jsx
import React, { useState, useEffect } from "react";
import Button from "./Button";

function CategoryModal({ onClose, onSave, itemToEdit, categoryName }) {
  const [nameMarathi, setNameMarathi] = useState("");
  const [nameEnglish, setNameEnglish] = useState("");

  useEffect(() => {
    if (itemToEdit) {
      setNameMarathi(itemToEdit.nameMarathi || "");
      setNameEnglish(itemToEdit.nameEnglish || "");
    }
  }, [itemToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: itemToEdit?.id, nameMarathi, nameEnglish });
  };

  const title = itemToEdit
    ? `Edit ${categoryName}`
    : `Create New ${categoryName}`;

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name (Marathi)
            </label>
            <input
              type="text"
              value={nameMarathi}
              onChange={(e) => setNameMarathi(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name (English)
            </label>
            <input
              type="text"
              value={nameEnglish}
              onChange={(e) => setNameEnglish(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;

// src/components/UserModal.jsx
import React, { useState, useEffect } from "react";

const villageOptions = ["Sunrise Valley", "Green Meadows"];
const boothOptions = [101, 102, 103];

// The modal now accepts an optional userToEdit prop
function UserModal({ onClose, onSave, userToEdit }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [village, setVillage] = useState("");
  const [booth, setBooth] = useState("");
  const [status, setStatus] = useState("Active");

  // This effect runs when the modal opens to pre-fill the form if we are editing
  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setMobile(userToEdit.mobile || "");
      setVillage(userToEdit.village || "");
      setBooth(userToEdit.booth || "");
      setStatus(userToEdit.status || "Active");
    }
  }, [userToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the original user's ID if we are editing
    onSave({ id: userToEdit?.id, name, mobile, village, booth, status });
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        {/* The title is now dynamic */}
        <h2 className="text-xl font-bold mb-4">
          {userToEdit ? "Edit User" : "Create New User"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields are the same */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Village
            </label>
            <select
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="" disabled>
                Select Village
              </option>
              {villageOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Booth
            </label>
            <select
              value={booth}
              onChange={(e) => setBooth(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="" disabled>
                Select Booth
              </option>
              {boothOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700"
            >
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;

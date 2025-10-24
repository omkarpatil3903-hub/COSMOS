// src/components/MasterCategory.jsx
import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";

import Card from "./Card";
import Button from "./Button";
import CategoryModal from "./CategoryModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import SkeletonRow from "./SkeletonRow"; // Import the skeleton component

function MasterCategory({ title, initialData }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Simulate fetching data for this category
  useEffect(() => {
    setTimeout(() => {
      setItems(initialData);
      setLoading(false);
    }, 1000); // 1-second delay
  }, [initialData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (itemData) => {
    if (itemData.id) {
      setItems(
        items.map((i) => (i.id === itemData.id ? { ...i, ...itemData } : i))
      );
      toast.success(`${title} updated successfully!`);
    } else {
      const newItem = { ...itemData, id: Date.now() };
      setItems([...items, newItem]);
      toast.success(`${title} created successfully!`);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    setItems(items.filter((i) => i.id !== deletingItem.id));
    toast.error(`${title} deleted.`);
    setIsDeleteModalOpen(false);
  };

  return (
    <Card
      title={title}
      actions={
        <Button onClick={handleOpenCreate} disabled={loading}>
          Create New
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sr. No.
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name (Marathi)
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name (English)
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? // Show skeleton rows while loading
                Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} columns={4} />
                ))
              : // Show data once loaded
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 odd:bg-white even:bg-slate-50"
                  >
                    <td className="py-4 px-4 whitespace-nowrap">{index + 1}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {item.nameMarathi}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {item.nameEnglish}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 transition-colors"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1 transition-colors"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-500">
                  No entries found. Click "Create New" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CategoryModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          itemToEdit={editingItem}
          categoryName={title}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          user={{ name: deletingItem.nameEnglish }}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </Card>
  );
}
export default MasterCategory;

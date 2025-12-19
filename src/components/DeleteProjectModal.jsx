import React from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "./Button";

const DeleteProjectModal = ({
  showDeleteModal,
  setShowDeleteModal,
  selectedProject,
  setSelectedProject,
  handleDelete,
}) => {
  if (!showDeleteModal || !selectedProject) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-md relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 [.dark_&]:text-white">
              Delete Project
            </h2>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedProject(null);
              }}
              className="text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300 transition-colors"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 [.dark_&]:text-gray-300 mb-6">
            Are you sure you want to delete the project "
            {selectedProject.projectName}"? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedProject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleDelete(selectedProject.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectModal;

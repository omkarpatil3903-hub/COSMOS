import React, { useEffect, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import Button from "../Button";
import { db } from "../../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useThemeStyles } from "../../hooks/useThemeStyles";

function ManageFoldersModal({ isOpen, onClose }) {
    const { buttonClass } = useThemeStyles();
    const [folders, setFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState("");
    const [editingFolder, setEditingFolder] = useState(null);
    const [editedName, setEditedName] = useState("");

    // Load folders from Firestore
    useEffect(() => {
        if (!isOpen) return;

        const foldersDocRef = doc(db, "documents", "folders");
        const unsub = onSnapshot(foldersDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFolders(data.folderNames || []);
            } else {
                setFolders([]);
            }
        }, (error) => {
            console.error("Error fetching folders:", error);
            setFolders([]);
        });
        return () => unsub();
    }, [isOpen]);

    const handleAddFolder = async () => {
        const trimmedName = newFolderName.trim();
        if (!trimmedName) return;

        if (folders.includes(trimmedName)) {
            alert("Folder already exists!");
            return;
        }

        try {
            const foldersDocRef = doc(db, "documents", "folders");
            const updatedFolders = [...folders, trimmedName].sort();

            await setDoc(foldersDocRef, {
                folderNames: updatedFolders,
                updatedAt: new Date().toISOString()
            });

            setNewFolderName("");
        } catch (error) {
            console.error("Error adding folder:", error);
            alert("Failed to add folder. Please try again.");
        }
    };

    const handleDeleteFolder = async (folderName) => {
        if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
            return;
        }

        try {
            const foldersDocRef = doc(db, "documents", "folders");
            const updatedFolders = folders.filter(f => f !== folderName);

            await setDoc(foldersDocRef, {
                folderNames: updatedFolders,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert("Failed to delete folder. Please try again.");
        }
    };

    const handleStartEdit = (folderName) => {
        setEditingFolder(folderName);
        setEditedName(folderName);
    };

    const handleSaveEdit = async () => {
        const trimmedName = editedName.trim();
        if (!trimmedName) return;

        if (trimmedName !== editingFolder && folders.includes(trimmedName)) {
            alert("Folder already exists!");
            return;
        }

        try {
            const foldersDocRef = doc(db, "documents", "folders");
            const updatedFolders = folders.map(f => f === editingFolder ? trimmedName : f).sort();

            await setDoc(foldersDocRef, {
                folderNames: updatedFolders,
                updatedAt: new Date().toISOString()
            });

            setEditingFolder(null);
            setEditedName("");
        } catch (error) {
            console.error("Error editing folder:", error);
            alert("Failed to edit folder. Please try again.");
        }
    };

    const handleCancelEdit = () => {
        setEditingFolder(null);
        setEditedName("");
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 [.dark_&]:border-white/10">
                    <h2 className="text-xl font-semibold text-gray-900 [.dark_&]:text-white">Manage Folders</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300">
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Add New Folder */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name..."
                            className="flex-1 rounded-lg border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
                        />
                        <button
                            onClick={handleAddFolder}
                            disabled={!newFolderName.trim()}
                            className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${newFolderName.trim() ? buttonClass + ' hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            Add
                        </button>
                    </div>

                    {/* Folder List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 [.dark_&]:text-gray-300">Existing Folders</h3>
                        {folders.length === 0 ? (
                            <p className="text-sm text-gray-500 [.dark_&]:text-gray-400 text-center py-4">No folders yet</p>
                        ) : (
                            <div className="space-y-2">
                                {folders.map((folder) => (
                                    <div
                                        key={folder}
                                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-[#1F2234]"
                                    >
                                        {editingFolder === folder ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="flex-1 rounded border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-1 px-2 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-1.5 rounded hover:bg-green-100 [.dark_&]:hover:bg-green-900/20 text-green-600 [.dark_&]:text-green-400"
                                                    title="Save"
                                                >
                                                    <FaCheck className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1.5 rounded hover:bg-gray-200 [.dark_&]:hover:bg-gray-700 text-gray-600 [.dark_&]:text-gray-400"
                                                    title="Cancel"
                                                >
                                                    <FaTimes className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 text-sm font-medium text-gray-900 [.dark_&]:text-white">{folder}</span>
                                                <button
                                                    onClick={() => handleStartEdit(folder)}
                                                    className="p-1.5 rounded hover:bg-indigo-100 [.dark_&]:hover:bg-indigo-900/20 text-indigo-600 [.dark_&]:text-indigo-400"
                                                    title="Edit"
                                                >
                                                    <FaEdit className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFolder(folder)}
                                                    className="p-1.5 rounded hover:bg-red-100 [.dark_&]:hover:bg-red-900/20 text-red-600 [.dark_&]:text-red-400"
                                                    title="Delete"
                                                >
                                                    <FaTrash className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-gray-200 [.dark_&]:border-white/10">
                    <Button onClick={onClose} variant="ghost">Close</Button>
                </div>
            </div>
        </div>
    );
}

export default ManageFoldersModal;

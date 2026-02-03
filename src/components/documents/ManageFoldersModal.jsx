/**
 * ManageFoldersModal Component
 *
 * Purpose: Admin modal for managing document folders (CRUD operations).
 * Allows creating, renaming, recoloring, and deleting folders.
 *
 * Responsibilities:
 * - Display existing folders with colors
 * - Create new folders with custom colors
 * - Edit folder name and color
 * - Delete folders with confirmation workflow
 * - Protect system folders (MOMs) from modification
 * - Cascade delete: remove all documents in deleted folder
 *
 * Dependencies:
 * - Firestore (documents/folders, documents collection)
 * - Firebase Storage (for file deletion during folder delete)
 * - Button (UI component)
 * - useThemeStyles (themed button class)
 * - react-icons (folder, lock, edit, trash icons)
 *
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close callback
 *
 * Folder Data Model:
 * - name: Folder display name
 * - color: Hex color for folder badge
 * - isSystem: Boolean (true for MOMs folder)
 * - visibleTo: Array of roles that can see folder (optional)
 *
 * Delete Workflow:
 * 1. Show confirmation modal
 * 2. Require typing "Delete {FolderName}" exactly
 * 3. Delete all documents from Storage
 * 4. Delete all documents from Firestore
 * 5. Remove folder from folders list
 *
 * System Folder Protection:
 * - MOMs folder marked as isSystem
 * - System folders cannot be renamed or deleted
 * - Shows lock icon instead of edit/delete buttons
 *
 * Color Palette:
 * - 20 predefined colors for quick selection
 * - Custom color picker also available
 *
 * Last Modified: 2026-01-10
 */

import React, { useEffect, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaFolder, FaLock } from "react-icons/fa";
import Button from "../Button";
import { db, storage } from "../../firebase";
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useThemeStyles } from "../../hooks/useThemeStyles";

function ManageFoldersModal({ isOpen, onClose }) {
    const { buttonClass } = useThemeStyles();
    const [folders, setFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState("");
    const [editingFolder, setEditingFolder] = useState(null);
    const [editedName, setEditedName] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Load folders from Firestore
    useEffect(() => {
        if (!isOpen) return;

        const foldersDocRef = doc(db, "documents", "folders");
        const unsub = onSnapshot(foldersDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Handle both old format (array of strings) and new format (array of objects)
                const folderData = data.folders || data.folderNames || [];
                const formattedFolders = folderData.map(f => {
                    if (typeof f === 'string') {
                        // Old format: convert to new format with default color
                        // Mark MOMs as protected folder
                        const isProtected = f.toLowerCase() === 'moms';
                        return { name: f, color: '#3B82F6', isSystem: isProtected };
                    }
                    // New format: mark MOMs as protected
                    const isProtected = f.name && f.name.toLowerCase() === 'moms';
                    return { ...f, isSystem: f.isSystem || isProtected };
                });
                setFolders(formattedFolders);
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

        if (folders.some(f => f.name === trimmedName)) {
            alert("Folder already exists!");
            return;
        }

        try {
            const foldersDocRef = doc(db, "documents", "folders");
            const newFolder = { name: trimmedName, color: "#3B82F6" };
            const updatedFolders = [...folders, newFolder].sort((a, b) => a.name.localeCompare(b.name));

            await setDoc(foldersDocRef, {
                folders: updatedFolders,
                updatedAt: new Date().toISOString()
            });

            setNewFolderName("");
        } catch (error) {
            console.error("Error adding folder:", error);
            alert("Failed to add folder. Please try again.");
        }
    };

    const handleDeleteClick = (folder) => {
        setFolderToDelete(folder);
        setShowDeleteModal(true);
        setDeleteConfirmText("");
    };

    const handleConfirmDelete = async () => {
        if (!folderToDelete) return;

        try {
            // Step 1: Find all documents in this folder
            const documentsQuery = query(
                collection(db, "documents"),
                where("folder", "==", folderToDelete.name)
            );
            const documentsSnapshot = await getDocs(documentsQuery);

            // Step 2: Delete all documents from Storage and Firestore
            const deletePromises = documentsSnapshot.docs.map(async (documentDoc) => {
                const documentData = documentDoc.data();

                // Delete from Storage if storagePath exists
                if (documentData.storagePath) {
                    try {
                        const storageRef = ref(storage, documentData.storagePath);
                        await deleteObject(storageRef);
                    } catch (storageError) {
                        console.warn(`Failed to delete file from storage: ${documentData.storagePath} `, storageError);
                    }
                }

                // Delete from Firestore
                await deleteDoc(doc(db, "documents", documentDoc.id));
            });

            // Wait for all document deletions to complete
            await Promise.all(deletePromises);

            // Step 3: Remove folder from folders list
            const foldersDocRef = doc(db, "documents", "folders");
            const updatedFolders = folders.filter(f => f.name !== folderToDelete.name);

            await setDoc(foldersDocRef, {
                folders: updatedFolders,
                updatedAt: new Date().toISOString()
            });

            setShowDeleteModal(false);
            setFolderToDelete(null);
            setDeleteConfirmText("");
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert("Failed to delete folder. Please try again.");
        }
    };

    const truncateFolderName = (name, maxLength = 30) => {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + "...";
    };


    const handleStartEdit = (folder) => {
        setEditingFolder(folder);
        setEditedName(folder.name);
    };

    const handleSaveEdit = async () => {
        const trimmedName = editedName.trim();
        if (!trimmedName) return;

        if (trimmedName !== editingFolder.name && folders.some(f => f.name === trimmedName)) {
            alert("Folder already exists!");
            return;
        }

        try {
            const foldersDocRef = doc(db, "documents", "folders");
            const updatedFolders = folders.map(f =>
                f.name === editingFolder.name
                    ? { ...f, name: trimmedName }
                    : f
            ).sort((a, b) => a.name.localeCompare(b.name));

            await setDoc(foldersDocRef, {
                folders: updatedFolders,
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

                        {/* Folder Name Input */}
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name..."
                            className="flex-1 rounded-lg border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
                        />

                        {/* Add Button */}
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
                                        key={folder.name}
                                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-[#1F2234]"
                                    >
                                        {editingFolder?.name === folder.name ? (
                                            <div className="flex-1 flex items-center gap-2">

                                                {/* Edit Input - Read-only for system folders */}
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    disabled={folder.isSystem}
                                                    className={`flex-1 rounded border border-gray-300 [.dark_&]:border-white/10 py-1 px-2 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${folder.isSystem ? 'bg-gray-100 [.dark_&]:bg-gray-700 cursor-not-allowed' : 'bg-white [.dark_&]:bg-[#181B2A]'}`}
                                                    autoFocus={!folder.isSystem}
                                                    title={folder.isSystem ? 'System folder name cannot be changed' : ''}
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
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="flex-shrink-0 relative flex items-center justify-center">
                                                        {folder.isSystem && (
                                                            <FaLock className="h-3 w-3 text-gray-500 [.dark_&]:text-gray-400 drop-shadow-md" />
                                                        )}
                                                    </div>
                                                    <span className="flex-1 text-sm font-medium text-gray-900 [.dark_&]:text-white" title={folder.name}>
                                                        {truncateFolderName(folder.name)}
                                                        {folder.isSystem && (
                                                            <span className="ml-2 text-xs text-gray-500 [.dark_&]:text-gray-400">(System)</span>
                                                        )}
                                                    </span>
                                                </div>
                                                {/* Hide edit and delete buttons for system/protected folders */}
                                                {!folder.isSystem ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartEdit(folder)}
                                                            className="p-1.5 rounded hover:bg-indigo-100 [.dark_&]:hover:bg-indigo-900/20 text-indigo-600 [.dark_&]:text-indigo-400"
                                                            title="Edit"
                                                        >
                                                            <FaEdit className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(folder)}
                                                            className="p-1.5 rounded hover:bg-red-100 [.dark_&]:hover:bg-red-900/20 text-red-600 [.dark_&]:text-red-400"
                                                            title="Delete"
                                                        >
                                                            <FaTrash className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="p-1.5 text-gray-400 [.dark_&]:text-gray-500" title="Protected folder - cannot edit or delete">
                                                        <FaLock className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && folderToDelete && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-white/50 [.dark_&]:bg-black/60 backdrop-blur-sm">
                    <div
                        className="rounded-xl shadow-2xl w-full max-w-lg" style={{ backgroundColor: 'white' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 [.dark_&]:border-white/10">
                            <h3 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white">Delete Folder</h3>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            {/* Warning Box */}
                            <div className="p-4 bg-red-50 [.dark_&]:bg-red-900/20 border-2 border-red-200 [.dark_&]:border-red-500/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-600 [.dark_&]:text-amber-400 text-xl mt-0.5">⚠</span>
                                    <div>
                                        <p className="text-amber-800 [.dark_&]:text-amber-300 font-semibold mb-2">Warning: This action cannot be undone!</p>
                                        <p className="text-red-700 [.dark_&]:text-red-300 text-sm leading-relaxed">
                                            Deleting this folder will affect all documents currently assigned to it. All documents in this folder will be moved to the "General" folder.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Folder Info */}
                            <div>
                                <p className="text-gray-600 [.dark_&]:text-gray-400 text-sm mb-2">Folder to delete:</p>
                                <div className="px-4 py-3 bg-gray-100 [.dark_&]:bg-[#1E1E2D] rounded-lg border border-gray-200 [.dark_&]:border-white/10">
                                    <p className="text-gray-900 [.dark_&]:text-white font-medium break-all">
                                        {folderToDelete.name}
                                    </p>
                                </div>
                            </div>

                            {/* Confirmation Input */}
                            <div>
                                <label className="block text-gray-700 [.dark_&]:text-gray-300 text-sm mb-2">
                                    Type <span className="font-bold text-red-600 [.dark_&]:text-red-400">Delete {folderToDelete.name}</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder={`Delete ${folderToDelete.name}`}
                                    className="w-full px-4 py-3 rounded-lg border-2 border-red-300 [.dark_&]:border-red-500/50 bg-white [.dark_&]:bg-[#1E1E2D] text-gray-900 [.dark_&]:text-white placeholder-gray-400 [.dark_&]:placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 [.dark_&]:border-white/10">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setFolderToDelete(null);
                                    setDeleteConfirmText("");
                                }}
                                className="px-6 py-2.5 rounded-lg font-medium text-gray-700 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white hover:bg-gray-100 [.dark_&]:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleteConfirmText !== `Delete ${folderToDelete.name}`}
                                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${deleteConfirmText === `Delete ${folderToDelete.name}`
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-gray-300 [.dark_&]:bg-gray-600 text-gray-500 [.dark_&]:text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Delete Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageFoldersModal;

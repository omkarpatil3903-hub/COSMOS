/**
 * GroupedDocumentsView Component
 *
 * Purpose: Displays documents grouped by folder with collapsible sections.
 * Each folder has a colored header and expandable document table.
 *
 * Responsibilities:
 * - Group documents by folder property
 * - Fetch folder colors from Firestore
 * - Provide collapsible folder sections
 * - Search/filter across all folders
 * - Handle document preview modal
 * - Support edit/delete actions per document
 *
 * Dependencies:
 * - Firestore (documents/folders for colors)
 * - DocumentPreviewModal (preview dialog)
 * - react-icons (file, folder, action icons)
 *
 * Props:
 * - rows: Array of document objects
 * - query: Search filter string
 * - showActions: Boolean to show edit/delete buttons
 * - onEdit: Edit callback
 * - onDelete: Delete callback
 *
 * Folder Colors:
 * - Fetched from documents/folders collection
 * - Old format (string array) uses default blue
 * - New format (object array) has explicit color
 *
 * Table Columns:
 * - SR. NO.: Sequential number within folder
 * - Document Name: Title with file icon
 * - Folder: Folder name with color indicator
 * - Uploaded By: Role or name of uploader
 * - Last Updated: Modification date
 * - Actions: Edit/Delete on hover
 *
 * Navigation:
 * - Preview modal with prev/next document navigation
 * - Navigates across all documents, not just current folder
 *
 * Last Modified: 2026-01-10
 */

import React, { useMemo, useState, useEffect } from "react";
import { FaFileAlt, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaFolder, FaUser } from "react-icons/fa";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";

function GroupedDocumentsView({
    rows: inputRows,
    query = "",
    showActions = false,
    onEdit,
    onDelete,
}) {
    const [previewDoc, setPreviewDoc] = useState(null);
    const [collapsedFolders, setCollapsedFolders] = useState({});
    const [folderColors, setFolderColors] = useState({});

    const rows = inputRows ?? [];

    // Fetch folder colors from Firestore
    useEffect(() => {
        const foldersDocRef = doc(db, "documents", "folders");
        const unsub = onSnapshot(foldersDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const folderData = data.folders || data.folderNames || [];
                const colorMap = {};

                folderData.forEach(f => {
                    if (typeof f === 'string') {
                        colorMap[f] = '#3B82F6'; // Default blue for old format
                    } else {
                        colorMap[f.name] = f.color;
                    }
                });

                setFolderColors(colorMap);
            }
        });
        return () => unsub();
    }, []);

    // Get folder color from the fetched colors
    const getFolderColor = (folderName) => {
        return folderColors[folderName] || '#3B82F6'; // Default blue if not found
    };

    // Group documents by folder
    const groupedDocs = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = rows;

        // Filter by query
        if (q) {
            list = rows.filter((r) =>
                [r.name, r.folder, r.createdByName, r.created].some((v) =>
                    String(v || "")
                        .toLowerCase()
                        .includes(q)
                )
            );
        }

        // Group by folder
        const groups = {};
        list.forEach((doc) => {
            const folderName = doc.folder || "General";
            if (!groups[folderName]) {
                groups[folderName] = [];
            }
            groups[folderName].push(doc);
        });

        return groups;
    }, [rows, query]);

    const folderNames = Object.keys(groupedDocs).sort();

    const toggleFolder = (folderName) => {
        setCollapsedFolders(prev => ({
            ...prev,
            [folderName]: !prev[folderName]
        }));
    };

    const handleDownload = async (doc) => {
        const href = doc?.url || doc?.fileDataUrl;
        if (!href) {
            console.warn("No URL for document:", doc);
            return;
        }
        try {
            const res = await fetch(href);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const downloadName = doc?.filename || doc?.name || "document";
            link.href = objectUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (e) {
            console.error("Download failed:", e);
        }
    };

    const handleView = (doc) => {
        setPreviewDoc(doc);
    };

    const handleNavigate = (direction) => {
        const allDocs = rows;
        if (!previewDoc || !Array.isArray(allDocs) || allDocs.length < 2) return;
        const index = allDocs.findIndex((d) => d.id === previewDoc.id);
        if (index === -1) return;

        let nextIndex = direction === "next" ? index + 1 : index - 1;
        if (nextIndex < 0) nextIndex = allDocs.length - 1;
        if (nextIndex >= allDocs.length) nextIndex = 0;

        setPreviewDoc(allDocs[nextIndex]);
    };

    if (folderNames.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 [.dark_&]:text-gray-400">
                No documents found
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {folderNames.map((folderName) => {
                    const docs = groupedDocs[folderName];
                    const isCollapsed = collapsedFolders[folderName];
                    const count = docs.length;

                    return (
                        <div key={folderName} className="space-y-2">
                            {/* Folder Header - Outside Card */}
                            <button
                                onClick={() => toggleFolder(folderName)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors rounded w-full text-left"
                            >
                                <span className="text-gray-400 text-xs">
                                    {isCollapsed ? (
                                        <FaChevronDown className="h-3 w-3" />
                                    ) : (
                                        <FaChevronUp className="h-3 w-3" />
                                    )}
                                </span>
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-bold uppercase text-white"
                                    style={{ backgroundColor: getFolderColor(folderName) }}
                                >
                                    {folderName}
                                </span>
                                <span className="text-gray-400 text-sm font-medium ml-1">
                                    {count}
                                </span>
                            </button>

                            {/* Document Table */}
                            {!isCollapsed && (
                                <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg shadow-sm overflow-hidden mt-2">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 [.dark_&]:bg-white/5 border-b border-gray-100 [.dark_&]:border-white/10 text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                        <div className="col-span-1 flex items-center gap-2">
                                            <span>SR. NO.</span>
                                        </div>
                                        <div className="col-span-3 flex items-center gap-2">
                                            <FaFileAlt className="text-gray-400" />
                                            <span>DOCUMENT NAME</span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <FaFolder className="text-gray-400" />
                                            <span>FOLDER</span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <FaUser className="text-gray-400" />
                                            <span>UPLOADED BY</span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <span>LAST UPDATED</span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <span>ACTIONS</span>
                                        </div>
                                    </div>

                                    {/* Document Rows */}
                                    {docs.map((doc, index) => (
                                        <div
                                            key={doc.id}
                                            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 [.dark_&]:border-white/5 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors cursor-pointer group last:border-b-0"
                                        >
                                            {/* SR. NO. */}
                                            <div className="col-span-1 flex items-center text-sm text-gray-600 [.dark_&]:text-gray-400">
                                                {index + 1}
                                            </div>

                                            {/* DOCUMENT NAME */}
                                            <div
                                                className="col-span-3 flex items-center gap-2"
                                                onClick={() => handleView(doc)}
                                            >
                                                <FaFileAlt className="h-4 w-4 text-indigo-500 [.dark_&]:text-indigo-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white truncate">
                                                    {doc.name}
                                                </span>
                                            </div>

                                            {/* FOLDER */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                <div
                                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: getFolderColor(doc.folder) }}
                                                />
                                                <span className="text-sm text-gray-700 [.dark_&]:text-gray-300 truncate">
                                                    {doc.folder}
                                                </span>
                                            </div>

                                            {/* UPLOADED BY */}
                                            <div className="col-span-2 flex items-center">
                                                <span className="text-sm text-gray-600 [.dark_&]:text-gray-400 truncate">
                                                    {(() => {
                                                        const role = doc.createdByRole || "";
                                                        const name = doc.createdByName || "";

                                                        // If role exists and is more than 2 characters, use it with proper capitalization
                                                        if (role && role.length > 2) {
                                                            return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
                                                        }

                                                        // Otherwise, use the name
                                                        return name || "—";
                                                    })()}
                                                </span>
                                            </div>

                                            {/* LAST UPDATED */}
                                            <div className="col-span-2 flex items-center">
                                                <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">
                                                    {doc.updated}
                                                </span>
                                            </div>

                                            {/* ACTIONS */}
                                            <div className="col-span-2 flex items-center justify-center gap-2">
                                                {showActions && onEdit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEdit(doc);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-indigo-100 [.dark_&]:hover:bg-indigo-900/20 text-indigo-600 [.dark_&]:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Edit"
                                                    >
                                                        <FaEdit className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                {/* Delete button visible for all documents */}
                                                {showActions && onDelete && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(doc);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-red-100 [.dark_&]:hover:bg-red-900/20 text-red-600 [.dark_&]:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete"
                                                    >
                                                        <FaTrash className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {previewDoc && (
                <DocumentPreviewModal
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    onNavigate={handleNavigate}
                    onDownload={handleDownload}
                    variant="compact"
                />
            )}
        </>
    );
}

export default GroupedDocumentsView;

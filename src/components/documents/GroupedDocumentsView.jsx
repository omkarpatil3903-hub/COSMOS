/**
 * GroupedDocumentsView Component
 *
 * Purpose: Displays documents grouped by folder.
 * Modified to support two modes:
 * 1. Folder Grid View (Default): Shows folders as icons.
 * 2. Document List View: Shows documents inside a clicked folder.
 *
 * Responsibilities:
 * - Group documents by folder property
 * - Fetch folder colors from Firestore
 * - Provide grid view of folders
 * - Provide table view of documents within a folder
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
 * Last Modified: 2026-02-02
 */

import React, { useMemo, useState, useEffect } from "react";
import { FaFileAlt, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaFolder, FaUser, FaArrowLeft } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { formatDate } from "../../utils/formatDate";
import { useThemeStyles } from "../../hooks/useThemeStyles";

function GroupedDocumentsView({
    rows: inputRows,
    query = "",
    showActions = false,
    onEdit,
    onDelete,
    activeFolder, // Received from parent
    setActiveFolder, // Received from parent
    viewMode = "grid", // 'grid' | 'list'
    onEditFolder,
    onDeleteFolder,
    sortConfig, // { key: 'name', direction: 'asc' }
}) {
    const { hoverAccentClass, hoverBorderClass } = useThemeStyles();
    const [previewDoc, setPreviewDoc] = useState(null);
    const [folderColors, setFolderColors] = useState({});
    // const [activeFolder, setActiveFolder] = useState(null); // Removed local state

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

    const folderNames = useMemo(() => {
        const names = Object.keys(groupedDocs);
        if (!sortConfig) return names.sort();

        const { key, direction } = sortConfig;
        const multiplier = direction === "asc" ? 1 : -1;

        return names.sort((a, b) => {
            // Keep "General" at top usually, or respect sort? 
            // Let's respect sort but maybe General has special meaning? 
            // If "General" means "Uncategorized", maybe it stays first/last.
            // For now, treat as normal name unless Name sort.
            if (key === "name") {
                if (a === "General") return -1;
                if (b === "General") return 1;
            }

            if (key === "date") {
                // Sort by most recent document in the folder
                const getDirTime = (folder) => {
                    const docs = groupedDocs[folder] || [];
                    if (!docs.length) return 0;
                    return Math.max(...docs.map(d => {
                        const v = d.updatedAt || d.createdAt;
                        if (!v) return 0;
                        if (v.toMillis) return v.toMillis();
                        if (v instanceof Date) return v.getTime();
                        return new Date(v).getTime() || 0;
                    }));
                };
                return (getDirTime(a) - getDirTime(b)) * multiplier;
            }

            return a.localeCompare(b) * multiplier;
        });
    }, [groupedDocs, sortConfig]);

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
        // Navigate through visible docs in current view
        const currentDocs = activeFolder ? groupedDocs[activeFolder] : rows;
        if (!previewDoc || !Array.isArray(currentDocs) || currentDocs.length < 2) return;

        const index = currentDocs.findIndex((d) => d.id === previewDoc.id);
        if (index === -1) return;

        let nextIndex = direction === "next" ? index + 1 : index - 1;
        if (nextIndex < 0) nextIndex = currentDocs.length - 1;
        if (nextIndex >= currentDocs.length) nextIndex = 0;

        setPreviewDoc(currentDocs[nextIndex]);
    };

    // Reset active folder if it becomes invalid (e.g. after deletion)
    useEffect(() => {
        if (activeFolder && !groupedDocs[activeFolder]) {
            setActiveFolder(null);
        }
    }, [activeFolder, groupedDocs, setActiveFolder]);

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
                {/* Back Button REMOVED - Controlled by parent page header */}


                {!activeFolder || !groupedDocs[activeFolder] ? (
                    // FOLDERS VIEW
                    viewMode === "grid" ? (
                        // FOLDER GRID
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-2 gap-y-4">
                            {folderNames.map((folderName) => {
                                const count = groupedDocs[folderName].length;
                                const folderColor = getFolderColor(folderName);

                                return (
                                    <div
                                        key={folderName}
                                        className="relative group"
                                    >
                                        {/* Edit/Delete Buttons - Top Right on Hover */}
                                        {(onEditFolder || onDeleteFolder) && (
                                            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                {onEditFolder && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditFolder(folderName);
                                                        }}
                                                        className="p-1.5 rounded-full bg-white [.dark_&]:bg-gray-800 text-gray-700 [.dark_&]:text-gray-300 shadow-lg hover:bg-gray-100 [.dark_&]:hover:bg-gray-700 transition-colors"
                                                        title="Edit Folder"
                                                    >
                                                        <FaEdit className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                {onDeleteFolder && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteFolder(folderName);
                                                        }}
                                                        className="p-1.5 rounded-full bg-white [.dark_&]:bg-gray-800 text-red-500 shadow-lg hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 transition-colors"
                                                        title="Delete Folder"
                                                    >
                                                        <FaTrash className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Folder Card */}
                                        <button
                                            onClick={() => setActiveFolder(folderName)}
                                            className={`w-full flex flex-col items-center justify-center py-5 px-1 rounded-xl border border-transparent ${hoverAccentClass} ${hoverBorderClass} transition-all duration-200 text-center h-full`}
                                        >
                                            <div className="text-6xl mb-1 transition-transform group-hover:scale-110 duration-200">
                                                <FcFolder />
                                            </div>
                                            <span className="font-semibold text-gray-800 [.dark_&]:text-gray-200 text-sm md:text-base line-clamp-2">
                                                {folderName}
                                            </span>
                                            <span className="mt-1 text-xs text-gray-500 [.dark_&]:text-gray-400 font-medium px-2 py-0.5 rounded-full bg-gray-100 [.dark_&]:bg-white/10">
                                                {count} {count === 1 ? 'file' : 'files'}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // FOLDER LIST VIEW - TABLE
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 [.dark_&]:bg-white/5 border-b border-gray-200 [.dark_&]:border-white/10">
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                SR. NO.
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                FOLDER NAME
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                TOTAL FILES
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                CREATED DATE
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                UPDATED DATE
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-left">
                                            <span className="text-[11px] font-bold text-gray-400 [.dark_&]:text-gray-500 uppercase tracking-wider">
                                                ACTIONS
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white [.dark_&]:bg-[#181B2A] divide-y divide-gray-100 [.dark_&]:divide-white/5">
                                    {folderNames.map((folderName, index) => {
                                        const docs = groupedDocs[folderName];
                                        const count = docs.length;

                                        // Find most recent created date
                                        const createdDate = docs.reduce((earliest, doc) => {
                                            if (!earliest) return doc.created;
                                            if (!doc.created) return earliest;
                                            return new Date(doc.created) < new Date(earliest) ? doc.created : earliest;
                                        }, null);

                                        // Find most recent updated date
                                        const lastUpdated = docs.reduce((latest, doc) => {
                                            if (!latest) return doc.updated;
                                            if (!doc.updated) return latest;
                                            return new Date(doc.updated) > new Date(latest) ? doc.updated : latest;
                                        }, null);

                                        return (
                                            <tr
                                                key={folderName}
                                                onClick={() => setActiveFolder(folderName)}
                                                className="hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                {/* SR. NO. */}
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700 [.dark_&]:text-white">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 [.dark_&]:bg-white/5">
                                                        {index + 1}
                                                    </div>
                                                </td>

                                                {/* FOLDER NAME */}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                                                        {folderName}
                                                    </span>
                                                </td>

                                                {/* TOTAL FILES */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 [.dark_&]:bg-indigo-900/20 text-indigo-700 [.dark_&]:text-indigo-300 border border-indigo-100 [.dark_&]:border-indigo-800">
                                                        {count} {count === 1 ? 'file' : 'files'}
                                                    </span>
                                                </td>

                                                {/* CREATED DATE */}
                                                <td className="px-6 py-4 text-sm text-gray-600 [.dark_&]:text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                                                        {formatDate(createdDate) || '—'}
                                                    </div>
                                                </td>

                                                {/* UPDATED DATE */}
                                                <td className="px-6 py-4 text-sm text-gray-600 [.dark_&]:text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>
                                                        {formatDate(lastUpdated) || '—'}
                                                    </div>
                                                </td>

                                                {/* ACTIONS */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-2">
                                                            {onEditFolder && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEditFolder(folderName);
                                                                    }}
                                                                    className="p-1.5 rounded-full hover:bg-white [.dark_&]:hover:bg-white/10 text-gray-500 [.dark_&]:text-gray-400 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 transition-colors"
                                                                    title="Edit Folder"
                                                                >
                                                                    <FaEdit className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {onDeleteFolder && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteFolder(folderName);
                                                                    }}
                                                                    className="p-1.5 rounded-full hover:bg-white [.dark_&]:hover:bg-white/10 text-gray-500 [.dark_&]:text-gray-400 hover:text-red-600 [.dark_&]:hover:text-red-400 transition-colors"
                                                                    title="Delete Folder"
                                                                >
                                                                    <FaTrash className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {!onEditFolder && !onDeleteFolder && (
                                                                <span className="text-xs text-gray-400 [.dark_&]:text-gray-500">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    // DOCUMENTS IN ACTIVE FOLDER
                    viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-2 gap-y-4">
                            {(groupedDocs[activeFolder] || []).map((doc) => (
                                <div
                                    key={doc.id}
                                    className="relative group"
                                >
                                    {/* Edit/Delete Buttons - Top Right on Hover */}
                                    {showActions && (onEdit || onDelete) && (
                                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            {onEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(doc);
                                                    }}
                                                    className="p-1.5 rounded-full bg-white [.dark_&]:bg-gray-800 text-gray-700 [.dark_&]:text-gray-300 shadow-lg hover:bg-gray-100 [.dark_&]:hover:bg-gray-700 transition-colors"
                                                    title="Edit Document"
                                                >
                                                    <FaEdit className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(doc);
                                                    }}
                                                    className="p-1.5 rounded-full bg-white [.dark_&]:bg-gray-800 text-red-500 shadow-lg hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 transition-colors"
                                                    title="Delete Document"
                                                >
                                                    <FaTrash className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Document Card */}
                                    <div
                                        onClick={() => handleView(doc)}
                                        className={`flex flex-col items-center justify-center py-4 px-1 rounded-lg border border-transparent ${hoverAccentClass} ${hoverBorderClass} transition-all cursor-pointer text-center gap-1 bg-white [.dark_&]:bg-white/5 border-gray-100 [.dark_&]:border-white/5`}
                                    >
                                        <div className="p-3 rounded-full text-6xl mb-1 group-hover:scale-110 transition-transform">
                                            <FaFileAlt className="text-indigo-500 [.dark_&]:text-indigo-400" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 [.dark_&]:text-white text-sm line-clamp-1 break-all px-2 w-full" title={doc.name}>
                                            {doc.name}
                                        </h3>
                                        <span className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                                            {formatDate(doc.updated)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // TABLE VIEW OF DOCUMENTS IN ACTIVE FOLDER
                        <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg shadow-sm overflow-hidden">
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
                            {(groupedDocs[activeFolder] || []).map((doc, index) => (
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
                                            {formatDate(doc.updated)}
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
                    )
                )}
            </div >

            {previewDoc && (
                <DocumentPreviewModal
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    onNavigate={handleNavigate}
                    onDownload={handleDownload}
                    variant="compact"
                />
            )
            }
        </>
    );
}

export default GroupedDocumentsView;

import React, { useMemo, useState } from "react";
import { FaFileAlt, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaFolder } from "react-icons/fa";
import DocumentPreviewModal from "./DocumentPreviewModal";

function GroupedDocumentsView({
    rows: inputRows,
    query = "",
    showActions = false,
    onEdit,
    onDelete,
}) {
    const [previewDoc, setPreviewDoc] = useState(null);
    const [collapsedFolders, setCollapsedFolders] = useState({});

    const rows = inputRows ?? [];

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
                        <div key={folderName} className="border border-gray-200 [.dark_&]:border-white/10 rounded-lg overflow-hidden">
                            {/* Folder Header */}
                            <button
                                onClick={() => toggleFolder(folderName)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 [.dark_&]:bg-[#1F2234] hover:bg-gray-100 [.dark_&]:hover:bg-[#252838] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <FaFolder className="h-4 w-4 text-orange-500" />
                                    <span className="font-semibold text-gray-900 [.dark_&]:text-white uppercase text-sm tracking-wide">
                                        {folderName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-gray-200 [.dark_&]:bg-gray-700 text-gray-700 [.dark_&]:text-gray-300 text-xs font-medium">
                                        {count}
                                    </span>
                                </div>
                                {isCollapsed ? (
                                    <FaChevronDown className="h-4 w-4 text-gray-500 [.dark_&]:text-gray-400" />
                                ) : (
                                    <FaChevronUp className="h-4 w-4 text-gray-500 [.dark_&]:text-gray-400" />
                                )}
                            </button>

                            {/* Document List */}
                            {!isCollapsed && (
                                <div className="bg-white [.dark_&]:bg-[#181B2A]">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-[#1F2234]">
                                        <div className="col-span-1 text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider text-center">
                                            SR. NO.
                                        </div>
                                        <div className="col-span-5 text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                                            Document Name
                                        </div>
                                        <div className="col-span-2 text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                                            Uploaded By
                                        </div>
                                        <div className="col-span-2 text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider">
                                            Uploaded On
                                        </div>
                                        {showActions && (
                                            <div className="col-span-2 text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider text-right">
                                                Actions
                                            </div>
                                        )}
                                    </div>

                                    {/* Document Rows */}
                                    {docs.map((doc, index) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleView(doc)}
                                            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 [.dark_&]:border-white/5 hover:bg-gray-50 [.dark_&]:hover:bg-[#1F2234] transition-colors cursor-pointer group"
                                        >
                                            <div className="col-span-1 flex items-center justify-center">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 [.dark_&]:bg-[#1F2234] text-gray-600 [.dark_&]:text-gray-300 text-sm">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className="col-span-5 flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-50 [.dark_&]:bg-blue-900/20 text-blue-600 [.dark_&]:text-blue-400">
                                                    <FaFileAlt />
                                                </span>
                                                <span className="truncate text-gray-900 [.dark_&]:text-white group-hover:text-blue-600 [.dark_&]:group-hover:text-blue-400 transition-colors">
                                                    {doc.name}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex items-center text-gray-800 [.dark_&]:text-gray-300 text-sm">
                                                {doc.createdByName || "-"}
                                            </div>
                                            <div className="col-span-2 flex items-center text-gray-700 [.dark_&]:text-gray-400 text-sm">
                                                {doc.created || "-"}
                                            </div>
                                            {showActions && (
                                                <div className="col-span-2 flex items-center justify-end gap-3">
                                                    {onEdit && (
                                                        <button
                                                            type="button"
                                                            title="Edit"
                                                            aria-label="Edit"
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-yellow-400 shadow-sm hover:bg-yellow-50 [.dark_&]:hover:bg-yellow-900/20 hover:shadow focus:outline-none"
                                                            onClick={(e) => { e.stopPropagation(); onEdit(doc); }}
                                                        >
                                                            <FaEdit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            type="button"
                                                            title="Delete"
                                                            aria-label="Delete"
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-red-600 [.dark_&]:text-red-400 shadow-sm hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 hover:shadow focus:outline-none"
                                                            onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                                                        >
                                                            <FaTrash className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
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

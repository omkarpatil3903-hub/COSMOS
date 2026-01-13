/**
 * DocumentsTable Component
 *
 * Purpose: Displays documents in a paginated, sortable table with preview modal.
 * Wraps DataTable with document-specific columns and behavior.
 *
 * Responsibilities:
 * - Define document-specific table columns
 * - Handle search filtering across multiple fields
 * - Manage sorting state
 * - Integrate DocumentPreviewModal for viewing
 * - Handle document download with filename resolution
 * - Provide edit/delete actions when enabled
 *
 * Dependencies:
 * - DataTable (reusable table component)
 * - DocumentPreviewModal (preview dialog)
 * - react-icons (file, edit, trash icons)
 *
 * Props:
 * - rows: Array of document objects (falls back to demo data)
 * - query: Search string for filtering
 * - users: User list (for display purposes)
 * - clients: Client list (for display purposes)
 * - showActions: Boolean to show edit/delete buttons
 * - onEdit: Edit callback
 * - onDelete: Delete callback
 *
 * Download Logic:
 * - Attempts blob download first (prevents new tab)
 * - Falls back to direct link on failure
 * - Resolves filename from: filename > storagePath > URL > fileType
 *
 * Navigation:
 * - Arrow buttons in preview modal for next/prev document
 * - Wraps around at list boundaries
 *
 * Last Modified: 2026-01-10
 */

import React, { useMemo, useState } from "react";
import { FaFileAlt, FaEdit, FaTrash } from "react-icons/fa";
import DataTable from "./DataTable";
import DocumentPreviewModal from "./DocumentPreviewModal";

function DocumentsTable({
  rows: inputRows,
  query = "",
  users = [],
  clients = [],
  showActions = false,
  onEdit,
  onDelete,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [previewDoc, setPreviewDoc] = useState(null);

  const rows = inputRows ?? [
    {
      id: "1",
      name: "Doc",
      location: "—",
      tags: [],
      updated: "Just now",
      viewed: "Just now",
      shared: true,
      children: 0,
    },
    {
      id: "2",
      name: "Doc",
      location: "—",
      tags: [],
      updated: "1 min ago",
      viewed: "Just now",
      shared: true,
      children: 0,
    },
    {
      id: "3",
      name: "Project Notes",
      location: "Team Space",
      tags: [],
      updated: "Nov 3",
      viewed: "-",
      shared: true,
      children: 2,
    },
  ];

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "sr",
        label: "SR. NO.",
        sortable: false,
        render: (_r, absoluteIndex) => (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 [.dark_&]:bg-[#1F2234] text-gray-600 [.dark_&]:text-gray-300 text-sm">
            {absoluteIndex + 1}
          </div>
        ),
        align: "center",
        headerClassName: "w-[90px]",
      },
      {
        key: "name",
        label: "Document Name",
        sortable: true,
        render: (r) => {
          const full = r.name || "";
          const short = full.length > 40 ? `${full.slice(0, 40)}…` : full;
          return (
            <div className="flex items-center gap-2 max-w-[480px]" title={full}>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-50 [.dark_&]:bg-blue-900/20 text-blue-600 [.dark_&]:text-blue-400">
                <FaFileAlt />
              </span>
              <span
                className="truncate text-gray-900 [.dark_&]:text-white group-hover:text-blue-600 [.dark_&]:group-hover:text-blue-400 transition-colors"
                aria-label={full}
              >
                {short}
              </span>
            </div>
          );
        },
      },
      {
        key: "createdByName",
        label: "Uploaded By",
        sortable: true,
        render: (r) => (
          <span className="text-gray-800 [.dark_&]:text-gray-300 text-sm" title={r.createdByName || "-"}>
            {r.createdByName || "-"}
          </span>
        ),
        headerClassName: "w-[200px]",
      },
      {
        key: "created",
        label: "Uploaded On",
        sortable: true,
        render: (r) => (
          <span className="text-gray-700 [.dark_&]:text-gray-400 text-sm" title={r.created || "-"}>
            {r.created || "-"}
          </span>
        ),
        headerClassName: "w-[160px]",
      },
    ];

    if (showActions) {
      baseColumns.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (r) => {
          const showEdit = Boolean(onEdit);
          const showDelete = Boolean(onDelete);
          return (
            <div className="flex items-center gap-3">
              {showEdit && (
                <button
                  type="button"
                  title="Edit"
                  aria-label="Edit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-yellow-400 shadow-sm hover:bg-yellow-50 [.dark_&]:hover:bg-yellow-900/20 hover:shadow focus:outline-none"
                  onClick={(e) => { e.stopPropagation(); onEdit && onEdit(r); }}
                >
                  <FaEdit className="h-4 w-4" />
                </button>
              )}
              {showDelete && (
                <button
                  type="button"
                  title="Delete"
                  aria-label="Delete"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-red-600 [.dark_&]:text-red-400 shadow-sm hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 hover:shadow focus:outline-none"
                  onClick={(e) => { e.stopPropagation(); onDelete && onDelete(r); }}
                >
                  <FaTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
        align: "right",
        headerClassName: "w-[160px]",
      });
    }

    return baseColumns;
  }, [showActions, onEdit, onDelete]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((r) =>
        [r.name, r.location, r.updated, r.viewed, r.createdByName, r.created].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const mult = direction === "asc" ? 1 : -1;
      const getString = (v) => String(v ?? "").toLowerCase();
      list = [...list].sort((a, b) => {
        return getString(a[key]).localeCompare(getString(b[key])) * mult;
      });
    }
    return list;
  }, [rows, query, sortConfig]);

  const handleSort = (columnKey) => {
    setPage(1);
    setSortConfig((prev) => {
      if (!prev || prev.key !== columnKey)
        return { key: columnKey, direction: "asc" };
      return {
        key: columnKey,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const handleNavigate = (direction) => {
    const list = filteredSorted;
    if (!previewDoc || !Array.isArray(list) || list.length < 2) return;
    const index = list.findIndex((d) => d.id === previewDoc.id);
    if (index === -1) return;

    let nextIndex = direction === "next" ? index + 1 : index - 1;
    if (nextIndex < 0) nextIndex = list.length - 1;
    if (nextIndex >= list.length) nextIndex = 0;

    setPreviewDoc(list[nextIndex]);
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
      const resolveName = () => {
        if (doc?.filename) return doc.filename;
        if (doc?.storagePath) {
          const seg = doc.storagePath.split("/");
          const name = seg[seg.length - 1];
          if (name) return name;
        }
        if (doc?.url) {
          try {
            const u = new URL(doc.url);
            const path = decodeURIComponent(u.pathname);
            const idx = path.lastIndexOf("/o/");
            if (idx !== -1) {
              const encoded = path.slice(idx + 3); // after /o/
              const decoded = decodeURIComponent(encoded);
              const parts = decoded.split("/");
              const last = parts[parts.length - 1];
              if (last) return last;
            }
          } catch { }
        }
        const map = {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
          "application/vnd.ms-excel": "xls",
          "text/csv": "csv",
          "application/pdf": "pdf",
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        const ext = map[doc?.fileType] || "";
        const base = doc?.name || "document";
        return ext ? `${base}.${ext}` : base;
      };
      const downloadName = resolveName();
      link.href = objectUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Blob download failed, falling back to direct link:", e);
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleView = (doc) => {
    setPreviewDoc(doc);
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={filteredSorted}
        sortConfig={sortConfig}
        onSort={handleSort}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(val) => {
          setRowsPerPage(val);
          setPage(1);
        }}
        onRowClick={handleView}
        emptyMessage="No documents found"
      />
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

export default DocumentsTable;

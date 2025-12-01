import React, { useMemo, useState } from "react";
import { FaFileAlt, FaEdit, FaTrash } from "react-icons/fa";
import DataTable from "./DataTable";
import DocumentPreviewModal from "./DocumentPreviewModal";

function DocumentsTable({ rows: inputRows, query = "", onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [previewDoc, setPreviewDoc] = useState(null);

  const rows = inputRows ?? [
    { id: "1", name: "Doc", location: "—", tags: [], updated: "Just now", viewed: "Just now", shared: true, children: 0 },
    { id: "2", name: "Doc", location: "—", tags: [], updated: "1 min ago", viewed: "Just now", shared: true, children: 0 },
    { id: "3", name: "Project Notes", location: "Team Space", tags: [], updated: "Nov 3", viewed: "-", shared: true, children: 2 },
  ];

  const columns = [
    {
      key: "sr",
      label: "SR. NO.",
      sortable: false,
      render: (_r, absoluteIndex) => (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm">{absoluteIndex + 1}</div>
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
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600"><FaFileAlt /></span>
            <span
              className="truncate text-gray-900 group-hover:text-blue-600 transition-colors"
              aria-label={full}
            >
              {short}
            </span>
          </div>
        );
      },
    },
    {
      key: "access",
      label: "Access",
      sortable: true,
      headerAlign: "left",
      align: "center",
      render: (r) => {
        const admins = Array.isArray(r.access?.admin) ? r.access.admin : [];
        const members = Array.isArray(r.access?.member) ? r.access.member : [];
        const items = [
          ...admins.map((name) => ({ role: "admin", name })),
          ...members.map((name) => ({ role: "member", name })),
        ];

        if (items.length === 0) {
          return r.shared ? (
            <span className="text-xs text-gray-600">Shared</span>
          ) : (
            <span className="text-xs text-gray-400">Private</span>
          );
        }

        const maxAvatars = 3;
        const maxNames = 2;
        const showAvatars = items.slice(0, maxAvatars);
        const showNames = items.slice(0, maxNames).map((i) => i.name);
        const extra = items.length - maxNames;

        return (
          <div className="flex items-center gap-2 max-w-[260px]">
            <div className="flex -space-x-1.5">
              {showAvatars.map((it, idx) => (
                <div
                  key={`${it.role}-${it.name}-${idx}`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm ${
                    it.role === "admin"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                  title={`${it.name} (${it.role})`}
                >
                  {String(it.name || "?").trim().charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-700 truncate">
              <span className="truncate inline-block max-w-[150px] align-middle">
                {showNames.join(", ")}
              </span>
              {extra > 0 && (
                <span className="text-gray-400 ml-1">+{extra} more</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      stickyRight: true,
      align: "center",
      headerAlign: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-3">
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(r); }}
          >
            <FaEdit className="text-amber-600" />
          </button>
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete && onDelete(r); }}
          >
            <FaTrash className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((r) => [r.name, r.location, r.updated, r.viewed].some((v) => String(v || "").toLowerCase().includes(q)));
    }
    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const mult = direction === "asc" ? 1 : -1;
      const getAccessMeta = (r) => {
        const admins = Array.isArray(r.access?.admin) ? r.access.admin : [];
        const members = Array.isArray(r.access?.member) ? r.access.member : [];
        return {
          count: admins.length + members.length,
          names: [...admins, ...members].join(", ").toLowerCase(),
        };
      };
      const getString = (v) => String(v ?? "").toLowerCase();
      list = [...list].sort((a, b) => {
        if (key === "access") {
          const A = getAccessMeta(a);
          const B = getAccessMeta(b);
          if (A.count !== B.count) return (A.count - B.count) * mult;
          return A.names.localeCompare(B.names) * mult;
        }
        return getString(a[key]).localeCompare(getString(b[key])) * mult;
      });
    }
    return list;
  }, [rows, query, sortConfig]);

  const handleSort = (columnKey) => {
    setPage(1);
    setSortConfig((prev) => {
      if (!prev || prev.key !== columnKey) return { key: columnKey, direction: "asc" };
      return { key: columnKey, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  const handleNavigate = (direction) => {
    const list = filteredSorted;
    if (!previewDoc || !Array.isArray(list) || list.length < 2) return;
    const index = list.findIndex((d) => d.id === previewDoc.id);
    if (index === -1) return;
    const nextIndex = direction === "prev" ? index - 1 : index + 1;
    if (nextIndex >= 0 && nextIndex < list.length) {
      setPreviewDoc(list[nextIndex]);
    }
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
        onRowsPerPageChange={(n) => { setPage(1); setRowsPerPage(n); }}
        emptyText="No documents"
        onRowClick={(row) => setPreviewDoc(row)}
      />
      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
        docs={filteredSorted}
        onNavigate={handleNavigate}
      />
    </>
  );
}

export default DocumentsTable;

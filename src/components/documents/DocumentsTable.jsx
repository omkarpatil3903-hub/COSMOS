import React, { useMemo, useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import DataTable from "./DataTable";
import DocumentPreviewModal from "./DocumentPreviewModal";

function DocumentsTable({
  rows: inputRows,
  query = "",
  users = [],
  clients = [],
  showActions = false,
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
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm">
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
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600">
                <FaFileAlt />
              </span>
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
    ];

    return baseColumns;
  }, [showActions]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((r) =>
        [r.name, r.location, r.updated, r.viewed].some((v) =>
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

  const handleDownload = (doc) => {
    if (!doc?.url) {
      console.warn("No URL for document:", doc);
      return;
    }
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = doc.name || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        />
      )}
    </>
  );
}

export default DocumentsTable;

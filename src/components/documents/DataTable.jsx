import React from "react";
import { FaSortAmountDownAlt, FaSortAmountUpAlt } from "react-icons/fa";
import Button from "../Button";

function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  sortConfig,
  onSort,
  page = 1,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  emptyText = "No records",
  onRowClick,
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row[rowKey] ?? index;
  };

  const total = rows?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (clampedPage - 1) * rowsPerPage;
  const pageRows = rows.slice(start, start + rowsPerPage);

  const handlePrev = () => onPageChange && onPageChange(Math.max(1, clampedPage - 1));
  const handleNext = () => onPageChange && onPageChange(Math.min(totalPages, clampedPage + 1));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-sm text-content-secondary">
        <div>
          Page {clampedPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="rounded-md border border-subtle bg-white px-2 py-1 text-sm"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))}
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={handlePrev}>Previous</Button>
          <Button variant="secondary" onClick={handleNext}>Next</Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig?.key === col.key;
                const isAsc = isSorted && sortConfig?.direction === "asc";
                const stickyClasses = col.stickyRight ? "sticky right-0 bg-gray-50" : "";
                const headerAlign = col.headerAlign === "center" ? "text-center" : col.headerAlign === "right" ? "text-right" : "text-left";
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${headerAlign} text-xs font-semibold uppercase tracking-wide text-gray-500 ${stickyClasses} ${col.headerClassName || ""}`}
                  >
                    {col.sortable ? (
                      <button
                        className="inline-flex items-center gap-2 hover:text-content-primary"
                        onClick={() => onSort && onSort(col.key)}
                      >
                        <span>{col.label}</span>
                        {isSorted && (isAsc ? <FaSortAmountUpAlt /> : <FaSortAmountDownAlt />)}
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row, idx) => (
              <tr
                key={getRowKey(row, idx)}
                className={`hover:bg-gray-50 ${onRowClick ? "cursor-pointer group" : ""}`}
                onClick={onRowClick ? () => onRowClick(row, start + idx, idx) : undefined}
              >
                {columns.map((col) => {
                  const stickyClasses = col.stickyRight ? "sticky right-0 bg-white" : "";
                  const content = col.render ? col.render(row, start + idx, idx) : (row[col.key] ?? "—");
                  const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                  return (
                    <td key={col.key} className={`px-4 py-3 text-sm text-gray-700 ${align} ${stickyClasses} ${col.cellClassName || ""}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;

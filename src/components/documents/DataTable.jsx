/**
 * DataTable Component
 *
 * Purpose: Reusable data table with sorting, pagination, and customizable columns.
 * Used across various document views for consistent table presentation.
 *
 * Responsibilities:
 * - Render tabular data with configurable columns
 * - Handle column sorting (ascending/descending)
 * - Manage pagination (page size, navigation)
 * - Support sticky columns for actions
 * - Handle row click events
 *
 * Dependencies:
 * - Button (UI component)
 * - react-icons (sort icons)
 *
 * Props:
 * - columns: Array of column definitions
 *   - key: Data field key
 *   - label: Column header text
 *   - sortable: Boolean for sortable columns
 *   - render: Custom render function (row, absoluteIndex, pageIndex)
 *   - align: 'left' | 'center' | 'right'
 *   - stickyRight: Boolean for sticky positioning
 *   - headerClassName: Additional header cell classes
 *   - cellClassName: Additional body cell classes
 * - rows: Data array
 * - rowKey: Field name or function to generate unique keys
 * - sortConfig: { key, direction } for current sort state
 * - onSort: Callback when column header clicked
 * - page: Current page number (1-indexed)
 * - rowsPerPage: Items per page
 * - onPageChange: Callback for page navigation
 * - onRowsPerPageChange: Callback for page size change
 * - emptyText: Message when no data
 * - onRowClick: Optional row click handler
 *
 * Pagination Options: 5, 10, 25, 50 rows per page
 *
 * Last Modified: 2026-01-10
 */

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


      <div className="w-full overflow-x-auto rounded-lg border border-gray-200 [.dark_&]:border-white/10">
        <table className="w-full bg-white [.dark_&]:bg-[#181B2A] divide-y divide-gray-200 [.dark_&]:divide-white/5">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 [.dark_&]:from-[#1F2234] [.dark_&]:to-[#1F2234]">
            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig?.key === col.key;
                const isAsc = isSorted && sortConfig?.direction === "asc";
                const stickyClasses = col.stickyRight ? "sticky right-0 bg-gray-50 [.dark_&]:bg-[#1F2234]" : "";
                const headerAlign = col.headerAlign === "center" ? "text-center" : col.headerAlign === "right" ? "text-right" : "text-left";
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${headerAlign} text-xs font-semibold uppercase tracking-wide text-gray-500 [.dark_&]:text-gray-400 ${stickyClasses} ${col.headerClassName || ""}`}
                  >
                    {col.sortable ? (
                      <button
                        className="inline-flex items-center gap-2 hover:text-content-primary [.dark_&]:hover:text-white"
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
          <tbody className="divide-y divide-gray-100 [.dark_&]:divide-white/5">
            {pageRows.map((row, idx) => (
              <tr
                key={getRowKey(row, idx)}
                className={`hover:bg-gray-50 [.dark_&]:hover:bg-white/5 ${onRowClick ? "cursor-pointer group" : ""}`}
                onClick={onRowClick ? () => onRowClick(row, start + idx, idx) : undefined}
              >
                {columns.map((col) => {
                  const stickyClasses = col.stickyRight ? "sticky right-0 bg-white [.dark_&]:bg-[#181B2A]" : "";
                  const content = col.render ? col.render(row, start + idx, idx) : (row[col.key] ?? "—");
                  const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                  return (
                    <td key={col.key} className={`px-4 py-3 text-sm text-gray-700 [.dark_&]:text-gray-300 ${align} ${stickyClasses} ${col.cellClassName || ""}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-500 [.dark_&]:text-gray-400">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mt-4 text-sm text-content-secondary [.dark_&]:text-gray-400">
        <div>
          Page {clampedPage} of {totalPages}
        </div>
        <div className="flex items-center gap-3">
          <span>Rows per page</span>
          <select
            className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] px-2 py-1 text-sm [.dark_&]:text-white"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))}
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handlePrev}>Previous</Button>
            <Button variant="secondary" onClick={handleNext}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;

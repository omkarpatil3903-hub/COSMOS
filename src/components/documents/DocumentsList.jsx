/**
 * DocumentsList Component
 *
 * Purpose: Displays a searchable, sortable list of documents with actions.
 * Provides a simplified table view with inline search and controls.
 *
 * NOTE: This component uses hardcoded demo data. For production,
 * replace with actual Firestore data fetching.
 *
 * Responsibilities:
 * - Display documents in table format
 * - Search/filter by name, location, dates
 * - Sort by name (ascending/descending)
 * - Row click to view document
 * - Action menu for each row
 *
 * Dependencies:
 * - Button (UI component)
 * - react-icons (icons)
 *
 * Props:
 * - title: Section header text (default: "All Docs")
 * - onRowClick: Callback when document row is clicked
 *
 * Table Columns:
 * - Name: Document title with file icon
 * - Location: Folder or workspace location
 * - Tags: Document labels
 * - Date Updated: Last modification time
 * - Date Viewed: Last access time
 * - Sharing: Shared status indicator
 * - Actions: Ellipsis menu button
 *
 * Last Modified: 2026-01-10
 */

import React, { useMemo, useState } from "react";
import {
  FaFileAlt,
  FaFilter,
  FaSearch,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
  FaEllipsisH,
  FaCloudUploadAlt,
} from "react-icons/fa";
import Button from "../Button";

export default function DocumentsList({ title = "All Docs", onRowClick }) {
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const [rows] = useState([
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
  ]);

  const filtered = useMemo(() => {
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
    const sorted = [...list].sort(
      (a, b) => (a.name || "").localeCompare(b.name || "") * (sortAsc ? 1 : -1)
    );
    return sorted;
  }, [rows, query, sortAsc]);

  const handleRowClick = (doc) => {
    if (onRowClick) {
      onRowClick(doc);
    }
  };

  const handleActionClick = (e, docId) => {
    e.stopPropagation();
    console.log("Action clicked for:", docId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-content-primary">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2">
            <FaCloudUploadAlt /> Import
          </Button>
          <Button className="gap-2">New Doc</Button>
          <div className="relative ml-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="pl-9 pr-3 py-2 rounded-lg border border-subtle bg-surface text-sm w-48 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button className="px-3 py-1.5 rounded-full border border-subtle text-content-secondary hover:bg-surface-subtle">
          Filters
        </button>
        <button
          onClick={() => setSortAsc((s) => !s)}
          className="px-3 py-1.5 rounded-full border border-subtle text-content-secondary hover:bg-surface-subtle flex items-center gap-2"
        >
          {sortAsc ? <FaSortAmountUpAlt /> : <FaSortAmountDownAlt />} Sort
        </button>
        <button className="px-3 py-1.5 rounded-full border border-subtle text-content-secondary hover:bg-surface-subtle">
          Tags: <span className="underline ml-1">View all</span>
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[1000px] bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tags
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date updated
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date viewed
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sharing
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sticky right-0 bg-gray-50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer transition-colors group"
                onClick={() => handleRowClick(r)}
              >
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 max-w-[320px]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 transition-colors">
                      <FaFileAlt />
                    </span>
                    <span
                      className="truncate group-hover:text-blue-600 font-medium transition-colors"
                      title={r.name}
                    >
                      {r.name}
                    </span>
                    {r.children > 0 && (
                      <span className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">
                        {r.children}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  {r.location === "—" ? (
                    <span className="text-gray-400 group-hover:text-blue-400">
                      —
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs transition-colors">
                      {r.location}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  {r.tags?.length ? (
                    r.tags.join(", ")
                  ) : (
                    <span className="text-gray-400 group-hover:text-blue-400">
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  {r.updated}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  {r.viewed}
                </td>
                <td className="px-4 py-3 text-sm">
                  {r.shared ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors">
                      –
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right sticky right-0 bg-white transition-colors">
                  <button
                    onClick={(e) => handleActionClick(e, r.id)}
                    className="p-2 rounded-full hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <FaEllipsisH />
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  No documents
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

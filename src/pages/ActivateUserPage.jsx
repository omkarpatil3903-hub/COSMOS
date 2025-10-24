// src/pages/ActivateUserPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";
import { FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import {
  HiOutlineArrowDownTray,
  HiMiniArrowPath,
  HiPlusSmall,
} from "react-icons/hi2";

import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import UserModal from "../components/UserModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

const initialUsers = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `User Name ${i + 1}`,
  mobile: `98765432${String(i).padStart(2, "0")}`,
  village: i % 4 < 2 ? "Sangli" : "Miraj",
  booth: 101 + (i % 3),
  status: i % 5 === 0 ? "Inactive" : "Active",
}));

const tableHeaders = [
  { key: "name", label: "Name", sortable: true },
  { key: "mobile", label: "Mobile", sortable: true },
  { key: "village", label: "Village", sortable: true },
  { key: "booth", label: "Booth", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

function ActivateUserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUsers(initialUsers);
      setLoading(false);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.mobile.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((user) => user.status === statusFilter);
    }

    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;

      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * multiplier;
        }

        return String(aValue).localeCompare(String(bValue)) * multiplier;
      });
    }

    return result;
  }, [users, searchTerm, statusFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredUsers.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }

      return {
        key: columnKey,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSortConfig({ key: "name", direction: "asc" });
    setRowsPerPage(10);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!filteredUsers.length) {
      toast.error("No users available to export.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Field Users");

      worksheet.columns = [
        { header: "Name", key: "name", width: 26 },
        { header: "Mobile", key: "mobile", width: 18 },
        { header: "Village", key: "village", width: 18 },
        { header: "Booth", key: "booth", width: 12 },
        { header: "Status", key: "status", width: 12 },
      ];

      worksheet.addRows(filteredUsers);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-export-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Export started. Check your downloads");
    } catch (error) {
      console.error("Failed to export users", error);
      toast.error("Unable to export users.");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleOpenDeleteModal = (user) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = (userData) => {
    if (userData.id) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userData.id ? { ...user, ...userData } : user
        )
      );
      toast.success("User updated successfully!");
    } else {
      const newUser = { ...userData, id: Date.now() };
      setUsers((prev) => [newUser, ...prev]);
      toast.success("New user created successfully!");
    }

    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const confirmDelete = () => {
    if (!deletingUser) return;

    setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
    toast.error("User has been deleted.");
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
  };

  const sortIndicator = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }

    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Activate Users"
          actions={<Button disabled>Create New User</Button>}
        >
          Manage and assign roles to your field users.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Filter Users">
            <div className="h-12 w-full rounded-lg bg-surface-strong animate-pulse" />
          </Card>
          <Card title="User List">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-subtle">
                  <tr>
                    {tableHeaders.map((header) => (
                      <th
                        key={header.key}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-content-tertiary"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {Array.from({ length: rowsPerPage }).map((_, index) => (
                    <SkeletonRow key={index} columns={tableHeaders.length} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Activate Users"
        actions={
          <Button onClick={handleOpenCreateModal}>
            <HiPlusSmall className="h-4 w-4" aria-hidden="true" />
            Create New User
          </Button>
        }
      >
        Manage and assign roles to your field users.
      </PageHeader>

      <div className="space-y-6">
        <Card
          title="Filter Users"
          actions={
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium text-content-secondary"
                aria-live="polite"
              >
                Showing {filteredUsers.length} users
              </span>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="hidden sm:inline-flex"
              >
                <HiMiniArrowPath className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
              <Button onClick={handleExport}>
                <HiOutlineArrowDownTray
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Export
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Search by name or mobile
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                  <FaSearch className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Anil Deshmukh"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-3 sm:hidden">
            <Button variant="ghost" onClick={handleReset} className="flex-1">
              <HiMiniArrowPath className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
            <Button onClick={handleExport} className="flex-1">
              <HiOutlineArrowDownTray className="h-4 w-4" aria-hidden="true" />
              Export
            </Button>
          </div>
        </Card>

        <Card title="User List">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-content-secondary">
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-secondary">
                Rows per page
              </label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevPage}
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={currentPage === totalPages || !filteredUsers.length}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-subtle">
              <caption className="sr-only">
                Field user directory with search, filters, and pagination
              </caption>
              <thead className="bg-surface-subtle">
                <tr>
                  {tableHeaders.map((header) => {
                    const isActive = sortConfig.key === header.key;
                    const ariaSort = !header.sortable
                      ? "none"
                      : isActive
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";

                    return (
                      <th
                        key={header.key}
                        scope="col"
                        aria-sort={ariaSort}
                        className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-content-tertiary"
                      >
                        {header.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(header.key)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span>{header.label}</span>
                            <span className="text-xs text-indigo-600">
                              {sortIndicator(header.key)}
                            </span>
                          </button>
                        ) : (
                          header.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {currentRows.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-surface hover:bg-surface-subtle"
                  >
                    <td className="px-4 py-4 text-sm font-medium text-content-primary">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-content-secondary">
                      {user.mobile}
                    </td>
                    <td className="px-4 py-4 text-sm text-content-secondary">
                      {user.village}
                    </td>
                    <td className="px-4 py-4 text-sm text-content-secondary">
                      {user.booth}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-200 hover:text-indigo-500"
                        >
                          <FaEdit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <FaTrash className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!currentRows.length && (
                  <tr>
                    <td
                      colSpan={tableHeaders.length}
                      className="px-4 py-10 text-center text-sm text-content-secondary"
                    >
                      No users match the current filters. Adjust your criteria
                      or create a new user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {isUserModalOpen && (
        <UserModal
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
          userToEdit={editingUser}
        />
      )}

      {isDeleteModalOpen && deletingUser && (
        <DeleteConfirmationModal
          user={deletingUser}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export default ActivateUserPage;

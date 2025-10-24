// src/pages/ActivateUserPage.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";
import UserModal from "../components/UserModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

// Icons for actions
import { FaEdit, FaTrash, FaSearch } from "react-icons/fa";

// Placeholder Data
const initialUsers = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `User Name ${i + 1}`,
  mobile: `98765432${String(i).padStart(2, "0")}`,
  village: i % 4 < 2 ? "Sangli" : "Miraj",
  booth: 101 + (i % 3),
  status: i % 5 === 0 ? "Inactive" : "Active",
}));

function ActivateUserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // State to manage modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Simulate fetching data on component mount
  useEffect(() => {
    setTimeout(() => {
      setUsers(initialUsers);
      setFilteredUsers(initialUsers);
      setLoading(false);
    }, 1500); // Increased delay to better see skeleton
  }, []);

  // Search logic
  useEffect(() => {
    const result = users.filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [searchTerm, users]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredUsers.slice(indexOfFirstRow, indexOfLastRow);
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Modal handlers
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

  // Data action handlers with toast notifications
  const handleSaveUser = (userData) => {
    if (userData.id) {
      setUsers(
        users.map((u) => (u.id === userData.id ? { ...u, ...userData } : u))
      );
      toast.success("User updated successfully!");
    } else {
      const newUser = { ...userData, id: Date.now() };
      setUsers([...users, newUser]);
      toast.success("New user created successfully!");
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const confirmDelete = () => {
    setUsers(users.filter((u) => u.id !== deletingUser.id));
    toast.error("User has been deleted.");
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
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
            <div className="h-10 bg-gray-200 rounded-md animate-pulse w-1/3"></div>
          </Card>
          <Card title="User List">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Mobile
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Village
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Booth
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: rowsPerPage }).map((_, i) => (
                    <SkeletonRow key={i} columns={6} />
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
          <Button onClick={handleOpenCreateModal}>Create New User</Button>
        }
      >
        Manage and assign roles to your field users.
      </PageHeader>

      <div className="space-y-6">
        <Card
          title="Filter Users"
          actions={
            <h3 className="text-lg font-semibold text-gray-700">
              Total Users: {filteredUsers.length}
            </h3>
          }
        >
          <div className="relative w-full md:w-1/3">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search by user name..."
              className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        <Card title="User List">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-gray-700">
                Rows per page:
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-2 border-gray-300 rounded-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                variant="secondary"
                className="ml-4 !px-3 !py-1 text-sm"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                variant="secondary"
                className="ml-2 !px-3 !py-1 text-sm"
              >
                Next
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Village
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booth
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentRows.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 odd:bg-white even:bg-slate-50"
                  >
                    <td className="py-4 px-4 whitespace-nowrap">{user.name}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {user.mobile}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {user.village}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {user.booth}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm font-medium flex items-center gap-4">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(user)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <FaTrash /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-500">
                      No users found.
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
          onClose={() => setIsUserModalOpen(false)}
          onSave={handleSaveUser}
          userToEdit={editingUser}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          user={deletingUser}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export default ActivateUserPage;

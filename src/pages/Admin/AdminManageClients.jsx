// src/pages/ManageClients.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
  FaPlus,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { db, functions, storage } from "../../firebase";
import { app as primaryApp } from "../../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getApps, getApp, initializeApp as initApp } from "firebase/app";
import {
  getAuth as getAuthMod,
  createUserWithEmailAndPassword,
  signOut as signOutMod,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SkeletonRow from "../../components/SkeletonRow";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import ClientTableRow from "../../components/ManageClients/ClientTableRow";
import ClientFormModal from "../../components/ManageClients/ClientFormModal";
import ClientViewModal from "../../components/ManageClients/ClientViewModal";
import { useThemeStyles } from "../../hooks/useThemeStyles";

const CLIENTS_COLLECTION = "clients";

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "image", label: "Image", sortable: false },
  { key: "companyName", label: "Company Name", sortable: true },
  { key: "clientName", label: "Client Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "contactNo", label: "Contact No", sortable: true },
  { key: "typeOfBusiness", label: "Business Type", sortable: true },
  { key: "noOfEmployees", label: "Employees", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

function ManageClients() {
  const { buttonClass } = useThemeStyles();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Operation Loading States
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Table States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "clientName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- 1. Data Fetching ---
  useEffect(() => {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy("companyName"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            joinDate:
              data.joinDate instanceof Timestamp
                ? data.joinDate.toDate()
                : null,
          };
        });
        setClients(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load clients:", err);
        toast.error("Failed to load clients");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // --- 2. Filtering & Sorting ---
  const filteredClients = useMemo(() => {
    let result = [...clients];
    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(term) ||
          c.companyName?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
      );
    }
    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;
      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];
        if (typeof aValue === "number" && typeof bValue === "number")
          return (aValue - bValue) * multiplier;
        return String(aValue).localeCompare(String(bValue)) * multiplier;
      });
    }
    return result;
  }, [clients, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  // --- 3. Pagination Logic ---
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredClients.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction:
        prev?.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // --- 4. Action Handlers ---

  // Create New Client (Auth + Firestore)
  const handleFormSubmit = async (submittedData) => {
    try {
      setIsAdding(true);

      // Password validation regex
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
      if (!passwordRegex.test(submittedData.password)) {
        setFormErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-)."
        }));
        setIsAdding(false);
        return;
      }

      // 1. Create Auth User (Secondary App to avoid logging out admin)
      const secondaryName = "Secondary";
      const secondaryApp = getApps().some((a) => a.name === secondaryName)
        ? getApp(secondaryName)
        : initApp(primaryApp.options, secondaryName);
      const secondaryAuth = getAuthMod(secondaryApp);

      const email = submittedData.email?.toLowerCase().trim() || "";

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        submittedData.password
      );
      const uid = cred.user.uid;

      // 2. Upload profile image (if provided) to Storage
      let uploadedUrl = "";
      let storagePath = "";
      if (submittedData.imageUrl) {
        try {
          const blob = await (await fetch(submittedData.imageUrl)).blob();
          const mime = blob.type || "image/png";
          const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png");
          const path = `profiles/client/${email}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, blob, { contentType: mime });
          uploadedUrl = await getDownloadURL(storageRef);
          storagePath = path;
        } catch (uploadErr) {
          console.error("Failed to upload client logo:", uploadErr);
        }
      }

      // 3. Create Firestore Document
      await setDoc(doc(db, CLIENTS_COLLECTION, uid), {
        ...submittedData,
        imageUrl: uploadedUrl,
        imageStoragePath: storagePath,
        email,
        // Ensure we store the password for dev reference (as per your original requirement)
        password: submittedData.password || "******",
        status: "Active",
        joinDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uid,
      });

      await signOutMod(secondaryAuth);
      setShowAddForm(false);
      toast.success("Client added successfully!");
    } catch (error) {
      console.error("Failed to add client", error);
      toast.error("Failed to add client: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Prepare Edit
  const handleEdit = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowEditForm(true);
  };

  // Update Existing Client
  const handleEditSubmit = async (submittedData) => {
    if (!selectedClient) return;
    try {
      setIsUpdating(true);
      // Remove password from update if not provided or needed
      if (submittedData.password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
        if (!passwordRegex.test(submittedData.password)) {
          setFormErrors((prev) => ({
            ...prev,
            password: "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-)."
          }));
          setIsUpdating(false);
          return;
        }
      }
      const { password, ...rest } = submittedData;
      const updateData = {
        ...rest,
        ...(submittedData.email
          ? { email: submittedData.email.toLowerCase().trim() }
          : {}),
      };

      // Handle image update
      if (submittedData.imageUrl === "") {
        // Image removed: delete from Storage and clear Firestore fields
        const oldPath = selectedClient.imageStoragePath || "";
        if (oldPath) {
          try {
            await deleteObject(ref(storage, oldPath));
          } catch (delErr) {
            console.error("Failed to delete image from storage:", delErr);
            toast.error("Warning: Could not delete old image from storage");
          }
        }
        updateData.imageUrl = "";
        updateData.imageStoragePath = "";
      } else if (submittedData.imageUrl && submittedData.imageUrl.startsWith("data:")) {
        try {
          // Delete all existing profile image variants before uploading new one
          const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          const email = submittedData.email || selectedClient.email;
          for (const ext of extensions) {
            const oldPath = `profiles/client/${email}.${ext}`;
            try {
              await deleteObject(ref(storage, oldPath));
              console.log(`Deleted old client image: ${oldPath}`);
            } catch (err) {
              // Silently ignore - file might not exist
            }
          }

          const blob = await (await fetch(submittedData.imageUrl)).blob();
          const mime = blob.type || "image/png";
          const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png");
          const path = `profiles/client/${email}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, blob, { contentType: mime });
          const url = await getDownloadURL(storageRef);
          updateData.imageUrl = url;
          updateData.imageStoragePath = path;
        } catch (uploadErr) {
          console.error("Failed to upload client logo:", uploadErr);
        }
      }

      if (submittedData.password) {
        // Call Cloud Function to update Auth password
        try {
          const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
          await updateUserPassword({ uid: selectedClient.id, password: submittedData.password });
          toast.success("Password updated in Auth system");

          // Also update password in Firestore
          updateData.password = submittedData.password;
        } catch (authError) {
          console.error("Failed to update Auth password:", authError);
          toast.error(`Failed to update Auth password: ${authError.message}`);
        }
      }

      await updateDoc(doc(db, CLIENTS_COLLECTION, selectedClient.id), {
        ...updateData,
        updatedAt: serverTimestamp(),
      });

      setShowEditForm(false);
      setSelectedClient(null);
      toast.success("Client updated successfully!");
    } catch (error) {
      console.error("Failed to update client", error);
      toast.error("Failed to update client");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Logic
  const handleDelete = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    try {
      setIsDeleting(true);

      // 1. Delete from Auth (Cloud Function)
      try {
        const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');
        await deleteUserAuth({ uid: selectedClient.id });
        console.log("Auth deletion successful");
      } catch (authError) {
        console.error("Auth deletion failed:", authError);
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, CLIENTS_COLLECTION, selectedClient.id));
      setShowDeleteModal(false);
      setSelectedClient(null);
      toast.success("Client deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (id) => {
    const client = clients.find((c) => c.id === id);
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const sortIndicator = (columnKey) => {
    if (sortConfig?.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <FaSortAmountUpAlt className="h-4 w-4" />
    ) : (
      <FaSortAmountDownAlt className="h-4 w-4" />
    );
  };

  if (loading) return <SkeletonLoader />; // Simplified for brevity

  return (
    <>
      <PageHeader title="Manage Clients">
        Search and manage all company clients and organizations.
      </PageHeader>

      <div className="space-y-6">
        <Card
          title="Search & Actions"
          actions={
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-content-secondary">
                Showing {filteredClients.length} records
              </span>
              <Button onClick={() => { setShowAddForm(true); setFormErrors({}); }} variant="custom" className={buttonClass}>
                <FaPlus className="h-4 w-4" /> Add Client
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Search by company, client name or email
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                  <FaSearch className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. TechCorp or John Doe"
                  spellCheck="true"
                />
              </div>
            </label>
          </div>
        </Card>

        <Card title="Client List">
          {/* Pagination Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="text-sm text-content-secondary">
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevPage}
                  variant="secondary"
                  disabled={currentPage === 1}
                  className="px-3 py-1"
                >
                  Prev
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  className="px-3 py-1"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Client Table */}
          <div className="w-full overflow-x-auto rounded-lg border border-subtle shadow-sm">
            <table className="min-w-full divide-y divide-subtle bg-surface">
              <thead className="bg-surface-subtle">
                <tr>
                  {tableHeaders.map((header) => (
                    <th
                      key={header.key}
                      className={`px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-content-secondary border-b border-subtle ${header.key === "actions"
                        ? "sticky right-0 z-10 bg-surface-subtle"
                        : ""
                        }`}
                    >
                      {header.sortable ? (
                        <button
                          onClick={() => handleSort(header.key)}
                          className="flex items-center gap-2 hover:text-indigo-600"
                        >
                          {header.label} {sortIndicator(header.key)}
                        </button>
                      ) : (
                        header.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle bg-surface">
                {currentRows.map((client, index) => (
                  <ClientTableRow
                    key={client.id}
                    client={client}
                    index={indexOfFirstRow + index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                  />
                ))}
                {!currentRows.length && (
                  <tr>
                    <td
                      colSpan={tableHeaders.length}
                      className="px-6 py-16 text-center text-content-tertiary"
                    >
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <ClientFormModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleFormSubmit}
        isSubmitting={isAdding}
        mode="add"
        errors={formErrors}
        onClearError={(field) => setFormErrors((prev) => ({ ...prev, [field]: "" }))}
      />

      <ClientFormModal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedClient(null);
        }}
        onSubmit={handleEditSubmit}
        initialData={selectedClient}
        isSubmitting={isUpdating}
        mode="edit"
        errors={formErrors}
        onClearError={(field) => setFormErrors((prev) => ({ ...prev, [field]: "" }))}
      />

      <ClientViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
      />

      {showDeleteModal && selectedClient && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowDeleteModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              itemType="client profile"
              itemTitle={selectedClient.companyName}
              title="Delete Client"
              description="Are you sure you want to permanently delete this client profile?"
              confirmLabel="Delete Client"
              isLoading={isDeleting}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={confirmDelete}
            />
          </div>
        </div>
      )}
    </>
  );
}

const SkeletonLoader = () => (
  <div className="space-y-6">
    <PageHeader title="Manage Clients">Loading...</PageHeader>
    <Card title="Loading Data...">
      <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
    </Card>
  </div>
);

export default ManageClients;

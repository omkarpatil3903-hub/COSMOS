import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import toast from "react-hot-toast";
import { db } from "../../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { FaTimes, FaEdit, FaTrash, FaPlus, FaSearch, FaSave } from "react-icons/fa";

export default function StatusSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    item: null,
    loading: false,
  });

  // Load Status list from Firestore
  useEffect(() => {
    const ref = doc(db, "settings", "task-statuses");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const statuses = Array.isArray(d.statuses) ? d.statuses : [];
      const list = statuses
        .filter((s) => s && s.name)
        .map((s, idx) => ({
          id: s.id || `status_${idx}_${s.name}`.replace(/\s+/g, "-"),
          name: s.name,
          color: s.color || "", // optional future use
        }));
      setItems(list);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, filtered.length]);

  const close = () => {
    const p = new URLSearchParams(location.search);
    if (p.has("add")) {
      p.delete("add");
      navigate(
        {
          pathname: location.pathname,
          search: p.toString() ? `?${p.toString()}` : "",
        },
        { replace: true }
      );
    }
    setOpen(false);
    setValue("");
    setEditing(null);
  };

  const save = async () => {
    const v = value.trim();
    if (!v) {
      toast.error("Enter a status name");
      return;
    }
    const exists = items.some(
      (it) => it.name.toLowerCase() === v.toLowerCase() && (!editing || it.id !== editing.id)
    );
    if (exists) {
      toast.error("Status already exists");
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, "settings", "task-statuses");
      if (editing) {
        await setDoc(
          ref,
          {
            statuses: arrayRemove({ name: editing.name, color: editing.color || "" }),
          },
          { merge: true }
        );
      }
      await setDoc(
        ref,
        {
          statuses: arrayUnion({ name: v }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Status saved");
      close();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save status");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setValue("");
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setValue(item.name || "");
    setOpen(true);
  };

  const confirmDelete = (item) => {
    setDeleteModal({ open: true, item, loading: false });
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      const ref = doc(db, "settings", "task-statuses");
      await setDoc(
        ref,
        {
          statuses: arrayRemove({ name: deleteModal.item.name, color: deleteModal.item.color || "" }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Status deleted");
      setDeleteModal({ open: false, item: null, loading: false });
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete status");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <Card
        title="Search & Actions"
        tone="white"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-content-secondary">
              Showing {filtered.length} records
            </span>
            <Button variant="primary" onClick={openAdd} className="shrink-0">
              <FaPlus /> Add Status
            </Button>
          </div>
        }
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
          Search by status name
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary">
              <FaSearch />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by status name"
              className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </label>
      </Card>

      {/* Status table (single main section like Project Level) */}
      <Card title="Status" tone="muted">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
          <div className="text-sm text-content-secondary">
            Page {Math.min(page, totalPages)} of {totalPages}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="px-3 py-1"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                  Sr. No.
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                  Status Name
                </th>
                <th className="px-6 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 sticky right-0 z-10 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-sm text-content-tertiary"
                  >
                    No statuses found.
                  </td>
                </tr>
              ) : (
                pageItems.map((it, idx) => (
                  <tr
                    key={it.id}
                    onClick={() => setPreview(it)}
                    className="cursor-pointer group odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50 transition-colors duration-150"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm font-medium text-gray-500">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 transition-colors">
                        {(page - 1) * pageSize + idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-2.5">
                      <div
                        className="max-w-[200px] text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors"
                        title={it.name}
                      >
                        {it.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm sticky right-0 z-10 bg-transparent transition-colors">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(it);
                          }}
                          className="flex items-center justify-center p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(it);
                          }}
                          className="flex items-center justify-center p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Status" : "Add Status"}
              </h2>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={close}
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Status Name
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-lg border border-subtle px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. On Hold, Awaiting Client, In QA"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <FaPlus className="animate-spin" /> : <FaSave />}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal.open && (
        <DeleteConfirmationModal
          isOpen={deleteModal.open}
          title="Delete Status"
          message={`Are you sure you want to delete status "${deleteModal.item?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          confirmTone="danger"
          onCancel={() =>
            setDeleteModal({ open: false, item: null, loading: false })
          }
          onConfirm={handleDelete}
          isLoading={deleteModal.loading}
        />
      )}

      {/* Preview simple modal */}
      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Status Preview</h2>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setPreview(null)}
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-content-primary">
              {preview.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

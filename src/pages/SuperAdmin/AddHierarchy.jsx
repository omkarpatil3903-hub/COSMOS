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
import {
  FaTimes,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaSearch,
} from "react-icons/fa";
import VoiceInput from "../../components/Common/VoiceInput";

export default function AddHierarchy() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("admin");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [preview, setPreview] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    item: null,
    loading: false,
  });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("add") === "1") setOpen(true);
  }, [location.search]);

  useEffect(() => {
    const ref = doc(db, "settings", "hierarchy");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const roles = Array.isArray(d.roles) ? d.roles : [];
      let list = [];
      if (roles.length > 0) {
        list = roles
          .filter((r) => r && r.name && r.role)
          .map((r) => ({
            id: `${(r.role || "r")}_${r.name}`,
            type: (r.role || "").toLowerCase(),
            name: r.name,
          }));
      } else {
        // Legacy fallback for existing data
        const sup = Array.isArray(d.superior) ? d.superior : [];
        const inf = Array.isArray(d.inferior) ? d.inferior : [];
        const adminArr = Array.isArray(d.admin) ? d.admin : [];
        const memberArr = Array.isArray(d.member) ? d.member : [];
        const adminSet = new Set([...(adminArr || []), ...(sup || [])]);
        const memberSet = new Set([...(memberArr || []), ...(inf || [])]);
        list = [
          ...Array.from(adminSet).map((v) => ({
            id: `a_${v}`,
            type: "admin",
            name: v,
          })),
          ...Array.from(memberSet).map((v) => ({
            id: `m_${v}`,
            type: "member",
            name: v,
          })),
        ];
      }
      setItems(list);
    });
    return () => unsub();
  }, []);

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
  };

  const save = async () => {
    const v = value.trim();
    if (!v) {
      toast.error("Enter a value");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "settings", "hierarchy");
      const field = type;
      if (editing) {
        await setDoc(
          ref,
          { roles: arrayRemove({ name: editing.name, role: editing.type }) },
          { merge: true }
        );
      }
      await setDoc(
        ref,
        {
          roles: arrayUnion({ name: v, role: field }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Saved");
      close();
      setEditing(null);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setType(item.type);
    setValue(item.name);
    setOpen(true);
  };

  const removeItem = async (item) => {
    try {
      const ref = doc(db, "settings", "hierarchy");
      await setDoc(
        ref,
        {
          roles: arrayRemove({ name: item.name, role: item.type }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((m) => ({ ...m, loading: true }));
    await removeItem(deleteModal.item);
    setDeleteModal({ open: false, item: null, loading: false });
  };

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (x) =>
        x.name.toLowerCase().includes(s) || x.type.toLowerCase().includes(s)
    );
  }, [items, query]);
  const ordered = useMemo(() => {
    const order = { superadmin: 0, admin: 1, manager: 2, member: 3 };
    return [...filtered].sort((a, b) => {
      const ao = order[a.type] ?? 99;
      const bo = order[b.type] ?? 99;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);
  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ordered.slice(start, start + pageSize);
  }, [ordered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, filtered.length]);

  const openCreate = () => {
    const p = new URLSearchParams(location.search);
    p.set("add", "1");
    navigate(
      { pathname: location.pathname, search: `?${p.toString()}` },
      { replace: true }
    );
    setOpen(true);
  };

  const handleRowClick = (item) => {
    setPreview(item);
  };

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    startEdit(item);
  };

  const handleDeleteClick = (item, e) => {
    e.stopPropagation();
    setDeleteModal({ open: true, item });
  };

  return (
    <div className="space-y-6">
      <Card
        title="Search & Actions"
        tone="white"
        className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-content-secondary [.dark_&]:text-gray-400">
              Showing {filtered.length} records
            </span>
            <Button variant="primary" onClick={openCreate} className="shrink-0">
              <FaPlus /> Add Hierarchy
            </Button>
          </div>
        }
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
          Search by hierarchy type or name
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary [.dark_&]:text-gray-500">
              <FaSearch />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by type or name"
              className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white [.dark_&]:placeholder-gray-500"
            />
          </div>
        </label>
      </Card>

      <Card title="Hierarchy List" tone="muted" className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
          <div className="text-sm text-content-secondary [.dark_&]:text-gray-400">
            Page {Math.min(page, totalPages)} of {totalPages}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
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

        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm [.dark_&]:border-white/10">
          <table className="min-w-full divide-y divide-gray-200 bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 [.dark_&]:from-[#1F2234] [.dark_&]:to-[#1F2234]">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Sr. No.
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Name
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Type
                </th>
                <th className="px-6 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 sticky right-0 z-10 bg-gray-50 [.dark_&]:bg-[#1F2234] [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5">
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-content-tertiary"
                  >
                    No items
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="cursor-pointer group odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50 transition-colors duration-150 [.dark_&]:odd:bg-[#181B2A] [.dark_&]:even:bg-[#1F2234]"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 transition-colors [.dark_&]:bg-white/10 [.dark_&]:text-white">
                        {(page - 1) * pageSize + idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors [.dark_&]:text-white">
                      <div className="max-w-[240px] truncate">{item.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm">
                      <span
                        className={`inline-flex items-center justify-center rounded-xs px-3 py-1 text-xs font-semibold tracking-wide uppercase transition-colors ${item.type === "admin"
                          ? "bg-blue-500 text-white"
                          : item.type === "superadmin"
                            ? "bg-purple-500 text-white"
                            : item.type === "manager"
                              ? "bg-green-500 text-white"
                              : "bg-gray-600 text-white"
                          }`}
                      >
                        {item.type === "admin"
                          ? "Admin Role"
                          : item.type === "superadmin"
                            ? "Super Admin Role"
                            : item.type === "manager"
                              ? "Manager Role"
                              : "Member Role"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm sticky right-0 z-10 bg-transparent transition-colors">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={(e) => handleEditClick(item, e)}
                          className="flex items-center justify-center p-2 rounded-full text-yellow-600 hover:bg-yellow-100 shadow-md transition-colors [.dark_&]:hover:bg-yellow-400/20"
                          title="Edit"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(item, e)}
                          className="flex items-center justify-center p-2 rounded-full text-red-600 hover:bg-red-100 shadow-md transition-colors [.dark_&]:hover:bg-red-400/20"
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

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-xl font-semibold">Create Hierarchy</h3>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="grid grid-cols-4 rounded-full bg-gray-100 p-1 text-sm font-medium [.dark_&]:bg-[#1F2234]">
                <button
                  onClick={() => setType("superadmin")}
                  className={`rounded-full px-4 py-2 transition ${type === "superadmin"
                    ? "bg-white shadow-sm text-gray-900 [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
                    : "text-gray-500 [.dark_&]:text-gray-400"
                    }`}
                >
                  Super Admin Role
                </button>
                <button
                  onClick={() => setType("admin")}
                  className={`rounded-full px-4 py-2 transition ${type === "admin"
                    ? "bg-white shadow-sm text-gray-900 [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
                    : "text-gray-500 [.dark_&]:text-gray-400"
                    }`}
                >
                  Admin Role
                </button>
                <button
                  onClick={() => setType("manager")}
                  className={`rounded-full px-4 py-2 transition ${type === "manager"
                    ? "bg-white shadow-sm text-gray-900 [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
                    : "text-gray-500 [.dark_&]:text-gray-400"
                    }`}
                >
                  Manager Role
                </button>
                <button
                  onClick={() => setType("member")}
                  className={`rounded-full px-4 py-2 transition ${type === "member"
                    ? "bg-white shadow-sm text-gray-900 [.dark_&]:bg-[#181B2A] [.dark_&]:text-white"
                    : "text-gray-500 [.dark_&]:text-gray-400"
                    }`}
                >
                  Member Role
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium mb-1 [.dark_&]:text-gray-300">
                {type === "admin"
                  ? "Add Admin Role"
                  : type === "superadmin"
                    ? "Add Super Admin Role"
                    : type === "manager"
                      ? "Add Manager Role"
                      : "Add Member Role"}
              </label>
              <VoiceInput
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
                placeholder={
                  type === "admin"
                    ? "e.g., Admin"
                    : type === "superadmin"
                      ? "e.g., Super Admin"
                      : type === "manager"
                        ? "e.g., Manager"
                        : "e.g., Member"
                }
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <Button variant="ghost" onClick={close} className="[.dark_&]:text-gray-300 [.dark_&]:hover:bg-white/10">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} variant="primary">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/30"
          onClick={() =>
            setDeleteModal({ open: false, item: null, loading: false })
          }
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              onClose={() =>
                setDeleteModal({ open: false, item: null, loading: false })
              }
              onConfirm={handleConfirmDelete}
              itemType="hierarchy role"
              title="Delete Hierarchy"
              description="Are you sure you want to delete this role from the hierarchy?"
              itemTitle={deleteModal.item?.name}
              itemSubtitle={
                deleteModal.item?.type === "admin"
                  ? "Admin Role"
                  : deleteModal.item?.type === "superadmin"
                    ? "Super Admin Role"
                    : "Member Role"
              }
              confirmLabel="Delete"
              isLoading={deleteModal.loading}
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl [.dark_&]:bg-[#181B2A] [.dark_&]:border [.dark_&]:border-white/10">
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-xl font-semibold [.dark_&]:text-white">Preview</h3>
              <button
                onClick={() => setPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-content-secondary [.dark_&]:text-gray-400">Name</span>
                <span className="font-medium [.dark_&]:text-white">{preview.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-secondary [.dark_&]:text-gray-400">Type</span>
                <span className="font-medium [.dark_&]:text-white">
                  {preview.type === "admin"
                    ? "Admin Role"
                    : preview.type === "superadmin"
                      ? "Super Admin Role"
                      : "Member Role"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <Button variant="ghost" onClick={() => setPreview(null)} className="[.dark_&]:text-gray-300 [.dark_&]:hover:bg-white/10">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

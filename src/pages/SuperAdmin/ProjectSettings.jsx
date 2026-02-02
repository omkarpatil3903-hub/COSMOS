import React, { useMemo, useState, useEffect } from "react";
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
import { FaTimes, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import VoiceInput from "../../components/Common/VoiceInput";
import { useThemeStyles } from "../../hooks/useThemeStyles";

export default function ProjectSettings() {
  const { buttonClass } = useThemeStyles();
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
  const [level, setLevel] = useState("");
  const [levelError, setLevelError] = useState("");

  // Load Project Levels from Firestore
  useEffect(() => {
    const ref = doc(db, "settings", "project-levels");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const levels = Array.isArray(d.levels) ? d.levels : [];
      const list = levels
        .filter((r) => r && r.name)
        .map((r) => ({
          id: `lvl_${r.level ?? ""}_${r.name}`.replace(/\s+/g, "-"),
          type: "level",
          name: r.name,
          level: r.level ?? "",
        }));
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
    setEditing(null);
    setLevel("");
    setLevelError("");
  };

  const save = async () => {
    const v = value.trim();
    const lvInput = String(level).trim();
    setLevelError("");
    if (!v) {
      toast.error("Enter a name");
      return;
    }
    if (!lvInput) {
      setLevelError("Enter a level");
      return;
    }
    if (!/^\d+$/.test(lvInput)) {
      setLevelError("Level must be a number");
      return;
    }
    const lv = lvInput;
    const exists = items.some(
      (it) =>
        String(it.level) === lv && (!editing || it.id !== editing.id)
    );
    if (exists) {
      setLevelError("Level already exists");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "settings", "project-levels");
      if (editing) {
        // remove both possible legacy and new shapes
        await setDoc(
          ref,
          {
            levels: arrayRemove(
              { name: editing.name, level: editing.level },
              { name: editing.name }
            ),
          },
          { merge: true }
        );
      }
      await setDoc(
        ref,
        {
          levels: arrayUnion({ name: v, level: lv }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Saved");
      close();
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setValue(item.name);
    setLevel(item.level ?? "");
    setOpen(true);
  };

  const removeItem = async (item) => {
    try {
      const ref = doc(db, "settings", "project-levels");
      await setDoc(
        ref,
        {
          levels: arrayRemove(
            { name: item.name, level: item.level },
            { name: item.name }
          ),
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
    const base = s
      ? items.filter(
        (x) =>
          (x.name || "").toLowerCase().includes(s) ||
          (x.level || "").toLowerCase().includes(s)
      )
      : [...items];
    const getNum = (val) => {
      const m = String(val ?? "").match(/\d+(?:\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    };
    base.sort((a, b) => {
      const na = getNum(a.level);
      const nb = getNum(b.level);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      if (!Number.isNaN(na) && Number.isNaN(nb)) return -1;
      if (Number.isNaN(na) && !Number.isNaN(nb)) return 1;
      const lv = String(a.level || "").localeCompare(String(b.level || ""));
      if (lv !== 0) return lv;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return base;
  }, [items, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

            <Button variant="custom" className={`shrink-0 ${buttonClass}`} onClick={openCreate}>
              <FaPlus /> Add Project Level
            </Button>
          </div>
        }
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
          Search by level name
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary [.dark_&]:text-gray-500">
              <FaSearch />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by level name"
              className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white [.dark_&]:placeholder-gray-500"
            />
          </div>
        </label>
      </Card>

      <Card
        title="Project Level"
        tone="muted"
        className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
        actions={
          <div className="text-sm font-medium text-gray-500 [.dark_&]:text-gray-400">
            Showing {filtered.length} records
          </div>
        }
      >


        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm [.dark_&]:border-white/10">
          <table className="min-w-full divide-y divide-gray-200 bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 [.dark_&]:from-[#1F2234] [.dark_&]:to-[#1F2234]">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Sr. No.
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Level
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 [.dark_&]:text-gray-400 [.dark_&]:border-white/10">
                  Name
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
                    <td className="px-6 py-2.5">
                      <div
                        className="max-w-[100px] text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors [.dark_&]:text-white"
                        title={item.level || "-"}
                      >
                        {item.level || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-2.5">
                      <div
                        className="max-w-[200px] text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors [.dark_&]:text-white"
                        title={item.name}
                      >
                        {item.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-sm sticky right-0 z-10 group-odd:bg-white group-even:bg-gray-50 [.dark_&]:group-odd:bg-[#181B2A] [.dark_&]:group-even:bg-[#1F2234] transition-colors">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mt-4">
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
      </Card>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl [.dark_&]:bg-[#181B2A] [.dark_&]:border [.dark_&]:border-white/10">
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-xl font-semibold [.dark_&]:text-white">
                {editing ? "Edit Project Level" : "Create Project Level"}
              </h3>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium [.dark_&]:text-gray-300">
                  Project Level
                  <input
                    type="text"
                    value={level}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setLevel(val);
                      if (levelError) setLevelError("");
                    }}
                    className={`mt-1 w-full rounded border px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [.dark_&]:bg-[#1F2234] [.dark_&]:text-white ${levelError ? "border-red-500" : "border-gray-300 [.dark_&]:border-white/10"
                      }`}
                    placeholder="e.g., 1, 2, 3..."
                  />
                  {levelError && (
                    <div className="mt-1 text-xs text-red-600">
                      {levelError}
                    </div>
                  )}
                </label>
                <label className="block text-sm font-medium [.dark_&]:text-gray-300">
                  Name
                  <VoiceInput
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white"
                    placeholder="e.g., Discovery"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <Button variant="ghost" onClick={close} className="[.dark_&]:text-gray-300 [.dark_&]:hover:bg-white/10">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} variant="custom" className={buttonClass}>
                {saving ? (editing ? "Updating..." : "Saving...") : (editing ? "Update" : "Save")}
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
              itemType="project level"
              title="Delete Project Level"
              description="Are you sure you want to delete this project level?"
              itemTitle={deleteModal.item?.name}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1 [.dark_&]:text-gray-400">Name</div>
                  <div className="font-medium [.dark_&]:text-white">{preview?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 [.dark_&]:text-gray-400">Type</div>
                  <div className="font-medium [.dark_&]:text-white">Project Level</div>
                </div>
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

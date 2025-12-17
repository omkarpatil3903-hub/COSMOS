import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaEdit, FaLightbulb, FaTrash, FaUser } from "react-icons/fa";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

export default function SuperAdminKnowledgePage() {
  const [knowledge, setKnowledge] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    // Global knowledge list for Super Admin/Admin
    const col = collection(db, "knowledge");
    const qy = query(col);
    const unsub = onSnapshot(qy, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        const uts = data.updatedAt || data.createdAt;
        let updated = "";
        if (uts && typeof uts.toDate === "function") updated = uts.toDate().toLocaleDateString();
        else if (uts) updated = new Date(uts).toLocaleDateString();
        const cts = data.createdAt;
        let created = "";
        if (cts && typeof cts.toDate === "function") created = cts.toDate().toLocaleDateString();
        else if (cts) created = new Date(cts).toLocaleDateString();
        return {
          id: d.id,
          title: data.title || "",
          description: data.description || "",
          created,
          updated,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          createdByName: data.createdByName || "",
          updatedByName: data.updatedByName || "",
        };
      });
      setKnowledge(list);
    });
    return () => unsub();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = knowledge;
    if (q) {
      list = list.filter((k) =>
        [k.title, k.description, k.createdByName, k.updatedByName].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
      );
    }
    const { key, dir } = sort || { key: "createdAt", dir: "desc" };
    const mult = dir === "asc" ? 1 : -1;
    const getVal = (k) => {
      if (key === "title") return String(k.title || "").toLowerCase();
      if (key === "updatedAt")
        return k.updatedAt?.toMillis?.()
          ? k.updatedAt.toMillis()
          : k.updatedAt
          ? new Date(k.updatedAt).getTime()
          : 0;
      return k.createdAt?.toMillis?.()
        ? k.createdAt.toMillis()
        : k.createdAt
        ? new Date(k.createdAt).getTime()
        : 0;
    };
    return [...list].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av).localeCompare(String(bv)) * mult;
    });
  }, [knowledge, search, sort]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (clampedPage - 1) * rowsPerPage;
  const pageRows = filteredSorted.slice(start, start + rowsPerPage);

  const handleAdd = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const handleEdit = (k) => {
    setEditing(k);
    setOpenModal(true);
  };

  const handleDelete = (k) => {
    setDeleteTarget(k);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (form) => {
    try {
      if (editing && editing.id) {
        const ref = doc(db, "knowledge", editing.id);
        await updateDoc(ref, {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          updatedAt: serverTimestamp(),
          updatedByUid: auth.currentUser?.uid || "",
          updatedByName: editing.updatedByName || editing.createdByName || "",
        });
      } else {
        await addDoc(collection(db, "knowledge"), {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: auth.currentUser?.uid || "",
          createdByName: auth.currentUser?.displayName || "",
        });
      }
    } catch (e) {
      console.error("Failed to save knowledge", e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "knowledge", deleteTarget.id));
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error("Failed to delete knowledge", e);
    }
  };

  return (
    <>
      <Card title="Search & Actions" tone="muted">
        <SearchActions
          value={search}
          onChange={setSearch}
          placeholder="Search by title or description"
          rightActions={<Button onClick={handleAdd}>+ Add Knowledge</Button>}
        />
      </Card>

      <Card title="Knowledge" tone="muted">
        <div className="flex items-center justify-between mb-3 text-sm text-content-secondary">
          <div>
            Page {clampedPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Sort by</span>
              <select
                className="rounded-md border border-subtle bg-white px-2 py-1 text-sm"
                value={`${sort.key}:${sort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":");
                  setSort({ key, dir });
                  setPage(1);
                }}
              >
                <option value="createdAt:desc">Newest</option>
                <option value="createdAt:asc">Oldest</option>
                <option value="updatedAt:desc">Recently Updated</option>
                <option value="updatedAt:asc">Least Recently Updated</option>
                <option value="title:asc">Title A→Z</option>
                <option value="title:desc">Title Z→A</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Cards per page</span>
              <select
                className="rounded-md border border-subtle bg-white px-2 py-1 text-sm"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(1);
                }}
              >
                {[6, 12, 18].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" onClick={() => setPage(Math.max(1, clampedPage - 1))}>
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(Math.min(totalPages, clampedPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((k) => (
            <div
              key={k.id}
              className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm min-h-[280px]"
            >
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow hover:bg-gray-50"
                  title="Edit"
                  onClick={() => handleEdit(k)}
                >
                  <FaEdit className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow hover:bg-red-50"
                  title="Delete"
                  onClick={() => handleDelete(k)}
                >
                  <FaTrash className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2 pr-16">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 text-violet-600 border border-violet-200">
                  <FaLightbulb className="h-4 w-4" />
                </span>
                <h3
                  className="text-lg font-semibold leading-snug text-gray-900 truncate max-w-[200px]"
                  title={k.title}
                >
                  {k.title.length > 10 ? `${k.title.substring(0, 10)}...` : k.title}
                </h3>
              </div>
              <hr className="my-3 border-t border-gray-200" />
              <p className="mt-1 mb-3 text-sm md:text-[0.95rem] leading-relaxed text-gray-800 line-clamp-4 whitespace-pre-wrap">
                {k.description}
              </p>
              <hr className="my-3 border-t border-gray-200" />
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                {k.created && (
                  <span className="inline-flex items-center gap-1.5">
                    <FaCalendarAlt className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium text-gray-700">{k.created}</span>
                  </span>
                )}
                {k.createdByName && (
                  <span className="inline-flex items-center gap-1.5">
                    <FaUser className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">By</span>
                    <span className="font-medium text-gray-700">{k.createdByName}</span>
                  </span>
                )}
                {k.updated && (
                  <span className="inline-flex items-center gap-1.5">
                    <FaClock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Updated</span>
                    <span className="font-medium text-gray-700">{k.updated}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
          {!pageRows.length && (
            <div className="col-span-full text-center text-sm text-gray-500 py-10">
              No knowledge found
            </div>
          )}
        </div>
      </Card>

      {openModal && (
        <AddKnowledgeModal
          isOpen={openModal}
          onClose={() => {
            setOpenModal(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          initialItem={editing}
          projectId={null}
          canEditAccess={true}
        />
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowDeleteModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleConfirmDelete}
              itemType="knowledge entry"
              title="Delete Knowledge"
              description="Are you sure you want to permanently delete this knowledge entry?"
              itemTitle={deleteTarget?.title}
              confirmLabel="Delete"
            />
          </div>
        </div>
      )}
    </>
  );
}

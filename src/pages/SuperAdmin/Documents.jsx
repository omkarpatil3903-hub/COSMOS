import React, { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import DocumentsTable from "../../components/documents/DocumentsTable";
import Button from "../../components/Button";
import AddDocumentModal from "../../components/documents/AddDocumentModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { db } from "../../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function Documents() {
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deleteState, setDeleteState] = useState({
    open: false,
    item: null,
    loading: false,
  });

  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        const ts = data.updatedAt || data.createdAt;
        let updated = "";
        if (ts && typeof ts.toDate === "function")
          updated = ts.toDate().toLocaleDateString();
        else if (ts) updated = new Date(ts).toLocaleDateString();
        return {
          id: d.id,
          name: data.name || "",
          location: data.location || "—",
          tags: Array.isArray(data.tags) ? data.tags : [],
          updated,
          viewed: "-",
          shared: Boolean(data.shared),
          access: data.access || { admin: [], member: [] },
          filename: data.filename || null,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
          fileDataUrl: data.fileDataUrl || null,
          children: data.children || 0,
        };
      });
      setDocs(list);
    });
    return () => unsub();
  }, []);

  const handleAddDoc = async (doc) => {
    try {
      await addDoc(collection(db, "documents"), {
        name: doc.name,
        shared: Boolean(doc.shared),
        access: doc.access || { admin: [], member: [] },
        filename: doc._file?.name || null,
        fileType: doc._file?.type || null,
        fileSize: doc._file?.size || null,
        fileDataUrl: doc._fileDataUrl || null,
        location: "—",
        tags: [],
        children: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Document saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save document");
    }
  };

  const handleEditDoc = (row) => {
    setEditingDoc(row);
    setOpenEdit(true);
  };

  const handleSaveEdit = async (docInput) => {
    try {
      const ref = doc(db, "documents", editingDoc.id);
      await updateDoc(ref, {
        name: docInput.name,
        shared: Boolean(docInput.shared),
        access: docInput.access || { admin: [], member: [] },
        // allow updating filename metadata if new file chosen (still no Storage)
        filename: docInput._file?.name ?? editingDoc.filename ?? null,
        fileType: docInput._file?.type ?? editingDoc.fileType ?? null,
        fileSize: docInput._file?.size ?? editingDoc.fileSize ?? null,
        fileDataUrl: docInput._fileDataUrl ?? editingDoc.fileDataUrl ?? null,
        updatedAt: serverTimestamp(),
      });
      toast.success("Document updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update document");
    } finally {
      setOpenEdit(false);
      setEditingDoc(null);
    }
  };

  const handleAskDelete = (row) =>
    setDeleteState({ open: true, item: row, loading: false });
  const handleConfirmDelete = async () => {
    const item = deleteState.item;
    if (!item) return;
    setDeleteState((s) => ({ ...s, loading: true }));
    try {
      await deleteDoc(doc(db, "documents", item.id));
      toast.success("Document deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete document");
    } finally {
      setDeleteState({ open: false, item: null, loading: false });
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Documents">All docs across your workspace.</PageHeader>
      <Card title="Search & Actions" tone="muted">
        <SearchActions
          value={search}
          onChange={setSearch}
          placeholder="Search by name, location or tag"
          rightActions={
            <Button onClick={() => setOpenAdd(true)}>+ Add Document</Button>
          }
        />
      </Card>
      <Card title="Document List" tone="muted">
        <DocumentsTable
          rows={docs}
          query={search}
          onEdit={handleEditDoc}
          onDelete={handleAskDelete}
        />
      </Card>
      <AddDocumentModal
        isOpen={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleAddDoc}
      />
      <AddDocumentModal
        isOpen={openEdit}
        onClose={() => setOpenEdit(false)}
        onSubmit={handleSaveEdit}
        initialDoc={editingDoc}
      />
      {deleteState.open && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/30"
          onClick={() =>
            setDeleteState({ open: false, item: null, loading: false })
          }
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              onClose={() =>
                setDeleteState({ open: false, item: null, loading: false })
              }
              onConfirm={handleConfirmDelete}
              itemType="document"
              title="Delete Document"
              description="Are you sure you want to delete this document?"
              itemTitle={deleteState.item?.name}
              confirmLabel="Delete"
              isLoading={deleteState.loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}

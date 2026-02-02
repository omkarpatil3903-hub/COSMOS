import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { collection, doc, onSnapshot, query, addDoc, updateDoc, serverTimestamp, deleteDoc, getDoc } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, deleteObject } from "firebase/storage";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaEdit, FaLightbulb, FaUser, FaTrash } from "react-icons/fa";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";
import { formatDate } from "../../utils/formatDate";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

export default function AdminKnowledgePage() {
  const navigate = useNavigate();
  const { buttonClass } = useThemeStyles();
  const [knowledge, setKnowledge] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUserImage, setCurrentUserImage] = useState(null);

  // Project Filter
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  // Fetch current user's profile image and name from users collection
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUserImage(userData.imageUrl || userData.photoURL || null);
            setCurrentUserName(userData.name || userData.fullName || userData.displayName || currentUser.displayName || "Unknown User");
          }
        } catch (err) {
          console.warn("Could not fetch user data:", err);
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })));
    });
    return () => unsub();
  }, []);

  // Live Users Map
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.forEach(d => {
        map[d.id] = d.data();
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

  const handleKnowledgeClick = (knowledgeId) => {
    navigate(`/admin/knowledge/${knowledgeId}`);
  };

  useEffect(() => {
    // Global knowledge list for Admin
    const col = collection(db, "knowledge");
    const qy = query(col);
    const unsub = onSnapshot(qy, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        const uts = data.updatedAt || data.createdAt;
        const updated = formatDate(uts);

        const cts = data.createdAt;
        const created = formatDate(cts);
        return {
          id: d.id,
          title: data.title || "",
          description: data.description || "",
          created,
          updated,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null),
          createdByUid: data.createdByUid || "",
          createdByName: data.createdByName || "",
          updatedByUid: data.updatedByUid || "",
          updatedByName: data.updatedByName || "",
          documents: data.documents || [],
          access: data.access || { admin: [], member: [] },
          projectId: data.projectId || null, // Ensure projectId is captured
          link: data.link || "",
          links: data.links || (data.link ? [data.link] : []), // Capture links array
          history: data.history || [], // Capture history for activity log
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
    if (selectedProject) {
      list = list.filter(k => k.projectId === selectedProject);
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

  const handleSubmit = async (form) => {
    try {
      const currentUser = auth.currentUser;
      let knowledgeDocId;

      // Prepare activity entry
      const activityEntry = {
        action: editing ? 'update' : 'create',
        changes: form.activityChanges || (editing ? ['Updated knowledge entry'] : ['Created knowledge entry']),
        timestamp: new Date().toISOString(),
        performedBy: currentUser?.uid || "",
        performedByName: currentUserName || currentUser?.displayName || "Unknown User",
        performedByImage: currentUserImage || currentUser?.photoURL || null,
      };

      if (editing && editing.id) {
        knowledgeDocId = editing.id;
        const knowledgeRef = doc(db, "knowledge", editing.id);
        await updateDoc(knowledgeRef, {
          title: form.title,
          description: form.description,
          link: form.link || "",
          links: form.links || [],
          access: form.access || { admin: [], member: [] },
          documents: form.documents || [],
          updatedAt: serverTimestamp(),
          updatedByUid: currentUser?.uid || "",
          updatedByName: currentUser?.displayName || "",
          projectId: editing.projectId || selectedProject || null,
        });
      } else {
        const docRef = await addDoc(collection(db, "knowledge"), {
          title: form.title,
          description: form.description,
          link: form.link || "",
          links: form.links || [],
          access: form.access || { admin: [], member: [] },
          documents: form.documents || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: currentUser?.uid || "",
          createdByName: currentUser?.displayName || "",
          projectId: selectedProject || null,
        });
        knowledgeDocId = docRef.id;
      }

      // Save activity to subcollection
      const activitiesRef = collection(db, "knowledge", knowledgeDocId, "activities");
      await addDoc(activitiesRef, activityEntry);

    } catch (e) {
      console.error("Failed to save knowledge", e);
    }
  };

  const handleDelete = (k) => {
    setDeleteTarget(k);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // First, delete all documents from Firebase Storage
      if (deleteTarget.documents && deleteTarget.documents.length > 0) {
        const deletePromises = deleteTarget.documents.map(async (document) => {
          if (document.storagePath) {
            try {
              const storageRef = ref(storage, document.storagePath);
              await deleteObject(storageRef);
            } catch (error) {
              console.warn(`Failed to delete file from storage: ${document.storagePath}`, error);
            }
          }
        });
        await Promise.all(deletePromises);
      }

      // Then delete the knowledge document from Firestore
      await deleteDoc(doc(db, "knowledge", deleteTarget.id));

      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error("Failed to delete knowledge", e);
      alert("Failed to delete knowledge. Please try again.");
    }
  };

  return (
    <>
      <Card title="Search & Actions" tone="muted">
        <SearchActions
          value={search}
          onChange={setSearch}
          placeholder="Search by title or description"
          rightActions={
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">Sort by</span>
                <select
                  className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <Button variant="custom" onClick={handleAdd} className={buttonClass}>+ Add Knowledge</Button>
            </div>
          }
        />
      </Card>

      <Card
        title="Knowledge"
        tone="muted"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-content-secondary">
              Page {clampedPage} of {totalPages}
            </span>
            <label className="text-sm font-medium text-content-secondary">
              Cards per page
            </label>
            <select
              className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage(Math.max(1, clampedPage - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage(Math.min(totalPages, clampedPage + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        }
      >

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((k) => (
            <div
              key={k.id}
              className="relative rounded-xl border border-subtle bg-surface-strong p-6 shadow-soft min-h-[280px]"
            >
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-content-secondary shadow-soft hover:bg-surface-subtle"
                  title="Edit"
                  onClick={() => handleEdit(k)}
                >
                  <FaEdit className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-red-600 shadow-soft hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                  title="Delete"
                  onClick={() => handleDelete(k)}
                >
                  <FaTrash className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2 pr-16">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-subtle text-violet-400 border border-subtle">
                  <FaLightbulb className="h-4 w-4" />
                </span>
                <h3
                  className="text-lg font-semibold leading-snug text-content-primary truncate max-w-[200px] cursor-pointer hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 transition-colors"
                  title={k.title}
                  onClick={() => handleKnowledgeClick(k.id)}
                >
                  {k.title.length > 10 ? `${k.title.substring(0, 10)}...` : k.title}
                </h3>
              </div>
              <hr className="my-3 border-t border-subtle" />
              <p className="mt-1 mb-3 text-sm md:text-[0.95rem] leading-relaxed text-content-secondary line-clamp-4 whitespace-pre-wrap">
                {k.description}
              </p>
              {k.link && (
                <div className="mb-3">
                  <a href={k.link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-500 underline truncate block" onClick={e => e.stopPropagation()}>
                    {k.link}
                  </a>
                </div>
              )}
              <hr className="my-3 border-t border-subtle" />
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-content-secondary">
                {k.created && (
                  <span className="inline-flex items-center gap-1.5">
                    <FaCalendarAlt className="w-3.5 h-3.5 text-content-tertiary" />
                    <span className="text-content-tertiary">Created</span>
                    <span className="font-medium text-content-primary">{k.created}</span>
                  </span>
                )}
                {k.createdByName && (
                  <span className="inline-flex items-center gap-1.5">
                    {usersMap[k.createdByUid]?.imageUrl ? (
                      <img src={usersMap[k.createdByUid].imageUrl} alt="User" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <FaUser className="w-3.5 h-3.5 text-content-tertiary" />
                    )}
                    <span className="text-content-tertiary">By</span>
                    <span className="font-medium text-content-primary">{k.createdByName}</span>
                  </span>
                )}
                {k.updated && (
                  <span className="inline-flex items-center gap-1.5">
                    <FaClock className="w-3.5 h-3.5 text-content-tertiary" />
                    <span className="text-content-tertiary">Updated</span>
                    <span className="font-medium text-content-primary">{k.updated}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
          {!pageRows.length && (
            <div className="col-span-full text-center text-sm text-content-secondary py-10">
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
          projectId={editing?.projectId || selectedProject || null}
          canEditAccess={true}
        />
      )}

      {showDeleteModal && deleteTarget && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmationModal
              itemType="knowledge"
              itemTitle={deleteTarget.title}
              title="Delete Knowledge"
              description="Are you sure you want to delete this knowledge entry? This will also delete all associated documents."
              confirmLabel="Delete Knowledge"
              isLoading={false}
              onClose={() => {
                setShowDeleteModal(false);
                setDeleteTarget(null);
              }}
              onConfirm={handleConfirmDelete}
            />
          </div>
        </div>
      )}
    </>
  );
}

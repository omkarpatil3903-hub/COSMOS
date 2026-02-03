import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, deleteObject } from "firebase/storage";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaEdit, FaLightbulb, FaTrash, FaUser } from "react-icons/fa";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";
import { formatDate } from "../../utils/formatDate";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

export default function SuperAdminKnowledgePage() {
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

  const handleKnowledgeClick = (knowledgeId) => {
    navigate(`/knowledge/${knowledgeId}`);
  };

  useEffect(() => {
    // Global knowledge list for Super Admin/Admin
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
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          createdByName: data.createdByName || "",
          updatedByName: data.updatedByName || "",
          documents: data.documents || [],
          access: data.access || { admin: [], member: [] },
          projectId: data.projectId || null,
          link: data.link || "",
          thumbnailUrl: data.thumbnailUrl || null,
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

  const handleDelete = (k) => {
    setDeleteTarget(k);
    setShowDeleteModal(true);
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
          whatYouLearn: form.whatYouLearn || [],
          courseContent: form.courseContent || [],
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
          whatYouLearn: form.whatYouLearn || [],
          courseContent: form.courseContent || [],
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
              // Log error but continue with deletion
              // File might already be deleted from storage
              console.warn(`Failed to delete file from storage: ${document.storagePath}`, error);
            }
          }
        });

        // Wait for all storage deletions to complete
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
          <span className="text-sm font-medium text-content-secondary">
            Total {filteredSorted.length} Records
          </span>
        }
      >

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pageRows.map((k) => (
            <div
              key={k.id}
              className="relative rounded-sm border border-subtle bg-white [.dark_&]:bg-[#181B2A] shadow-soft overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => handleKnowledgeClick(k.id)}
            >
              {/* Image Section */}
              <div className="relative w-full h-56 bg-gray-100 [.dark_&]:bg-gray-800 overflow-hidden">
                {k.thumbnailUrl ? (
                  <img
                    src={k.thumbnailUrl}
                    alt={k.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 [.dark_&]:from-violet-900/30 [.dark_&]:to-indigo-900/30 flex items-center justify-center">
                    <FaLightbulb className="h-20 w-20 text-violet-300 [.dark_&]:text-violet-600 opacity-50" />
                  </div>
                )}

                {/* Action Buttons - Show on hover */}
                <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white [.dark_&]:bg-gray-800 text-red-500 shadow-lg hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(k);
                    }}
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-3">
                {/* Title */}
                <h3
                  className="text-base font-bold leading-tight text-gray-900 [.dark_&]:text-white mb-0.5 line-clamp-2 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 transition-colors"
                  title={k.title}
                >
                  {k.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-snug text-gray-600 [.dark_&]:text-gray-400 line-clamp-2 mb-1">
                  {k.description || "No description provided"}
                </p>

                {/* Link */}
                {k.link && (
                  <div className="mb-1.5">
                    <a
                      href={k.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-500 underline truncate block"
                      onClick={e => e.stopPropagation()}
                    >
                      {k.link}
                    </a>
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 [.dark_&]:border-white/10">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 [.dark_&]:text-gray-400">
                    {k.createdByName && (
                      <span className="inline-flex items-center gap-1.5">
                        <FaUser className="w-3 h-3" />
                        <span className="font-medium">{k.createdByName}</span>
                      </span>
                    )}
                    {k.created && (
                      <span className="inline-flex items-center gap-1.5">
                        <FaCalendarAlt className="w-3 h-3" />
                        <span>{k.created}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!pageRows.length && (
            <div className="col-span-full text-center text-sm text-content-secondary py-10">
              No knowledge found
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        {pageRows.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-subtle">
            <span className="text-sm font-medium text-content-secondary">
              Page {clampedPage} of {totalPages}
            </span>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-secondary">
                Rows per page
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
          </div>
        )}
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

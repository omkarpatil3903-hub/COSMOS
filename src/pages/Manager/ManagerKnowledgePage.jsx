/**
 * Manager Knowledge Page
 * Shows only knowledge related to projects the current user manages,
 * or global knowledge entries where the manager has access.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaEdit, FaLightbulb, FaUser, FaFolderOpen } from "react-icons/fa";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";

export default function ManagerKnowledgePage() {
  const navigate = useNavigate();
  const { buttonClass } = useThemeStyles();
  const [knowledge, setKnowledge] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUserImage, setCurrentUserImage] = useState(null);
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

  // Get projects managed by current user
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "projects"),
      where("projectManagerId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        projectName: d.data().projectName || "",
      }));
      setProjects(list);
    });

    return () => unsub();
  }, []);

  // Get all knowledge and filter client-side
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "knowledge"), (snap) => {
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
          createdByUid: data.createdByUid || "",
          updatedByName: data.updatedByName || "",
          documents: data.documents || [],
          access: data.access || { admin: [], member: [] },
          projectId: data.projectId || null,
          documents: data.documents || [],
          access: data.access || { admin: [], member: [] },
          projectId: data.projectId || null,
          link: data.link || "",
          thumbnailUrl: data.thumbnailUrl || null,
        };
      });
      setKnowledge(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter knowledge to only show:
  // 1. Knowledge linked to projects the manager manages
  // 2. Knowledge created by the manager
  // 3. Knowledge where the manager has explicit access
  const filteredKnowledge = useMemo(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const managedProjectIds = new Set(projects.map((p) => p.id));

    return knowledge.filter((k) => {
      // If knowledge is linked to a managed project
      if (k.projectId && managedProjectIds.has(k.projectId)) {
        return true;
      }

      // If knowledge was created by the manager
      if (k.createdByUid === currentUser.uid) {
        return true;
      }

      // If manager has explicit access (in admin or member arrays)
      const hasAdminAccess = (k.access?.admin || []).includes(currentUser.uid);
      const hasMemberAccess = (k.access?.member || []).includes(currentUser.uid);
      if (hasAdminAccess || hasMemberAccess) {
        return true;
      }

      if (hasAdminAccess || hasMemberAccess) {
        return true;
      }

      return false;
    });

    if (selectedProject) {
      return result.filter(k => k.projectId === selectedProject);
    }
    return result;
  }, [knowledge, projects, selectedProject]);

  // Get project name for a knowledge item
  const getProjectName = (projectId) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.projectName || null;
  };

  const handleKnowledgeClick = (knowledgeId) => {
    navigate(`/manager/knowledge/${knowledgeId}`);
  };

  // Sort and search
  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filteredKnowledge;
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
  }, [filteredKnowledge, search, sort]);

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

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (clampedPage - 1) * rowsPerPage;
  const pageRows = filteredSorted.slice(start, start + rowsPerPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card title="Search & Actions" tone="muted">
          <div className="h-12 rounded-lg bg-gray-200 [.dark_&]:bg-white/10 animate-pulse" />
        </Card>
        <Card title="Knowledge" tone="muted">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 [.dark_&]:border-white/10 p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 [.dark_&]:bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-full" />
                <div className="h-4 bg-gray-200 [.dark_&]:bg-white/10 rounded w-2/3" />
                <div className="h-3 bg-gray-200 [.dark_&]:bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Card title="Search & Actions" tone="muted">
        <SearchActions
          value={search}
          onChange={setSearch}
          placeholder="Search by title or description"
          rightActions={
            <div className="flex items-center gap-2">
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
              Page {clampedPage} of {totalPages} ({total} items)
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pageRows.map((k) => {
            const projectName = getProjectName(k.projectId);
            return (
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

                  {/* Project Badge - top left */}
                  {projectName && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white/90 [.dark_&]:bg-gray-900/90 text-indigo-600 [.dark_&]:text-indigo-400 shadow-md backdrop-blur">
                        <FaFolderOpen className="h-3 w-3" />
                        {projectName}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons - Show on hover */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

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
            );
          })}
          {!pageRows.length && (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 [.dark_&]:bg-white/5 text-gray-400 mb-4">
                <FaLightbulb className="text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">No knowledge found</h3>
              <p className="text-gray-500 [.dark_&]:text-gray-400 mt-1 max-w-sm mx-auto">
                {projects.length === 0
                  ? "You don't have any projects assigned as manager yet."
                  : "No knowledge entries match your search criteria."}
              </p>
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
          canEditAccess={false}
        />
      )}
    </>
  );
}

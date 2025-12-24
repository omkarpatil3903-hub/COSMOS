/**
 * Employee Knowledge Page
 * Shows only knowledge related to projects the employee is assigned to,
 * or global knowledge entries where the employee has access.
 * Employees can Add and Edit knowledge, but cannot Delete.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaEdit, FaLightbulb, FaUser, FaFolderOpen } from "react-icons/fa";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";

export default function EmployeeKnowledgePage() {
  const navigate = useNavigate();
  const { buttonClass } = useThemeStyles();
  const [knowledge, setKnowledge] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Get tasks assigned to current employee
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "tasks"),
      where("assigneeId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        projectId: d.data().projectId || "",
      }));
      setTasks(list);
    });

    return () => unsub();
  }, []);

  // Get projects associated with the tasks
  useEffect(() => {
    const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
    if (projectIds.length === 0) {
      setProjects([]);
      return;
    }

    const unsub = onSnapshot(collection(db, "projects"), (snap) => {
      const list = snap.docs
        .filter(d => projectIds.includes(d.id))
        .map((d) => ({
          id: d.id,
          projectName: d.data().projectName || "",
        }));
      setProjects(list);
    });

    return () => unsub();
  }, [tasks]);

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
        };
      });
      setKnowledge(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter knowledge to only show:
  // 1. Knowledge linked to projects the employee is assigned to
  // 2. Knowledge created by the employee
  // 3. Knowledge where the employee has explicit access
  const filteredKnowledge = useMemo(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const assignedProjectIds = new Set(projects.map((p) => p.id));

    return knowledge.filter((k) => {
      // If knowledge is linked to an assigned project
      if (k.projectId && assignedProjectIds.has(k.projectId)) {
        return true;
      }

      // If knowledge was created by the employee
      if (k.createdByUid === currentUser.uid) {
        return true;
      }

      // If employee has explicit access (ONLY in member arrays, not admin)
      // This ensures Manager Users access doesn't show in Employee dashboard
      const hasMemberAccess = (k.access?.member || []).includes(currentUser.uid);
      if (hasMemberAccess) {
        return true;
      }

      return false;
    });
  }, [knowledge, projects]);

  // Get project name for a knowledge item
  const getProjectName = (projectId) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.projectName || null;
  };

  const handleKnowledgeClick = (knowledgeId) => {
    navigate(`/employee/knowledge/${knowledgeId}`);
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
      if (editing && editing.id) {
        const ref = doc(db, "knowledge", editing.id);
        await updateDoc(ref, {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          documents: form.documents || [],
          updatedAt: serverTimestamp(),
          updatedByUid: auth.currentUser?.uid || "",
          updatedByName: editing.updatedByName || editing.createdByName || "",
        });
      } else {
        await addDoc(collection(db, "knowledge"), {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          documents: form.documents || [],
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((k) => {
            const projectName = getProjectName(k.projectId);
            return (
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
                    {k.title.length > 20 ? `${k.title.substring(0, 20)}...` : k.title}
                  </h3>
                </div>

                {/* Project badge */}
                {projectName && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 [.dark_&]:bg-indigo-500/10 text-indigo-600 [.dark_&]:text-indigo-400 border border-indigo-100 [.dark_&]:border-indigo-500/20">
                      <FaFolderOpen className="h-3 w-3" />
                      {projectName}
                    </span>
                  </div>
                )}

                <hr className="my-3 border-t border-subtle" />
                <p className="mt-1 mb-3 text-sm md:text-[0.95rem] leading-relaxed text-content-secondary line-clamp-4 whitespace-pre-wrap">
                  {k.description}
                </p>
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
                      <FaUser className="w-3.5 h-3.5 text-content-tertiary" />
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
                  ? "You don't have any projects assigned yet."
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
          projectId={null}
          canEditAccess={false}
        />
      )}
    </>
  );
}

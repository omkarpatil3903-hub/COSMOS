import React, { useEffect, useMemo, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaArrowLeft, FaRegComment, FaBookOpen, FaFileAlt, FaEdit, FaTrash, FaLightbulb, FaUser, FaCalendarAlt, FaClock, FaChevronUp, FaChevronDown } from "react-icons/fa";
import Card from "../../components/Card";
import { db, storage, auth } from "../../firebase";
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, updateMetadata, getBytes } from "firebase/storage";
import { formatDate } from "../../utils/formatDate";
import DocumentsTable from "../../components/documents/DocumentsTable";
import GroupedDocumentsView from "../../components/documents/GroupedDocumentsView";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import AddDocumentModal from "../../components/documents/AddDocumentModal";
import ManageFoldersModal from "../../components/documents/ManageFoldersModal";
import AddKnowledgeModal from "../../components/knowledge/AddKnowledgeModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

export default function KnowledgeProjectDetail() {
  const { buttonClass, barColor } = useThemeStyles();
  const navigate = useNavigate();
  const { projectName } = useParams();
  const location = useLocation();
  const isSuperAdminRoute = location.pathname.startsWith("/knowledge-management");
  const fromDocsTab = Boolean(location.state && location.state.fromDocsTab);
  const isManagerRoute = location.pathname.startsWith("/manager");
  const isEmployeeRoute = location.pathname.startsWith("/employee");

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedProjectId, setResolvedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState(fromDocsTab ? "documentation" : "knowledge");
  const [docSearch, setDocSearch] = useState("");
  const [docs, setDocs] = useState([]);
  const [openAddDoc, setOpenAddDoc] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleType, setRoleType] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [knowledge, setKnowledge] = useState([]);
  const [knSearch, setKnSearch] = useState("");
  const [openAddKn, setOpenAddKn] = useState(false);
  const [editingKn, setEditingKn] = useState(null);
  const [knSort, setKnSort] = useState({ key: "createdAt", dir: "desc" });
  const [knPage, setKnPage] = useState(1);
  const [knRowsPerPage, setKnRowsPerPage] = useState(9);
  const [showDeleteKnModal, setShowDeleteKnModal] = useState(false);
  const [deleteKnTarget, setDeleteKnTarget] = useState(null);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const dropdownButtonRef = React.useRef(null);

  useEffect(() => {
    const decoded = decodeURIComponent(projectName || "");
    if (!decoded) {
      setProject(null);
      setResolvedProjectId("");
      setLoading(false);
      return;
    }
    const q = query(collection(db, "projects"), where("projectName", "==", decoded));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      const first = docs[0] || null;
      setProject(first);
      setResolvedProjectId(first?.id || "");
      setLoading(false);
    });
    return () => unsub();
  }, [projectName]);

  useEffect(() => {
    if (!resolvedProjectId) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, "tasks"), where("projectId", "==", resolvedProjectId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setTasks(list);
    });
    return () => unsub();
  }, [resolvedProjectId]);

  // Load knowledge entries linked to this project: knowldge/{projectId}/Knowledge
  useEffect(() => {
    if (!resolvedProjectId) {
      setKnowledge([]);
      return;
    }
    const qy = query(collection(db, "knowledge"), where("projectId", "==", resolvedProjectId));
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
          access: data.access || { admin: [], member: [] },
          createdByName: data.createdByName || "",
          updatedByName: data.updatedByName || "",
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };

      });
      setKnowledge(list);
    });
    return () => unsub();
  }, [resolvedProjectId]);

  // Load documents linked to this project from nested path: knowldge/{projectId}/Documents
  useEffect(() => {
    if (!resolvedProjectId) {
      setDocs([]);
      return;
    }
    const q = query(collection(db, "documents"), where("projectId", "==", resolvedProjectId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        const ts = data.updatedAt || data.createdAt;
        let updated = "";
        if (ts && typeof ts.toDate === "function") updated = ts.toDate().toLocaleDateString();
        else if (ts) updated = new Date(ts).toLocaleDateString();
        const cts = data.createdAt;
        let created = "";
        if (cts && typeof cts.toDate === "function") created = cts.toDate().toLocaleDateString();
        else if (cts) created = new Date(cts).toLocaleDateString();
        return {
          id: d.id,
          name: data.name || "",
          location: data.location || "—",
          tags: Array.isArray(data.tags) ? data.tags : [],
          updated,
          created,
          viewed: "-",
          shared: Boolean(data.shared),
          access: data.access || { admin: [], member: [] },
          folder: data.folder || "", // Add folder field
          children: data.children || 0,
          url: data.fileDataUrl || data.url || "",
          storagePath: data.storagePath || "",
          fileType: data.fileType || "",
          filename: data.filename || "",
          createdByUid: data.createdByUid || "",
          createdByName: data.createdByName || data.uploadedByName || "",
          updatedByUid: data.updatedByUid || "",
          updatedByName: data.updatedByName || data.editedByName || "",
        };
      });
      setDocs(list);
    });
    return () => unsub();
  }, [resolvedProjectId]);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setIsAdmin(false);
      setRoleType("");
      return;
    }
    const load = async () => {
      try {
        const uref = doc(db, "users", u.uid);
        const snap = await getDoc(uref);
        const data = snap.data() || {};
        const role = String(data.resourceRoleType || "").toLowerCase();
        setRoleType(role);
        setIsAdmin(role === "admin");
        setCurrentUserName(
          data.name || data.fullName || data.displayName || u.displayName || u.email || ""
        );
      } catch {
        setIsAdmin(false);
        setRoleType("");
        setCurrentUserName("");
      }
    };
    load();
  }, []);

  const normalizeStatus = (s) => {
    const x = String(s || "").trim().toLowerCase();
    if (x === "done" || x === "completed" || x === "complete") return "Done";
    if (x === "in progress" || x === "in-progress" || x === "inreview" || x === "in review") return "In Progress";
    if (x === "to-do" || x === "to do" || x === "todo" || x === "" || x === "open") return "To-Do";
    return s || "To-Do";
  };

  const inProgress = useMemo(() => tasks.filter((t) => normalizeStatus(t.status) === "In Progress"), [tasks]);
  const todo = useMemo(() => tasks.filter((t) => normalizeStatus(t.status) === "To-Do"), [tasks]);

  const visibleDocs = useMemo(() => {
    if (isSuperAdminRoute) return docs;
    const me = String(currentUserName || "").trim().toLowerCase();
    if (!me) return [];
    return docs.filter((d) => {
      const access = d.access || {};
      const admins = Array.isArray(access.admin) ? access.admin : [];
      const members = Array.isArray(access.member) ? access.member : [];
      const inList = [...admins, ...members].some(
        (n) => String(n || "").trim().toLowerCase() === me
      );
      const createdBy = String(d.createdByName || "").trim().toLowerCase();
      const updatedBy = String(d.updatedByName || "").trim().toLowerCase();
      if (inList) return true;
      if (createdBy && createdBy === me) return true;
      if (updatedBy && updatedBy === me) return true;
      return false;
    });
  }, [docs, isSuperAdminRoute, currentUserName]);

  const visibleKnowledge = useMemo(() => {
    if (isSuperAdminRoute) return knowledge;
    const me = String(currentUserName || "").trim().toLowerCase();
    if (!me) return [];
    return knowledge.filter((k) => {
      const access = k.access || {};
      const admins = Array.isArray(access.admin) ? access.admin : [];
      const members = Array.isArray(access.member) ? access.member : [];
      const inList = [...admins, ...members].some(
        (n) => String(n || "").trim().toLowerCase() === me
      );
      const createdBy = String(k.createdByName || "").trim().toLowerCase();
      const updatedBy = String(k.updatedByName || "").trim().toLowerCase();
      if (inList) return true;
      if (createdBy && createdBy === me) return true;
      if (updatedBy && updatedBy === me) return true;
      return false;
    });
  }, [knowledge, isSuperAdminRoute, currentUserName]);

  const knFilteredSorted = useMemo(() => {
    const q = knSearch.trim().toLowerCase();
    let list = visibleKnowledge;
    if (q) {
      list = visibleKnowledge.filter((k) =>
        [k.title, k.description, k.createdByName, k.updatedByName].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
      );
    }
    const { key, dir } = knSort || { key: "createdAt", dir: "desc" };
    const mult = dir === "asc" ? 1 : -1;
    const getVal = (k) => {
      if (key === "title") return String(k.title || "").toLowerCase();
      if (key === "updatedAt") return k.updatedAt?.toMillis?.() ? k.updatedAt.toMillis() : (k.updatedAt ? new Date(k.updatedAt).getTime() : 0);
      return k.createdAt?.toMillis?.() ? k.createdAt.toMillis() : (k.createdAt ? new Date(k.createdAt).getTime() : 0);
    };
    return [...list].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av).localeCompare(String(bv)) * mult;
    });
  }, [visibleKnowledge, knSearch, knSort]);

  const knTotal = knFilteredSorted.length;
  const knTotalPages = Math.max(1, Math.ceil(knTotal / knRowsPerPage));
  const knClampedPage = Math.min(Math.max(knPage, 1), knTotalPages);
  const knStart = (knClampedPage - 1) * knRowsPerPage;
  const knPageRows = knFilteredSorted.slice(knStart, knStart + knRowsPerPage);

  const title = project?.projectName || "Project";
  const truncatedTitle = title.length > 18 ? `${title.slice(0, 18)}…` : title;

  const handleBack = () => {
    if (fromDocsTab) {
      const base = location.pathname.startsWith("/manager")
        ? "/manager/knowledge-management"
        : location.pathname.startsWith("/employee")
          ? "/employee/knowledge-management"
          : "/knowledge-management";
      navigate(base, { state: { activeTab: "documents" } });
      return;
    }

    if (location.key !== "default") navigate(-1);
    else {
      const base = location.pathname.startsWith("/manager")
        ? "/manager/knowledge-management"
        : location.pathname.startsWith("/employee")
          ? "/employee/knowledge-management"
          : "/knowledge-management";
      navigate(base);
    }
  };

  const renderGroup = (label, items) => {
    return (
      <div className="rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A]">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 [.dark_&]:bg-white/5">
          <div className="font-semibold text-gray-700 [.dark_&]:text-white uppercase text-xs tracking-wide">{label}</div>
          <div className="text-xs text-gray-600 [.dark_&]:text-gray-400">{items.length}</div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full bg-white [.dark_&]:bg-[#181B2A]">
            <thead>
              <tr className="text-xs text-gray-500 [.dark_&]:text-gray-400 bg-white [.dark_&]:bg-[#181B2A]">
                <th className="px-4 py-2 text-left font-semibold">Name</th>
                <th className="px-4 py-2 text-left font-semibold">Assignee</th>
                <th className="px-4 py-2 text-left font-semibold">Due date</th>
                <th className="px-4 py-2 text-left font-semibold">Priority</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 [.dark_&]:hover:bg-white/5">
                  <td className="px-4 py-2 text-sm text-gray-900 [.dark_&]:text-white">{t.title || "Task"}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 [.dark_&]:text-gray-300">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 [.dark_&]:bg-[#1F2234] text-gray-600 [.dark_&]:text-gray-300 text-xs">👤</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 [.dark_&]:text-gray-300">{formatDate(t.dueDate)}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${String(t.priority || "Medium").toLowerCase() === "urgent"
                      ? "bg-red-100 text-red-800 border-red-200"
                      : String(t.priority || "Medium").toLowerCase() === "high"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}>
                      {t.priority || "Medium"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${normalizeStatus(t.status) === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : normalizeStatus(t.status) === "To-Do"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-green-100 text-green-800"
                      }`}>
                      {normalizeStatus(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <FaRegComment />
                  </td>
                </tr>))}
              {!items.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500 [.dark_&]:text-gray-400" colSpan={6}>No tasks</td>
                </tr>
              )}
              <tr>
                <td colSpan={6} className="px-4 py-3 text-sm text-gray-500 [.dark_&]:text-gray-400">+ Add Task</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleAddKnowledge = async (form) => {
    if (!resolvedProjectId) return;
    try {
      if (editingKn && editingKn.id) {
        const refDoc = doc(db, "knowledge", editingKn.id);
        const payload = {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          updatedAt: serverTimestamp(),
          updatedByUid: auth.currentUser?.uid || "",
          updatedByName: currentUserName,
          projectId: resolvedProjectId,
        };
        await updateDoc(refDoc, payload);
        setEditingKn(null);
        setOpenAddKn(false);
      } else {
        await addDoc(collection(db, "knowledge"), {
          title: form.title,
          description: form.description,
          access: form.access || { admin: [], member: [] },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: auth.currentUser?.uid || "",
          createdByName: currentUserName,
          projectId: resolvedProjectId,
        });
        setOpenAddKn(false);
      }
    } catch (e) {
      console.error("Failed to add knowledge", e);
    }
  };

  const handleEditKnowledge = (item) => {
    setEditingKn(item);
    setOpenAddKn(true);
  };

  const handleDeleteKnowledge = (item) => {
    const canDelete = isSuperAdminRoute || roleType === "admin";
    if (!canDelete || !resolvedProjectId) return;
    setDeleteKnTarget(item);
    setShowDeleteKnModal(true);
  };

  const confirmDeleteKnowledge = async () => {
    if (!deleteKnTarget) return;
    try {
      // Delete all associated documents from storage and Firestore
      if (deleteKnTarget.documents && Array.isArray(deleteKnTarget.documents)) {
        for (const docItem of deleteKnTarget.documents) {
          // Delete from storage if storagePath exists
          if (docItem.storagePath) {
            try {
              await deleteObject(ref(storage, docItem.storagePath));
            } catch (err) {
              console.warn("Failed to delete from storage:", docItem.storagePath, err);
            }
          }
        }
      }

      // Delete the knowledge document from Firestore
      await deleteDoc(doc(db, "knowledge", deleteKnTarget.id));
      setShowDeleteKnModal(false);
      setDeleteKnTarget(null);
    } catch (e) {
      console.error("Failed to delete knowledge", e);
    }
  };

  const handleAddDocument = async (form) => {
    if (!resolvedProjectId) return;
    try {
      // Overwrite existing storage object on edit; only create a new path when none exists
      let storagePath = editingDoc?.storagePath || null;
      let downloadURL = null;
      const sanitize = (s) => (s || "").replace(/[^a-zA-Z0-9._-]/g, "-");
      const getExtFromType = (mime) => {
        const map = {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
          "application/vnd.ms-excel": "xls",
          "text/csv": "csv",
          "application/pdf": "pdf",
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        return map[String(mime || "").toLowerCase()] || "";
      };

      if (form._file) {
        const safeName = (form._file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "-");
        if (!storagePath) {
          storagePath = `Documents/${resolvedProjectId}/${safeName}`;
        }
        const storageRef = ref(storage, storagePath);
        const meta = {
          contentType: form._file.type || undefined,
          customMetadata: {
            projectId: resolvedProjectId,
            documentName: form.name || editingDoc?.name || "",
            filename: safeName,
            uploadedBy: auth.currentUser?.uid || "",
            uploadedAt: new Date().toISOString(),
          },
        };
        await uploadBytes(storageRef, form._file, meta);
        downloadURL = await getDownloadURL(storageRef);
      } else if (editingDoc?.storagePath) {
        // Editing without new file - just update metadata, don't try to copy file
        const oldRef = ref(storage, editingDoc.storagePath);
        const custom = {
          projectId: resolvedProjectId,
          documentName: form.name || editingDoc.name || "",
          filename: editingDoc.filename || "",
          updatedBy: auth.currentUser?.uid || "",
          updatedAt: new Date().toISOString(),
        };

        // Only update metadata, don't rename file to avoid CORS issues
        try {
          await updateMetadata(oldRef, { customMetadata: custom });
        } catch (err) {
          console.warn("Failed to update metadata:", err);
        }
        storagePath = editingDoc.storagePath;
        downloadURL = editingDoc.url;
      }

      if (editingDoc && editingDoc.id) {
        const refDoc = doc(db, "documents", editingDoc.id);
        const extFromOld = (() => {
          const name = editingDoc.filename || "";
          const idx = name.lastIndexOf(".");
          if (idx > 0 && idx < name.length - 1) return name.slice(idx + 1);
          return getExtFromType(editingDoc.fileType);
        })();
        const nextFilename = form._file
          ? (form._file.name || null)
          : sanitize(`${form.name}${extFromOld ? `.${extFromOld}` : ""}`);
        const payload = {
          name: form.name,
          shared: Boolean(form.shared),
          access: form.access || { admin: [], member: [] },
          folder: form.folder, // Required field from dropdown
          filename: nextFilename || editingDoc.filename || null,
          fileType: form._file?.type || editingDoc.fileType || null,
          fileSize: form._file?.size || editingDoc.fileSize || null,
          location: "—",
          tags: [],
          children: 0,
          projectId: resolvedProjectId,
          updatedAt: serverTimestamp(),
          updatedByUid: auth.currentUser?.uid || "",
          updatedByName: currentUserName,
        };

        if (!payload.folder) {
          alert("Please select a folder");
          return;
        }
        if (downloadURL) payload.url = downloadURL;
        if (storagePath) payload.storagePath = storagePath;
        await updateDoc(refDoc, payload);
        setEditingDoc(null);
        setOpenAddDoc(false);
      } else {
        // New document
        if (!form.folder) {
          alert("Please select a folder");
          return;
        }

        const newDocPayload = {
          name: form.name,
          shared: Boolean(form.shared),
          access: form.access || { admin: [], member: [] },
          folder: form.folder, // Required field from dropdown
          filename: form._file?.name || null,
          fileType: form._file?.type || null,
          fileSize: form._file?.size || null,
          url: downloadURL || null,
          storagePath: storagePath || null,
          location: "—",
          tags: [],
          children: 0,
          projectId: resolvedProjectId,
          createdByUid: auth.currentUser?.uid || "",
          createdByName: currentUserName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "documents"), newDocPayload);

        setOpenAddDoc(false);
      }
    } catch (e) {
      console.error("Failed to add document", e);
    }
  };

  const handleEditDocument = (row) => {
    setEditingDoc(row);
    setOpenAddDoc(true);
  };

  const handleDeleteDocument = (row) => {
    const canDelete = isSuperAdminRoute || isAdmin;
    if (!canDelete || !resolvedProjectId) return;
    setDeleteTarget(row);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.storagePath) {
        try { await deleteObject(ref(storage, deleteTarget.storagePath)); } catch { }
      }
      await deleteDoc(doc(db, "documents", deleteTarget.id));
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error("Failed to delete document", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-3 py-3 border-b bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10 rounded-lg">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white"
          >
            <FaArrowLeft />
            Back
          </button>
          <span className="text-gray-300 [.dark_&]:text-gray-600">/</span>
          <div className="truncate font-semibold text-gray-900 [.dark_&]:text-white">{truncatedTitle}</div>
        </div>
      </div>

      {!fromDocsTab && (
        <div className="flex items-center gap-2 px-3">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border ${activeTab === "knowledge"
              ? `${barColor} text-white border-transparent`
              : "bg-white [.dark_&]:bg-[#181B2A] text-gray-700 [.dark_&]:text-gray-300 border-gray-200 [.dark_&]:border-white/10 hover:bg-gray-50 [.dark_&]:hover:bg-white/5"
              }`}
            aria-pressed={activeTab === "knowledge"}
          >
            <FaBookOpen className="h-4 w-4" />
            Knowledge
          </button>
          <button
            onClick={() => setActiveTab("documentation")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border ${activeTab === "documentation"
              ? `${barColor} text-white border-transparent`
              : "bg-white [.dark_&]:bg-[#181B2A] text-gray-700 [.dark_&]:text-gray-300 border-gray-200 [.dark_&]:border-white/10 hover:bg-gray-50 [.dark_&]:hover:bg-white/5"
              }`}
            aria-pressed={activeTab === "documentation"}
          >
            <FaFileAlt className="h-4 w-4" />
            Documentation
          </button>
        </div>
      )}

      {activeTab === "knowledge" ? (
        <>
          <Card title="Search & Actions" tone="muted">
            <SearchActions
              value={knSearch}
              onChange={setKnSearch}
              placeholder="Search by title or description"
              rightActions={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">Sort by</span>
                    <select
                      className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={`${knSort.key}:${knSort.dir}`}
                      onChange={(e) => {
                        const [key, dir] = e.target.value.split(":");
                        setKnSort({ key, dir });
                        setKnPage(1);
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
                  {(isSuperAdminRoute || roleType === "admin" || roleType === "member" || roleType === "resource") && (
                    <Button variant="custom" onClick={() => { setEditingKn(null); setOpenAddKn(true); }} className={buttonClass}>+ Add Knowledge</Button>
                  )}
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
                  Page {knClampedPage} of {knTotalPages}
                </span>
                <label className="text-sm font-medium text-content-secondary">
                  Cards per page
                </label>
                <select
                  className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={knRowsPerPage}
                  onChange={(e) => {
                    setKnRowsPerPage(parseInt(e.target.value, 10));
                    setKnPage(1);
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
                    onClick={() => setKnPage(Math.max(1, knClampedPage - 1))}
                    disabled={knPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setKnPage(Math.min(knTotalPages, knClampedPage + 1))}
                    disabled={knPage === knTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            }
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {knPageRows.map((k) => {
                const canEdit = isSuperAdminRoute || roleType === "admin" || roleType === "member" || roleType === "resource";
                const canDelete = isSuperAdminRoute || roleType === "admin";
                return (
                  <div key={k.id} className="relative rounded-xl border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] p-6 shadow-sm min-h-[280px]">
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      {canEdit && (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-gray-600 [.dark_&]:text-gray-400 shadow hover:bg-gray-50 [.dark_&]:hover:bg-white/10"
                          title="Edit"
                          onClick={() => handleEditKnowledge(k)}
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white [.dark_&]:bg-[#1F2234] text-red-600 [.dark_&]:text-red-400 shadow hover:bg-red-50 [.dark_&]:hover:bg-red-900/20"
                          title="Delete"
                          onClick={() => handleDeleteKnowledge(k)}
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2 pr-16">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 [.dark_&]:bg-violet-900/20 text-violet-600 [.dark_&]:text-violet-400 border border-violet-200 [.dark_&]:border-violet-500/20">
                        <FaLightbulb className="h-4 w-4" />
                      </span>
                      <h3 className="text-lg font-semibold leading-snug text-gray-900 [.dark_&]:text-white truncate max-w-[200px]" title={k.title}>{k.title.length > 10 ? `${k.title.substring(0, 10)}...` : k.title}</h3>
                    </div>
                    <hr className="my-3 border-t border-gray-200 [.dark_&]:border-white/10" />
                    <p className="mt-1 mb-3 text-sm md:text-[0.95rem] leading-relaxed text-gray-800 [.dark_&]:text-gray-300 line-clamp-4 whitespace-pre-wrap">{k.description}</p>
                    <hr className="my-3 border-t border-gray-200 [.dark_&]:border-white/10" />
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600 [.dark_&]:text-gray-400">
                      {k.created && (
                        <span className="inline-flex items-center gap-1.5">
                          <FaCalendarAlt className="w-3.5 h-3.5 text-gray-400 [.dark_&]:text-gray-500" />
                          <span className="text-gray-500 [.dark_&]:text-gray-400">Created</span>
                          <span className="font-medium text-gray-700 [.dark_&]:text-gray-300">{k.created}</span>
                        </span>
                      )}
                      {k.createdByName && (
                        <span className="inline-flex items-center gap-1.5">
                          <FaUser className="w-3.5 h-3.5 text-gray-400 [.dark_&]:text-gray-500" />
                          <span className="text-gray-500 [.dark_&]:text-gray-400">By</span>
                          <span className="font-medium text-gray-700 [.dark_&]:text-gray-300">{k.createdByName}</span>
                        </span>
                      )}
                      {k.updated && (
                        <span className="inline-flex items-center gap-1.5">
                          <FaClock className="w-3.5 h-3.5 text-gray-400 [.dark_&]:text-gray-500" />
                          <span className="text-gray-500 [.dark_&]:text-gray-400">Updated</span>
                          <span className="font-medium text-gray-700 [.dark_&]:text-gray-300">{k.updated}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!knPageRows.length && (
                <div className="col-span-full text-center text-sm text-gray-500 [.dark_&]:text-gray-400 py-10">No knowledge found</div>
              )}
            </div>
          </Card>

          <AddKnowledgeModal
            isOpen={openAddKn}
            onClose={() => { setOpenAddKn(false); setEditingKn(null); }}
            onSubmit={handleAddKnowledge}
            initialItem={editingKn}
            projectId={resolvedProjectId}
            canEditAccess={isSuperAdminRoute || isManagerRoute || roleType === "admin"}
          />

          {showDeleteKnModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDeleteKnModal(false)}>
              <div onClick={(e) => e.stopPropagation()}>
                <DeleteConfirmationModal
                  onClose={() => setShowDeleteKnModal(false)}
                  onConfirm={confirmDeleteKnowledge}
                  itemType="knowledge entry"
                  title="Delete Knowledge"
                  description="Are you sure you want to permanently delete this knowledge entry?"
                  itemTitle={deleteKnTarget?.title}
                  confirmLabel="Delete"
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <Card title="Search & Actions" tone="muted">
            <SearchActions
              value={docSearch}
              onChange={setDocSearch}
              placeholder="Search by name, location or tag"
              rightActions={(isSuperAdminRoute || roleType === "admin" || roleType === "member" || roleType === "resource") ? (
                <div className="relative" ref={dropdownButtonRef}>
                  <div className={`${buttonClass} flex items-center rounded-lg text-white text-sm font-medium overflow-hidden`}>
                    {/* Left part - Add Document */}
                    <button
                      onClick={() => setOpenAddDoc(true)}
                      className="px-4 py-2 hover:opacity-90 transition-opacity"
                    >
                      + Add Document
                    </button>

                    {/* Divider */}
                    <div className="h-5 w-px bg-white/30"></div>

                    {/* Right part - Dropdown toggle */}
                    <button
                      onClick={() => setShowDocDropdown(!showDocDropdown)}
                      className="px-2 py-2 hover:opacity-90 transition-opacity"
                    >
                      {showDocDropdown ? (
                        <FaChevronUp className="h-3 w-3" />
                      ) : (
                        <FaChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {showDocDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowDocDropdown(false)}
                      ></div>
                      <div
                        className={`fixed rounded-lg shadow-lg ${buttonClass} border-none z-[9999]`}
                        style={{
                          top: dropdownButtonRef.current ? `${dropdownButtonRef.current.getBoundingClientRect().bottom + 8}px` : '0',
                          right: dropdownButtonRef.current ? `${window.innerWidth - dropdownButtonRef.current.getBoundingClientRect().right}px` : '0',
                          width: dropdownButtonRef.current ? `${dropdownButtonRef.current.getBoundingClientRect().width}px` : 'auto'
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowFolderModal(true);
                            setShowDocDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:opacity-90 rounded-lg transition-opacity font-medium"
                        >
                          + Add Folder
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            />
          </Card>
          <Card title="Document List" tone="muted">
            {(() => {
              const canEditDocs = isSuperAdminRoute || roleType === "admin" || roleType === "member" || roleType === "resource";
              const canDeleteDocs = isSuperAdminRoute;
              return (
                <GroupedDocumentsView
                  rows={visibleDocs}
                  query={docSearch}
                  showActions={canEditDocs || canDeleteDocs}
                  onEdit={canEditDocs ? handleEditDocument : undefined}
                  onDelete={canDeleteDocs ? handleDeleteDocument : undefined}
                />
              );
            })()}
          </Card>
          <AddDocumentModal
            isOpen={openAddDoc}
            onClose={() => { setOpenAddDoc(false); setEditingDoc(null); }}
            onSubmit={handleAddDocument}
            initialDoc={editingDoc}
            projectId={resolvedProjectId}
            canEditAccess={isSuperAdminRoute || isManagerRoute || roleType === "admin"}
          />
          {showDeleteModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={() => !isDeleting && setShowDeleteModal(false)}>
              <div onClick={(e) => e.stopPropagation()}>
                <DeleteConfirmationModal
                  onClose={() => !isDeleting && setShowDeleteModal(false)}
                  onConfirm={confirmDeleteDocument}
                  itemType="document"
                  title="Delete Document"
                  description="Are you sure you want to permanently delete this document?"
                  itemTitle={deleteTarget?.name}
                  itemSubtitle={deleteTarget?.filename}
                  confirmLabel="Delete"
                  isLoading={isDeleting}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Manage Folders Modal */}
      <ManageFoldersModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
      />
    </div>
  );
}

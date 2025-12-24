import React, { useEffect, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import { FaPlus, FaCheck, FaTrash } from "react-icons/fa";
import Button from "../Button";
import { db } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

function AddDocumentModal({ isOpen, onClose, onSubmit, initialDoc = null, projectId, canEditAccess = true }) {
  const { buttonClass } = useThemeStyles();
  const [name, setName] = useState("");
  const [folder, setFolder] = useState(""); // Selected folder from dropdown
  const [availableFolders, setAvailableFolders] = useState([]); // Folders from Firestore
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState([]);
  const [selectedMember, setSelectedMember] = useState([]);
  const [allowedIds, setAllowedIds] = useState([]);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setFolder("");
      setFile(null);
      setErrors({});
      setSelectedAdmin([]);
      setSelectedMember([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setEntered(true), 10);
      return () => {
        clearTimeout(t);
        setEntered(false);
      };
    }
  }, [isOpen]);

  // Prefill when editing
  useEffect(() => {
    if (isOpen && initialDoc) {
      setName(initialDoc.name || "");
      setFolder(initialDoc.folder || "");
      setSelectedAdmin(Array.isArray(initialDoc.access?.admin) ? initialDoc.access.admin : []);
      setSelectedMember(Array.isArray(initialDoc.access?.member) ? initialDoc.access.member : []);
    }
  }, [isOpen, initialDoc]);

  // Determine allowed user IDs for the selected project (project manager + assignees on tasks)
  useEffect(() => {
    if (!isOpen || !projectId) {
      setAllowedIds([]);
      return;
    }
    let taskIds = new Set();
    let managerId = null;

    const recompute = () => {
      const combined = new Set([...(managerId ? [managerId] : []), ...taskIds]);
      setAllowedIds(Array.from(combined));
    };

    const tq = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const unsubTasks = onSnapshot(tq, (snap) => {
      const ids = snap.docs
        .map((d) => (d.data() || {}).assigneeId)
        .filter(Boolean);
      taskIds = new Set(ids);
      recompute();
    });

    const pref = doc(db, "projects", projectId);
    let unsubProject = null;
    try {
      // Try to keep manager updates live if project changes
      unsubProject = onSnapshot(pref, (ds) => {
        const pdata = ds.data() || {};
        managerId = pdata.projectManagerId || null;
        recompute();
      });
    } catch {
      // Fallback to one-time fetch
      getDoc(pref).then((ds) => {
        const pdata = ds.data() || {};
        managerId = pdata.projectManagerId || null;
        recompute();
      });
    }

    return () => {
      unsubTasks();
      if (typeof unsubProject === "function") unsubProject();
    };
  }, [isOpen, projectId]);

  // Load users, filter to those involved in the project, and group by resourceRoleType
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const allowed = new Set(allowedIds);
      const mapped = list
        .filter((u) => (projectId ? allowed.has(u.id) : true))
        .map((u) => ({
          id: u.id,
          name: u.name || u.fullName || "",
          type: String(u.resourceRoleType || "").toLowerCase(),
        }));
      setAdmins(mapped.filter((x) => x.type === "admin"));
      setMembers(mapped.filter((x) => x.type === "member" || x.type === "resource"));
    });
    return () => unsub();
  }, [allowedIds, projectId]);

  // Load available folders from Firestore
  useEffect(() => {
    const foldersDocRef = doc(db, "documents", "folders");
    const unsub = onSnapshot(foldersDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Handle both old format (array of strings) and new format (array of objects)
        const folderData = data.folders || data.folderNames || [];
        const folderNames = folderData.map(f => typeof f === 'string' ? f : f.name);
        setAvailableFolders(folderNames);
      } else {
        setAvailableFolders([]);
      }
    }, (error) => {
      console.error("Error fetching folders:", error);
      setAvailableFolders([]);
    });
    return () => unsub();
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Document name is required";
    if (!folder) e.folder = "Please select a folder";
    if (!initialDoc && !file) e.file = "Please upload a document";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    let fileDataUrl = null;
    if (file) {
      fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const shared = (selectedAdmin.length + selectedMember.length) > 0;
    const doc = {
      id: initialDoc?.id || String(Date.now()),
      name: name.trim(),
      folder: folder.trim(), // Required field, selected from dropdown
      location: "—",
      tags: [],
      updated: new Date().toLocaleDateString(),
      viewed: "-",
      shared,
      access: {
        admin: selectedAdmin,
        member: selectedMember,
      },
      children: 0,
      _file: file,
      _fileDataUrl: fileDataUrl,
    };
    onSubmit && onSubmit(doc);
    onClose && onClose();
  };

  const handleOverlayKeyDown = (e) => {
    if (e.key === "Escape") onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      tabIndex={-1}
    >
      <div
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative z-[10000] transform transition-all duration-300 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary [.dark_&]:text-white">{initialDoc ? "Edit Document" : "Add Document"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300">
              <HiXMark className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`grid grid-cols-1 gap-6 ${canEditAccess ? "md:grid-cols-2" : ""}`}>
              <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#1F2234] p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 [.dark_&]:bg-indigo-900/20 text-indigo-600 [.dark_&]:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M19.5 14.25v3.375a2.625 2.625 0 0 1-2.625 2.625H7.125A2.625 2.625 0 0 1 4.5 17.625V6.375A2.625 2.625 0 0 1 7.125 3.75h5.25L19.5 10.5v3.75z" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-semibold text-content-secondary [.dark_&]:text-gray-400">Document Details</h3>
                </div>
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                    Name of document *
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Project Requirements"
                      className={`w-full rounded-lg border ${errors.name ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                    Folder Name *
                    <select
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      className={`w-full rounded-lg border ${errors.folder ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    >
                      <option value="">Select a folder</option>
                      {availableFolders.map((folderName) => (
                        <option key={folderName} value={folderName}>
                          {folderName}
                        </option>
                      ))}
                    </select>
                    {errors.folder && <span className="text-xs text-red-600">{errors.folder}</span>}
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                    <span className="flex items-center gap-2">
                      <span>Upload document *</span>
                      <span className="text-indigo-600 [.dark_&]:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M7.5 18.75h9a3.75 3.75 0 0 0 .42-7.485 5.25 5.25 0 0 0-10.293-.894A4.5 4.5 0 0 0 7.5 18.75z" />
                          <path d="M12 12.75v6m0-6l2.25 2.25M12 12.75l-2.25 2.25M12 3v9" />
                        </svg>
                      </span>
                    </span>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className={`w-full rounded-lg border ${errors.file ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required={!initialDoc}
                    />
                    {!!file && (
                      <span className="text-xs text-content-tertiary">Selected: {file.name}</span>
                    )}
                    {errors.file && <span className="text-xs text-red-600">{errors.file}</span>}
                  </label>
                </div>
              </div>

              {canEditAccess && (
                <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#1F2234] p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 [.dark_&]:bg-emerald-900/20 text-emerald-600 [.dark_&]:text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 1.5a4.5 4.5 0 0 1 4.5 4.5v1.5h.75A2.25 2.25 0 0 1 19.5 9.75v9A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-9A2.25 2.25 0 0 1 6.75 6H7.5A4.5 4.5 0 0 1 12 1.5zm0 3A1.5 1.5 0 0 0 10.5 6v1.5h3V6A1.5 1.5 0 0 0 12 4.5z" />
                      </svg>
                    </span>
                    <h3 className="text-sm font-semibold text-content-secondary [.dark_&]:text-gray-400">Access</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-content-tertiary [.dark_&]:text-gray-500">Admin Users</div>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-subtle [.dark_&]:border-white/10 p-2">
                        {admins.length === 0 ? (
                          <div className="text-xs text-content-tertiary">No admin users</div>
                        ) : (
                          admins.map((u) => {
                            const checked = selectedAdmin.includes(u.name);
                            return (
                              <label key={`admin_${u.id}`} className="flex items-center gap-2 py-1 text-sm [.dark_&]:text-gray-300">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-subtle [.dark_&]:border-white/10"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedAdmin((prev) =>
                                      e.target.checked
                                        ? Array.from(new Set([...prev, u.name]))
                                        : prev.filter((n) => n !== u.name)
                                    );
                                  }}
                                />
                                <span>{u.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-content-tertiary [.dark_&]:text-gray-500">Member Users</div>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-subtle [.dark_&]:border-white/10 p-2">
                        {members.length === 0 ? (
                          <div className="text-xs text-content-tertiary [.dark_&]:text-gray-500">No member users</div>
                        ) : (
                          members.map((u) => {
                            const checked = selectedMember.includes(u.name);
                            return (
                              <label key={`member_${u.id}`} className="flex items-center gap-2 py-1 text-sm [.dark_&]:text-gray-300">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-subtle [.dark_&]:border-white/10"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedMember((prev) =>
                                      e.target.checked
                                        ? Array.from(new Set([...prev, u.name]))
                                        : prev.filter((n) => n !== u.name)
                                    );
                                  }}
                                />
                                <span>{u.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="custom" className={buttonClass}>{initialDoc ? "Save Changes" : "Add Document"}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddDocumentModal;

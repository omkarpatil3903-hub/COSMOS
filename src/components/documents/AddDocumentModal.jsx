/**
 * AddDocumentModal Component
 *
 * Purpose: Modal form for creating and editing documents with access control.
 * Handles file upload, folder selection, and user assignment.
 *
 * Responsibilities:
 * - Create new documents with file upload
 * - Edit existing document metadata
 * - Assign access permissions (admins/members)
 * - Filter folders by user role visibility
 * - Display activity timeline for edits
 * - Validate required fields before submission
 *
 * Dependencies:
 * - Firestore (users, tasks, projects, documents/folders collections)
 * - Firebase Auth (current user for activity tracking)
 * - AssigneeSelector (user selection component)
 * - Button (UI component)
 *
 * Props:
 * - isOpen: Modal visibility
 * - onClose: Close callback
 * - onSubmit: Submit callback with document data
 * - initialDoc: Document to edit (null for create)
 * - projectId: Project context for user filtering
 * - canEditAccess: Boolean to show access controls
 * - userRole: Current user's role for folder filtering
 *
 * Business Rules:
 * - MOMs folder is always hidden (protected system folder)
 * - Folders can have visibleTo restrictions by role
 * - Access is split into admin and member arrays
 * - Activity timeline shows creation and last update
 *
 * Form Validation:
 * - Name required
 * - Folder required
 * - File required for new documents
 *
 * Last Modified: 2026-01-10
 */

import React, { useEffect, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import { FaPlus, FaCheck, FaTrash } from "react-icons/fa";
import Button from "../Button";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

import AssigneeSelector from "../AssigneeSelector";

function AddDocumentModal({ isOpen, onClose, onSubmit, initialDoc = null, projectId, canEditAccess = true, userRole = "" }) {
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
  const [allUsersMap, setAllUsersMap] = useState({});



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

      // Helper to convert names to IDs if legacy data used names
      const mapToIds = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map(item => {
          // If it looks like a UID (no spaces, >20 chars usually, but just check existence)
          if (allUsersMap[item]) return item;
          // Else try to find by name
          const found = Object.values(allUsersMap).find(u => (u.name === item || u.fullName === item));
          return found ? found.id : null;
        }).filter(Boolean);
      };

      // Wait for allUsersMap to be populated? 
      // This effect runs when isOpen/initialDoc changes. 
      // We might need to run this when allUsersMap changes too if it's not ready yet.
      // But usually users load fast. Let's rely on re-renders or add dependency.
      if (Object.keys(allUsersMap).length > 0) {
        setSelectedAdmin(mapToIds(initialDoc.access?.admin));
        setSelectedMember(mapToIds(initialDoc.access?.member));
      }
    }
  }, [isOpen, initialDoc, allUsersMap]);

  // Determine allowed user IDs for the selected project (project manager + task assignees + project members)
  useEffect(() => {
    if (!isOpen || !projectId) {
      setAllowedIds([]);
      return;
    }
    let taskIds = new Set();
    let managerId = null;
    let projectAssigneeIds = [];

    const recompute = () => {
      const combined = new Set([...(managerId ? [managerId] : []), ...taskIds, ...projectAssigneeIds]);
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
      // Try to keep manager and project members updates live
      unsubProject = onSnapshot(pref, (ds) => {
        const pdata = ds.data() || {};
        managerId = pdata.projectManagerId || null;
        projectAssigneeIds = pdata.assigneeIds || [];
        recompute();
      });
    } catch {
      // Fallback to one-time fetch
      getDoc(pref).then((ds) => {
        const pdata = ds.data() || {};
        managerId = pdata.projectManagerId || null;
        projectAssigneeIds = pdata.assigneeIds || [];
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

      // Create a map for easy lookup
      const map = {};
      list.forEach(u => { map[u.id] = u; });
      setAllUsersMap(map);

      const allowed = new Set(allowedIds);

      // Setup set of IDs that are already assigned to the document (if editing)
      const existingDocAssignees = new Set();
      if (initialDoc?.access) {
        // Collect IDs from both admin and member access arrays
        const admins = initialDoc.access.admin || [];
        const members = initialDoc.access.member || [];

        // Handle both ID strings and objects if data structure varies, though usually arrays of strings
        [...admins, ...members].forEach(item => {
          if (typeof item === 'string') existingDocAssignees.add(item);
          else if (item?.id) existingDocAssignees.add(item.id);
        });
      }

      const mapped = list
        .filter((u) => {
          if (!projectId) return true;

          const isAssignedToDoc = existingDocAssignees.has(u.id);
          const isActive = u.status === 'Active';
          const isInProject = allowed.has(u.id);

          // Show user if:
          // 1. They are ALREADY assigned to this document (preservation)
          // OR
          // 2. They are in the project AND are Active
          return isAssignedToDoc || (isInProject && isActive);
        })
        .map((u) => ({
          id: u.id,
          name: u.name || u.fullName || "",
          imageUrl: u.imageUrl,
          type: String(u.resourceRoleType || "").toLowerCase(),
        }));
      setAdmins(mapped.filter((x) => x.type === "admin"));
      setMembers(mapped.filter((x) => x.type === "member" || x.type === "resource"));
    });
    return () => unsub();
  }, [allowedIds, projectId, initialDoc]);

  const getUserImage = (uid, name) => {
    if (uid && allUsersMap[uid]?.imageUrl) return allUsersMap[uid].imageUrl;
    // Fallback: look up by name
    if (name) {
      const lowerName = name.toLowerCase();
      const found = Object.values(allUsersMap).find(u => (u.name || u.fullName || "").toLowerCase() === lowerName);
      if (found?.imageUrl) return found.imageUrl;
    }
    return null;
  };

  // Load available folders from Firestore and filter based on user role
  useEffect(() => {
    const foldersDocRef = doc(db, "documents", "folders");
    const unsub = onSnapshot(foldersDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Handle both old format (array of strings) and new format (array of objects)
        const folderData = data.folders || data.folderNames || [];

        // Filter folders based on user role
        const filteredFolders = folderData.filter(f => {
          const folderObj = typeof f === 'string' ? { name: f } : f;
          const folderName = folderObj.name || '';

          // Always exclude MOMs and Report folders - they are protected system folders
          const fName = folderName.toLowerCase().trim();
          const systemFolders = ['moms', 'mom', 'mom\'s', 'daily report', 'weekly report', 'monthly report'];
          if (systemFolders.includes(fName)) {
            return false;
          }

          // If folder has visibleTo restriction, check if user's role is allowed
          if (folderObj.visibleTo && Array.isArray(folderObj.visibleTo)) {
            const normalizedRole = (userRole || "").toLowerCase();
            const allowedRoles = folderObj.visibleTo.map(r => r.toLowerCase());
            return allowedRoles.includes(normalizedRole);
          }

          // If no restriction, show to everyone
          return true;
        });

        const folderNames = filteredFolders.map(f => typeof f === 'string' ? f : f.name);
        setAvailableFolders(folderNames);
      } else {
        setAvailableFolders([]);
      }
    }, (error) => {
      console.error("Error fetching folders:", error);
      setAvailableFolders([]);
    });
    return () => unsub();
  }, [userRole]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Document name is required";
    if (!folder) e.folder = "Please select a folder";
    if (!initialDoc && !file) e.file = "Please upload a document";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Helper to deep compare arrays
  const arraysEqual = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  const isDirty = React.useMemo(() => {
    if (!initialDoc) {
      // Create mode: at least name, folder, or file must be present
      return name.trim().length > 0 || folder.length > 0 || file !== null;
    }

    // Edit mode
    const currentName = name.trim();
    const currentFolder = folder;

    // Access
    const currentAdmins = selectedAdmin || [];
    const currentMembers = selectedMember || [];

    // Handle initial access IDs which might be objects or strings (legacy)
    // usage in useEffect maps them to IDs, so we assume `initialDoc.access` structure might vary
    // but we can try to rely on what we parsed into state if we had a pure "initialState" hook, 
    // but here we have to re-derive or trust the raw initialDoc.

    // Let's grab IDs from initialDoc similar to how we did in useEffect
    const getIds = (list) => {
      if (!Array.isArray(list)) return [];
      return list.map(item => (typeof item === 'object' ? item.id : item)).filter(Boolean).sort();
    };

    const initialAdmins = getIds(initialDoc.access?.admin);
    const initialMembers = getIds(initialDoc.access?.member);

    const accessChanged = !arraysEqual(currentAdmins, initialAdmins) || !arraysEqual(currentMembers, initialMembers);

    return (
      currentName !== (initialDoc.name || "") ||
      currentFolder !== (initialDoc.folder || "") ||
      file !== null || // If a new file is dropped, it's dirty
      accessChanged
    );
  }, [name, folder, file, selectedAdmin, selectedMember, initialDoc]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (existing code)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    if (!validate()) return;

    setIsSubmitting(true);
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
      // Metadata for Activity
      createdAt: initialDoc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUid: initialDoc?.createdByUid || auth.currentUser?.uid || "",
      createdByName: initialDoc?.createdByName || auth.currentUser?.displayName || "",
      updatedByUid: auth.currentUser?.uid || "",
      updatedByName: auth.currentUser?.displayName || "",
    };

    try {
      if (onSubmit) {
        await onSubmit(doc);
      }
      toast.success(initialDoc ? 'Document updated successfully' : 'Document added successfully');
      onClose && onClose();
    } catch (error) {
      console.error('Error submitting document:', error);
      toast.error('Failed to save document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full ${!canEditAccess ? "max-w-4xl" : "max-w-6xl"} max-h-[90vh] overflow-y-auto relative z-[10000] transform transition-all duration-300 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
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
            <div className={`grid grid-cols-1 gap-6 ${canEditAccess ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
              <div className={`rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#1F2234] p-4 shadow-sm ${!canEditAccess ? "lg:col-span-1" : ""}`}>
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
                  <div>
                    <AssigneeSelector
                      label="Assignees"
                      users={[...admins, ...members]}
                      selectedIds={[...selectedAdmin, ...selectedMember]}
                      onChange={(newIds) => {
                        const newAdmins = [];
                        const newMembers = [];
                        newIds.forEach(id => {
                          const user = allUsersMap[id];
                          if (user) {
                            const type = String(user.resourceRoleType || "").toLowerCase();
                            if (['superadmin', 'admin', 'manager'].includes(type) || type === 'super admin') {
                              newAdmins.push(id);
                            } else {
                              newMembers.push(id);
                            }
                          }
                        });
                        setSelectedAdmin(newAdmins);
                        setSelectedMember(newMembers);
                      }}
                    />
                  </div>
                </div>
              )}


              {/* Activity Column */}
              <div>
                <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm h-full">
                  <h3 className="mb-4 text-sm font-semibold text-content-secondary [.dark_&]:text-gray-300">Activity & Comments</h3>
                  <div className="space-y-6 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 [.dark_&]:bg-gray-700 -z-10"></div>

                    {/* Created Activity */}
                    {initialDoc?.createdAt && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {getUserImage(initialDoc.createdByUid, initialDoc.createdByName) ? (
                            <img
                              src={getUserImage(initialDoc.createdByUid, initialDoc.createdByName)}
                              alt={initialDoc.createdByName || "User"}
                              className="h-8 w-8 rounded-full object-cover border border-subtle [.dark_&]:border-white/10"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-100 [.dark_&]:bg-blue-900/30 flex items-center justify-center text-blue-600 [.dark_&]:text-blue-400 font-semibold text-xs border border-blue-200 [.dark_&]:border-blue-800">
                              {initialDoc.createdByName?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-3 text-sm flex-1 border border-subtle [.dark_&]:border-white/10">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 [.dark_&]:text-gray-200">{initialDoc.createdByName || "Unknown User"}</span>
                            <span className="text-xs text-gray-400">
                              {initialDoc.createdAt && new Date(initialDoc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 [.dark_&]:text-gray-400 text-xs">Created this document</p>
                          <div className="mt-1 text-[10px] text-gray-400 text-right">
                            {initialDoc.createdAt && new Date(initialDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Updated Activity */}
                    {initialDoc?.updatedAt && initialDoc?.updatedAt !== initialDoc?.createdAt && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {getUserImage(initialDoc.updatedByUid, initialDoc.updatedByName) ? (
                            <img
                              src={getUserImage(initialDoc.updatedByUid, initialDoc.updatedByName)}
                              alt={initialDoc.updatedByName || "User"}
                              className="h-8 w-8 rounded-full object-cover border border-subtle [.dark_&]:border-white/10"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-100 [.dark_&]:bg-purple-900/30 flex items-center justify-center text-purple-600 [.dark_&]:text-purple-400 font-semibold text-xs border border-purple-200 [.dark_&]:border-purple-800">
                              {initialDoc.updatedByName?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-3 text-sm flex-1 border border-subtle [.dark_&]:border-white/10">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 [.dark_&]:text-gray-200">{initialDoc.updatedByName || "Unknown User"}</span>
                            <span className="text-xs text-gray-400">
                              {initialDoc.updatedAt && new Date(initialDoc.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 [.dark_&]:text-gray-400 text-xs">Updated this document</p>
                          <div className="mt-1 text-[10px] text-gray-400 text-right">
                            {initialDoc.updatedAt && new Date(initialDoc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )}

                    {!initialDoc && (
                      <div className="flex gap-3 opacity-50">
                        <div className="flex-shrink-0">
                          {getUserImage(auth.currentUser?.uid, auth.currentUser?.displayName) ? (
                            <img
                              src={getUserImage(auth.currentUser?.uid, auth.currentUser?.displayName)}
                              alt="Me"
                              className="h-8 w-8 rounded-full object-cover border border-subtle [.dark_&]:border-white/10"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center text-gray-400 font-semibold text-xs border border-gray-200 [.dark_&]:border-gray-700">
                              Now
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-3 text-sm flex-1 border border-dashed border-subtle [.dark_&]:border-white/10">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 [.dark_&]:text-gray-200">You</span>
                          </div>
                          <p className="text-gray-500 [.dark_&]:text-gray-400 text-xs">Creating document...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="custom" className={buttonClass} disabled={!isDirty || isSubmitting}>{isSubmitting ? "Saving..." : (initialDoc ? "Update Document" : "Add Document")}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddDocumentModal;

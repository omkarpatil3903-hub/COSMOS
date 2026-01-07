import React, { useEffect, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import { FaUpload, FaFileAlt, FaTrash, FaPlus } from "react-icons/fa";
import Button from "../Button";
import { db, storage, auth } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import VoiceInput from "../Common/VoiceInput";
import AssigneeSelector from "../AssigneeSelector";

function AddKnowledgeModal({ isOpen, onClose, onSubmit, initialItem = null, projectId, canEditAccess = true }) {
  const { buttonClass } = useThemeStyles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState([""]); // Changed from single link to array
  const [errors, setErrors] = useState({});
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState([]);
  const [selectedMember, setSelectedMember] = useState([]);
  const [allowedIds, setAllowedIds] = useState([]);
  const [entered, setEntered] = useState(false);

  // Initialize with one empty doc slot if none exist
  const [documents, setDocuments] = useState([{
    file: null,
    name: '',
    displayName: '',
    size: 0,
    url: null,
  }]);
  const [uploading, setUploading] = useState(false);
  const [allUsersMap, setAllUsersMap] = useState({}); // Map of uid -> user data

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setLinks([""]);
      setErrors({});
      setSelectedAdmin([]);
      setSelectedMember([]);
      setDocuments([{
        file: null,
        name: '',
        displayName: '',
        size: 0,
        url: null,
      }]);
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

  useEffect(() => {
    if (isOpen && initialItem) {
      setTitle(initialItem.title || "");
      setDescription(initialItem.description || "");
      // Backward compatibility: check 'links' array first, then fallback to 'link' string
      if (Array.isArray(initialItem.links) && initialItem.links.length > 0) {
        setLinks(initialItem.links);
      } else if (initialItem.link) {
        setLinks([initialItem.link]);
      } else {
        setLinks([""]);
      }
      setSelectedAdmin(Array.isArray(initialItem.access?.admin) ? initialItem.access.admin : []);
      setSelectedMember(Array.isArray(initialItem.access?.member) ? initialItem.access.member : []);
      // If existing docs, use them; else start with one empty slot
      setDocuments(Array.isArray(initialItem.documents) && initialItem.documents.length > 0
        ? initialItem.documents
        : [{
          file: null,
          name: '',
          displayName: '',
          size: 0,
          url: null,
        }]);
    }
  }, [isOpen, initialItem]);

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
      unsubProject = onSnapshot(pref, (ds) => {
        const pdata = ds.data() || {};
        managerId = pdata.projectManagerId || null;
        recompute();
      });
    } catch {
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

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Create a map for easy lookup
      const map = {};
      list.forEach(u => { map[u.id] = u; });
      setAllUsersMap(map);


      const allowed = new Set(allowedIds);
      const allUsers = list
        .filter((u) => (projectId ? allowed.has(u.id) : true))
        .map((u) => ({
          id: u.id,
          name: u.name || u.fullName || "",
          imageUrl: u.imageUrl,
          type: String(u.resourceRoleType || "").toLowerCase()
        }));

      // Manager Users: All hierarchy levels for Manager-level access
      // (SuperAdmin can grant themselves Manager access to see knowledge in Manager dashboard)
      setAdmins(allUsers.filter((x) =>
        x.type === "superadmin" ||
        x.type === "admin" ||
        x.type === "manager" ||
        x.type === "member" ||
        x.type === "resource"
      ));

      // Member Users: All hierarchy levels for Member-level access
      // (SuperAdmin can grant themselves Member access to see knowledge in Employee dashboard)
      setMembers(allUsers.filter((x) =>
        x.type === "superadmin" ||
        x.type === "admin" ||
        x.type === "manager" ||
        x.type === "member" ||
        x.type === "resource"
      ));
    });
    return () => unsub();
  }, [allowedIds, projectId]);

  const getUserImage = (uid, name) => {
    // 1. Try generic map lookup
    if (uid && allUsersMap[uid]?.imageUrl) return allUsersMap[uid].imageUrl;

    // 2. Try current user fallback (if the ID matches the logged-in user)
    if (uid === auth.currentUser?.uid && auth.currentUser?.photoURL) {
      return auth.currentUser.photoURL;
    }

    // 3. Fallback: look up by name
    if (name) {
      const lowerName = name.toLowerCase();
      const found = Object.values(allUsersMap).find(u => (u.name || u.fullName || "").toLowerCase() === lowerName);
      if (found?.imageUrl) return found.imageUrl;
    }
    return null;
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title is required";
    if (!description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileSelect = (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocuments((prev) =>
      prev.map((doc, i) =>
        i === index
          ? {
            file,
            name: file.name,
            displayName: '',
            size: file.size,
            url: null,
          }
          : doc
      )
    );
  };

  const handleAddDocumentSlot = () => {
    setDocuments((prev) => [
      {
        file: null,
        name: '',
        displayName: '',
        size: 0,
        url: null,
      },
      ...prev,
    ]);
  };

  const handleDocumentNameChange = (index, newName) => {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, displayName: newName } : doc))
    );
  };

  const handleFileDelete = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadDocumentsToStorage = async (knowledgeId) => {
    const uploadedDocs = [];

    for (const doc of documents) {
      if (doc.url) {
        // Already uploaded (from initialItem)
        uploadedDocs.push(doc);
      } else if (doc.file) {
        // New file to upload
        try {
          const timestamp = Date.now();
          const sanitizedName = doc.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `${timestamp}_${sanitizedName}`;
          const storagePath = `knowledge/${knowledgeId}/${fileName}`;
          const storageRef = ref(storage, storagePath);

          await uploadBytes(storageRef, doc.file);
          const downloadURL = await getDownloadURL(storageRef);

          uploadedDocs.push({
            name: doc.name,
            displayName: doc.displayName || doc.name,
            size: doc.size,
            url: downloadURL,
            storagePath: storagePath,
            uploadedAt: new Date().toISOString(),
            uploadedBy: auth.currentUser?.uid || "",
            uploadedByName: auth.currentUser?.displayName || "Unknown User",
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          throw error;
        }
      }
    }

    return uploadedDocs;
  };

  const handleAddLink = () => {
    setLinks([...links, ""]);
  };

  const handleLinkChange = (index, value) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleDeleteLink = (index) => {
    if (links.length === 1) {
      setLinks([""]); // Just clear if it's the only one
    } else {
      setLinks(links.filter((_, i) => i !== index));
    }
  };

  const safeParseDate = (dateInput) => {
    if (!dateInput) return null;
    try {
      // Handle Firestore Timestamp
      if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        return dateInput.toDate();
      }
      // Handle numeric timestamp (seconds vs millis)
      if (typeof dateInput === 'number') {
        // Assume millis if huge, seconds if small? Firestore seconds are usually in objects.
        // Plain numbers usually millis in JS.
        return new Date(dateInput);
      }
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    try {
      const knowledgeId = initialItem?.id || String(Date.now());

      // Upload documents to Firebase Storage
      const uploadedDocs = await uploadDocumentsToStorage(knowledgeId);

      const cleanedLinks = links.map(l => l.trim()).filter(l => l !== "");

      // --- Activity Log Logic ---
      const changes = [];
      const currentUser = auth.currentUser;

      if (initialItem) {
        // Detect Title Change
        if (title.trim() !== initialItem.title) {
          changes.push(`Changed title to "${title.trim()}"`);
        }

        // Detect Description Change
        if (description.trim() !== initialItem.description) {
          changes.push("Updated description");
        }

        // Detect Link Changes
        const oldLinks = initialItem.links || (initialItem.link ? [initialItem.link] : []);
        // addedLinks: links in new list that weren't in old list
        const addedLinks = cleanedLinks.filter(l => !oldLinks.includes(l));
        // removedLinks: links in old list that aren't in new list
        const removedLinks = oldLinks.filter(l => !cleanedLinks.includes(l));

        addedLinks.forEach(l => changes.push(`Added link: ${l}`));
        removedLinks.forEach(l => changes.push(`Removed link: ${l}`));

        // Detect Document Changes
        const oldDocs = initialItem.documents || [];
        // Compare by storagePath if available, else by url/name combo
        // Simple approach: Use storagePath or URL as unique ID.
        // New docs won't have the same URL/StoragePath as old ones unless preserved.

        // uploadedDocs contains the complete final state of documents (existing + new)
        const currentDocIdentifiers = new Set(uploadedDocs.map(d => d.storagePath || d.url));
        const oldDocIdentifiers = new Set(oldDocs.map(d => d.storagePath || d.url));

        const addedDocs = uploadedDocs.filter(d => !oldDocIdentifiers.has(d.storagePath || d.url));
        const removedDocs = oldDocs.filter(d => !currentDocIdentifiers.has(d.storagePath || d.url));

        addedDocs.forEach(d => changes.push(`Added document: ${d.displayName || d.name}`));
        removedDocs.forEach(d => changes.push(`Removed document: ${d.displayName || d.name}`));

        // Detect Assignee Changes
        const oldAdmins = initialItem.access?.admin || [];
        const oldMembers = initialItem.access?.member || [];
        const allOldIds = new Set([...oldAdmins, ...oldMembers]);
        const allNewIds = new Set([...selectedAdmin, ...selectedMember]);

        // Simple check for any change in membership
        const assigneesChanged =
          allOldIds.size !== allNewIds.size ||
          [...allOldIds].some(id => !allNewIds.has(id));

        if (assigneesChanged) {
          changes.push("Updated assignees");
        }

      } else {
        changes.push("Created knowledge entry");
      }

      const payload = {
        id: knowledgeId,
        title: title.trim(),
        description: description.trim(),
        links: cleanedLinks,
        link: cleanedLinks[0] || "", // Keep 'link' for backward compatibility
        access: { admin: selectedAdmin, member: selectedMember },
        documents: uploadedDocs,
        // Pass activity changes for the parent to save to subcollection
        activityChanges: changes.length > 0 ? changes : ["Updated knowledge entry"],
        // Maintain legacy fields for sorting/filtering outside logic if needed
        updatedAt: new Date().toISOString(),
        updatedByUid: currentUser?.uid || "",
        updatedByName: currentUser?.displayName || "Unknown User",
      };

      // If creating, add creation metadata
      if (!initialItem) {
        payload.createdAt = new Date().toISOString();
        payload.createdByUid = currentUser?.uid || "";
        payload.createdByName = currentUser?.displayName || "Unknown User";
      } else {
        // Preserve original creation data
        payload.createdAt = initialItem.createdAt;
        payload.createdByUid = initialItem.createdByUid;
        payload.createdByName = initialItem.createdByName;
      }

      onSubmit && onSubmit(payload);
      onClose && onClose();
    } catch (error) {
      console.error('Error submitting knowledge:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-[10000] transform transition-all duration-300 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary [.dark_&]:text-white">{initialItem ? "Edit Knowledge" : "Add Knowledge"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300">
              <HiXMark className="h-6 w-6" />
            </button>
          </div>


          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column - Title, Description, Link */}
              <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm h-full">
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                    Title *
                    <VoiceInput
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. What I learned"
                      className={`w-full rounded-lg border ${errors.title ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.title && <span className="text-xs text-red-600">{errors.title}</span>}
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                    Description *
                    <VoiceInput
                      as="textarea"
                      rows={5} // Decreased height
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write what you learned from this project..."
                      className={`w-full rounded-lg border ${errors.description ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
                  </label>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                        Links (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className={`flex items-center justify-center w-5 h-5 rounded-full ${buttonClass} text-white cursor-pointer hover:shadow-md transition-all`}
                        title="Add another link"
                      >
                        <FaPlus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <div className="space-y-2 h-[88px] overflow-y-auto pr-1 custom-scrollbar">
                      {links.map((lnk, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="url"
                            value={lnk}
                            onChange={(e) => handleLinkChange(index, e.target.value)}
                            placeholder="https://example.com"
                            className="flex-1 rounded-lg border border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                          />
                          {(links.length > 1 || lnk !== "") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(index)}
                              className="text-red-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"
                              title="Remove link"
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>


                </div>
              </div>

              {/* Right Column - Documents */}
              <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm h-full">
                <div className="space-y-4 h-full flex flex-col">
                  {/* Access Section - Right Column */}
                  {canEditAccess && (
                    <div className="mb-6">
                      {/* Label is handled inside AssigneeSelector now if passed, or we can keep it here.
                          The user asked to "add label Assignees", AssigneeSelector has a prop label="Access" by default.
                          I will pass label="Assignees" to it and remove the external label to avoid duplication.
                       */}
                      <AssigneeSelector
                        label="Assignees"
                        users={admins} // admins contains all eligible users
                        selectedIds={[...selectedAdmin, ...selectedMember]}
                        onChange={(newIds) => {
                          const newAdmins = [];
                          const newMembers = [];
                          newIds.forEach(id => {
                            const user = allUsersMap[id];
                            if (user) {
                              // Auto-assign role based on user type
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
                  )}
                  {/* Document Upload Section */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-content-secondary [.dark_&]:text-gray-400">
                      Documents (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDocumentSlot}
                      className={`flex items-center justify-center w-6 h-6 rounded-full ${buttonClass} text-white cursor-pointer transition-colors shadow-sm`}
                      title="Add document field"
                    >
                      <FaPlus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* File List - Fixed height to show 2 items */}
                  {documents.length > 0 && (
                    <div className="mt-2 space-y-3 h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 [.dark_&]:bg-[#1F2234] border border-subtle [.dark_&]:border-white/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {doc.file ? (
                                <>
                                  <FaFileAlt className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 truncate">
                                      {doc.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 [.dark_&]:text-gray-500">
                                      {(doc.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="flex-1">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                    onChange={(e) => handleFileSelect(e, index)}
                                    className="hidden"
                                    id={`doc-upload-${index}`}
                                  />
                                  <label
                                    htmlFor={`doc-upload-${index}`}
                                    className="flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-3 text-xs cursor-pointer hover:bg-gray-50 [.dark_&]:hover:bg-[#1F2234] transition-colors"
                                  >
                                    <FaUpload className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-500 [.dark_&]:text-gray-400">Choose file</span>
                                  </label>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileDelete(index)}
                              className="p-1 rounded hover:bg-red-100 [.dark_&]:hover:bg-red-500/20 text-red-500 transition-colors flex-shrink-0"
                              title="Remove"
                            >
                              <FaTrash className="h-3 w-3" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Enter document name (optional)"
                            value={doc.displayName}
                            onChange={(e) => handleDocumentNameChange(index, e.target.value)}
                            className="w-full rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-xs [.dark_&]:text-white placeholder-gray-400 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                          />
                        </div>
                      ))}</div>
                  )}


                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={uploading}>Cancel</Button>
              <Button type="submit" variant="custom" className={buttonClass} disabled={uploading}>
                {uploading ? "Uploading..." : initialItem ? "Save Changes" : "+ Add Knowledge"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddKnowledgeModal;

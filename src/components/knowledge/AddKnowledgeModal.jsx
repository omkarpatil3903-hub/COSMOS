import React, { useEffect, useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { HiXMark } from "react-icons/hi2";
import { FaUpload, FaFileAlt, FaTrash, FaPlus } from "react-icons/fa";
import Button from "../Button";
import { db, storage, auth } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import VoiceInput from "../Common/VoiceInput";

function AddKnowledgeModal({ isOpen, onClose, onSubmit, initialItem = null, projectId, canEditAccess = true }) {
  const { buttonClass } = useThemeStyles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState([]);
  const [selectedMember, setSelectedMember] = useState([]);
  const [allowedIds, setAllowedIds] = useState([]);
  const [entered, setEntered] = useState(false);
  const [documents, setDocuments] = useState([]); // Array of {file, name, size, url, displayName}
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
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

  useEffect(() => {
    if (isOpen && initialItem) {
      setTitle(initialItem.title || "");
      setDescription(initialItem.description || "");
      setSelectedAdmin(Array.isArray(initialItem.access?.admin) ? initialItem.access.admin : []);
      setSelectedMember(Array.isArray(initialItem.access?.member) ? initialItem.access.member : []);
      setDocuments(Array.isArray(initialItem.documents) ? initialItem.documents : []);
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
      const allowed = new Set(allowedIds);
      const mapped = list
        .filter((u) => (projectId ? allowed.has(u.id) : true))
        .map((u) => ({ id: u.id, name: u.name || u.fullName || "", type: String(u.resourceRoleType || "").toLowerCase() }));
      setAdmins(mapped.filter((x) => x.type === "admin"));
      setMembers(mapped.filter((x) => x.type === "member" || x.type === "resource"));
    });
    return () => unsub();
  }, [allowedIds, projectId]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    try {
      const knowledgeId = initialItem?.id || String(Date.now());

      // Upload documents to Firebase Storage
      const uploadedDocs = await uploadDocumentsToStorage(knowledgeId);

      const payload = {
        id: knowledgeId,
        title: title.trim(),
        description: description.trim(),
        access: { admin: selectedAdmin, member: selectedMember },
        documents: uploadedDocs,
      };

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
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000] transform transition-all duration-300 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
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
            <div className={`grid grid-cols-1 gap-6 ${canEditAccess ? "md:grid-cols-2" : ""}`}>
              {/* Left Column - Title, Description, Access */}
              <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm">
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
                      rows={8}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write what you learned from this project..."
                      className={`w-full rounded-lg border ${errors.description ? "border-red-500" : "border-subtle [.dark_&]:border-white/10"} bg-surface [.dark_&]:bg-[#181B2A] py-2 px-3 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
                  </label>

                  {/* Access Section - Moved from right column */}
                  {canEditAccess && (
                    <div className="pt-2">
                      <div className="mb-3 text-sm font-semibold text-content-secondary [.dark_&]:text-gray-300">Access</div>
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
              </div>

              {/* Right Column - Documents */}
              <div className="rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm">
                <div className="space-y-4">
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

                  {/* File List */}
                  {documents.length > 0 && (
                    <div className="mt-2 space-y-3 max-h-110 overflow-y-auto pr-1">
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
                                    className="flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-2 px-3 text-xs cursor-pointer hover:bg-gray-50 [.dark_&]:hover:bg-[#1F2234] transition-colors"
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
                            className="w-full rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-1.5 px-2 text-xs [.dark_&]:text-white placeholder-gray-400 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                          />
                        </div>
                      ))}</div>
                  )}

                  {/* Empty state */}
                  {documents.length === 0 && (
                    <div
                      className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-subtle [.dark_&]:border-white/10 bg-surface [.dark_&]:bg-[#181B2A] py-4 px-3 text-sm"
                    >
                      <span className="text-gray-500 [.dark_&]:text-gray-400">Click + to add documents</span>
                    </div>
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

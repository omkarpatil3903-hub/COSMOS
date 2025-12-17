import React, { useEffect, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "../Button";
import { db } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, getDoc } from "firebase/firestore";
import VoiceInput from "../Common/VoiceInput";

function AddKnowledgeModal({ isOpen, onClose, onSubmit, initialItem = null, projectId, canEditAccess = true }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState([]);
  const [selectedMember, setSelectedMember] = useState([]);
  const [allowedIds, setAllowedIds] = useState([]);
  const [entered, setEntered] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      id: initialItem?.id || String(Date.now()),
      title: title.trim(),
      description: description.trim(),
      access: { admin: selectedAdmin, member: selectedMember },
    };
    onSubmit && onSubmit(payload);
    onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000] transform transition-all duration-300 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">{initialItem ? "Edit Knowledge" : "Add Knowledge"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <HiXMark className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`grid grid-cols-1 gap-6 ${canEditAccess ? "md:grid-cols-2" : ""}`}>
              <div className="rounded-lg border border-subtle bg-surface p-4 shadow-sm">
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Title *
                    <VoiceInput
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. What I learned"
                      className={`w-full rounded-lg border ${errors.title ? "border-red-500" : "border-subtle"} bg-surface py-2 px-3 text-sm focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.title && <span className="text-xs text-red-600">{errors.title}</span>}
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
                    Description *
                    <VoiceInput
                      as="textarea"
                      rows={8}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write what you learned from this project..."
                      className={`w-full rounded-lg border ${errors.description ? "border-red-500" : "border-subtle"} bg-surface py-2 px-3 text-sm focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                      required
                    />
                    {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
                  </label>
                </div>
              </div>

              {canEditAccess && (
                <div className="rounded-lg border border-subtle bg-surface p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-content-secondary">Access</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-content-tertiary">Admin Users</div>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-subtle p-2">
                        {admins.length === 0 ? (
                          <div className="text-xs text-content-tertiary">No admin users</div>
                        ) : (
                          admins.map((u) => {
                            const checked = selectedAdmin.includes(u.name);
                            return (
                              <label key={`admin_${u.id}`} className="flex items-center gap-2 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-subtle"
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
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-content-tertiary">Member Users</div>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-subtle p-2">
                        {members.length === 0 ? (
                          <div className="text-xs text-content-tertiary">No member users</div>
                        ) : (
                          members.map((u) => {
                            const checked = selectedMember.includes(u.name);
                            return (
                              <label key={`member_${u.id}`} className="flex items-center gap-2 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-subtle"
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
              <Button type="submit">{initialItem ? "Save Changes" : "+ Add Knowledge"}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddKnowledgeModal;

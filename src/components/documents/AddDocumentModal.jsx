import React, { useEffect, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "../Button";
import { db } from "../../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

function AddDocumentModal({ isOpen, onClose, onSubmit, initialDoc = null }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState([]);
  const [selectedMember, setSelectedMember] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setFile(null);
      setErrors({});
      setSelectedAdmin([]);
      setSelectedMember([]);
    }
  }, [isOpen]);

  // Prefill when editing
  useEffect(() => {
    if (isOpen && initialDoc) {
      setName(initialDoc.name || "");
      setSelectedAdmin(Array.isArray(initialDoc.access?.admin) ? initialDoc.access.admin : []);
      setSelectedMember(Array.isArray(initialDoc.access?.member) ? initialDoc.access.member : []);
    }
  }, [isOpen, initialDoc]);

  // Load users and group by resourceRoleType
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mapped = list.map((u) => ({
        id: u.id,
        name: u.name || u.fullName || "",
        type: String(u.resourceRoleType || "").toLowerCase(),
      }));
      setAdmins(mapped.filter((x) => x.type === "admin"));
      setMembers(mapped.filter((x) => x.type === "member"));
    });
    return () => unsub();
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Document name is required";
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">{initialDoc ? "Edit Document" : "Add Document"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <HiXMark className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Name of document *
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Requirements"
                className={`w-full rounded-lg border ${errors.name ? "border-red-500" : "border-subtle"} bg-surface py-2 px-3 text-sm focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                required
              />
              {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Upload document *
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={`w-full rounded-lg border ${errors.file ? "border-red-500" : "border-subtle"} bg-surface py-2 px-3 text-sm focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100`}
                required={!initialDoc}
              />
              {!!file && (
                <span className="text-xs text-content-tertiary">Selected: {file.name}</span>
              )}
              {errors.file && <span className="text-xs text-red-600">{errors.file}</span>}
            </label>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-content-secondary">Access</div>
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

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">{initialDoc ? "Save Changes" : "Add Document"}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddDocumentModal;

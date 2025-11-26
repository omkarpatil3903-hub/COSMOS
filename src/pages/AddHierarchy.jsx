import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import Button from "../components/Button";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { FaTimes, FaEdit, FaTrash } from "react-icons/fa";

export default function AddHierarchy() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("superior");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const filters = useOutletContext() || {};
  const { search = "", section = "all", sort = "az" } = filters;

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("add") === "1") setOpen(true);
  }, [location.search]);

  useEffect(() => {
    const ref = doc(db, "settings", "hierarchy");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const sup = Array.isArray(d.superior) ? d.superior : [];
      const inf = Array.isArray(d.inferior) ? d.inferior : [];
      const list = [
        ...sup.map((v) => ({ id: `s_${v}`, type: "superior", name: v })),
        ...inf.map((v) => ({ id: `i_${v}`, type: "inferior", name: v })),
      ];
      setItems(list);
    });
    return () => unsub();
  }, []);

  const close = () => {
    const p = new URLSearchParams(location.search);
    if (p.has("add")) {
      p.delete("add");
      navigate({ pathname: location.pathname, search: p.toString() ? `?${p.toString()}` : "" }, { replace: true });
    }
    setOpen(false);
    setValue("");
  };

  const save = async () => {
    const v = value.trim();
    if (!v) {
      toast.error("Enter a value");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "settings", "hierarchy");
      const field = type === "superior" ? "superior" : "inferior";
      if (editing) {
        const oldField = editing.type === "superior" ? "superior" : "inferior";
        await setDoc(ref, { [oldField]: arrayRemove(editing.name) }, { merge: true });
      }
      await setDoc(ref, { [field]: arrayUnion(v), updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Saved");
      close();
      setEditing(null);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setType(item.type);
    setValue(item.name);
    setOpen(true);
  };

  const removeItem = async (item) => {
    try {
      const ref = doc(db, "settings", "hierarchy");
      const field = item.type === "superior" ? "superior" : "inferior";
      await setDoc(ref, { [field]: arrayRemove(item.name), updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (section === "project") list = [];
    if (section === "hierarchy" || section === "all") {
      list = items;
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((x) => x.name.toLowerCase().includes(s) || x.type.toLowerCase().includes(s));
    }
    if (sort === "za") list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, search, section, sort]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-subtle">
        <table className="min-w-full divide-y divide-subtle">
          <thead className="bg-surface-subtle">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
              <th className="px-4 py-2 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-content-tertiary">No items</td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm capitalize">{item.type}</td>
                  <td className="px-4 py-2 text-sm">{item.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" className="h-8 px-3" onClick={() => startEdit(item)}>
                        <FaEdit /> Edit
                      </Button>
                      <Button variant="danger" className="h-8 px-3" onClick={() => removeItem(item)}>
                        <FaTrash /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-xl font-semibold">Create Hierarchy</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 rounded-full bg-gray-100 p-1 text-sm font-medium">
                <button
                  onClick={() => setType("superior")}
                  className={`rounded-full px-4 py-2 transition ${
                    type === "superior" ? "bg-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Superior
                </button>
                <button
                  onClick={() => setType("inferior")}
                  className={`rounded-full px-4 py-2 transition ${
                    type === "inferior" ? "bg-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  Inferior
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium mb-1">
                {type === "superior" ? "Add Superior" : "Add Inferior"}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                placeholder={type === "superior" ? "e.g., Manager" : "e.g., Intern"}
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={save} disabled={saving} variant="primary">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

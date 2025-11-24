import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import Button from "../Button";

const EventFormModal = ({
    isOpen,
    onClose,
    onSave,
    eventToEdit,
    selectedDate,
    clients,
    resources,
    defaultFormBuilder
}) => {
    const [form, setForm] = useState(defaultFormBuilder ? defaultFormBuilder() : {});

    // Initialize
    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setForm({
                    title: eventToEdit.title || "",
                    type: eventToEdit.type || "meeting",
                    date: eventToEdit.date || "",
                    time: eventToEdit.time || "09:00",
                    duration: eventToEdit.duration || 60,
                    clientId: eventToEdit.clientId || "",
                    description: eventToEdit.description || "",
                    priority: eventToEdit.priority || "medium",
                    location: eventToEdit.location || "",
                    attendeeIds: eventToEdit.attendeeIds || []
                });
            } else {
                // New Event logic
                const dateStr = selectedDate
                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                    : new Date().toISOString().split('T')[0];

                setForm(prev => ({
                    ...defaultFormBuilder(),
                    date: dateStr
                }));
            }
        }
    }, [isOpen, eventToEdit, selectedDate, defaultFormBuilder]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    // Helper to handle checkbox changes for attendees
    const handleAttendeeChange = (resourceId) => {
        setForm(prev => {
            const current = prev.attendeeIds || [];
            if (current.includes(resourceId)) {
                return { ...prev, attendeeIds: current.filter(id => id !== resourceId) };
            } else {
                return { ...prev, attendeeIds: [...current, resourceId] };
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{eventToEdit ? "Edit Event" : "New Event"}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><HiXMark className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Title</label>
                        <input
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Event Title"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Time</label>
                            <input
                                type="time"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={form.time}
                                onChange={e => setForm({ ...form, time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Client</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={form.clientId}
                                onChange={e => setForm({ ...form, clientId: e.target.value })}
                            >
                                <option value="">Select Client (Optional)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.companyName || c.clientName || c.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Duration (min)</label>
                            <input
                                type="number"
                                min="15"
                                step="15"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={form.duration}
                                onChange={e => setForm({ ...form, duration: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Attendees (Resources)</label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                            {resources.length === 0 ? <p className="text-sm text-gray-500">No resources found.</p> : (
                                <div className="space-y-2">
                                    {resources.map(res => (
                                        <label key={res.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(form.attendeeIds || []).includes(res.id)}
                                                onChange={() => handleAttendeeChange(res.id)}
                                                className="rounded border-gray-300 text-indigo-600"
                                            />
                                            <span className="text-sm">{res.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Meeting agenda or notes..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">{eventToEdit ? "Update Event" : "Create Event"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventFormModal;
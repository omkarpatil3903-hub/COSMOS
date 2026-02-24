import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../context/useAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaThumbtack } from 'react-icons/fa';
import noteIcon from '../../assets/notepad_icon.png';
import NotePreview from './NotePreview';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

/**
 * GlobalStickyNotes Component
 * 
 * Provides a floating toggle icon that displays the user's sticky notes.
 * Designed to be included in layout shells for global availability.
 */
const GlobalStickyNotes = () => {
    const { user, userData } = useAuthContext();
    const { mode } = useTheme();
    const [showTopNotes, setShowTopNotes] = useState(false);
    const [notes, setNotes] = useState([]);
    const [noteHeading, setNoteHeading] = useState("");
    const [noteInput, setNoteInput] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const uid = userData?.uid || user?.uid;

    useEffect(() => {
        if (!uid) return;

        const q = query(collection(db, "notes"), where("userUid", "==", uid));
        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map((d) => {
                const data = d.data() || {};
                return {
                    id: d.id,
                    heading: data.heading || "",
                    text: data.bodyText || data.text || data.title || "",
                    isPinned: data.isPinned === true,
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                };
            });

            const sorted = [...items].sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                const at = (a.updatedAt?.toMillis?.() || (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0) || 0) ||
                    (a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) || 0);
                const bt = (b.updatedAt?.toMillis?.() || (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0) || 0) ||
                    (b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) || 0);
                return bt - at;
            });
            setNotes(sorted);
        }, (error) => {
            console.error("Failed to load notes for user", error);
        });

        return () => unsub();
    }, [uid]);

    const handleSaveNote = async () => {
        const trimmedText = noteInput.trim();
        const trimmedHeading = noteHeading.trim();
        if (!trimmedText || !uid) return;

        setIsSaving(true);
        try {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            await addDoc(collection(db, "notes"), {
                text: trimmedText,
                heading: trimmedHeading,
                isPinned: isPinned,
                userUid: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setNoteInput("");
            setNoteHeading("");
            setIsPinned(false);
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateNote = async (noteId, updatedData) => {
        try {
            const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
            const docRef = doc(db, "notes", noteId);

            // Construct update object with only defined fields
            const updateObj = {
                updatedAt: serverTimestamp()
            };

            if (updatedData.text !== undefined) updateObj.text = updatedData.text;
            if (updatedData.heading !== undefined) updateObj.heading = updatedData.heading;
            if (updatedData.isPinned !== undefined) updateObj.isPinned = updatedData.isPinned;

            await updateDoc(docRef, updateObj);
            setEditingNoteId(null);
        } catch (error) {
            console.error("Failed to update note:", error);
            alert("Failed to update note. Please try again.");
        }
    };

    const handleDeleteNote = (noteId) => {
        setNoteToDelete(noteId);
        setShowDeleteModal(true);
    };

    const confirmDeleteNote = async () => {
        if (!noteToDelete) return;
        setIsSaving(true);
        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            await deleteDoc(doc(db, "notes", noteToDelete));
            if (editingNoteId === noteToDelete) {
                setEditingNoteId(null);
            }
            setShowDeleteModal(false);
            setNoteToDelete(null);
        } catch (error) {
            console.error("Failed to delete note:", error);
            alert("Failed to delete note. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed top-2 right-8 z-50 flex flex-col items-end pointer-events-none">
            <div
                className="flex items-center justify-center w-16 h-16 cursor-pointer mb-4 transition-all hover:-translate-y-1.5 pointer-events-auto group"
                onClick={() => setShowTopNotes(!showTopNotes)}
                title="Toggle Sticky Notes"
            >
                <img
                    src={noteIcon}
                    alt="Sticky Notes"
                    className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-lg transition-all"
                />
            </div>

            {showTopNotes && (
                <div className="w-96 flex flex-col gap-4 transition-all max-h-[80vh] overflow-y-auto pointer-events-auto custom-scrollbar px-2 pb-4 pt-1">
                    {/* Create New Note Card - Strictly for addition */}
                    <div className={`relative p-5 rounded-[12px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 group transition-all`}>
                        <div className="flex flex-col">
                            {/* Heading Input Area - Matches NotePreview Header */}
                            <div className="w-full mb-2 relative">
                                <div className="grid grid-cols-[40px_1fr_40px] items-center w-full mb-0.5">
                                    <div className="flex justify-start">
                                        <button
                                            onClick={() => setIsPinned(!isPinned)}
                                            className={`transition-colors ${isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500'}`}
                                            title={isPinned ? "Unpin this note" : "Pin this note"}
                                        >
                                            <FaThumbtack className={`w-4 h-4 transform ${isPinned ? 'rotate-45' : 'rotate-0'}`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={noteHeading}
                                        onChange={(e) => setNoteHeading(e.target.value)}
                                        className="font-bold text-gray-900 dark:text-white px-1 leading-tight text-center break-words text-lg bg-transparent border-none focus:ring-0 placeholder:italic placeholder:text-gray-400 placeholder:font-medium w-full"
                                        placeholder="Headline..."
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveNote}
                                            disabled={isSaving || !noteInput.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-full w-7 h-7 flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-90"
                                            title="Save Note"
                                        >
                                            {isSaving ? (
                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <span className="font-bold text-xs leading-none">✓</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center relative">
                                    <span className={`text-[10px] font-medium tracking-wider uppercase leading-none transition-colors text-gray-400 dark:text-gray-500`}>
                                        New NoteDraft
                                    </span>
                                </div>
                            </div>

                            <hr className={`border-t-2 border-gray-200 dark:border-gray-600 mb-2 mt-1`} />

                            {/* Content Input Area - Matches Lined Paper Texture */}
                            <div className="relative">
                                <textarea
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-normal text-gray-800 dark:text-gray-200 px-1 pt-0 resize-none overflow-hidden"
                                    placeholder="Write your note here..."
                                    style={{
                                        lineHeight: '28px',
                                        backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${mode === 'dark' ? '#374151' : '#f3f4f6'} 27px, ${mode === 'dark' ? '#374151' : '#f3f4f6'} 28px)`,
                                        backgroundSize: '100% 28px',
                                        backgroundAttachment: 'local',
                                        minHeight: '112px'
                                    }}
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>

                    {notes.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                            No other notes saved yet.
                        </div>
                    ) : (
                        notes.map(note => (
                            <NotePreview
                                key={note.id}
                                note={note}
                                variant="floating"
                                mode={mode}
                                isEditing={editingNoteId === note.id}
                                onEdit={(n) => setEditingNoteId(n.id)}
                                onCancel={() => setEditingNoteId(null)}
                                onSaveUpdate={handleUpdateNote}
                                onDelete={() => handleDeleteNote(note.id)}
                            />
                        ))
                    )}
                </div>
            )}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 pointer-events-auto px-4">
                    <div onClick={(e) => e.stopPropagation()}>
                        <DeleteConfirmationModal
                            onClose={() => {
                                setShowDeleteModal(false);
                                setNoteToDelete(null);
                            }}
                            onConfirm={confirmDeleteNote}
                            itemType="note"
                            title="Delete Note"
                            description="Are you sure you want to delete this note?"
                            permanentMessage="This action cannot be undone."
                            isLoading={isSaving}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalStickyNotes;

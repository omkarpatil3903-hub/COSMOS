import React, { useState } from 'react';
import { FaThumbtack, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { HiPencil, HiTrash } from 'react-icons/hi';

/**
 * NotePreview Component
 * 
 * Renders a sticky note with notebook styling, centered heading/date, 
 * and lined paper texture. Includes expand/collapse for long notes.
 * 
 * @param {Object} props
 * @param {Object} props.note - The note data (text, heading, updatedAt, isPinned)
 * @param {string} props.variant - 'floating' or 'inline' to determine spacing and size
 * @param {'light' | 'dark'} props.mode - The current theme mode ('light' or 'dark')
 * @param {string} props.className - Additional classes for the container
 * @param {Function} props.onEdit - Callback for editing
 * @param {Function} props.onDelete - Callback for deleting
 */
const NotePreview = ({
    note,
    variant = 'floating',
    mode = 'light',
    className = '',
    onEdit,
    onDelete,
    isEditing = false,
    onSaveUpdate,
    onCancel
}) => {
    const isFloating = variant === 'floating';
    const [isExpanded, setIsExpanded] = useState(true);

    // Local state for inline editing
    const [editHeading, setEditHeading] = useState("");
    const [editText, setEditText] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Synchronize local state when editing starts
    React.useEffect(() => {
        if (isEditing) {
            setEditHeading(note.heading || "");
            setEditText(note.text || "");
        }
    }, [isEditing, note]);

    const handleUpdate = async (e) => {
        e.stopPropagation();
        if (!editText.trim() || !onSaveUpdate) return;
        setIsSaving(true);
        try {
            await onSaveUpdate(note.id, {
                heading: editHeading,
                text: editText,
                isPinned: !!note.isPinned
            });
        } catch (err) {
            console.error("Error in NotePreview handleUpdate:", err);
        } finally {
            setIsSaving(false);
        }
    };

    // Format date to dd/mm/yyyy
    const formattedDateTime = (() => {
        const d = note.updatedAt?.toDate ? note.updatedAt.toDate() : (note.updatedAt ? new Date(note.updatedAt) : null);
        if (!d || isNaN(d)) return 'Just now';

        const dateStr = d.toLocaleDateString('en-GB'); // dd/mm/yyyy
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateStr} AT ${timeStr}`;
    })();

    const containerClasses = isFloating
        ? `relative p-5 rounded-[12px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] transform transition-all border ${isEditing ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-200 dark:border-gray-700 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]'} bg-white dark:bg-gray-800`
        : "flex flex-col text-xs text-gray-700 dark:text-gray-300 leading-snug flex-1 w-full relative";

    const lineHeight = isFloating ? '28px' : '20px';
    const parsedLineHeight = parseInt(lineHeight);

    // Line color based on mode and variant
    const lineColor = mode === 'dark'
        ? '#374151' // dark:border-gray-700
        : (isFloating ? '#f3f4f6' : '#e5e7eb'); // gray-100 or gray-200

    const lines = note.text.split('\n');

    return (
        <div className={`${containerClasses} ${className}`}>
            <div className="flex flex-col h-full">
                <div className={`w-full ${isFloating ? 'mb-2' : 'mb-1'} relative`}>
                    {/* Title Row with Toggle */}
                    <div className="grid grid-cols-[40px_1fr_40px] items-center w-full mb-0.5">
                        <div className="flex justify-start">
                            {note.isPinned && isFloating && !isEditing ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSaveUpdate(note.id, { ...note, isPinned: false });
                                    }}
                                    className="transition-all hover:scale-110 active:scale-95"
                                    title="Unpin note"
                                >
                                    <FaThumbtack className="w-4 h-4 text-amber-500 transform rotate-45" />
                                </button>
                            ) : (
                                isFloating && !isEditing && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSaveUpdate(note.id, { ...note, isPinned: true });
                                        }}
                                        className="text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500 transition-all hover:scale-110 active:scale-95"
                                        title="Pin note"
                                    >
                                        <FaThumbtack className="w-4 h-4" />
                                    </button>
                                )
                            )}
                        </div>

                        <div className={`px-1 text-center w-full`}>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editHeading}
                                    onChange={(e) => setEditHeading(e.target.value)}
                                    autoFocus
                                    className="font-bold text-gray-900 dark:text-white leading-tight text-center break-words text-lg bg-transparent border-none focus:ring-0 p-0 w-full placeholder:italic placeholder:text-gray-300"
                                    placeholder="Headline..."
                                />
                            ) : (
                                <div className={`font-bold text-gray-900 dark:text-white leading-tight break-words ${isFloating ? 'text-lg' : 'text-sm'}`}>
                                    {note.heading || (
                                        <span className="italic text-gray-400 dark:text-gray-500 font-medium">Note Headline</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            {isEditing ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdate(e);
                                    }}
                                    disabled={isSaving || !editText.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-full w-7 h-7 flex items-center justify-center transition-all shadow-sm active:scale-90"
                                    title="Update Note"
                                >
                                    {isSaving ? (
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="font-bold text-xs leading-none">✓</span>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700/50 text-gray-500 hover:text-indigo-600 transition-colors shadow-sm border border-gray-100 dark:border-gray-600 z-10 font-bold text-sm"
                                    title={isExpanded ? "Collapse note" : "Expand note"}
                                >
                                    {isExpanded ? <FaChevronUp className="w-2.5 h-2.5" /> : <FaChevronDown className="w-2.5 h-2.5" />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Date Row with Edit/Delete at end */}
                    <div className="grid grid-cols-[80px_1fr_80px] items-center w-full">
                        <div />

                        <div className="text-center">
                            <span className={`${isFloating ? 'text-[10px] font-medium' : 'text-[9px]'} text-gray-400 dark:text-gray-500 tracking-wider uppercase leading-none block`}>
                                {isEditing ? 'Editing Mode' : formattedDateTime}
                            </span>
                            {isEditing && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancel && onCancel();
                                    }}
                                    className="text-[9px] text-red-500 hover:text-red-600 font-bold uppercase tracking-tight mt-0.5"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="flex justify-end gap-1 px-1">
                            {!isEditing && (
                                <>
                                    {onEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(note);
                                            }}
                                            className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-gray-400 hover:text-indigo-600 transition-colors"
                                            title="Edit note"
                                        >
                                            <HiPencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(note);
                                            }}
                                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete note"
                                        >
                                            <HiTrash className="w-4 h-4" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <hr className={`border-t-2 ${isEditing ? 'border-indigo-100 dark:border-indigo-900/40' : 'border-gray-200 dark:border-gray-600'} ${isFloating ? 'mb-2 mt-1' : 'mb-1'}`} />

                {(isExpanded || isEditing) && (
                    <div
                        className={`whitespace-pre-wrap break-words px-1 font-normal text-gray-800 dark:text-gray-200 ${isFloating ? 'text-sm' : 'text-xs'} transition-all duration-300 ease-in-out h-full`}
                        style={{
                            lineHeight,
                            backgroundImage: `repeating-linear-gradient(transparent, transparent ${parsedLineHeight - 1}px, ${lineColor} ${parsedLineHeight - 1}px, ${lineColor} ${lineHeight})`,
                            backgroundSize: `100% ${lineHeight}`,
                            backgroundAttachment: 'local',
                            minHeight: isFloating ? '84px' : '60px'
                        }}
                    >
                        {isEditing ? (
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-normal text-gray-800 dark:text-gray-200 px-0 pt-0 resize-none overflow-hidden h-full"
                                style={{ lineHeight, minHeight: '112px' }}
                                rows={4}
                            />
                        ) : (
                            <>
                                {lines.map((line, i) => (
                                    <span
                                        key={i}
                                        className={`block ${isFloating && !note.heading && i === 0 && note.text.includes('\n') ? "font-bold text-base text-gray-900 dark:text-white" : ""}`}
                                        style={{ minHeight: lineHeight }}
                                    >
                                        {line || '\u00A0'}
                                    </span>
                                ))}
                                {/* Extra blank line for better look */}
                                <span className="block" style={{ minHeight: lineHeight }}>{'\u00A0'}</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


export default NotePreview;

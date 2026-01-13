/**
 * TagInput Component
 *
 * Purpose: Reusable tag input with colored badges.
 * Supports add/remove operations and keyboard navigation.
 *
 * Responsibilities:
 * - Display existing tags with colored badges
 * - Toggle input mode for adding new tags
 * - Handle tag addition via Enter key
 * - Handle ESC to cancel input
 * - Prevent duplicate tags
 * - Remove tags via X button
 *
 * Dependencies:
 * - react-icons (FaTimes, FaPlus)
 *
 * Props:
 * - tags: Array of tag strings
 * - onAdd: Callback when new tag is added
 * - onRemove: Callback when tag is removed
 * - placeholder: Input placeholder text
 * - readOnly: Disable add/remove (default: false)
 *
 * Features:
 * - 8 color variants cycled by tag index
 * - Dark mode support via [.dark_&] classes
 * - Inline input with autofocus
 * - Dashed "Add tag" button when not editing
 *
 * TAG_COLORS Array:
 * - blue, green, purple, orange, pink, indigo, teal, red
 *
 * Last Modified: 2026-01-10
 */

import React, { useState } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";

const TAG_COLORS = [
    "bg-blue-100 text-blue-700 border-blue-200 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-300 [.dark_&]:border-blue-700/30",
    "bg-green-100 text-green-700 border-green-200 [.dark_&]:bg-green-900/30 [.dark_&]:text-green-300 [.dark_&]:border-green-700/30",
    "bg-purple-100 text-purple-700 border-purple-200 [.dark_&]:bg-purple-900/30 [.dark_&]:text-purple-300 [.dark_&]:border-purple-700/30",
    "bg-orange-100 text-orange-700 border-orange-200 [.dark_&]:bg-orange-900/30 [.dark_&]:text-orange-300 [.dark_&]:border-orange-700/30",
    "bg-pink-100 text-pink-700 border-pink-200 [.dark_&]:bg-pink-900/30 [.dark_&]:text-pink-300 [.dark_&]:border-pink-700/30",
    "bg-indigo-100 text-indigo-700 border-indigo-200 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-300 [.dark_&]:border-indigo-700/30",
    "bg-teal-100 text-teal-700 border-teal-200 [.dark_&]:bg-teal-900/30 [.dark_&]:text-teal-300 [.dark_&]:border-teal-700/30",
    "bg-red-100 text-red-700 border-red-200 [.dark_&]:bg-red-900/30 [.dark_&]:text-red-300 [.dark_&]:border-red-700/30",
];

const TagInput = ({ tags = [], onAdd, onRemove, placeholder = "Add tag...", readOnly = false }) => {
    const [inputValue, setInputValue] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const getTagColor = (index) => {
        return TAG_COLORS[index % TAG_COLORS.length];
    };

    const handleAdd = () => {
        if (readOnly) return;
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onAdd(trimmed);
            setInputValue("");
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        } else if (e.key === "Escape") {
            setInputValue("");
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {tags.map((tag, index) => (
                <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getTagColor(
                        index
                    )}`}
                >
                    {tag}
                    {!readOnly && (
                        <button
                            onClick={() => onRemove(tag)}
                            className="hover:bg-black/10 [.dark_&]:hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
                            <FaTimes className="text-[10px]" />
                        </button>
                    )}
                </span>
            ))}

            {!readOnly && (
                isAdding ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                                if (!inputValue.trim()) {
                                    setIsAdding(false);
                                }
                            }}
                            placeholder={placeholder}
                            className="px-2 py-1 text-xs border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] rounded-md focus:outline-none focus:border-indigo-500 w-32 text-gray-900 [.dark_&]:text-white"
                            autoFocus
                        />
                        <button
                            onClick={handleAdd}
                            className="p-1 text-indigo-600 [.dark_&]:text-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 rounded transition-colors"
                        >
                            <FaPlus className="text-xs" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 [.dark_&]:text-gray-400 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 border border-dashed border-gray-300 [.dark_&]:border-white/10 hover:border-indigo-400 rounded-full transition-all"
                    >
                        <FaPlus className="text-[10px]" />
                        Add tag
                    </button>
                )
            )}
        </div>
    );
};

export default TagInput;

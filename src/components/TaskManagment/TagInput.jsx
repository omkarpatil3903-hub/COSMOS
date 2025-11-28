// src/components/TaskManagment/TagInput.jsx
import React, { useState } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";

const TAG_COLORS = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-green-100 text-green-700 border-green-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-red-100 text-red-700 border-red-200",
];

const TagInput = ({ tags = [], onAdd, onRemove, placeholder = "Add tag..." }) => {
    const [inputValue, setInputValue] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const getTagColor = (index) => {
        return TAG_COLORS[index % TAG_COLORS.length];
    };

    const handleAdd = () => {
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
                    <button
                        onClick={() => onRemove(tag)}
                        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    >
                        <FaTimes className="text-[10px]" />
                    </button>
                </span>
            ))}

            {isAdding ? (
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
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500 w-32"
                        autoFocus
                    />
                    <button
                        onClick={handleAdd}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                        <FaPlus className="text-xs" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-gray-300 hover:border-indigo-400 rounded-full transition-all"
                >
                    <FaPlus className="text-[10px]" />
                    Add tag
                </button>
            )}
        </div>
    );
};

export default TagInput;

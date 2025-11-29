// src/components/TaskManagment/TimeEstimateInput.jsx
import React, { useState } from "react";
import { FaClock, FaTimes } from "react-icons/fa";

const QUICK_PRESETS = [
    { label: "2h", hours: 2 },
    { label: "4h", hours: 4 },
    { label: "1d", hours: 8 },
    { label: "2d", hours: 16 },
    { label: "1w", hours: 40 },
];

const formatHours = (hours) => {
    if (!hours || hours === 0) return "Not set";
    if (hours < 8) return `${hours}h`;
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    if (remainingHours === 0) return `${days}d`;
    return `${days}d ${remainingHours}h`;
};

const TimeEstimateInput = ({ value, onChange, readOnly = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handlePresetClick = (hours) => {
        onChange(hours);
        setIsEditing(false);
    };

    const handleCustomSubmit = () => {
        const num = parseFloat(inputValue);
        if (!isNaN(num) && num > 0) {
            onChange(num);
            setInputValue("");
            setIsEditing(false);
        }
    };

    const handleClear = () => {
        onChange(0);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleCustomSubmit();
        } else if (e.key === "Escape") {
            setInputValue("");
            setIsEditing(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                    <FaClock className="text-gray-400 text-sm" />
                    <span className={`text-sm ${value ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                        {formatHours(value)}
                    </span>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {value ? "Edit" : "Set"}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Time Estimate</span>
                <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => handlePresetClick(preset.hours)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all ${value === preset.hours
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600"
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600">Custom (hours):</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., 12"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleCustomSubmit}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Set
                    </button>
                </div>
            </div>

            {/* Clear Button */}
            {value > 0 && (
                <button
                    onClick={handleClear}
                    className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                >
                    Clear Estimate
                </button>
            )}
        </div>
    );
};

export default TimeEstimateInput;

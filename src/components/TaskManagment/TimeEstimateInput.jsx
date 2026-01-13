/**
 * TimeEstimateInput Component
 *
 * Purpose: Time estimate input with quick presets and custom entry.
 * Displays time in hours/days format.
 *
 * Responsibilities:
 * - Display current time estimate or "Not set"
 * - Toggle edit mode on click
 * - Provide quick preset buttons (2h, 4h, 1d, 2d, 1w)
 * - Allow custom hour input
 * - Clear estimate option
 * - Format hours to days/hours display
 *
 * Dependencies:
 * - react-icons (FaClock, FaTimes)
 *
 * Props:
 * - value: Current estimate in hours
 * - onChange: Callback with new hours value
 * - readOnly: Disable editing (default: false)
 *
 * Quick Presets:
 * - 2h = 2 hours
 * - 4h = 4 hours
 * - 1d = 8 hours (1 work day)
 * - 2d = 16 hours
 * - 1w = 40 hours
 *
 * Display Format:
 * - < 8 hours: "Xh"
 * - >= 8 hours: "Xd" or "Xd Xh"
 * - 0 or null: "Not set"
 *
 * Keyboard Support:
 * - Enter: Submit custom value
 * - Escape: Cancel editing
 *
 * Last Modified: 2026-01-10
 */

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
                    <FaClock className="text-gray-400 [.dark_&]:text-gray-500 text-sm" />
                    <span className={`text-sm ${value ? "text-gray-700 [.dark_&]:text-white font-medium" : "text-gray-400 [.dark_&]:text-gray-500"}`}>
                        {formatHours(value)}
                    </span>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-700 [.dark_&]:hover:text-indigo-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
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
                <span className="text-xs font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase">Time Estimate</span>
                <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
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
                            : "bg-white [.dark_&]:bg-[#181B2A] text-gray-700 [.dark_&]:text-white border-gray-300 [.dark_&]:border-white/20 hover:border-indigo-500 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400"
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600 [.dark_&]:text-gray-400">Custom (hours):</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., 12"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 [.dark_&]:border-white/20 rounded-md focus:outline-none focus:border-indigo-500 bg-white [.dark_&]:bg-[#181B2A] text-gray-900 [.dark_&]:text-white"
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
                    className="w-full px-3 py-1.5 text-xs text-red-600 [.dark_&]:text-red-400 hover:bg-red-50 [.dark_&]:hover:bg-red-900/20 border border-red-200 [.dark_&]:border-red-500/20 rounded-md transition-colors"
                >
                    Clear Estimate
                </button>
            )}
        </div>
    );
};

export default TimeEstimateInput;

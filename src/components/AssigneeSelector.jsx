/**
 * AssigneeSelector Component
 *
 * Purpose: Multi-select user picker with floating popover.
 * Displays selected users as avatars with search and suggestions.
 *
 * Responsibilities:
 * - Display selected user avatars (max 5 shown, +N overflow)
 * - Add assignee button (dashed border when empty)
 * - Floating popover with search input
 * - Assigned section: already selected users (checkmark)
 * - Suggestions section: filtered unselected users
 * - Toggle selection on click
 * - Click outside to close
 *
 * Dependencies:
 * - react-icons (FaCheck, FaSearch, FaUserCircle, FaPlus)
 *
 * Props:
 * - users: Array of { id, name, email, imageUrl, role }
 * - selectedIds: Array of selected user IDs
 * - onChange: Callback with updated ID array
 * - label: Optional label text (default: "Access")
 *
 * Features:
 * - Real-time search by name or email
 * - Avatar fallback to initials
 * - Role badge display
 * - Theme-aware styling
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { FaCheck, FaSearch, FaUserCircle, FaPlus } from "react-icons/fa";

const AssigneeSelector = ({
    users = [],
    selectedIds = [],
    onChange,
    label = "Access"
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const { assigned, suggestions, selectedUsers } = useMemo(() => {
        const assignedList = [];
        const suggestionsList = [];
        const selectedList = []; // For the avatar row display

        const query = searchQuery.toLowerCase();

        users.forEach(user => {
            const isSelected = selectedIds.includes(user.id);
            const matchesSearch =
                !query ||
                (user.name && user.name.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query));

            if (isSelected) {
                assignedList.push(user);
                selectedList.push(user);
            } else if (matchesSearch) {
                suggestionsList.push(user);
            }
        });

        return { assigned: assignedList, suggestions: suggestionsList, selectedUsers: selectedList };
    }, [users, selectedIds, searchQuery]);

    const toggleUser = (userId) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        onChange(Array.from(newSelected));
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Header / Avatar Row */}
            <div className="flex flex-col gap-2">
                {/* Optional Label */}
                {label && (
                    <div className="text-xs font-semibold text-content-secondary [.dark_&]:text-gray-400">
                        {label}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                        {selectedUsers.slice(0, 5).map(user => (
                            <div key={user.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white [.dark_&]:ring-[#181B2A] bg-white [.dark_&]:bg-[#181B2A] relative group cursor-pointer" title={user.name}>
                                {user.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        alt={user.name}
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 [.dark_&]:text-indigo-400">
                                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                                    </div>
                                )}
                                {/* Hover Tooltip - Simple fallback */}
                            </div>
                        ))}
                        {selectedUsers.length > 5 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white [.dark_&]:ring-[#181B2A] bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 [.dark_&]:text-gray-400">
                                +{selectedUsers.length - 5}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2 h-8 ${selectedUsers.length === 0 ? 'px-3 rounded-lg border-dashed border border-gray-300 [.dark_&]:border-gray-600' : 'w-8 justify-center rounded-full border border-dashed border-gray-300 [.dark_&]:border-gray-600'} text-gray-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 [.dark_&]:hover:bg-indigo-900/20 transition-all`}
                    >
                        <FaPlus className="h-3 w-3" />
                        {selectedUsers.length === 0 && <span className="text-xs font-medium">Add Assignee</span>}
                    </button>
                </div>
            </div>


            {/* Floating Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-72 max-h-[320px] flex flex-col bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-xl border border-gray-200 [.dark_&]:border-gray-700 overflow-hidden transform transition-all duration-200 origin-top-left">
                    {/* Search - Fixed at top of popover */}
                    <div className="p-3 border-b border-gray-100 [.dark_&]:border-gray-700">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 [.dark_&]:border-gray-700 bg-gray-50 [.dark_&]:bg-black/20 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[250px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {/* ASSIGNED SECTION */}
                        {assigned.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 [.dark_&]:text-gray-500 mb-2 tracking-wider uppercase px-2">
                                    Assigned ({assigned.length})
                                </h4>
                                <div className="space-y-0.5">
                                    {assigned.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className="flex items-center justify-between p-1.5 rounded-md hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {user.imageUrl ? (
                                                    <img
                                                        src={user.imageUrl}
                                                        alt={user.name}
                                                        className="w-6 h-6 rounded-full object-cover border border-gray-200 [.dark_&]:border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 text-indigo-600 [.dark_&]:text-indigo-400 flex items-center justify-center text-[10px] font-bold border border-indigo-200 [.dark_&]:border-indigo-800/30">
                                                        {user.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-gray-900 [.dark_&]:text-gray-100 leading-tight">
                                                        {user.name || "Unknown User"}
                                                    </span>
                                                    <span className="text-[9px] text-indigo-500 font-medium leading-tight">
                                                        {user.role || "Member"}
                                                    </span>
                                                </div>
                                            </div>
                                            <FaCheck className="w-2.5 h-2.5 text-indigo-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SUGGESTIONS SECTION */}
                        <div>
                            <h4 className="text-[10px] font-bold text-gray-400 [.dark_&]:text-gray-500 mb-2 tracking-wider uppercase px-2">
                                Suggestions
                            </h4>
                            <div className="space-y-0.5">
                                {suggestions.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic px-2 py-2 text-center">
                                        No matching users found...
                                    </p>
                                ) : (
                                    suggestions.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className="flex items-center justify-between p-1.5 rounded-md hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {user.imageUrl ? (
                                                    <img
                                                        src={user.imageUrl}
                                                        alt={user.name}
                                                        className="w-6 h-6 rounded-full object-cover border border-gray-200 [.dark_&]:border-white/10 opacity-70 group-hover:opacity-100 transition-opacity"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 [.dark_&]:bg-white/5 text-gray-500 [.dark_&]:text-gray-400 flex items-center justify-center text-[10px] font-bold border border-gray-200 [.dark_&]:border-white/10">
                                                        {user.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-gray-700 [.dark_&]:text-gray-300 group-hover:text-gray-900 [.dark_&]:group-hover:text-white transition-colors leading-tight">
                                                        {user.name || "Unknown User"}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 group-hover:text-gray-500 transition-colors leading-tight">
                                                        {user.role || "Member"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssigneeSelector;

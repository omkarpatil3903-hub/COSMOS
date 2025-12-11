// src/components/TaskManagment/TaskGroup.jsx
import React, { useState, useEffect, useRef } from "react";
import {
    FaCaretDown,
    FaCaretRight,
    FaPlus,
    FaEllipsisH,
    // New Header Icons
    FaTasks,
    FaUserFriends,
    FaRegCalendarPlus, // For Assigned Date
    FaRegCalendarAlt, // For Due Date
    FaFlag,
    FaClipboardList, // For Status
    // Menu icons
    FaPen,
    FaPalette,
    FaThumbtack,
    FaListUl,
} from "react-icons/fa";
import TaskRow from "./TaskRow";

const TaskGroup = ({
    title,
    tasks,
    colorClass,
    onOpenCreate,
    selectedIds,
    onToggleSelect,
    onView,
    resolveAssignees,
    onEdit,
    onDelete,
    onSetReminder,
    showActions = true,
    onHeaderMenu,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu]);

    if (tasks.length === 0) return null;

    return (
        <div className="mb-6">
            <div 
                className="group flex items-center justify-between mb-2 rounded hover:bg-gray-50 transition-colors"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => {
                    setHovered(false);
                    setShowMenu(false); // close dropdown when leaving header so it cannot reopen on hover alone
                }}
            >
                <div className="flex items-center w-full">
                    <div 
                        className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 w-full"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <span className="text-gray-400 text-xs">
                            {isOpen ? <FaCaretDown /> : <FaCaretRight />}
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${colorClass}`}
                        >
                            {title}
                        </span>
                        <span className="text-gray-400 text-sm font-medium ml-2">
                            {tasks.length}
                        </span>
                        <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
                            <button
                                type="button"
                                title="More"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu((prev) => !prev);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-normal"
                            >
                                <FaEllipsisH className="h-3 w-3" />
                            </button>
                            {onOpenCreate && (
                                <button
                                    type="button"
                                    title="Add Task"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenCreate();
                                    }}
                                    className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 font-normal"
                                >
                                    <FaPlus className="h-3 w-3" />
                                </button>
                            )}
                            {showMenu && (
                                <div
                                    className="absolute top-full -right-2 mt-1 z-20 w-44 rounded-lg bg-white shadow-md border border-gray-200/60 py-2 text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                        Group options
                                    </div>

                                    {/* Edit statuses */}
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onHeaderMenu?.({ action: "edit-statuses", title, tasks });
                                        }}
                                    >
                                        <FaPen className="h-3 w-3 text-indigo-500" />
                                        <span>Edit status</span>
                                    </button>

                                    {/* Change color */}
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onHeaderMenu?.({ action: "change-color", title, tasks });
                                        }}
                                    >
                                        <FaPalette className="h-3 w-3 text-purple-500" />
                                        <span>Change color</span>
                                    </button>

                                    {/* Pin status */}
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onHeaderMenu?.({ action: "pin-status", title, tasks });
                                        }}
                                    >
                                        <FaThumbtack className="h-3 w-3 text-amber-500 rotate-45" />
                                        <span>Pin status</span>
                                    </button>

                                    <div className="my-1 border-t border-gray-200/70" />

                                    {/* Select all */}
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-gray-800 hover:bg-gray-50"
                                        onClick={() => {
                                            setShowMenu(false);
                                            tasks.forEach((t) => {
                                                if (!selectedIds.has(t.id)) {
                                                    onToggleSelect(t.id);
                                                }
                                            });
                                            onHeaderMenu?.({ action: "select-all", title, tasks });
                                        }}
                                    >
                                        <FaListUl className="h-3 w-3 text-teal-500" />
                                        <span>Select all</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* List Body */}
            {isOpen && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* --- UPDATED COLUMN HEADERS WITH ICONS --- */}
                    <div
                        className={`grid ${showActions
                            ? "grid-cols-[30px_1fr_180px_100px_100px_80px_110px_80px]"
                            : "grid-cols-[30px_1fr_180px_100px_100px_80px_110px]"
                            } gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider`}
                    >
                        {/* 1. Checkbox Spacer */}
                        <div></div>

                        {/* 2. Task Name */}
                        <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaTasks className="text-gray-400" />
                            <span>Task Name</span>
                        </div>

                        {/* 3. Assignees */}
                        <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaUserFriends className="text-gray-400" />
                            <span>Assignees</span>
                        </div>

                        {/* 4. Assigned Date */}
                        <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaRegCalendarPlus className="text-gray-400" />
                            <span>Assigned</span>
                        </div>

                        {/* 5. Due Date */}
                        <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaRegCalendarAlt className="text-gray-400" />
                            <span>Due Date</span>
                        </div>

                        {/* 6. Priority (Centered) */}
                        <div className="flex items-center justify-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaFlag className="text-gray-400" />
                            <span>Priority</span>
                        </div>

                        {/* 7. Status */}
                        <div className="flex items-center gap-2 hover:text-gray-600 transition-colors cursor-pointer">
                            <FaClipboardList className="text-gray-400" />
                            <span>Status</span>
                        </div>

                        {/* 8. Actions (Centered) */}
                        {showActions && (
                            <div className="flex items-center justify-center text-gray-400">
                                <span>Actions</span>
                            </div>
                        )}
                    </div>

                    {/* Rows */}
                    {tasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            assigneesResolved={resolveAssignees(task)}
                            isSelected={selectedIds.has(task.id)}
                            onToggleSelect={onToggleSelect}
                            onView={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSetReminder={onSetReminder}
                            showActions={showActions}
                        />
                    ))}

                    {/* Quick Add Button */}
                    {onOpenCreate && (
                        <div
                            onClick={onOpenCreate}
                            className="flex items-center gap-2 px-10 py-2 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors border-t border-gray-50"
                        >
                            <FaPlus className="text-xs" />
                            <span>New Task</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskGroup;

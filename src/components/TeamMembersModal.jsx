import React, { useState } from "react";
import { FaTimes, FaSearch, FaUserCircle } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

const TeamMembersModal = ({ isOpen, onClose, members = [], tasks = [], projects = [] }) => {
    const { accent } = useTheme();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);

    // Reset selection when modal closes
    React.useEffect(() => {
        if (!isOpen) setSelectedMember(null);
    }, [isOpen]);



    const filteredMembers = members.filter((member) =>
        (member.name || member.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const memberTasks = selectedMember
        ? tasks.filter(t => (t.assigneeIds || []).includes(selectedMember.id))
        : [];

    // Group tasks logic
    const groupedTasks = React.useMemo(() => {
        const groups = {
            overdue: [],
            inProgress: [],
            pending: [],
            completed: []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        memberTasks.forEach(task => {
            const status = (task.status || "").toLowerCase();
            let isOverdue = false;

            if (task.dueDate && !["done", "completed"].includes(status)) {
                let d = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                if (!isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0);
                    if (d < today) isOverdue = true;
                }
            }

            if (isOverdue) {
                groups.overdue.push(task);
            } else if (["done", "completed"].includes(status)) {
                groups.completed.push(task);
            } else if (["in progress", "in-progress"].includes(status)) {
                groups.inProgress.push(task);
            } else {
                groups.pending.push(task);
            }
        });

        return groups;
    }, [memberTasks]);

    const renderTaskGroup = (title, tasks, colorClass, bgClass) => {
        if (tasks.length === 0) return null;
        return (
            <div className="mb-6 last:mb-0">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorClass}`}>
                    {title}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${bgClass} ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('500', '100')} bg-opacity-20`}>
                        {tasks.length}
                    </span>
                </h4>
                <div className="space-y-3">
                    {tasks.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        return (
                            <div key={task.id} className="bg-white dark:bg-[#1e1e2d] p-3 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{task.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                {project?.projectName || "No Project"}
                                            </span>
                                            {task.dueDate && (
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${(() => {
                                                    let d = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                                                    let today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    if (!isNaN(d.getTime())) {
                                                        d.setHours(0, 0, 0, 0);
                                                        if (d < today && !["done", "completed"].includes((task.status || "").toLowerCase())) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10";
                                                    }
                                                    return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10";
                                                })()
                                                    }`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    {task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded capitalize shrink-0 ${["done", "completed"].includes((task.status || "").toLowerCase())
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : ["in progress", "in-progress"].includes((task.status || "").toLowerCase())
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                        }`}>
                                        {task.status || "Pending"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-xl w-full max-w-5xl flex flex-col md:flex-row h-[85vh] animate-in fade-in zoom-in duration-200 overflow-hidden`}>

                {/* Left Panel: Member List */}
                <div className={`flex flex-col border-r border-gray-100 dark:border-white/10 w-full md:w-1/3 transition-all ${selectedMember ? 'hidden md:flex' : 'flex'}`}>
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Team Members
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {members.length} member{members.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-gray-100 dark:border-white/10 shrink-0">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {filteredMembers.length > 0 ? (
                            <div className="space-y-1">
                                {filteredMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => setSelectedMember(member)}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${selectedMember?.id === member.id
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/30"
                                            : "hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent"
                                            }`}
                                    >
                                        {member.photoURL ? (
                                            <img
                                                src={member.photoURL}
                                                alt={member.name}
                                                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                                                {member.name?.charAt(0) || "?"}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`text-sm font-semibold truncate ${selectedMember?.id === member.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                                                {member.name || "Unknown User"}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {member.email || member.role || "No details"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                                <FaUserCircle className="w-12 h-12 mb-3 opacity-20" />
                                <p>No members found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Task Details */}
                <div className={`flex flex-col flex-1 bg-gray-50/50 dark:bg-black/20 w-full md:w-2/3 transition-all ${selectedMember ? 'flex' : 'hidden md:flex'}`}>

                    {/* Header (Right) */}
                    <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#1e1e2d] shrink-0 h-[73px]">
                        {selectedMember ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="md:hidden p-1 mr-1 text-gray-500"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Assigned Tasks
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                                        {memberTasks.length}
                                    </span>
                                </h3>
                            </div>
                        ) : (
                            <h3 className="text-gray-400 dark:text-gray-500 font-medium">Select a member to view details</h3>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content (Right) */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                        {selectedMember ? (
                            memberTasks.length > 0 ? (
                                <div>
                                    {renderTaskGroup("Overdue", groupedTasks.overdue, "text-red-600", "bg-red-500")}
                                    {renderTaskGroup("In Progress", groupedTasks.inProgress, "text-blue-600", "bg-blue-500")}
                                    {renderTaskGroup("Pending", groupedTasks.pending, "text-gray-600", "bg-gray-500")}
                                    {renderTaskGroup("Completed", groupedTasks.completed, "text-green-600", "bg-green-500")}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <p>No tasks assigned to {selectedMember.name.split(" ")[0]}</p>
                                </div>
                            )
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-60">
                                <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <p className="text-lg font-medium">Select a team member</p>
                                <p className="text-sm">to view their assigned tasks</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamMembersModal;

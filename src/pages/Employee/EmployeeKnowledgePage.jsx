import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, onSnapshot, query, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import Button from "../../components/Button";
import { FaCalendarAlt, FaClock, FaLightbulb, FaUser } from "react-icons/fa";

export default function EmployeeKnowledgePage() {
    const navigate = useNavigate();
    const [knowledge, setKnowledge] = useState([]);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(6);
    const [currentUserName, setCurrentUserName] = useState("");

    // Fetch current user's profile
    useEffect(() => {
        const fetchUserData = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const userRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setCurrentUserName(userData.name || userData.fullName || userData.displayName || currentUser.displayName || "");
                    }
                } catch (err) {
                    console.warn("Could not fetch user data:", err);
                }
            }
        };
        fetchUserData();
    }, []);

    const handleKnowledgeClick = (knowledgeId) => {
        navigate(`/employee/knowledge/${knowledgeId}`);
    };

    useEffect(() => {
        const col = collection(db, "knowledge");
        const qy = query(col);
        const unsub = onSnapshot(qy, (snap) => {
            const list = snap.docs.map((d) => {
                const data = d.data() || {};
                const uts = data.updatedAt || data.createdAt;
                let updated = "";
                if (uts && typeof uts.toDate === "function") updated = uts.toDate().toLocaleDateString();
                else if (uts) updated = new Date(uts).toLocaleDateString();
                const cts = data.createdAt;
                let created = "";
                if (cts && typeof cts.toDate === "function") created = cts.toDate().toLocaleDateString();
                else if (cts) created = new Date(cts).toLocaleDateString();
                return {
                    id: d.id,
                    title: data.title || "",
                    description: data.description || "",
                    created,
                    updated,
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                    createdByName: data.createdByName || "",
                    updatedByName: data.updatedByName || "",
                    access: data.access || { admin: [], member: [] },
                    projectId: data.projectId || null,
                    documents: data.documents || [],
                    link: data.link || "",
                    thumbnailUrl: data.thumbnailUrl || null,
                };
            });
            setKnowledge(list);
        });
        return () => unsub();
    }, []);

    const filteredSorted = useMemo(() => {
        // Filter by access
        const me = String(currentUserName || "").trim().toLowerCase();
        let list = knowledge.filter((k) => {
            // If no user loaded yet, maybe show nothing or wait? 
            // Assuming public or shared logic. 
            // If restriction applies:
            const access = k.access || {};
            const admins = Array.isArray(access.admin) ? access.admin : [];
            const members = Array.isArray(access.member) ? access.member : [];

            // Check ID match could be better but name match is consistent with other files
            const inList = [...admins, ...members].some(
                (n) => String(n || "").trim().toLowerCase() === me
            );

            const createdBy = String(k.createdByName || "").trim().toLowerCase();
            // If strict access control:
            if (inList) return true;
            if (createdBy && createdBy === me) return true;

            // Logic from AdminKnowledgeProjectDetail for visibility:
            // If shared is true? Knowledge doesn't have 'shared' flag usually, relies on access list
            return false;
        });

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((k) =>
                [k.title, k.description, k.createdByName, k.updatedByName].some((v) =>
                    String(v || "").toLowerCase().includes(q)
                )
            );
        }

        const { key, dir } = sort || { key: "createdAt", dir: "desc" };
        const mult = dir === "asc" ? 1 : -1;
        const getVal = (k) => {
            if (key === "title") return String(k.title || "").toLowerCase();
            if (key === "updatedAt")
                return k.updatedAt?.toMillis?.()
                    ? k.updatedAt.toMillis()
                    : k.updatedAt
                        ? new Date(k.updatedAt).getTime()
                        : 0;
            return k.createdAt?.toMillis?.()
                ? k.createdAt.toMillis()
                : k.createdAt
                    ? new Date(k.createdAt).getTime()
                    : 0;
        };
        return [...list].sort((a, b) => {
            const av = getVal(a);
            const bv = getVal(b);
            if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
            return String(av).localeCompare(String(bv)) * mult;
        });
    }, [knowledge, search, sort, currentUserName]);

    const total = filteredSorted.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const start = (clampedPage - 1) * rowsPerPage;
    const pageRows = filteredSorted.slice(start, start + rowsPerPage);

    return (
        <Card
            title="Knowledge"
            tone="muted"
            actions={
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-content-secondary">
                        Page {clampedPage} of {totalPages}
                    </span>
                    <select
                        className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(1);
                        }}
                    >
                        {[6, 12, 18].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setPage(Math.max(1, clampedPage - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setPage(Math.min(totalPages, clampedPage + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="mb-4">
                <SearchActions
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by title or description"
                    rightActions={
                        <label className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">Sort by</span>
                            <select
                                className="rounded-md border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-2 py-1.5 text-sm [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={`${sort.key}:${sort.dir}`}
                                onChange={(e) => {
                                    const [key, dir] = e.target.value.split(":");
                                    setSort({ key, dir });
                                    setPage(1);
                                }}
                            >
                                <option value="createdAt:desc">Newest</option>
                                <option value="createdAt:asc">Oldest</option>
                                <option value="updatedAt:desc">Recently Updated</option>
                                <option value="updatedAt:asc">Least Recently Updated</option>
                                <option value="title:asc">Title A→Z</option>
                                <option value="title:desc">Title Z→A</option>
                            </select>
                        </label>
                    }
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pageRows.map((k) => (
                    <div
                        key={k.id}
                        className="relative rounded-sm border border-subtle bg-white [.dark_&]:bg-[#181B2A] shadow-soft overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                        onClick={() => handleKnowledgeClick(k.id)}
                    >
                        {/* Image Section */}
                        <div className="relative w-full h-56 bg-white [.dark_&]:bg-gray-800 border-b border-gray-100 [.dark_&]:border-white/5 overflow-hidden">
                            {k.thumbnailUrl ? (
                                <img
                                    src={k.thumbnailUrl}
                                    alt={k.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full bg-violet-50/50 [.dark_&]:bg-violet-900/10 flex items-center justify-center">
                                    <FaLightbulb className="h-20 w-20 text-violet-200 [.dark_&]:text-violet-500/30" />
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="p-3">
                            {/* Title */}
                            <h3
                                className="text-base font-bold leading-tight text-gray-900 [.dark_&]:text-white mb-0.5 line-clamp-2 hover:text-indigo-600 [.dark_&]:hover:text-indigo-400 transition-colors"
                                title={k.title}
                            >
                                {k.title}
                            </h3>

                            {/* Description */}
                            <p className="text-sm leading-snug text-gray-600 [.dark_&]:text-gray-400 line-clamp-2 mb-1">
                                {k.description || "No description provided"}
                            </p>

                            {/* Link */}
                            {k.link && (
                                <div className="mb-1.5">
                                    <a
                                        href={k.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-500 underline truncate block"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {k.link}
                                    </a>
                                </div>
                            )}

                            {/* Metadata Footer */}
                            <div className="mt-1.5 pt-1.5 border-t border-gray-100 [.dark_&]:border-white/10">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 [.dark_&]:text-gray-400">
                                    {k.createdByName && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <FaUser className="w-3 h-3" />
                                            <span className="font-medium">{k.createdByName}</span>
                                        </span>
                                    )}
                                    {k.created && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <FaCalendarAlt className="w-3 h-3" />
                                            <span>{k.created}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {!pageRows.length && (
                    <div className="col-span-full text-center text-sm text-content-secondary py-10">
                        No knowledge found or access restricted
                    </div>
                )}
            </div>
        </Card>
    );
}

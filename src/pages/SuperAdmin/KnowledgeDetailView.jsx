import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { FaArrowLeft, FaDownload, FaFileAlt, FaChevronDown, FaChevronUp, FaInfoCircle, FaUser, FaExclamationTriangle } from "react-icons/fa";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import Card from "../../components/Card";

function KnowledgeDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { buttonClass } = useThemeStyles();

    const [knowledge, setKnowledge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("newest"); // newest, oldest
    const [uploadedBy, setUploadedBy] = useState("all"); // all or specific uploader name
    const [showMetadata, setShowMetadata] = useState(false); // metadata modal visibility
    const [docErrors, setDocErrors] = useState({}); // Track errors for each document by index

    useEffect(() => {
        const fetchKnowledge = async () => {
            try {
                const knowledgeRef = doc(db, "knowledge", id);
                const knowledgeSnap = await getDoc(knowledgeRef);

                if (knowledgeSnap.exists()) {
                    setKnowledge({ id: knowledgeSnap.id, ...knowledgeSnap.data() });
                } else {
                    console.error("Knowledge not found");
                }
            } catch (error) {
                console.error("Error fetching knowledge:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchKnowledge();
        }
    }, [id]);

    const handleBack = () => {
        navigate("/knowledge-management");
    };

    const handleDownload = (doc) => {
        if (doc.url) {
            window.open(doc.url, "_blank");
        }
    };

    // Get unique uploaders from documents
    const getUniqueUploaders = () => {
        if (!knowledge?.documents) return [];
        const uploaders = knowledge.documents
            .map(doc => doc.uploadedByName)
            .filter(Boolean)
            .filter((value, index, self) => self.indexOf(value) === index);
        return uploaders;
    };

    // Sort and filter documents
    const getSortedDocuments = () => {
        if (!knowledge?.documents) return [];

        let docs = [...knowledge.documents];

        // Apply filter by uploader
        if (uploadedBy !== "all") {
            docs = docs.filter(doc => doc.uploadedByName === uploadedBy);
        }

        // Apply sorting
        if (sortBy === "newest") {
            docs.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        } else if (sortBy === "oldest") {
            docs.sort((a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0));
        }

        return docs;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-900 [.dark_&]:text-white">Loading...</div>
            </div>
        );
    }

    if (!knowledge) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-lg text-gray-900 [.dark_&]:text-white mb-4">Knowledge not found</div>
                <button onClick={handleBack} className={`px-4 py-2 rounded-lg ${buttonClass} text-white`}>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Back Button and Title - Exact same styling as document page */}
            <div className="flex items-center justify-between px-3 py-3 border-b bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white"
                    >
                        <FaArrowLeft />
                        Back
                    </button>
                    <span className="text-gray-300 [.dark_&]:text-gray-600">/</span>
                    <div className="truncate text-base font-semibold text-indigo-600 [.dark_&]:text-indigo-400" title={knowledge.title}>
                        {knowledge.title.length > 10 ? `${knowledge.title.substring(0, 10)}...` : knowledge.title}
                    </div>
                </div>
            </div>


            {/* Title Card with Info Button */}
            <Card tone="muted">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <h1
                            className="text-2xl font-bold text-indigo-700 [.dark_&]:text-indigo-400 truncate px-4"
                            style={{ fontFamily: 'Georgia, serif' }}
                            title={knowledge.title}
                        >
                            {knowledge.title.length > 80 ? `${knowledge.title.substring(0, 80)}...` : knowledge.title}
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowMetadata(true)}
                        className={`flex-shrink-0 p-0 rounded-lg transition-colors ${buttonClass} hover:opacity-80`}
                        title="View Metadata"
                    >
                        <FaInfoCircle className="h-5 w-5 text-white" />
                    </button>
                </div>
            </Card>

            {/* Description Card - Auto Word Wrap */}
            <Card title="Description" tone="muted">
                <p className="text-sm md:text-[0.95rem] leading-relaxed text-gray-800 [.dark_&]:text-gray-300 whitespace-pre-wrap break-words indent-30">
                    {knowledge.description.charAt(0).toUpperCase() + knowledge.description.slice(1)}
                </p>
            </Card>

            {/* Documents Section */}
            {knowledge.documents && knowledge.documents.length > 0 ? (
                <Card tone="muted">
                    {/* Header with Filters */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
                            Documents ({getSortedDocuments().length})
                        </h2>
                        <div className="flex items-center gap-4">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 [.dark_&]:text-gray-400">Sort:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="rounded-md border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-3 py-1.5 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                </select>
                            </div>

                            {/* Uploaded By Dropdown */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 [.dark_&]:text-gray-400">Uploaded By:</label>
                                <select
                                    value={uploadedBy}
                                    onChange={(e) => setUploadedBy(e.target.value)}
                                    className="rounded-md border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] px-3 py-1.5 text-sm text-gray-900 [.dark_&]:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All</option>
                                    {getUniqueUploaders().map((uploader, idx) => (
                                        <option key={idx} value={uploader}>
                                            {uploader}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getSortedDocuments().map((doc, index) => {
                            const isPDF = doc.name?.toLowerCase().endsWith('.pdf');
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.name || '');
                            const hasPreview = isPDF || isImage;

                            return (
                                <div
                                    key={index}
                                    className="rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] shadow-sm hover:shadow-md transition-all hover:border-indigo-300 [.dark_&]:hover:border-indigo-500/50 overflow-hidden flex flex-col"
                                >
                                    {/* Document Preview or Error Message */}
                                    <div className="w-full h-48 bg-gray-100 [.dark_&]:bg-gray-900 overflow-hidden flex items-center justify-center">
                                        {hasPreview && doc.url ? (
                                            docErrors[index] ? (
                                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                                    <FaExclamationTriangle className="h-12 w-12 text-amber-500 mb-2" />
                                                    <p className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 mb-1">
                                                        Document Not Found
                                                    </p>
                                                    <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                                                        File deleted from storage
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {isPDF ? (
                                                        <iframe
                                                            src={`${doc.url}#toolbar=0&navpanes=0&scrollbar=0`}
                                                            className="w-full h-full"
                                                            title={doc.displayName || doc.name}
                                                            onError={() => setDocErrors(prev => ({ ...prev, [index]: true }))}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={doc.url}
                                                            alt={doc.displayName || doc.name}
                                                            className="w-full h-full object-cover"
                                                            onError={() => setDocErrors(prev => ({ ...prev, [index]: true }))}
                                                        />
                                                    )}
                                                </>
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-4 text-center">
                                                <FaFileAlt className="h-12 w-12 text-gray-400 [.dark_&]:text-gray-600 mb-2" />
                                                <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                                                    Preview not supported
                                                </p>
                                                <p className="text-xs text-gray-400 [.dark_&]:text-gray-500 mt-1">
                                                    {doc.name?.split('.').pop()?.toUpperCase()} file
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="p-4 flex flex-col gap-3 flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                                                    <FaFileAlt className="h-5 w-5 text-indigo-600 [.dark_&]:text-indigo-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-gray-900 [.dark_&]:text-white truncate mb-1">
                                                    {doc.displayName || doc.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 truncate mb-1">
                                                    {doc.name}
                                                </p>
                                                <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                                                    {(doc.size / 1024).toFixed(2)} KB
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons - Bottom of ALL cards */}
                                        <div className="flex gap-2 mt-auto">
                                            <button
                                                onClick={() => handleDownload(doc)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 [.dark_&]:bg-gray-800 text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-200 [.dark_&]:hover:bg-gray-700 transition-colors text-sm font-medium"
                                            >
                                                <FaDownload className="h-3 w-3" />
                                                <span>Download</span>
                                            </button>
                                            {doc.url && (
                                                <button
                                                    onClick={() => navigate('/document-viewer', {
                                                        state: {
                                                            document: doc,
                                                            knowledgeTitle: knowledge.title
                                                        }
                                                    })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${buttonClass} text-white hover:opacity-90 transition-opacity text-sm font-medium`}
                                                >
                                                    <FaFileAlt className="h-3 w-3" />
                                                    <span>View</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ) : (
                <Card title="Documents" tone="muted">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center mb-4">
                            <FaFileAlt className="h-8 w-8 text-gray-400 [.dark_&]:text-gray-600" />
                        </div>
                        <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm">
                            No documents attached to this knowledge
                        </p>
                    </div>
                </Card>
            )}

            {/* Metadata Modal */}
            {showMetadata && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowMetadata(false)}
                >
                    <div
                        className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-md p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowMetadata(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Profile Icon */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 flex items-center justify-center mb-3">
                                <FaUser className="h-10 w-10 text-indigo-600 [.dark_&]:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 [.dark_&]:text-white">
                                {knowledge.createdByName || "Unknown User"}
                            </h3>
                            <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">Creator</p>
                        </div>

                        {/* Metadata Details */}
                        <div className="space-y-4">
                            {/* Created On */}
                            {knowledge.createdAt && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 [.dark_&]:border-white/10">
                                    <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Created On</span>
                                    <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {new Date(knowledge.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}

                            {/* Updated On */}
                            {knowledge.updatedAt && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 [.dark_&]:border-white/10">
                                    <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Updated On</span>
                                    <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {new Date(knowledge.updatedAt.seconds * 1000).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}

                            {/* Updated By */}
                            {knowledge.updatedByName && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 [.dark_&]:border-white/10">
                                    <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Updated By</span>
                                    <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {knowledge.updatedByName}
                                    </span>
                                </div>
                            )}

                            {/* Total Documents */}
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 [.dark_&]:border-white/10">
                                <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Total Documents</span>
                                <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                    {knowledge.documents?.length || 0}
                                </span>
                            </div>

                            {/* Access - Admin */}
                            {knowledge.access?.admin && knowledge.access.admin.length > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 [.dark_&]:border-white/10">
                                    <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Admin Access</span>
                                    <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {knowledge.access.admin.length} admin(s)
                                    </span>
                                </div>
                            )}

                            {/* Access - Members */}
                            {knowledge.access?.member && knowledge.access.member.length > 0 && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600 [.dark_&]:text-gray-400">Member Access</span>
                                    <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                                        {knowledge.access.member.length} member(s)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KnowledgeDetailView;

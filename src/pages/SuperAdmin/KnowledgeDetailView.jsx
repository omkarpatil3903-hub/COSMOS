import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, orderBy, onSnapshot, updateDoc, serverTimestamp, addDoc, where } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FaArrowLeft, FaDownload, FaFileAlt, FaChevronDown, FaChevronUp, FaInfoCircle, FaUser, FaExclamationTriangle, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaListUl } from "react-icons/fa";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import Card from "../../components/Card";
import toast from 'react-hot-toast';
import AssigneeSelector from "../../components/AssigneeSelector";

function KnowledgeDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { buttonClass, selectedBgClass } = useThemeStyles();
    const isEmployee = location.pathname.startsWith("/employee");

    const [knowledge, setKnowledge] = useState(null);
    const [activities, setActivities] = useState([]);
    const [creatorImage, setCreatorImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("newest"); // newest, oldest
    const [uploadedBy, setUploadedBy] = useState("all"); // all or specific uploader name
    const [showMetadata, setShowMetadata] = useState(false); // metadata modal visibility
    const [showAccessModal, setShowAccessModal] = useState(false); // access control modal visibility
    const [docErrors, setDocErrors] = useState({}); // Track errors for each document by index
    const [expandedSections, setExpandedSections] = useState({}); // Track expanded states for course content sections

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLinks, setEditLinks] = useState([""]);
    const [editWhatYouLearn, setEditWhatYouLearn] = useState([""]);
    const [editCourseContent, setEditCourseContent] = useState([{ heading: "", points: [""] }]);
    const [editDocuments, setEditDocuments] = useState([]);

    const [editThumbnail, setEditThumbnail] = useState(null);
    const [editThumbnailPreview, setEditThumbnailPreview] = useState(null);
    const [editUploading, setEditUploading] = useState(false);

    // Access Control State
    const [admins, setAdmins] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedAdmin, setSelectedAdmin] = useState([]);
    const [selectedMember, setSelectedMember] = useState([]);
    const [allUsersMap, setAllUsersMap] = useState({});

    const [usersMap, setUsersMap] = useState({}); // Map of userId -> user data with imageUrl

    // Live listener for users collection to get profile images
    useEffect(() => {
        const usersRef = collection(db, "users");
        const unsubUsers = onSnapshot(usersRef, (snap) => {
            const map = {};
            snap.docs.forEach(d => {
                const data = d.data();
                map[d.id] = {
                    name: data.name || data.displayName || "",
                    imageUrl: data.imageUrl || data.photoURL || null,
                };
            });
            setUsersMap(map);
        });
        return () => unsubUsers();
    }, []);

    useEffect(() => {
        if (!id) return;

        // Knowledge Listener
        const knowledgeRef = doc(db, "knowledge", id);
        const unsubKnowledge = onSnapshot(knowledgeRef, (docSnap) => {
            if (docSnap.exists()) {
                setKnowledge({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.error("Knowledge not found");
                toast.error("Knowledge entry not found");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching knowledge:", error);
            setLoading(false);
        });

        // Activities Listener
        const activitiesRef = collection(db, "knowledge", id, "activities");
        const activitiesQuery = query(activitiesRef, orderBy("timestamp", "desc"));
        const unsubActivities = onSnapshot(activitiesQuery, (snap) => {
            const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));
            setActivities(list);
        });

        return () => {
            unsubKnowledge();
            unsubActivities();
        };
    }, [id]);

    useEffect(() => {
        if (!knowledge?.projectId && !isEditing) return;

        const q = query(collection(db, "users"), orderBy("name", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

            // Create a map for easy lookup
            const map = {};
            list.forEach(u => { map[u.id] = u; });
            setAllUsersMap(map);

            const allUsers = list
                .filter((u) => u.status === "Active") // Filter for active users
                .map((u) => ({
                    id: u.id,
                    name: u.name || u.fullName || "",
                    imageUrl: u.imageUrl,
                    type: String(u.resourceRoleType || "").toLowerCase()
                }));

            // Manager Users
            setAdmins(allUsers.filter((x) =>
                ['superadmin', 'admin', 'manager', 'member', 'resource'].includes(x.type)
            ));

            // Member Users
            setMembers(allUsers.filter((x) =>
                ['superadmin', 'admin', 'manager', 'member', 'resource'].includes(x.type)
            ));
        });
        return () => unsub();
    }, [knowledge?.projectId, isEditing]);

    // Initialize edit state when entering edit mode
    const handleEditToggle = () => {
        if (!isEditing) {
            setEditTitle(knowledge.title || "");
            setEditDescription(knowledge.description || "");

            setEditTitle(knowledge.title || "");
            setEditDescription(knowledge.description || "");
            setEditThumbnailPreview(knowledge.thumbnailUrl || null);
            setEditThumbnail(null);

            // Handle Links
            let linksToProcess = knowledge.links;
            if (linksToProcess && typeof linksToProcess === 'object' && !Array.isArray(linksToProcess)) {
                linksToProcess = Object.values(linksToProcess);
            }
            if (Array.isArray(linksToProcess) && linksToProcess.length > 0) {
                const linkStrings = linksToProcess.map(link => {
                    if (typeof link === 'string') return link;
                    if (link && typeof link === 'object') return link.url || '';
                    return '';
                }).filter(Boolean);
                setEditLinks(linkStrings.length > 0 ? linkStrings : [""]);
            } else if (knowledge.link) {
                setEditLinks([knowledge.link]);
            } else {
                setEditLinks([""]);
            }

            // Handle WhatYouLearn
            if (Array.isArray(knowledge.whatYouLearn) && knowledge.whatYouLearn.length > 0) {
                setEditWhatYouLearn(knowledge.whatYouLearn);
            } else {
                setEditWhatYouLearn([""]);
            }

            // Handle CourseContent
            if (Array.isArray(knowledge.courseContent) && knowledge.courseContent.length > 0) {
                setEditCourseContent(knowledge.courseContent);
            } else {
                setEditCourseContent([{ heading: "", points: [""] }]);
            }

            // Handle Documents (Preserve existing)
            setEditDocuments(Array.isArray(knowledge.documents) && knowledge.documents.length > 0
                ? knowledge.documents
                : []);

            // Handle Access
            setSelectedAdmin(Array.isArray(knowledge.access?.admin) ? knowledge.access.admin : []);
            setSelectedMember(Array.isArray(knowledge.access?.member) ? knowledge.access.member : []);
        }
        setIsEditing(!isEditing);
    };

    // --- Edit Helpers ---
    const handleAddLink = () => setEditLinks([...editLinks, ""]);
    const handleLinkChange = (index, value) => {
        const newLinks = [...editLinks];
        newLinks[index] = value;
        setEditLinks(newLinks);
    };
    const handleDeleteLink = (index) => {
        if (editLinks.length === 1) setEditLinks([""]);
        else setEditLinks(editLinks.filter((_, i) => i !== index));
    };

    const handleAddWhatYouLearn = () => setEditWhatYouLearn([...editWhatYouLearn, ""]);
    const handleWhatYouLearnChange = (index, value) => {
        const newItems = [...editWhatYouLearn];
        newItems[index] = value;
        setEditWhatYouLearn(newItems);
    };
    const handleDeleteWhatYouLearn = (index) => {
        if (editWhatYouLearn.length === 1) setEditWhatYouLearn([""]);
        else setEditWhatYouLearn(editWhatYouLearn.filter((_, i) => i !== index));
    };

    const handleAddContentSection = () => setEditCourseContent([...editCourseContent, { heading: "", points: [""] }]);
    const handleContentHeadingChange = (index, value) => {
        const newContent = [...editCourseContent];
        newContent[index].heading = value;
        setEditCourseContent(newContent);
    };
    const handleDeleteContentSection = (index) => {
        if (editCourseContent.length === 1) setEditCourseContent([{ heading: "", points: [""] }]);
        else setEditCourseContent(editCourseContent.filter((_, i) => i !== index));
    };
    const handleAddContentPoint = (sectionIndex) => {
        const newContent = [...editCourseContent];
        newContent[sectionIndex].points.push("");
        setEditCourseContent(newContent);
    };
    const handleContentPointChange = (sectionIndex, pointIndex, value) => {
        const newContent = [...editCourseContent];
        newContent[sectionIndex].points[pointIndex] = value;
        setEditCourseContent(newContent);
    };
    const handleDeleteContentPoint = (sectionIndex, pointIndex) => {
        const newContent = [...editCourseContent];
        if (newContent[sectionIndex].points.length === 1) newContent[sectionIndex].points = [""];
        else newContent[sectionIndex].points = newContent[sectionIndex].points.filter((_, i) => i !== pointIndex);
        setEditCourseContent(newContent);
    };

    // Accordion Helpers
    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const toggleAllSections = () => {
        const sections = isEditing ? editCourseContent : (knowledge?.courseContent || []);
        const allExpanded = sections.every((_, idx) => expandedSections[idx]);

        if (allExpanded) {
            setExpandedSections({});
        } else {
            const newExpanded = {};
            sections.forEach((_, idx) => { newExpanded[idx] = true; });
            setExpandedSections(newExpanded);
        }
    };

    // File Handling
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newDocs = files.map(file => ({
            file,
            name: file.name,
            displayName: file.name,
            size: file.size,
            url: null, // New file
        }));
        setEditDocuments([...editDocuments, ...newDocs]);
    };

    const handleFileDelete = (index) => {
        setEditDocuments(editDocuments.filter((_, i) => i !== index));
    };

    const uploadDocumentsToStorage = async (knowledgeId) => {
        const uploadedDocs = [];
        for (const doc of editDocuments) {
            if (doc.url) {
                uploadedDocs.push(doc); // Already uploaded
            } else if (doc.file) {
                try {
                    const timestamp = Date.now();
                    const sanitizedName = doc.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const fileName = `${timestamp}_${sanitizedName}`;
                    const storagePath = `knowledge/${knowledgeId}/${fileName}`;
                    const storageRef = ref(storage, storagePath);
                    await uploadBytes(storageRef, doc.file);
                    const downloadURL = await getDownloadURL(storageRef);
                    uploadedDocs.push({
                        name: doc.name,
                        displayName: doc.displayName || doc.name,
                        size: doc.size,
                        url: downloadURL,
                        storagePath: storagePath,
                        uploadedAt: new Date().toISOString(),
                        uploadedBy: auth.currentUser?.uid || "",
                        uploadedByName: auth.currentUser?.displayName || "Unknown User",
                    });
                } catch (error) {
                    console.error('Error uploading file:', error);
                    throw error;
                }
            }
        }
        return uploadedDocs;
        return uploadedDocs;
    };

    const handleThumbnailSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditThumbnail(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditThumbnailPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadThumbnailToStorage = async (knowledgeId) => {
        if (!editThumbnail) return null;
        try {
            const timestamp = Date.now();
            const storagePath = `knowledge/${knowledgeId}/thumbnail_${timestamp}_${editThumbnail.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, editThumbnail);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading thumbnail:", error);
            return null;
        }
    };

    const handleSave = async () => {
        try {
            setEditUploading(true);
            const currentUser = auth.currentUser;
            let knowledgeDocId = id;

            // Upload docs
            const uploadedDocs = await uploadDocumentsToStorage(knowledgeDocId);
            const uploadedThumbnailUrl = await uploadThumbnailToStorage(knowledgeDocId);

            const cleanedLinks = editLinks.map(l => l.trim()).filter(l => l !== "");
            const cleanedWhatYouLearn = editWhatYouLearn.map(l => l.trim()).filter(l => l !== "");
            const cleanedCourseContent = editCourseContent.map(section => ({
                heading: section.heading.trim(),
                points: section.points.map(p => p.trim()).filter(p => p !== "")
            })).filter(section => section.heading !== "" || section.points.length > 0);

            // Prepare activity entry
            // (For simplicity, not calculating detailed diffs here, but could be added)
            const activityEntry = {
                action: 'update',
                changes: ['Updated knowledge entry details (Inline Edit)'],
                timestamp: new Date().toISOString(),
                performedBy: currentUser?.uid || "",
                performedByName: currentUser?.displayName || "Unknown User",
                performedByImage: currentUser?.photoURL || null,
            };

            const knowledgeRef = doc(db, "knowledge", id);
            const updatePayload = {
                title: editTitle,
                description: editDescription,
                link: cleanedLinks[0] || "",
                links: cleanedLinks,
                documents: uploadedDocs,
                thumbnailUrl: uploadedThumbnailUrl || (knowledge.thumbnailUrl || null),
                whatYouLearn: cleanedWhatYouLearn,
                courseContent: cleanedCourseContent,
                access: { admin: selectedAdmin, member: selectedMember },
                updatedAt: serverTimestamp(),
                updatedByUid: currentUser?.uid || "",
                updatedByName: currentUser?.displayName || "",
            };

            await updateDoc(knowledgeRef, updatePayload); // Update main doc

            // Save activity
            const activitiesRef = collection(db, "knowledge", knowledgeDocId, "activities");
            await addDoc(activitiesRef, activityEntry);

            // Update local state to reflect changes immediately without waiting for re-fetch if possible, 
            // but onSnapshot usually handles it.
            // setKnowledge({...knowledge, ...updatePayload}); // Optional optimization

            setIsEditing(false);
            toast.success("Knowledge updated successfully");

        } catch (e) {
            console.error("Failed to save knowledge", e);
            toast.error("Failed to update knowledge");
        } finally {
            setEditUploading(false);
        }
    };
    // Removed old handleSubmit logic in favor of handleSave


    const handleBack = () => {
        // Determine the correct base path based on current route
        const basePath = location.pathname.startsWith("/admin")
            ? "/admin/knowledge-management"
            : location.pathname.startsWith("/manager")
                ? "/manager/knowledge-management"
                : location.pathname.startsWith("/employee")
                    ? "/employee/knowledge-management"
                    : "/knowledge-management";
        navigate(basePath);
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
        <div className="min-h-screen">
            {/* Back Button and Edit Button Header */}
            <div className="bg-white [.dark_&]:bg-[#0D0F1C] border-b border-gray-200 [.dark_&]:border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-700 [.dark_&]:hover:text-indigo-300 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <FaArrowLeft className="h-3 w-3" />
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleEditToggle}
                                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                                    title="Cancel Edit"
                                    disabled={editUploading}
                                >
                                    <FaTimes className="h-4 w-4" />
                                </button>
                                {(!isEmployee) && (
                                    <button
                                        onClick={() => setShowAccessModal(true)}
                                        className={`p-2 rounded-full ${buttonClass} text-white shadow-sm hover:shadow-md transition-all`}
                                        title="Access Control"
                                        disabled={editUploading}
                                    >
                                        <FaUser className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className={`p-2 rounded-full ${buttonClass} text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center`}
                                    title="Save Changes"
                                    disabled={editUploading}
                                >
                                    {editUploading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <FaSave className="h-4 w-4" />
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleEditToggle}
                                className={`p-2 rounded-full ${buttonClass} text-white shadow-sm hover:shadow-md transition-all`}
                                title="Edit Knowledge"
                            >
                                <FaEdit className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Section - Dynamic Faint Background */}
            <div className={`relative ${selectedBgClass} border-b border-subtle`}>
                <div className="max-w-7xl mx-auto px-6 py-8 relative">
                    {/* Info Icon Button - Absolute Top Right */}
                    <button
                        onClick={() => setShowMetadata(true)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-indigo-600 [.dark_&]:text-gray-400 [.dark_&]:hover:text-white transition-colors"
                        title="More Info"
                    >
                        <FaInfoCircle className="h-6 w-6" />
                    </button>

                    {/* Main Hero Content */}
                    <div className="space-y-3">
                        {/* Title */}
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full text-2xl md:text-3xl font-bold font-heading leading-tight text-gray-900 [.dark_&]:text-white bg-transparent border-b-2 border-indigo-300 focus:border-indigo-500 outline-none px-1 py-1"
                                placeholder="Knowledge Title"
                            />
                        ) : (
                            <h1 className="text-2xl md:text-3xl font-bold font-heading leading-tight text-gray-900 [.dark_&]:text-white pr-12">
                                {knowledge.title.charAt(0).toUpperCase() + knowledge.title.slice(1)}
                            </h1>
                        )}

                        {/* Description Preview */}
                        {isEditing ? (
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full text-base font-sans text-gray-600 [.dark_&]:text-gray-300 bg-white/50 [.dark_&]:bg-black/20 border border-indigo-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                placeholder="Description..."
                                rows={3}
                            />
                        ) : (
                            <p className="text-base font-sans text-gray-600 [.dark_&]:text-gray-300 leading-relaxed max-w-4xl">
                                {(() => {
                                    const desc = knowledge.description.length > 200
                                        ? `${knowledge.description.substring(0, 200)}...`
                                        : knowledge.description;
                                    return desc.charAt(0).toUpperCase() + desc.slice(1);
                                })()}
                            </p>
                        )}

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm pt-2">
                            {/* Creator */}
                            {knowledge.createdByName && (
                                <div className="flex items-center gap-2">
                                    {creatorImage ? (
                                        <img
                                            src={creatorImage}
                                            alt={knowledge.createdByName}
                                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <FaUser className="h-4 w-4 text-indigo-600" />
                                        </div>
                                    )}
                                    <span className="text-gray-500 [.dark_&]:text-gray-400">Created by</span>
                                    <span className="font-medium text-gray-900 [.dark_&]:text-white">{knowledge.createdByName}</span>
                                </div>
                            )}

                            {/* Last Updated */}
                            {knowledge.createdAt && (
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-500 [.dark_&]:text-gray-400">Last updated</span>
                                    <span className="font-medium text-gray-900 [.dark_&]:text-white">
                                        {new Date(knowledge.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Thumbnail Section - Edit Mode Only */}
                    {isEditing && (
                        <div className="mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-700 [.dark_&]:text-gray-300">
                                    Thumbnail Image
                                </label>
                                <div className="flex items-center gap-4">
                                    {editThumbnailPreview ? (
                                        <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-gray-200 [.dark_&]:border-white/10 group">
                                            <img src={editThumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => { setEditThumbnail(null); setEditThumbnailPreview(null); }}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <FaTrash className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-48 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 [.dark_&]:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors">
                                            <FaPlus className="h-6 w-6 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">Upload Thumbnail</span>
                                            <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                                        </label>
                                    )}
                                    <div className="text-xs text-gray-500">
                                        <p>Recommended: 800x600px</p>
                                        <p>Max: 2MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section - White/Light Background */}
            <div className="bg-white [.dark_&]:bg-[#0D0F1C]">
                <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">


                    {/* What You'll Learn Section */}
                    {(isEditing || (knowledge.whatYouLearn && knowledge.whatYouLearn.length > 0 && knowledge.whatYouLearn.some(item => item && item.trim()))) && (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white">
                                    What you'll learn
                                </h2>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleAddWhatYouLearn}
                                        className={`flex items-center justify-center w-6 h-6 rounded-full ${buttonClass} text-white cursor-pointer hover:shadow-md transition-all`}
                                        title="Add topic"
                                    >
                                        <FaPlus className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-3">
                                    {editWhatYouLearn.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => handleWhatYouLearnChange(index, e.target.value)}
                                                placeholder="e.g. Advanced State Management"
                                                className="flex-1 rounded-lg border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {!isEmployee && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteWhatYouLearn(index)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                                                    title="Remove topic"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {knowledge.whatYouLearn.filter(line => line && line.trim()).map((line, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <svg className="h-5 w-5 text-green-600 [.dark_&]:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-base text-gray-700 [.dark_&]:text-gray-300">
                                                {line.trim()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Course Content Section */}
                    {(isEditing || (knowledge.courseContent && knowledge.courseContent.length > 0 && knowledge.courseContent.some(c => c.heading || (c.points && c.points.length > 0)))) && (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white">
                                        Knowledge contents
                                    </h2>
                                    {!isEditing && knowledge.courseContent && (
                                        <div className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                                            {knowledge.courseContent.length} sections • {knowledge.courseContent.reduce((acc, curr) => acc + (curr.points?.length || 0), 0)} points
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <button
                                        type="button"
                                        onClick={handleAddContentSection}
                                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg ${buttonClass} text-white text-sm cursor-pointer hover:shadow-md transition-all`}
                                    >
                                        <FaPlus className="h-3 w-3" /> Add Section
                                    </button>
                                ) : (
                                    <button
                                        onClick={toggleAllSections}
                                        className="text-indigo-600 [.dark_&]:text-indigo-400 text-sm font-medium hover:underline"
                                    >
                                        {(knowledge.courseContent && knowledge.courseContent.every((_, idx) => expandedSections[idx])) ? "Collapse all sections" : "Expand all sections"}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {isEditing ? (
                                    editCourseContent.map((section, idx) => (
                                        <div key={idx} className="rounded-lg overflow-hidden bg-gray-50 [.dark_&]:bg-white/5 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={section.heading}
                                                    onChange={(e) => handleContentHeadingChange(idx, e.target.value)}
                                                    placeholder="Section Heading"
                                                    className="flex-1 font-semibold bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none p-1 text-gray-900 [.dark_&]:text-white"
                                                />
                                                {!isEmployee && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteContentSection(idx)}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                        title="Remove Section"
                                                    >
                                                        <FaTrash className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-2 pl-4">
                                                {section.points.map((point, pIdx) => (
                                                    <div key={pIdx} className="flex gap-2 items-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-2"></span>
                                                        <input
                                                            type="text"
                                                            value={point}
                                                            onChange={(e) => handleContentPointChange(idx, pIdx, e.target.value)}
                                                            placeholder="Content point..."
                                                            className="flex-1 rounded border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] py-1.5 px-2 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 focus:outline-none"
                                                        />
                                                        {!isEmployee && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteContentPoint(idx, pIdx)}
                                                                className="text-gray-400 hover:text-red-500 p-1"
                                                                title="Remove point"
                                                            >
                                                                <FaTrash className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddContentPoint(idx)}
                                                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium pl-4"
                                                >
                                                    <FaPlus className="h-3 w-3" /> Add Point
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="border border-gray-200 [.dark_&]:border-white/10 rounded-lg overflow-hidden">
                                        {knowledge.courseContent.map((section, idx) => (
                                            <div key={idx} className="border-b border-gray-200 [.dark_&]:border-white/10 last:border-0">
                                                <button
                                                    onClick={() => toggleSection(idx)}
                                                    className="w-full flex items-center justify-between px-4 py-4 bg-gray-50 [.dark_&]:bg-[#1F2234] hover:bg-gray-100 [.dark_&]:hover:bg-white/5 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedSections[idx] ? (
                                                            <FaChevronUp className="h-4 w-4 text-gray-500" />
                                                        ) : (
                                                            <FaChevronDown className="h-4 w-4 text-gray-500" />
                                                        )}
                                                        <span className="font-semibold text-gray-900 [.dark_&]:text-white">
                                                            {section.heading}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-500 [.dark_&]:text-gray-400">
                                                        {section.points?.length || 0} points
                                                    </span>
                                                </button>

                                                {expandedSections[idx] && (
                                                    <div className="bg-white [.dark_&]:bg-[#181B2A] px-4 py-2">
                                                        {section.points && section.points.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {section.points.filter(p => p && p.trim()).map((point, pIdx) => (
                                                                    <div key={pIdx} className="flex items-start gap-3 py-2 pl-7 pr-2 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 rounded-md group transition-colors">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 [.dark_&]:bg-indigo-400 flex-shrink-0 mt-2"></span>
                                                                        <span className="text-sm text-gray-700 [.dark_&]:text-gray-300 leading-relaxed">
                                                                            {point}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="py-2 pl-7 text-sm text-gray-500 italic">
                                                                No points in this section
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Explore Related Topics */}
                    {knowledge.projects && knowledge.projects.length > 0 && (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] border border-gray-200 [.dark_&]:border-white/10 rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white mb-4">
                                Explore related topics
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {knowledge.projects.map((project, index) => (
                                    <span
                                        key={index}
                                        className="px-4 py-2 rounded-full border border-gray-300 [.dark_&]:border-white/20 text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        {project.name || project}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}



                    {/* Links Section */}
                    {(isEditing || (knowledge.links && knowledge.links.length > 0)) && (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white">
                                    Related Links
                                </h2>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleAddLink}
                                        className={`flex items-center justify-center w-6 h-6 rounded-full ${buttonClass} text-white cursor-pointer hover:shadow-md transition-all`}
                                        title="Add link"
                                    >
                                        <FaPlus className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {isEditing ? (
                                    editLinks.map((lnk, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="url"
                                                value={lnk}
                                                onChange={(e) => handleLinkChange(index, e.target.value)}
                                                placeholder="https://example.com"
                                                className="flex-1 rounded-lg border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] py-2 px-3 text-sm text-gray-900 [.dark_&]:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {!isEmployee && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLink(index)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                                                    title="Remove link"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    knowledge.links.map((linkItem, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 [.dark_&]:bg-white/5 transition-colors">
                                            <div className="flex-shrink-0">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 [.dark_&]:bg-indigo-500/20 flex items-center justify-center">
                                                    <svg className="h-5 w-5 text-indigo-600 [.dark_&]:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {linkItem.label && (
                                                    <div className="text-sm font-medium text-gray-900 [.dark_&]:text-white truncate mb-0.5">
                                                        {linkItem.label}
                                                    </div>
                                                )}
                                                <a
                                                    href={linkItem.url || linkItem}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-indigo-600 [.dark_&]:text-indigo-400 hover:underline truncate block"
                                                >
                                                    {linkItem.url || linkItem}
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Documents Section */}
                    {(isEditing || (knowledge.documents && knowledge.documents.length > 0)) ? (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
                                    Documents {isEditing ? `(${editDocuments.length})` : `(${getSortedDocuments().length})`}
                                </h2>

                                {isEditing ? (
                                    <label className={`cursor-pointer flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg ${buttonClass} text-white text-sm hover:shadow-md transition-all`}>
                                        <FaPlus className="h-3 w-3" /> Add Document
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                ) : (
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
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(isEditing ? editDocuments : getSortedDocuments()).map((doc, index) => {
                                    const isPDF = doc.name?.toLowerCase().endsWith('.pdf');
                                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.name || '');
                                    const hasPreview = isPDF || isImage;
                                    const isNew = !doc.url;

                                    return (
                                        <div
                                            key={index}
                                            className="rounded-lg bg-white [.dark_&]:bg-[#181B2A] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col relative"
                                        >
                                            {isEditing && !isEmployee && (
                                                <button
                                                    onClick={() => handleFileDelete(index)}
                                                    className="absolute top-2 right-2 z-10 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm"
                                                    title="Remove document"
                                                >
                                                    <FaTrash className="h-3 w-3" />
                                                </button>
                                            )}

                                            {/* Document Preview or Error Message */}
                                            <div className="w-full h-48 bg-gray-100 [.dark_&]:bg-gray-900 overflow-hidden flex items-center justify-center">
                                                {isNew ? (
                                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                                        <FaFileAlt className="h-12 w-12 text-indigo-400 mb-2" />
                                                        <p className="text-sm font-medium text-indigo-600 [.dark_&]:text-indigo-400">
                                                            New Upload
                                                        </p>
                                                    </div>
                                                ) : hasPreview && doc.url ? (
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
                                                {!isEditing && (
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
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-900 [.dark_&]:text-white mb-4">
                                Documents
                            </h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center mb-4">
                                    <FaFileAlt className="h-8 w-8 text-gray-400 [.dark_&]:text-gray-600" />
                                </div>
                                <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm">
                                    No documents attached to this knowledge
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Access Control Modal */}
            {showAccessModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowAccessModal(false)}
                >
                    <div
                        className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-lg p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowAccessModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300 z-10"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 [.dark_&]:text-white mb-4">
                            Access Control
                        </h2>

                        <AssigneeSelector
                            label="Assignees"
                            users={admins}
                            selectedIds={[...selectedAdmin, ...selectedMember]}
                            onChange={(newIds) => {
                                const newAdmins = [];
                                const newMembers = [];
                                newIds.forEach(id => {
                                    const user = allUsersMap[id];
                                    if (user) {
                                        const type = String(user.resourceRoleType || "").toLowerCase();
                                        if (['superadmin', 'admin', 'manager'].includes(type) || type === 'super admin') {
                                            newAdmins.push(id);
                                        } else {
                                            newMembers.push(id);
                                        }
                                    }
                                });
                                setSelectedAdmin(newAdmins);
                                setSelectedMember(newMembers);
                            }}
                        />

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowAccessModal(false)}
                                className={`px-4 py-2 rounded-lg ${buttonClass} text-white hover:opacity-90`}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Metadata Modal */}
            {showMetadata && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowMetadata(false)}
                >
                    <div
                        className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg shadow-2xl w-full max-w-3xl p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowMetadata(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300 z-10"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Metadata */}
                            <div>
                                {/* Profile Image/Icon */}
                                <div className="flex flex-col items-center mb-6">
                                    {(() => {
                                        // Get live user image from usersMap, fallback to fetched creatorImage
                                        const liveCreatorImage = knowledge.createdByUid
                                            ? usersMap[knowledge.createdByUid]?.imageUrl
                                            : null;
                                        const displayImage = liveCreatorImage || creatorImage;

                                        return displayImage ? (
                                            <img
                                                src={displayImage}
                                                alt={knowledge.createdByName || "Creator"}
                                                className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-indigo-200 [.dark_&]:border-indigo-900/50"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 flex items-center justify-center mb-3">
                                                <FaUser className="h-10 w-10 text-indigo-600 [.dark_&]:text-indigo-400" />
                                            </div>
                                        );
                                    })()}
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

                            {/* Right Column - Activities */}
                            <div className="lg:border-l border-gray-200 [.dark_&]:border-white/10 lg:pl-6">
                                <h4 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white mb-4">Activities</h4>
                                {activities && activities.length > 0 ? (
                                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* Timeline */}
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 [.dark_&]:bg-gray-700"></div>
                                            <div className="space-y-4">
                                                {activities.map((entry, idx) => {
                                                    const dateObj = entry.timestamp ? new Date(entry.timestamp) : null;
                                                    const dateStr = dateObj ? dateObj.toLocaleDateString('en-GB') : "N/A";
                                                    const timeStr = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";

                                                    // Get live user image from usersMap, fallback to stored image
                                                    const userImage = usersMap[entry.performedBy]?.imageUrl || entry.performedByImage;

                                                    return (
                                                        <div key={entry.id || idx} className="flex gap-3 relative">
                                                            <div className="flex-shrink-0 z-10">
                                                                {userImage ? (
                                                                    <img
                                                                        src={userImage}
                                                                        alt={entry.performedByName || "User"}
                                                                        className="h-8 w-8 rounded-full object-cover border-2 border-white [.dark_&]:border-[#181B2A]"
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 [.dark_&]:bg-indigo-900/30 flex items-center justify-center text-indigo-600 [.dark_&]:text-indigo-400 font-bold text-xs border-2 border-white [.dark_&]:border-[#181B2A]">
                                                                        {entry.performedByName?.charAt(0) || "U"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 bg-gray-50 [.dark_&]:bg-white/5 rounded-lg p-3 border border-gray-100 [.dark_&]:border-white/10">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-sm font-semibold text-gray-900 [.dark_&]:text-white truncate">
                                                                        {entry.performedByName || "Unknown User"}
                                                                    </span>
                                                                    <div className="text-right flex-shrink-0 ml-2">
                                                                        <div className="text-xs font-medium text-gray-500 [.dark_&]:text-gray-400">{dateStr}</div>
                                                                        <div className="text-xs text-gray-400">{timeStr}</div>
                                                                    </div>
                                                                </div>
                                                                <ul className="space-y-1">
                                                                    {entry.changes && entry.changes.length > 0 ? (
                                                                        entry.changes.map((change, cIdx) => (
                                                                            <li key={cIdx} className="text-xs text-gray-600 [.dark_&]:text-gray-400 flex items-start gap-1.5">
                                                                                <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                                                                                <span className="leading-relaxed">{change}</span>
                                                                            </li>
                                                                        ))
                                                                    ) : (
                                                                        <li className="text-xs text-gray-500 italic">Performed an update</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center mb-3">
                                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">No activity recorded yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default KnowledgeDetailView;

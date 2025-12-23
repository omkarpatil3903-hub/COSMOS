import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import Card from "../../components/Card";

function DocumentViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { buttonClass } = useThemeStyles();

    // Get document data from navigation state
    const document = location.state?.document;
    const knowledgeTitle = location.state?.knowledgeTitle;

    const handleBack = () => {
        navigate(-1);
    };

    const handleDownload = () => {
        if (document?.url) {
            window.open(document.url, '_blank');
        }
    };

    if (!document) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-lg text-gray-900 [.dark_&]:text-white mb-4">Document not found</div>
                <button onClick={handleBack} className={`px-4 py-2 rounded-lg ${buttonClass} text-white`}>
                    Go Back
                </button>
            </div>
        );
    }

    const isPDF = document.name?.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(document.name || '');
    const truncatedName = document.displayName || document.name;
    const displayName = truncatedName.length > 20 ? `${truncatedName.substring(0, 20)}...` : truncatedName;

    return (
        <div className="h-screen flex flex-col gap-4 p-4">
            {/* Top Navigation */}
            <div className="flex items-center justify-between px-3 py-3 border-b bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 hover:text-gray-900 [.dark_&]:hover:text-white"
                    >
                        <FaArrowLeft />
                        Back
                    </button>
                    <span className="text-gray-300 [.dark_&]:text-gray-600">/</span>
                    <div className="truncate text-base font-semibold text-indigo-600 [.dark_&]:text-indigo-400" title={document.displayName || document.name}>
                        {displayName}
                    </div>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg ${buttonClass} text-white hover:opacity-90 transition-opacity text-sm font-medium`}
                >
                    <FaDownload className="h-3 w-3" />
                    <span>Download</span>
                </button>
            </div>

            {/* Document Preview - Full Screen Height */}
            <div className="flex-1 bg-white [.dark_&]:bg-[#181B2A] overflow-hidden rounded-lg shadow-sm border border-gray-200 [.dark_&]:border-white/10">
                {isPDF && document.url && (
                    <iframe
                        src={`${document.url}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full border-0"
                        title={document.displayName || document.name}
                    />
                )}

                {isImage && document.url && (
                    <div className="w-full h-full overflow-auto bg-gray-100 [.dark_&]:bg-gray-900 flex items-center justify-center p-4">
                        <img
                            src={document.url}
                            alt={document.displayName || document.name}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                )}

                {!isPDF && !isImage && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-gray-100 [.dark_&]:bg-gray-800 flex items-center justify-center mb-4">
                            <FaDownload className="h-8 w-8 text-gray-400 [.dark_&]:text-gray-600" />
                        </div>
                        <p className="text-gray-900 [.dark_&]:text-white font-semibold mb-2">
                            {document.displayName || document.name}
                        </p>
                        <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm mb-4">
                            Preview not available for this file type
                        </p>
                        <button
                            onClick={handleDownload}
                            className={`px-4 py-2 rounded-lg ${buttonClass} text-white hover:opacity-90 transition-opacity`}
                        >
                            Download File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentViewer;

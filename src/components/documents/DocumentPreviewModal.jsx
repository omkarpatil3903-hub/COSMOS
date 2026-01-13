/**
 * DocumentPreviewModal Component
 *
 * Purpose: Full-screen modal for previewing documents with metadata sidebar.
 * Supports images, PDFs, and provides download functionality.
 *
 * Responsibilities:
 * - Display document preview (image/PDF/fallback)
 * - Show document metadata (uploader, dates, filename)
 * - Display access control list (admins/members)
 * - Enable document download with proper filename
 * - Support navigation between documents (prev/next)
 * - Handle missing/deleted files gracefully
 *
 * Dependencies:
 * - Button (UI component)
 * - useThemeStyles (themed button class)
 * - react-hot-toast (download notifications)
 * - react-icons (file type, navigation icons)
 *
 * Props:
 * - open: Modal visibility (default: true)
 * - onClose: Close callback
 * - doc: Document object to preview
 * - onSave: Optional save callback
 * - docs: Array of documents for navigation
 * - onNavigate: Navigation callback ('prev'/'next')
 * - variant: 'default' | 'compact' for size
 * - showMetadata: Boolean to show sidebar
 *
 * File Type Detection:
 * - Image: MIME type starts with 'image/' or data URI
 * - PDF: MIME type is 'application/pdf' or file extension
 * - Other: Generic file icon with download prompt
 *
 * Download Logic:
 * - Fetch as blob to enable proper download (not new tab)
 * - Resolve filename from: filename > storagePath > URL > fileType
 * - Firebase Storage URLs get content-disposition header appended
 *
 * Error States:
 * - Image load error: Shows "Document Not Found" message
 * - PDF load error: Shows "Document Not Found" message
 *
 * Last Modified: 2026-01-10
 */

import React, { useState } from "react";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import Button from "../Button";
import {
  FaChevronLeft,
  FaChevronRight,
  FaFile,
  FaFileImage,
  FaFilePdf,
  FaCalendarAlt,
  FaDownload,
  FaTimes,
  FaUserShield,
  FaUsers,
  FaUser,
  FaUserEdit,
  FaExclamationTriangle,
} from "react-icons/fa";
import toast from "react-hot-toast";

function DocumentPreviewModal({
  open = true,
  onClose,
  doc,
  onSave,
  docs = [],
  onNavigate,
  variant = "default",
  showMetadata = true,
}) {
  const { buttonClass } = useThemeStyles();
  const [imageError, setImageError] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!doc) return null;
  const admin = doc.access?.admin || [];
  const member = doc.access?.member || [];
  const previewUrl = doc.fileDataUrl || doc.url || "";
  const hasPreview = Boolean(previewUrl);
  const isImage =
    hasPreview &&
    (doc.fileType?.startsWith("image/") ||
      /^data:image\//.test(previewUrl) ||
      /\.(png|jpe?g|gif|webp|bmp)$/i.test(previewUrl));
  const isPdf =
    hasPreview &&
    (doc.fileType === "application/pdf" ||
      /^data:application\/pdf/.test(previewUrl) ||
      /\.pdf(?:$|[?#])/i.test(previewUrl));

  const fileKind = isImage ? "Image" : isPdf ? "PDF" : "File";
  const FileIcon = isImage ? FaFileImage : isPdf ? FaFilePdf : FaFile;
  const badgeClasses = isImage
    ? "bg-blue-50 text-blue-700 border-blue-300"
    : isPdf
      ? "bg-rose-50 text-rose-700 border-rose-300"
      : "bg-indigo-50 text-indigo-700 border-indigo-300";
  const previewBorderColor = isImage
    ? "border-blue-200"
    : isPdf
      ? "border-rose-200"
      : "border-indigo-200";
  const iconColor = isImage
    ? "text-blue-600"
    : isPdf
      ? "text-rose-600"
      : "text-indigo-600";

  const canNavigate = Array.isArray(docs) && docs.length > 1;
  const currentIndex = canNavigate
    ? docs.findIndex((d) => d.id === doc.id)
    : -1;
  const enablePrev = canNavigate && currentIndex > 0;
  const enableNext = canNavigate && currentIndex < docs.length - 1;
  const displayName = typeof doc.name === "string" ? (doc.name.length > 30 ? doc.name.slice(0, 30) + ".." : doc.name) : "";

  const handleDownload = async () => {
    const href = doc?.url || doc?.fileDataUrl || previewUrl;
    if (!href) return;

    const toastId = toast.loading("Downloading...");
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const resolveName = () => {
        if (doc?.filename) return doc.filename;
        if (doc?.storagePath) {
          const seg = doc.storagePath.split("/");
          const name = seg[seg.length - 1];
          if (name) return name;
        }
        if (doc?.url) {
          try {
            const u = new URL(doc.url);
            const path = decodeURIComponent(u.pathname);
            const idx = path.lastIndexOf("/o/");
            if (idx !== -1) {
              const encoded = path.slice(idx + 3); // after /o/
              const decoded = decodeURIComponent(encoded);
              const parts = decoded.split("/");
              const last = parts[parts.length - 1];
              if (last) return last;
            }
          } catch { }
        }
        const map = {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
          "application/vnd.ms-excel": "xls",
          "text/csv": "csv",
          "application/pdf": "pdf",
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        const ext = map[doc?.fileType] || "";
        const base = doc?.name || "document";
        return ext ? `${base}.${ext}` : base;
      };

      const safeName = resolveName().replace(/[^a-zA-Z0-9._-]/g, "_");
      a.download = safeName;
      a.target = "_self"; // Explicitly prevent new tab

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download complete!", { id: toastId });
    } catch (error) {
      console.error("Download error:", error);

      // Fallback
      const link = document.createElement("a");
      let downloadHref = href;

      // Sanitize backup filename
      const safeName = (doc.filename || doc.name || "download").replace(/[^a-zA-Z0-9._-]/g, "_");

      // For Firebase Storage, append content-disposition to force download
      if (downloadHref && downloadHref.includes("firebasestorage.googleapis.com")) {
        const separator = downloadHref.includes("?") ? "&" : "?";
        downloadHref = `${downloadHref}${separator}response-content-disposition=attachment%3B%20filename%3D%22${encodeURIComponent(safeName)}%22`;
      }

      link.href = downloadHref;
      link.download = safeName;
      link.target = "_self";
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.dismiss(toastId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full ${!showMetadata ? "max-w-4xl max-h-[90vh]" : variant === "compact" ? "max-w-5xl max-h-[90vh]" : "max-w-7xl max-h-[94vh]"} flex flex-col overflow-hidden`}
        style={{ maxWidth: !showMetadata ? "800px" : variant === "compact" ? "95vw" : "98vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 [.dark_&]:border-white/10 bg-gradient-to-r from-gray-50 to-white [.dark_&]:from-[#1F2234] [.dark_&]:to-[#1F2234] shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`p-2 rounded-lg ${badgeClasses.split(" ")[0]
                } border ${badgeClasses.split(" ").slice(2).join(" ")}`}
            >
              <FileIcon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-semibold text-gray-900 [.dark_&]:text-white truncate"
                title={doc.name}
              >
                {displayName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-full ${badgeClasses}`}
                >
                  {fileKind}
                </span>
                <span
                  className="text-xs text-gray-500 [.dark_&]:text-gray-400 truncate"
                  title={`ID: ${String(doc.id || "").toUpperCase()}`}
                >
                  ID:{" "}
                  {String(doc.id || "")
                    .slice(0, 8)
                    .toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(hasPreview || doc.filename) && (
              <button
                type="button"
                onClick={handleDownload}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 [.dark_&]:bg-indigo-900/20 hover:bg-indigo-100 [.dark_&]:hover:bg-indigo-900/40 text-indigo-700 [.dark_&]:text-indigo-300 rounded-lg font-medium text-xs transition-colors border border-indigo-200 [.dark_&]:border-indigo-500/20 mr-2"
                title="Download"
              >
                <FaDownload className="w-3 h-3" />
                Download
              </button>
            )}

            <button
              className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-lg text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white transition-colors"
              onClick={onClose}
              title="Close"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Preview Section */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <div
              className={`border-2 ${previewBorderColor} [.dark_&]:border-white/10 rounded-xl bg-gradient-to-br from-gray-50 to-white [.dark_&]:from-[#181B2A] [.dark_&]:to-[#181B2A] overflow-hidden shadow-inner relative`}
              style={{ minHeight: variant === "compact" ? "65vh" : "72vh", maxHeight: "90vh" }}
            >
              {/* Navigation Buttons - Top Right Corner */}
              {canNavigate && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 [.dark_&]:bg-[#1F2234]/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 [.dark_&]:border-white/10 p-1">
                  <button
                    onClick={() =>
                      enablePrev && onNavigate && onNavigate("prev")
                    }
                    disabled={!enablePrev}
                    className={`p-2 rounded-md transition-all ${enablePrev
                      ? "bg-white [.dark_&]:bg-[#181B2A] hover:bg-indigo-50 [.dark_&]:hover:bg-white/10 text-gray-700 [.dark_&]:text-white hover:text-indigo-600 [.dark_&]:hover:text-white shadow-sm"
                      : "bg-gray-50 [.dark_&]:bg-white/5 text-gray-300 [.dark_&]:text-gray-600 cursor-not-allowed"
                      }`}
                    title="Previous Document"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 [.dark_&]:text-gray-300 font-semibold px-2 min-w-[50px] text-center">
                    {currentIndex + 1} / {docs.length}
                  </span>
                  <button
                    onClick={() =>
                      enableNext && onNavigate && onNavigate("next")
                    }
                    disabled={!enableNext}
                    className={`p-2 rounded-md transition-all ${enableNext
                      ? "bg-white [.dark_&]:bg-[#181B2A] hover:bg-indigo-50 [.dark_&]:hover:bg-white/10 text-gray-700 [.dark_&]:text-white hover:text-indigo-600 [.dark_&]:hover:text-white shadow-sm"
                      : "bg-gray-50 [.dark_&]:bg-white/5 text-gray-300 [.dark_&]:text-gray-600 cursor-not-allowed"
                      }`}
                    title="Next Document"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {hasPreview ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {isImage ? (
                    imageError ? (
                      <div className="text-center p-8">
                        <FaExclamationTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <p className="text-gray-700 [.dark_&]:text-gray-300 text-lg font-semibold mb-2">
                          Document Not Found
                        </p>
                        <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm">
                          The file has been deleted from storage or is no longer available.
                        </p>
                        <p className="text-gray-400 [.dark_&]:text-gray-500 text-xs mt-2">
                          Please contact an administrator if you believe this is an error.
                        </p>
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt={doc.name}
                        onError={() => setImageError(true)}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                      />
                    )
                  ) : isPdf ? (
                    iframeError ? (
                      <div className="text-center p-8">
                        <FaExclamationTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <p className="text-gray-700 [.dark_&]:text-gray-300 text-lg font-semibold mb-2">
                          Document Not Found
                        </p>
                        <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm">
                          The file has been deleted from storage or is no longer available.
                        </p>
                        <p className="text-gray-400 [.dark_&]:text-gray-500 text-xs mt-2">
                          Please contact an administrator if you believe this is an error.
                        </p>
                      </div>
                    ) : (
                      <iframe
                        title="PDF Preview"
                        src={previewUrl}
                        onError={() => setIframeError(true)}
                        className="w-full h-full rounded-lg"
                        style={{ minHeight: variant === "compact" ? "70vh" : "78vh" }}
                      />
                    )
                  ) : (
                    <div className="text-center p-8">
                      <FaFile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm font-medium">
                        Preview not available for this file type
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Download the file to view its contents
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <FaFile className="w-16 h-16 text-gray-300 [.dark_&]:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 [.dark_&]:text-gray-400 text-sm font-medium">
                      No preview available
                    </p>
                    <p className="text-gray-400 [.dark_&]:text-gray-500 text-xs mt-1">
                      This document doesn't have a preview
                    </p>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Sidebar */}
          {showMetadata && (
            <div className="w-full lg:w-80 bg-gray-50 [.dark_&]:bg-[#1F2234] border-t lg:border-t-0 lg:border-l border-gray-200 [.dark_&]:border-white/10 flex flex-col shrink-0">
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Metadata */}
                <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-4 shadow-sm border border-gray-200 [.dark_&]:border-white/10">
                  <h3 className="text-xs font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider mb-3">
                    Document Info
                  </h3>

                  {(doc.createdByRole || doc.createdByName) && (
                    <div className="flex items-center gap-3 mb-3">
                      <FaUser className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">Uploaded By</p>
                        <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                          {(() => {
                            const role = doc.createdByRole || "";
                            const name = doc.createdByName || "";

                            // If role exists and is valid, show it with proper capitalization
                            if (role && role.length > 2) {
                              return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
                            }

                            // Otherwise, show the name
                            return name || "—";
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {doc.created && (
                    <div className="flex items-center gap-3 mb-3">
                      <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">Uploaded On</p>
                        <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">{doc.created}</p>
                      </div>
                    </div>
                  )}

                  {doc.updatedByName && (
                    <div className="flex items-center gap-3 mb-3">
                      <FaUserEdit className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">Last Edited By</p>
                        <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">{doc.updatedByName}</p>
                      </div>
                    </div>
                  )}

                  {doc.updated && (
                    <div className="flex items-center gap-3 mb-3">
                      <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">Last Updated</p>
                        <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">
                          {doc.updated}
                        </p>
                      </div>
                    </div>
                  )}

                  {doc.filename && (
                    <div className="flex items-start gap-3">
                      <FaFile className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mb-0.5">Filename</p>
                        <p
                          className="text-sm font-medium text-gray-900 [.dark_&]:text-white break-all line-clamp-2"
                          title={doc.filename}
                        >
                          {doc.filename}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Access Control */}
                <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-4 shadow-sm border border-gray-200 [.dark_&]:border-white/10">
                  <h3 className="text-xs font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider mb-3">
                    Access Control
                  </h3>

                  {admin.length === 0 && member.length === 0 ? (
                    <div className="text-center py-4">
                      <FaUserShield className="w-8 h-8 text-gray-300 [.dark_&]:text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                        No access restrictions set
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {admin.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FaUserShield className="w-3.5 h-3.5 text-indigo-600 [.dark_&]:text-indigo-400" />
                            <span className="text-xs font-semibold text-gray-700 [.dark_&]:text-gray-300">
                              Administrators
                            </span>
                            <span className="ml-auto text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 bg-gray-100 [.dark_&]:bg-white/10 px-2 py-0.5 rounded-full">
                              {admin.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {admin.map((n) => (
                              <span
                                key={`a_${n}`}
                                className="px-2.5 py-1 rounded-md bg-indigo-50 [.dark_&]:bg-indigo-900/20 border border-indigo-200 [.dark_&]:border-indigo-500/20 text-xs text-indigo-700 [.dark_&]:text-indigo-300 font-medium truncate max-w-[150px]"
                                title={n}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {member.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FaUsers className="w-3.5 h-3.5 text-blue-600 [.dark_&]:text-blue-400" />
                            <span className="text-xs font-semibold text-gray-700 [.dark_&]:text-gray-300">
                              Members
                            </span>
                            <span className="ml-auto text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 bg-gray-100 [.dark_&]:bg-white/10 px-2 py-0.5 rounded-full">
                              {member.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {member.map((n) => (
                              <span
                                key={`m_${n}`}
                                className="px-2.5 py-1 rounded-md bg-blue-50 [.dark_&]:bg-blue-900/20 border border-blue-200 [.dark_&]:border-blue-500/20 text-xs text-blue-700 [.dark_&]:text-blue-300 font-medium truncate max-w-[150px]"
                                title={n}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {showMetadata && (
          <div className="px-6 py-4 border-t border-gray-200 [.dark_&]:border-white/10 bg-gray-50 [.dark_&]:bg-[#1F2234] flex justify-end gap-3 shrink-0">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="custom"
              className={buttonClass}
              onClick={() => {
                if (typeof onSave === "function") {
                  onSave(doc);
                } else {
                  onClose();
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentPreviewModal;

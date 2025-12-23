import React from "react";
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
} from "react-icons/fa";

function DocumentPreviewModal({
  open = true,
  onClose,
  doc,
  onSave,
  docs = [],
  onNavigate,
  variant = "default",
}) {
  const { buttonClass } = useThemeStyles();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full ${variant === "compact" ? "max-w-5xl max-h-[90vh]" : "max-w-7xl max-h-[94vh]"} flex flex-col overflow-hidden`}
        style={{ maxWidth: variant === "compact" ? "95vw" : "98vw" }}
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

          <button
            className="p-2 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-lg text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white transition-colors"
            onClick={onClose}
            title="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
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
                    <img
                      src={previewUrl}
                      alt={doc.name}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                    />
                  ) : isPdf ? (
                    <iframe
                      title="PDF Preview"
                      src={previewUrl}
                      className="w-full h-full rounded-lg"
                      style={{ minHeight: variant === "compact" ? "70vh" : "78vh" }}
                    />
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

            {(hasPreview || doc.filename) && (
              <div className="flex justify-end mt-4">
                {hasPreview && (
                  <a
                    href={previewUrl}
                    download={doc.filename || `${doc.name}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium text-sm transition-colors border border-indigo-200"
                  >
                    <FaDownload className="w-3.5 h-3.5" />
                    Download File
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 bg-gray-50 [.dark_&]:bg-[#1F2234] border-t lg:border-t-0 lg:border-l border-gray-200 [.dark_&]:border-white/10 flex flex-col shrink-0">
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Metadata */}
              <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-4 shadow-sm border border-gray-200 [.dark_&]:border-white/10">
                <h3 className="text-xs font-bold text-gray-500 [.dark_&]:text-gray-400 uppercase tracking-wider mb-3">
                  Document Info
                </h3>

                {doc.createdByName && (
                  <div className="flex items-center gap-3 mb-3">
                    <FaUser className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 [.dark_&]:text-gray-400">Uploaded By</p>
                      <p className="text-sm font-medium text-gray-900 [.dark_&]:text-white">{doc.createdByName}</p>
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
        </div>

        {/* Footer */}
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
      </div>
    </div>
  );
}

export default DocumentPreviewModal;

import React, { useState, useEffect } from "react";
import {
  FaDownload,
  FaTrash,
  FaEye,
  FaFilter,
  FaSearch,
  FaFileImage,
  FaUser,
  FaTasks,
  FaCalendarAlt,
  FaChartBar,
} from "react-icons/fa";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import {
  getAllUploads,
  listenToUploads,
  deleteUpload,
  getUploadStats,
  formatFileSize,
  getFileTypeIcon,
} from "../utils/uploadUtils";

export default function UploadsManagement() {
  const [uploads, setUploads] = useState([]);
  const [filteredUploads, setFilteredUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [stats, setStats] = useState(null);
  const [view, setView] = useState("list"); // 'list' or 'grid'

  // Load uploads and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [uploadsData, statsData] = await Promise.all([
          getAllUploads(),
          getUploadStats(),
        ]);
        setUploads(uploadsData);
        setStats(statsData);
      } catch (error) {
        console.error("Error loading uploads:", error);
        toast.error("Failed to load uploads");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listener
    const unsubscribe = listenToUploads((uploadsData) => {
      setUploads(uploadsData);
    });

    return () => unsubscribe();
  }, []);

  // Filter uploads based on search and filters
  useEffect(() => {
    let filtered = uploads;

    if (searchTerm) {
      filtered = filtered.filter(
        (upload) =>
          upload.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          upload.taskTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          upload.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (clientFilter) {
      filtered = filtered.filter(
        (upload) => upload.clientName === clientFilter
      );
    }

    if (fileTypeFilter) {
      filtered = filtered.filter((upload) =>
        upload.fileType?.startsWith(fileTypeFilter)
      );
    }

    setFilteredUploads(filtered);
  }, [uploads, searchTerm, clientFilter, fileTypeFilter]);

  const handleDownload = (upload) => {
    const link = document.createElement("a");
    link.href = upload.url;
    link.download = upload.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`📥 Downloading ${upload.fileName}`);
  };

  const handleDelete = async (uploadId) => {
    if (!window.confirm("Are you sure you want to delete this upload?")) {
      return;
    }

    try {
      await deleteUpload(uploadId);
      toast.success("Upload deleted successfully");
    } catch (error) {
      console.error("Error deleting upload:", error);
      toast.error("Failed to delete upload");
    }
  };

  const handleView = (upload) => {
    window.open(upload.url, "_blank");
  };

  // Get unique clients for filter
  const uniqueClients = [
    ...new Set(uploads.map((u) => u.clientName).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Uploads Management"
          subtitle="Manage client uploaded files and documents"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Uploads Management"
        subtitle="Manage client uploaded files and documents"
      />

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <FaFileImage className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalUploads}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <FaChartBar className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(stats.totalSize)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <FaUser className="text-purple-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.clientCounts).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <FaTasks className="text-orange-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Tasks with Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.taskCounts).length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files, tasks, or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Clients</option>
            {uniqueClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All File Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="application">Documents</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg ${
                view === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <FaFilter />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg ${
                view === "grid"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <FaChartBar />
            </button>
          </div>
        </div>
      </Card>

      {/* Uploads List */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Uploaded Files ({filteredUploads.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUploads.map((upload) => (
                <tr key={upload.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {getFileTypeIcon(upload.fileType)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {upload.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {upload.fileType}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <FaUser className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {upload.clientName || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <FaTasks className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 truncate max-w-xs">
                        {upload.taskTitle || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900">
                      {formatFileSize(upload.fileSize || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {upload.uploadedAt?.toDate
                          ? upload.uploadedAt.toDate().toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(upload)}
                        className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="View file"
                      >
                        <FaEye className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDownload(upload)}
                        className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                        title="Download file"
                      >
                        <FaDownload className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(upload.id)}
                        className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Delete file"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUploads.length === 0 && (
            <div className="text-center py-12">
              <FaFileImage className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No uploads found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {uploads.length === 0
                  ? "No files have been uploaded yet."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

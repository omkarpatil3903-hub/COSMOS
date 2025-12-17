import React, { useState } from "react";
import { FaBookOpen, FaFileAlt } from "react-icons/fa";
import SuperAdminKnowledgePage from "./SuperAdminKnowledgePage";
import SuperAdminDocumentsPage from "./SuperAdminDocumentsPage";
import PageHeader from "../../components/PageHeader";

export default function SuperAdminKnowledgeManagement() {
  const [activeTab, setActiveTab] = useState("knowledge");

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Management">
        View, create and manage organizational knowledge and documentation.
      </PageHeader>

      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("knowledge")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${
            activeTab === "knowledge"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <FaBookOpen className="h-4 w-4" />
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${
            activeTab === "documents"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <FaFileAlt className="h-4 w-4" />
          Documentation
        </button>
      </div>

      {activeTab === "knowledge" ? <SuperAdminKnowledgePage /> : <SuperAdminDocumentsPage />}
    </div>
  );
}

import React, { useState } from "react";
import { FaBookOpen, FaFileAlt } from "react-icons/fa";
import SuperAdminKnowledgePage from "./SuperAdminKnowledgePage";
import SuperAdminDocumentsPage from "./SuperAdminDocumentsPage";
import PageHeader from "../../components/PageHeader";

import { useLocation } from "react-router-dom";

export default function SuperAdminKnowledgeManagement() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "knowledge");

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Management">
        View, create and manage organizational knowledge and documentation.
      </PageHeader>

      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("knowledge")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${activeTab === "knowledge"
              ? "bg-surface-strong text-content-primary border-subtle shadow-soft"
              : "bg-transparent text-content-secondary border-transparent hover:text-content-primary"
            }`}
        >
          <FaBookOpen className="h-4 w-4" />
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${activeTab === "documents"
              ? "bg-surface-strong text-content-primary border-subtle shadow-soft"
              : "bg-transparent text-content-secondary border-transparent hover:text-content-primary"
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

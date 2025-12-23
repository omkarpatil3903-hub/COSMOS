import React, { useState } from "react";
import { FaBookOpen, FaFileAlt } from "react-icons/fa";
import PageHeader from "../../components/PageHeader";
import ManagerKnowledgePage from "./ManagerKnowledgePage";
import ManagerDocumentsPage from "./ManagerDocumentsPage";

export default function ManagerKnowledgeManagement() {
  const [activeTab, setActiveTab] = useState("knowledge");

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Management">
        View, create and manage knowledge and documentation for your projects.
      </PageHeader>

      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("knowledge")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${activeTab === "knowledge"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white [.dark_&]:bg-[#1F2234] text-gray-800 [.dark_&]:text-gray-200 border-gray-200 [.dark_&]:border-white/10 hover:bg-gray-50 [.dark_&]:hover:bg-white/5"
            }`}
        >
          <FaBookOpen className="h-4 w-4" />
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${activeTab === "documents"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white [.dark_&]:bg-[#1F2234] text-gray-800 [.dark_&]:text-gray-200 border-gray-200 [.dark_&]:border-white/10 hover:bg-gray-50 [.dark_&]:hover:bg-white/5"
            }`}
        >
          <FaFileAlt className="h-4 w-4" />
          Documentation
        </button>
      </div>

      {activeTab === "knowledge" ? <ManagerKnowledgePage /> : <ManagerDocumentsPage />}
    </div>
  );
}


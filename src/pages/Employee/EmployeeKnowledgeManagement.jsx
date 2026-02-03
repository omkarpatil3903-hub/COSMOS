import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { FaBookOpen, FaFileAlt } from "react-icons/fa";
import PageHeader from "../../components/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import EmployeeKnowledgePage from "./EmployeeKnowledgePage";
import EmployeeDocumentsPage from "./EmployeeDocumentsPage";

export default function EmployeeKnowledgeManagement() {
  const location = useLocation();
  const defaultTab = location.state?.activeTab || "knowledge";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { accent, mode } = useTheme();

  const getIconColor = () => {
    const colorMap = {
      purple: mode === 'light' ? 'text-purple-500' : 'text-purple-400',
      blue: mode === 'light' ? 'text-sky-500' : 'text-sky-400',
      pink: mode === 'light' ? 'text-pink-500' : 'text-pink-400',
      violet: mode === 'light' ? 'text-violet-500' : 'text-violet-400',
      orange: mode === 'light' ? 'text-amber-500' : 'text-amber-400',
      teal: mode === 'light' ? 'text-teal-500' : 'text-teal-400',
      bronze: mode === 'light' ? 'text-amber-600' : 'text-amber-500',
      mint: mode === 'light' ? 'text-emerald-500' : 'text-emerald-400',
      black: mode === 'light' ? 'text-gray-600' : 'text-indigo-400',
      indigo: mode === 'light' ? 'text-indigo-500' : 'text-indigo-400',
    };
    return colorMap[accent] || colorMap.indigo;
  };

  const activeIconColor = getIconColor();

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Management">
        View and access knowledge and documentation shared with you.
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
          <FaBookOpen className={`h-4 w-4 ${activeTab === "knowledge" ? activeIconColor : ""}`} />
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
          <FaFileAlt className={`h-4 w-4 ${activeTab === "documents" ? activeIconColor : ""}`} />
          Documentation
        </button>
      </div>

      {activeTab === "knowledge" ? <EmployeeKnowledgePage /> : <EmployeeDocumentsPage />}
    </div>
  );
}

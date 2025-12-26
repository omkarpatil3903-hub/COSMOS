import React, { useState } from "react";
import { FaBookOpen, FaFileAlt } from "react-icons/fa";
import PageHeader from "../../components/PageHeader";
import EmployeeKnowledgePage from "./EmployeeKnowledgePage";
import EmployeeDocumentsPage from "./EmployeeDocumentsPage";
import { useTheme } from "../../context/ThemeContext";

export default function EmployeeKnowledgeManagement() {
  const [activeTab, setActiveTab] = useState("knowledge");
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
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${activeTab === "knowledge"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <FaBookOpen className={`h-4 w-4 ${activeTab === "knowledge" ? activeIconColor : ""}`} />
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border transition-colors ${activeTab === "documents"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
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

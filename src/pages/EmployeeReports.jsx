import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import { useAuthContext } from "../context/useAuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  FaChartBar,
  FaDownload,
  FaCheckCircle,
  FaClock,
  FaProjectDiagram,
  FaTasks,
  FaFileAlt,
  FaEnvelope,
  FaShareAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

export default function EmployeeReports() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    employeeName: "",
    reportDate: "",
    reportTime: "",
    reportContent: "",
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  // Utility function to format dates in dd/mm/yyyy format
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (!uid) return;

    // Fetch tasks assigned to employee
    const qTasks = query(
      collection(db, "tasks"),
      where("assigneeId", "==", uid)
    );
    const unsubT = onSnapshot(qTasks, (snap) => {
      const allTasks = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((task) => task.assigneeType === "user");
      setTasks(allTasks);
      setLoading(false);
    });
    // Fetch projects where employee has tasks
    const projectIds = new Set();
    const unsubTasksForProjects = onSnapshot(qTasks, (snap) => {
      snap.docs.forEach((doc) => {
        const projectId = doc.data().projectId;
        if (projectId) projectIds.add(projectId);
      });

      if (projectIds.size > 0) {
        const qProjects = query(
          collection(db, "projects"),
          where("__name__", "in", Array.from(projectIds))
        );
        const unsubP = onSnapshot(qProjects, (projectSnap) => {
          setProjects(projectSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubP();
      } else {
        setProjects([]);
      }
    });

    return () => {
      unsubT();
      unsubTasksForProjects();
    };
  }, [uid]);

  // Calculate statistics
  const totalProjects = projects.length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const pendingTasks = tasks.filter((t) => t.status === "To-Do").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;
  // 'In Review' is no longer a status

  const taskCompletionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Overdue tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "Done") return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    return dueDate < new Date();
  }).length;

  // Tasks by priority
  const highPriorityTasks = tasks.filter((t) => t.priority === "High").length;
  const mediumPriorityTasks = tasks.filter(
    (t) => t.priority === "Medium"
  ).length;
  const lowPriorityTasks = tasks.filter((t) => t.priority === "Low").length;

  // Today's tasks
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    const dueDateStr = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
    return dueDateStr === todayStr && t.status !== "Done";
  });

  // Recent activity (last 7 days completed tasks)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCompletedTasks = tasks
    .filter((t) => {
      if (t.status !== "Done" || !t.completedAt) return false;
      const completedDate =
        t.completedAt?.toDate?.() || new Date(t.completedAt);
      return completedDate >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
      return dateB - dateA;
    })
    .slice(0, 5);

  // Tasks completed TODAY
  const tasksCompletedToday = tasks.filter((t) => {
    if (t.status !== "Done" || !t.completedAt) return false;
    const completedDate = t.completedAt?.toDate?.() || new Date(t.completedAt);
    const completedDateStr = `${completedDate.getFullYear()}-${String(
      completedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(completedDate.getDate()).padStart(2, "0")}`;
    return completedDateStr === todayStr;
  });

  // Initialize report data when modal opens
  useEffect(() => {
    if (showReportModal) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");

      setReportData({
        employeeName: userData?.name || "Employee",
        reportDate: `${dd}/${mm}/${yyyy}`,
        reportTime: `${hh}:${min}`,
        reportContent: "",
      });
    }
  }, [showReportModal, userData]);

  // Generate Report handler
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Generate report content
  const generateReportContent = () => {
    setGeneratingReport(true);
    try {
      const content = `==========================================
       DAILY PERFORMANCE REPORT
==========================================

EMPLOYEE: ${reportData.employeeName}
DATE:     ${reportData.reportDate}
TIME:     ${reportData.reportTime}

------------------------------------------
             DAILY PROGRESS
------------------------------------------
${
  tasksCompletedToday.length > 0
    ? tasksCompletedToday.map((task) => `[x] ${task.title}`).join("\n")
    : "(No tasks completed today)"
}

------------------------------------------
        PENDING / IN PROGRESS
------------------------------------------
${
  todayTasks.length > 0
    ? todayTasks
        .map((task) => `[ ] ${task.title} (${task.priority}) - ${task.status}`)
        .join("\n")
    : "(No pending tasks for today)"
}

------------------------------------------
               SUMMARY
------------------------------------------
• Completed Today: ${tasksCompletedToday.length}
• Pending Today:   ${todayTasks.length}
• Total Pending:   ${pendingTasks}

==========================================
Generated on: ${formatDateToDDMMYYYY(
        new Date()
      )} at ${new Date().toLocaleTimeString()}
==========================================`;

      setReportData((prev) => ({ ...prev, reportContent: content }));
      toast.success("Daily report generated!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text("Daily Performance Report", 105, 20, { align: "center" });

    // Employee Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Employee: ${reportData.employeeName}`, 20, 40);
    doc.text(`Date: ${reportData.reportDate}`, 20, 48);
    doc.text(`Time: ${reportData.reportTime}`, 20, 56);

    // Daily Progress
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text("Daily Progress", 20, 70);
    doc.line(20, 72, 190, 72); // Horizontal line

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let yPos = 80;
    if (tasksCompletedToday.length > 0) {
      tasksCompletedToday.forEach((task) => {
        doc.text(`• ${task.title}`, 25, yPos);
        yPos += 8;
      });
    } else {
      doc.text("(No tasks completed today)", 25, yPos);
      yPos += 8;
    }

    // Pending / In Progress
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text("Pending / In Progress", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);

    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    if (todayTasks.length > 0) {
      todayTasks.forEach((task) => {
        const text = `• ${task.title} (${task.priority}) - ${task.status}`;
        doc.text(text, 25, yPos);
        yPos += 8;
      });
    } else {
      doc.text("(No pending tasks for today)", 25, yPos);
      yPos += 8;
    }

    // Summary
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text("Summary", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);

    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`• Completed Today: ${tasksCompletedToday.length}`, 25, yPos);
    doc.text(`• Pending Today: ${todayTasks.length}`, 25, yPos + 8);
    doc.text(`• Total Pending: ${pendingTasks}`, 25, yPos + 16);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on: ${formatDateToDDMMYYYY(
        new Date()
      )} at ${new Date().toLocaleTimeString()}`,
      105,
      280,
      { align: "center" }
    );

    doc.save(
      `Daily_Report_${reportData.reportDate.replace(/\//g, "-")}_${
        reportData.employeeName
      }.pdf`
    );
    toast.success("PDF downloaded successfully!");
  };

  // Handle Share
  const handleShare = async () => {
    if (!reportData.reportContent) return;

    const shareData = {
      title: `Daily Report - ${reportData.reportDate}`,
      text: reportData.reportContent,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Report shared successfully!");
      } else {
        await navigator.clipboard.writeText(reportData.reportContent);
        toast.success("Report copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      toast.error("Failed to share report");
    }
  };

  // Send via Email
  const sendViaEmail = () => {
    const subject = `Daily Report - ${reportData.reportDate} - ${reportData.employeeName}`;
    const body = encodeURIComponent(reportData.reportContent);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Save report (Text)
  const saveReport = () => {
    setSavingReport(true);
    try {
      const blob = new Blob([reportData.reportContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee-report-${reportData.reportDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Report saved and downloaded!");
      setShowReportModal(false);
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
    } finally {
      setSavingReport(false);
    }
  };

  // CSV export removed as per requirement. PDF/text/email/share options retained.

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reports & Analytics"
        description="Overview of your performance and task statistics"
        icon={<FaChartBar />}
      />

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleGenerateReport}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
        >
          <FaFileAlt />
          Generate Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Total Projects
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {totalProjects}
              </p>
            </div>
            <FaProjectDiagram className="text-blue-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Tasks</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {totalTasks}
              </p>
            </div>
            <FaTasks className="text-purple-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {completedTasks}
              </p>
            </div>
            <FaCheckCircle className="text-green-600 text-3xl" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {overdueTasks}
              </p>
            </div>
            <FaClock className="text-red-600 text-3xl" />
          </div>
        </Card>
      </div>

      {/* Completion Rate & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Task Completion Rate
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">
                  {taskCompletionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${taskCompletionRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">
                  {completedTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">Done</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">
                  {inProgressTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">In Progress</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xl font-bold text-yellow-600">
                  {pendingTasks}
                </p>
                <p className="text-xs text-gray-600 mt-1">To-Do</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks by Priority
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">High Priority</span>
                <span className="font-medium text-red-600">
                  {highPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? (highPriorityTasks / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Medium Priority</span>
                <span className="font-medium text-yellow-600">
                  {mediumPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? (mediumPriorityTasks / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Low Priority</span>
                <span className="font-medium text-green-600">
                  {lowPriorityTasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalTasks > 0 ? (lowPriorityTasks / totalTasks) * 100 : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Projects
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalProjects}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalProjects}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Tasks
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {completedTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inProgressTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pendingTasks}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  High Priority
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {highPriorityTasks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "Done"
                    ).length
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "In Progress"
                    ).length
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {
                    tasks.filter(
                      (t) => t.priority === "High" && t.status === "To-Do"
                    ).length
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaFileAlt className="h-5 w-5 text-indigo-600" />
                Generate Performance Report
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={reportData.employeeName}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      employeeName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Date
                </label>
                <input
                  type="date"
                  value={reportData.reportDate}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      reportDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Time
                </label>
                <input
                  type="time"
                  value={reportData.reportTime}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      reportTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Button
                onClick={generateReportContent}
                disabled={generatingReport}
                className="flex items-center gap-2"
              >
                {generatingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileAlt className="h-4 w-4" />
                    {reportData.reportContent
                      ? "Regenerate"
                      : "Generate Report"}
                  </>
                )}
              </Button>

              {reportData.reportContent && (
                <>
                  <Button
                    variant="secondary"
                    onClick={generatePDF}
                    className="flex items-center gap-2"
                  >
                    <FaDownload className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={saveReport}
                    disabled={savingReport}
                  >
                    {savingReport ? "Saving..." : "Save Text"}
                  </Button>
                  <Button
                    onClick={sendViaEmail}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FaEnvelope className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <FaShareAlt className="h-4 w-4" />
                    Share
                  </Button>
                </>
              )}
            </div>

            {/* Report Editor Area */}
            {reportData.reportContent && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Report Content (Editable)
                  </label>
                  <span className="text-xs text-gray-500">
                    You can edit this text before saving or sending
                  </span>
                </div>
                <textarea
                  value={reportData.reportContent}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      reportContent: e.target.value,
                    }))
                  }
                  className="w-full h-[400px] rounded-xl border border-gray-300 p-6 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-gray-50 shadow-inner resize-none"
                  placeholder="Report content will appear here..."
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

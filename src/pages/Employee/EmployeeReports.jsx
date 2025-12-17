import React, { useEffect, useState, useMemo } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import { useAuthContext } from "../../context/useAuthContext";
import { db } from "../../firebase";
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
import VoiceInput from "../../components/Common/VoiceInput";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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
    clientName: "",
    projectName: "",
    dailyHours: "",
    objective: "",
    obstacles: "",
    nextActionPlan: "",
    summary: "",
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

  const todayTasks = useMemo(() => tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
    const dueDateStr = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
    return dueDateStr === todayStr && t.status !== "Done";
  }), [tasks, todayStr]);

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

      // Pre-fill Next Action Plan with pending tasks for today
      const pendingTasksList = todayTasks
        .map((t) => `${t.title} (${t.priority})`)
        .join("\n");

      setReportData({
        employeeName: userData?.name || "Employee",
        reportDate: `${dd}/${mm}/${yyyy}`,
        reportTime: `${hh}:${min}`,
        clientName: "",
        projectName: projects.length > 0 ? projects[0].name : "",
        dailyHours: "8.0",
        objective: "",
        obstacles: "",
        nextActionPlan: pendingTasksList,
        summary: "",
        reportContent: "",
      });
    }
  }, [showReportModal, userData, projects, todayTasks]);

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
${tasksCompletedToday.length > 0
          ? tasksCompletedToday.map((task) => `[x] ${task.title}`).join("\n")
          : "(No tasks completed today)"
        }

------------------------------------------
        PENDING / IN PROGRESS
------------------------------------------
${todayTasks.length > 0
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

  // Generate PDF using html2canvas
  const generatePDF = async () => {
    const element = document.getElementById("report-preview");
    if (!element) {
      toast.error("Report preview not found");
      return;
    }

    try {
      setGeneratingReport(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Top margin

      pdf.addImage(
        imgData,
        "PNG",
        0, // Full width
        0,
        pdfWidth,
        (imgHeight * pdfWidth) / imgWidth
      );

      pdf.save(
        `Daily_Report_${reportData.reportDate.replace(/\//g, "-")}_${reportData.employeeName
        }.pdf`
      );
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingReport(false);
    }
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

      {/* Overview Stats - Updated Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Total Projects
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {totalProjects}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FaProjectDiagram className="text-blue-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Total Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
              <FaTasks className="text-purple-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Completed
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {completedTasks}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <FaCheckCircle className="text-green-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Completion Rate
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {taskCompletionRate.toFixed(0)}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FaChartBar className="text-indigo-500 text-xl" />
            </div>
          </div>
        </div>
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
                    width: `${totalTasks > 0
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
                    width: `${totalTasks > 0
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
                    width: `${totalTasks > 0 ? (lowPriorityTasks / totalTasks) * 100 : 0
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
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

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              {/* LEFT COLUMN: Inputs & Actions */}
              <div className="w-full lg:w-1/3 overflow-y-auto pr-2 flex flex-col gap-6">
                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name
                    </label>
                    <VoiceInput
                      value={reportData.clientName}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          clientName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name
                    </label>
                    <VoiceInput
                      value={reportData.projectName}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          projectName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Website Redesign"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Hours
                    </label>
                    <input
                      type="text"
                      value={reportData.dailyHours}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          dailyHours: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 8.0 Hrs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Objective for the Day
                    </label>
                    <VoiceInput
                      value={reportData.objective}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          objective: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Main goal for today"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Obstacles / Challenges (One per line)
                    </label>
                    <VoiceInput
                      as="textarea"
                      value={reportData.obstacles}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          obstacles: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                      placeholder="List any roadblocks..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Action Plan (One per line)
                    </label>
                    <VoiceInput
                      as="textarea"
                      value={reportData.nextActionPlan}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          nextActionPlan: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                      placeholder="What's next..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Summary
                    </label>
                    <VoiceInput
                      as="textarea"
                      value={reportData.summary}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                      placeholder="Brief summary of the day..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap border-t pt-4">
                  <Button
                    onClick={generateReportContent}
                    disabled={generatingReport}
                    className="flex items-center gap-2 w-full justify-center"
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
                          ? "Regenerate Text"
                          : "Generate Text Report"}
                      </>
                    )}
                  </Button>

                  {reportData.reportContent && (
                    <div className="flex gap-2 w-full flex-wrap">
                      <Button
                        variant="secondary"
                        onClick={generatePDF}
                        className="flex items-center gap-2 flex-1 justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                      >
                        <FaDownload className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={saveReport}
                        disabled={savingReport}
                        className="flex-1 justify-center"
                      >
                        {savingReport ? "Saving..." : "Save Text"}
                      </Button>
                      <Button
                        onClick={sendViaEmail}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white flex-1 justify-center"
                      >
                        <FaEnvelope className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white flex-1 justify-center"
                      >
                        <FaShareAlt className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  )}
                </div>

                {/* Report Editor Area (Text) */}
                {reportData.reportContent && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Report Content (Editable)
                      </label>
                    </div>
                    <textarea
                      value={reportData.reportContent}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          reportContent: e.target.value,
                        }))
                      }
                      className="w-full h-[200px] rounded-xl border border-gray-300 p-4 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-gray-50 shadow-inner resize-none"
                      placeholder="Report content will appear here..."
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Visual Preview */}
              <div className="w-full lg:w-2/3 bg-gray-100 rounded-xl border border-gray-200 overflow-y-auto p-4 flex justify-center">
                {/* VISUAL PREVIEW - MATCHING SCREENSHOT */}
                <div
                  id="report-preview"
                  className="bg-white p-8 shadow-lg text-black transform scale-90 origin-top"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
                  }}
                >
                  {/* Title */}
                  <h1
                    className="text-center text-2xl font-bold mb-6"
                    style={{
                      fontFamily:
                        '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                      fontStyle: "italic",
                    }}
                  >
                    Daily Progress Report
                  </h1>

                  <hr className="border-t-2 border-gray-300 mb-6" />

                  {/* Metadata Table */}
                  <table className="w-full border-collapse border border-black mb-6 text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">
                          Report No.
                        </td>
                        <td className="border border-black p-2 w-1/4">
                          MFI_DR_{new Date().getDate()}
                        </td>
                        <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">
                          Day & Date
                        </td>
                        <td className="border border-black p-2 w-1/4">
                          {reportData.reportDate}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-gray-100">
                          Client Name -
                        </td>
                        <td className="border border-black p-2" colSpan="3">
                          {reportData.clientName}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-gray-100">
                          Project Name -
                        </td>
                        <td className="border border-black p-2" colSpan="3">
                          {reportData.projectName}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-gray-100">
                          Consultant Name:
                        </td>
                        <td className="border border-black p-2" colSpan="3">
                          {reportData.employeeName}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-gray-100">
                          Daily Hours:
                        </td>
                        <td className="border border-black p-2" colSpan="3">
                          Hours Worked: {reportData.dailyHours}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Objective */}
                  <div className="mb-4">
                    <h3 className="font-bold mb-1 italic">
                      Objective for the Day:
                    </h3>
                    <p className="ml-4">{reportData.objective}</p>
                  </div>

                  {/* Key Activities */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-2 italic">
                      1. Key Activities Completed:
                    </h3>
                    <table className="w-full border-collapse border border-black text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-left w-1/2">
                            Task Detail
                          </th>
                          <th className="border border-black p-2 text-left w-1/4">
                            Task Status
                          </th>
                          <th className="border border-black p-2 text-left w-1/4">
                            Comments/Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasksCompletedToday.length > 0 ? (
                          tasksCompletedToday.map((task, index) => (
                            <tr key={task.id}>
                              <td className="border border-black p-2">
                                {index + 1}. {task.title}
                              </td>
                              <td className="border border-black p-2">
                                {task.status}
                              </td>
                              <td className="border border-black p-2">
                                {task.completionComment || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              className="border border-black p-2 text-center text-gray-500"
                              colSpan="3"
                            >
                              No tasks completed today
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Obstacles */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-2 italic">
                      Obstacles/Challenges Faced/ Roadblocks (if any)
                    </h3>
                    <table className="w-full border-collapse border border-black text-sm">
                      <tbody>
                        {reportData.obstacles
                          .split("\n")
                          .filter((line) => line.trim() !== "")
                          .map((line, index) => (
                            <tr key={index}>
                              <td className="border border-black p-2 w-10 text-center">
                                {index + 1}
                              </td>
                              <td className="border border-black p-2">
                                {line}
                              </td>
                            </tr>
                          ))}
                        {reportData.obstacles.trim() === "" && (
                          <tr>
                            <td className="border border-black p-2 w-10 text-center">
                              1
                            </td>
                            <td className="border border-black p-2"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Next Action Plan */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-2 italic">Next Action Plan</h3>
                    <table className="w-full border-collapse border border-black text-sm">
                      <tbody>
                        {reportData.nextActionPlan
                          .split("\n")
                          .filter((line) => line.trim() !== "")
                          .map((line, index) => (
                            <tr key={index}>
                              <td className="border border-black p-2 w-10 text-center">
                                {index + 1}
                              </td>
                              <td className="border border-black p-2">
                                {line}
                              </td>
                            </tr>
                          ))}
                        {reportData.nextActionPlan.trim() === "" && (
                          <tr>
                            <td className="border border-black p-2 w-10 text-center">
                              1
                            </td>
                            <td className="border border-black p-2"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-1 italic">Summary:</h3>
                    <p className="ml-4 border-b border-black min-h-[2rem]">
                      {reportData.summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

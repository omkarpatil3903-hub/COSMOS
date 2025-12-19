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
import { pdf } from "@react-pdf/renderer";
import { formatDateToDDMMYYYY } from "../../utils/dateUtils";
import {
  DailyReportPDF,
  WeeklyReportPDF,
  MonthlyReportPDF,
} from "../../components/reports/ReportPDFTemplates";

export default function EmployeeReports() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  // Company name - uses userData if available, fallback to default
  const companyName = userData?.companyName || "Your Company";
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("Daily"); // "Daily" or "Weekly"
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
    // Weekly Report Fields
    weekNumber: "",
    weekStartDate: "",
    weekEndDate: "",
    weeklyHours: "",
    keyAchievements: "",
    urgentActions: "",
    // Monthly Report Fields
    monthName: "",
    executiveSummary: "",
    learnings: "",
    consultantNote: "",
    nextMonthObjectives: "",
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);


  // Track project subscription for cleanup
  const projectUnsubRef = React.useRef(null);

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

      // Collect project IDs from tasks
      const projectIds = new Set();
      snap.docs.forEach((doc) => {
        const projectId = doc.data().projectId;
        if (projectId) projectIds.add(projectId);
      });

      // Cleanup previous project subscription if exists
      if (projectUnsubRef.current) {
        projectUnsubRef.current();
        projectUnsubRef.current = null;
      }

      // Subscribe to projects if there are any
      if (projectIds.size > 0) {
        const qProjects = query(
          collection(db, "projects"),
          where("__name__", "in", Array.from(projectIds))
        );
        projectUnsubRef.current = onSnapshot(qProjects, (projectSnap) => {
          setProjects(projectSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
      } else {
        setProjects([]);
      }
    });

    return () => {
      unsubT();
      // Cleanup project subscription on unmount
      if (projectUnsubRef.current) {
        projectUnsubRef.current();
      }
    };
  }, [uid]);

  // Fetch clients for dropdown
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubClients();
  }, []);

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

  const todayTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        const dueDate = t.dueDate?.toDate?.() || new Date(t.dueDate);
        const dueDateStr = `${dueDate.getFullYear()}-${String(
          dueDate.getMonth() + 1
        ).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
        return dueDateStr === todayStr && t.status !== "Done";
      }),
    [tasks, todayStr]
  );

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

  // Tasks completed THIS WEEK (Monday to current day)
  const tasksCompletedThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7;
    if (day !== 1) startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      if (t.status !== "Done" || !t.completedAt) return false;
      const completedDate = t.completedAt?.toDate?.() || new Date(t.completedAt);
      return completedDate >= startOfWeek;
    });
  }, [tasks]);

  // Tasks completed THIS MONTH
  const tasksCompletedThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return tasks.filter((t) => {
      if (t.status !== "Done" || !t.completedAt) return false;
      const completedDate = t.completedAt?.toDate?.() || new Date(t.completedAt);
      return completedDate >= startOfMonth;
    });
  }, [tasks]);

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

      // Calculate week number and dates
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7; // Get current day number, converting Sun (0) to 7
      if (day !== 1) startOfWeek.setHours(-24 * (day - 1)); // Set to Monday

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday

      const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return weekNo;
      };

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
        // Weekly Report Fields - Auto-fill with weekly completed tasks
        weekNumber: `Week ${getWeekNumber(now)}`,
        weekStartDate: formatDateToDDMMYYYY(startOfWeek),
        weekEndDate: formatDateToDDMMYYYY(endOfWeek),
        weeklyHours: "40.0",
        keyAchievements: tasksCompletedThisWeek
          .map((t) => `• ${t.title}`)
          .join("\n") || "",
        urgentActions: "",
        // Monthly Report Fields - Auto-fill with monthly stats
        monthName: now.toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
        executiveSummary: `Completed ${tasksCompletedThisMonth.length} tasks this month.`,
        learnings: "",
        consultantNote: "",
        nextMonthObjectives: "",
      });
    }
  }, [showReportModal, userData, projects, todayTasks, tasksCompletedThisWeek, tasksCompletedThisMonth]);

  // Generate Report handler
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Generate report content
  const generateReportContent = () => {
    setGeneratingReport(true);
    try {
      let content = "";

      if (reportType === "Daily") {
        content = `==========================================
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
      } else if (reportType === "Weekly") {
        // Weekly Report Content
        content = `==========================================
       WEEKLY PERFORMANCE REPORT
==========================================

EMPLOYEE:   ${reportData.employeeName}
WEEK:       ${reportData.weekNumber}
DATE RANGE: ${reportData.weekStartDate} - ${reportData.weekEndDate}

------------------------------------------
          KEY ACHIEVEMENTS
------------------------------------------
${reportData.keyAchievements || "(No key achievements listed)"}

------------------------------------------
          CHALLENGES
------------------------------------------
${reportData.obstacles || "(No challenges listed)"}

------------------------------------------
          URGENT ACTIONS
------------------------------------------
${reportData.urgentActions || "(No urgent actions listed)"}

------------------------------------------
          SUMMARY OF ACTIVITIES
------------------------------------------
${reportData.summary || "(No summary provided)"}

==========================================
Generated on: ${formatDateToDDMMYYYY(
          new Date()
        )} at ${new Date().toLocaleTimeString()}
==========================================`;
      } else {
        // Monthly Report Content
        content = `==========================================
       MONTHLY PERFORMANCE REPORT
==========================================

EMPLOYEE:   ${reportData.employeeName}
MONTH:      ${reportData.monthName}
DATE:       ${reportData.reportDate}

------------------------------------------
          EXECUTIVE SUMMARY
------------------------------------------
${reportData.executiveSummary || "(No executive summary provided)"}

------------------------------------------
          KEY ACTIVITIES
------------------------------------------
${reportData.objective || "(No key activities listed)"}

------------------------------------------
          ACHIEVEMENTS
------------------------------------------
${reportData.keyAchievements || "(No achievements listed)"}

------------------------------------------
          CHALLENGES & RISKS
------------------------------------------
${reportData.obstacles || "(No challenges listed)"}

------------------------------------------
          LEARNINGS
------------------------------------------
${reportData.learnings || "(No learnings listed)"}

------------------------------------------
          NEXT MONTH OBJECTIVES
------------------------------------------
${reportData.nextMonthObjectives || "(No objectives listed)"}

------------------------------------------
          CONSULTANT NOTE
------------------------------------------
${reportData.consultantNote || "(No notes provided)"}

==========================================
Generated on: ${formatDateToDDMMYYYY(
          new Date()
        )} at ${new Date().toLocaleTimeString()}
==========================================`;
      }

      setReportData((prev) => ({ ...prev, reportContent: content }));
      toast.success(`${reportType} report generated!`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Helper to generate PDF Blob using @react-pdf/renderer
  const getPDFBlob = async () => {
    try {
      let pdfDocument;

      if (reportType === "Daily") {
        pdfDocument = (
          <DailyReportPDF
            reportData={reportData}
            tasksCompletedToday={tasksCompletedToday}
            todayTasks={todayTasks}
            pendingTasks={pendingTasks}
          />
        );
      } else if (reportType === "Weekly") {
        pdfDocument = <WeeklyReportPDF reportData={reportData} />;
      } else {
        pdfDocument = (
          <MonthlyReportPDF reportData={reportData} companyName={companyName} />
        );
      }

      const blob = await pdf(pdfDocument).toBlob();
      return blob;
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      throw error;
    }
  };

  // Generate and download PDF
  const generatePDF = async () => {
    try {
      setGeneratingReport(true);
      const pdfBlob = await getPDFBlob();

      const filename =
        reportType === "Daily"
          ? `Daily_Report_${reportData.reportDate.replace(/\//g, "-")}_${reportData.employeeName}.pdf`
          : reportType === "Weekly"
            ? `Weekly_Report_${reportData.weekNumber.replace(/\s/g, "_")}_${reportData.employeeName}.pdf`
            : `Monthly_Report_${reportData.monthName.replace(/\s/g, "_")}_${reportData.employeeName}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Handle Share
  const handleShare = async () => {
    if (!reportData.reportContent) return;

    const title =
      reportType === "Daily"
        ? `Daily Report - ${reportData.reportDate}`
        : reportType === "Weekly"
          ? `Weekly Report - ${reportData.weekNumber}`
          : `Monthly Report - ${reportData.monthName}`;

    const filename =
      reportType === "Daily"
        ? `Daily_Report_${reportData.reportDate.replace(/\//g, "-")}_${reportData.employeeName
        }.pdf`
        : reportType === "Weekly"
          ? `Weekly_Report_${reportData.weekNumber.replace(/\s/g, "_")}_${reportData.employeeName
          }.pdf`
          : `Monthly_Report_${reportData.monthName.replace(/\s/g, "_")}_${reportData.employeeName
          }.pdf`;

    try {
      // Try sharing PDF file first
      if (navigator.canShare && navigator.share) {
        setGeneratingReport(true);
        try {
          const pdfBlob = await getPDFBlob();
          if (pdfBlob) {
            const file = new File([pdfBlob], filename, {
              type: "application/pdf",
            });
            const shareData = {
              files: [file],
              title: title,
              text: `Here is the ${reportType} report for ${reportData.employeeName}.`,
            };

            if (navigator.canShare(shareData)) {
              await navigator.share(shareData);
              toast.success("Report PDF shared successfully!");
              setGeneratingReport(false);
              return;
            }
          }
        } catch (pdfError) {
          console.error("Error creating PDF blob for sharing:", pdfError);
          // Continue to text fallback if PDF fails
        }
      }

      // Fallback to text sharing
      const shareData = {
        title: title,
        text: reportData.reportContent,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Report text shared successfully!");
      } else {
        await navigator.clipboard.writeText(reportData.reportContent);
        toast.success("Report text copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Don't show error if user cancelled share
      if (err.name !== "AbortError") {
        toast.error("Failed to share report");
      }
    } finally {
      setGeneratingReport(false);
    }
  };

  // Send via Email
  const sendViaEmail = () => {
    const subject =
      reportType === "Daily"
        ? `Daily Report - ${reportData.reportDate} - ${reportData.employeeName}`
        : reportType === "Weekly"
          ? `Weekly Report - ${reportData.weekNumber} - ${reportData.employeeName}`
          : `Monthly Report - ${reportData.monthName} - ${reportData.employeeName}`;
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
      const filename =
        reportType === "Daily"
          ? `employee-report-${reportData.reportDate.replace(/\//g, "-")}.txt`
          : reportType === "Weekly"
            ? `employee-report-${reportData.weekNumber.replace(/\s/g, "-")}.txt`
            : `employee-report-${reportData.monthName.replace(/\s/g, "-")}.txt`;
      a.download = filename;
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
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FaFileAlt className="h-5 w-5 text-indigo-600" />
                  Generate Performance Report
                </h3>
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setReportType("Daily")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${reportType === "Daily"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Daily Report
                  </button>
                  <button
                    onClick={() => setReportType("Weekly")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${reportType === "Weekly"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Weekly Report
                  </button>
                  <button
                    onClick={() => setReportType("Monthly")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${reportType === "Monthly"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Monthly Report
                  </button>
                </div>
              </div>
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
              <div className="w-full lg:w-1/3 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6">
                  {/* Form Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Name
                      </label>
                      <select
                        value={reportData.clientName}
                        onChange={(e) =>
                          setReportData((prev) => ({
                            ...prev,
                            clientName: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Select a client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.name || client.companyName}>
                            {client.name || client.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name
                      </label>
                      <select
                        value={reportData.projectName}
                        onChange={(e) =>
                          setReportData((prev) => ({
                            ...prev,
                            projectName: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.name}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {reportType === "Daily" ? (
                      <>
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
                      </>
                    ) : reportType === "Weekly" ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Week Number
                            </label>
                            <input
                              type="text"
                              value={reportData.weekNumber}
                              onChange={(e) =>
                                setReportData((prev) => ({
                                  ...prev,
                                  weekNumber: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="e.g. Week 42"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weekly Hours
                            </label>
                            <input
                              type="text"
                              value={reportData.weeklyHours}
                              onChange={(e) =>
                                setReportData((prev) => ({
                                  ...prev,
                                  weeklyHours: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="e.g. 40.0 Hrs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Date
                            </label>
                            <input
                              type="text"
                              value={reportData.weekStartDate}
                              onChange={(e) =>
                                setReportData((prev) => ({
                                  ...prev,
                                  weekStartDate: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              End Date
                            </label>
                            <input
                              type="text"
                              value={reportData.weekEndDate}
                              onChange={(e) =>
                                setReportData((prev) => ({
                                  ...prev,
                                  weekEndDate: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      // Monthly Report Inputs
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Month
                        </label>
                        <input
                          type="text"
                          value={reportData.monthName}
                          onChange={(e) =>
                            setReportData((prev) => ({
                              ...prev,
                              monthName: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          placeholder="e.g. July 2025"
                        />
                      </div>
                    )}

                    {reportType === "Monthly" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Executive Summary
                        </label>
                        <VoiceInput
                          as="textarea"
                          value={reportData.executiveSummary}
                          onChange={(e) =>
                            setReportData((prev) => ({
                              ...prev,
                              executiveSummary: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-24"
                          placeholder="Executive summary of the month..."
                        />
                      </div>
                    )}

                    {reportType === "Monthly" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Key Activities (One per line)
                        </label>
                        <p className="text-xs text-gray-500 mb-1">
                          Format: Area | Activity | Outcome
                        </p>
                        <VoiceInput
                          as="textarea"
                          value={reportData.objective}
                          onChange={(e) =>
                            setReportData((prev) => ({
                              ...prev,
                              objective: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-24"
                          placeholder="Marketing | Launched Campaign | 20% Growth"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {reportType === "Daily"
                          ? "Obstacles / Challenges"
                          : reportType === "Weekly"
                            ? "Challenges"
                            : "Challenges & Risks (One per line)"}
                      </label>
                      {reportType === "Monthly" && (
                        <p className="text-xs text-gray-500 mb-1">
                          Format: Risk | Cause | Impact | Plan
                        </p>
                      )}
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
                        placeholder={
                          reportType === "Monthly"
                            ? "Risk | Cause | Impact | Plan"
                            : "List any roadblocks..."
                        }
                      />
                    </div>

                    {reportType === "Daily" ? (
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
                    ) : reportType === "Weekly" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Key Achievements (One per line)
                          </label>
                          <VoiceInput
                            as="textarea"
                            value={reportData.keyAchievements}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                keyAchievements: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="List key achievements..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Urgent Action Items (One per line)
                          </label>
                          <VoiceInput
                            as="textarea"
                            value={reportData.urgentActions}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                urgentActions: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="Urgent items..."
                          />
                        </div>
                      </>
                    ) : (
                      // Monthly Report Extra Fields
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Achievements / Highlights (One per line)
                          </label>
                          <VoiceInput
                            as="textarea"
                            value={reportData.keyAchievements}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                keyAchievements: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="List highlights..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Learnings & Observations
                          </label>
                          <VoiceInput
                            as="textarea"
                            value={reportData.learnings}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                learnings: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="Key learnings..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Next Month's Objectives (One per line)
                          </label>
                          <p className="text-xs text-gray-500 mb-1">
                            Format: Objective | Key Result
                          </p>
                          <VoiceInput
                            as="textarea"
                            value={reportData.nextMonthObjectives}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                nextMonthObjectives: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="Objective | Key Result"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Consultant's Note / Recommendations
                          </label>
                          <VoiceInput
                            as="textarea"
                            value={reportData.consultantNote}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                consultantNote: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20"
                            placeholder="Notes..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 pt-4 border-t bg-white z-10">
                  <Button
                    onClick={generateReportContent}
                    disabled={generatingReport}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl shadow-sm transition-all"
                  >
                    {generatingReport ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FaFileAlt className="h-4 w-4" />
                    )}
                    Generate Report
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN: Visual Preview */}
              <div className="w-full lg:w-2/3 flex flex-col">
                {/* Preview Header with Action Buttons */}
                <div className="flex-shrink-0 flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Report Preview
                  </h3>
                  {reportData.reportContent && (
                    <div className="flex gap-3">
                      <button
                        onClick={generatePDF}
                        disabled={generatingReport}
                        type="button"
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-full shadow-sm transition-all text-sm font-medium"
                      >
                        {generatingReport ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FaDownload className="h-4 w-4" />
                        )}
                        Download PDF
                      </button>

                      <button
                        onClick={handleShare}
                        disabled={generatingReport}
                        type="button"
                        className="flex items-center justify-center gap-2 bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 px-6 py-2 rounded-full shadow-sm transition-all text-sm font-medium"
                      >
                        <FaShareAlt className="h-4 w-4" />
                        Share
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview Content */}
                <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 overflow-y-auto p-4 flex justify-center">
                  {/* VISUAL PREVIEW - MATCHING SCREENSHOT */}
                  <div
                    id="report-preview"
                    className="bg-white p-8 shadow-lg text-black transform scale-90 origin-top"
                    style={{
                      width: "210mm",
                      minHeight: "297mm",
                      fontFamily: '"Times New Roman", Times, serif',
                    }}
                  >
                    {reportType === "Daily" ? (
                      <>
                        {/* Title */}
                        <h1
                          className="text-center text-2xl font-bold mb-6"
                          style={{
                            fontFamily: '"Arial", sans-serif',
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
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.clientName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Project Name -
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.projectName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Consultant Name:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.employeeName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Daily Hours:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
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
                          <h3 className="font-bold mb-2 italic">
                            Next Action Plan
                          </h3>
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
                      </>
                    ) : reportType === "Weekly" ? (
                      <>
                        {/* Title */}
                        <h1
                          className="text-center text-2xl font-bold mb-6"
                          style={{
                            fontFamily: '"Arial", sans-serif',
                            fontStyle: "italic",
                          }}
                        >
                          Weekly Progress Report
                        </h1>

                        <hr className="border-t-2 border-gray-300 mb-6" />

                        {/* Metadata Table */}
                        <table className="w-full border-collapse border border-black mb-6 text-sm">
                          <tbody>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">
                                Week No.
                              </td>
                              <td className="border border-black p-2 w-1/4">
                                {reportData.weekNumber}
                              </td>
                              <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">
                                Date Range
                              </td>
                              <td className="border border-black p-2 w-1/4">
                                {reportData.weekStartDate} -{" "}
                                {reportData.weekEndDate}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Client Name -
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.clientName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Project Name -
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.projectName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Consultant Name:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.employeeName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Weekly Hours:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                Hours Worked: {reportData.weeklyHours}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Summary of Activities */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            1. Summary of Activities:
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
                              {tasks
                                .filter((t) => {
                                  if (!t.updatedAt) return false;
                                  const updated = t.updatedAt.toDate
                                    ? t.updatedAt.toDate()
                                    : new Date(t.updatedAt);
                                  const sevenDaysAgo = new Date();
                                  sevenDaysAgo.setDate(
                                    sevenDaysAgo.getDate() - 7
                                  );
                                  return updated >= sevenDaysAgo;
                                })
                                .slice(0, 10)
                                .map((task, index) => (
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
                                ))}
                              {tasks.filter((t) => {
                                if (!t.updatedAt) return false;
                                const updated = t.updatedAt.toDate
                                  ? t.updatedAt.toDate()
                                  : new Date(t.updatedAt);
                                const sevenDaysAgo = new Date();
                                sevenDaysAgo.setDate(
                                  sevenDaysAgo.getDate() - 7
                                );
                                return updated >= sevenDaysAgo;
                              }).length === 0 && (
                                  <tr>
                                    <td
                                      className="border border-black p-2 text-center text-gray-500"
                                      colSpan="3"
                                    >
                                      No activity recorded this week
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                          </table>
                        </div>

                        {/* Key Achievements */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            2. Key Achievements
                          </h3>
                          <table className="w-full border-collapse border border-black text-sm">
                            <tbody>
                              {reportData.keyAchievements
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
                              {reportData.keyAchievements.trim() === "" && (
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

                        {/* Challenges */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            3. Challenges
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

                        {/* Urgent Action Items */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            4. Urgent Action Items
                          </h3>
                          <table className="w-full border-collapse border border-black text-sm">
                            <tbody>
                              {reportData.urgentActions
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
                              {reportData.urgentActions.trim() === "" && (
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
                      </>
                    ) : (
                      // Monthly Report Preview
                      <>
                        {/* Title */}
                        <h1
                          className="text-center text-2xl font-bold mb-6"
                          style={{
                            fontFamily: '"Arial", sans-serif',
                            fontStyle: "italic",
                          }}
                        >
                          Monthly Report
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
                                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                                MR_{reportData.monthName.replace(/\s/g, "_")}
                              </td>
                              <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">
                                Date
                              </td>
                              <td className="border border-black p-2 w-1/4">
                                {reportData.reportDate}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Client Name -
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.clientName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Consultant Name:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.employeeName}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold bg-gray-100">
                                Month:
                              </td>
                              <td
                                className="border border-black p-2"
                                colSpan="3"
                              >
                                {reportData.monthName}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Executive Summary */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            Executive Summary
                          </h3>
                          <div className="border border-black p-4 min-h-[100px] text-sm whitespace-pre-wrap">
                            {reportData.executiveSummary}
                          </div>
                        </div>

                        {/* Key Activities Completed */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            2. Key Activities Completed
                          </h3>
                          <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-left w-1/4">
                                  Area / Department
                                </th>
                                <th className="border border-black p-2 text-left w-1/2">
                                  Activities Done
                                </th>
                                <th className="border border-black p-2 text-left w-1/4">
                                  Outcome / Impact
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.objective
                                .split("\n")
                                .filter((line) => line.trim() !== "")
                                .map((line, index) => {
                                  const parts = line.split("|");
                                  return (
                                    <tr key={index}>
                                      <td className="border border-black p-2">
                                        {parts[0]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[1]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[2]?.trim() || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {reportData.objective.trim() === "" && (
                                <tr>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Achievements */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            3. Achievements / Highlights of the Month
                          </h3>
                          <div className="border border-black p-4 min-h-[80px] text-sm whitespace-pre-wrap">
                            {reportData.keyAchievements}
                          </div>
                        </div>

                        {/* Challenges & Risks */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            4. Challenges & Risks Identified
                          </h3>
                          <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-left w-1/4">
                                  Challenge / Risk
                                </th>
                                <th className="border border-black p-2 text-left w-1/4">
                                  Cause
                                </th>
                                <th className="border border-black p-2 text-left w-1/4">
                                  Impact
                                </th>
                                <th className="border border-black p-2 text-left w-1/4">
                                  Action Taken / Plan
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.obstacles
                                .split("\n")
                                .filter((line) => line.trim() !== "")
                                .map((line, index) => {
                                  const parts = line.split("|");
                                  return (
                                    <tr key={index}>
                                      <td className="border border-black p-2">
                                        {parts[0]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[1]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[2]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[3]?.trim() || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {reportData.obstacles.trim() === "" && (
                                <tr>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Learnings */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            5. Learnings & Observations
                          </h3>
                          <div className="border-b border-black min-h-[60px] text-sm whitespace-pre-wrap">
                            {reportData.learnings}
                          </div>
                        </div>

                        {/* Next Month Objectives */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            6. Next Month's Objective & Key Results
                          </h3>
                          <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-left w-1/2">
                                  Objectives
                                </th>
                                <th className="border border-black p-2 text-left w-1/2">
                                  Key Results
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.nextMonthObjectives
                                .split("\n")
                                .filter((line) => line.trim() !== "")
                                .map((line, index) => {
                                  const parts = line.split("|");
                                  return (
                                    <tr key={index}>
                                      <td className="border border-black p-2">
                                        {parts[0]?.trim() || "-"}
                                      </td>
                                      <td className="border border-black p-2">
                                        {parts[1]?.trim() || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {reportData.nextMonthObjectives.trim() === "" && (
                                <tr>
                                  <td className="border border-black p-2 h-8"></td>
                                  <td className="border border-black p-2 h-8"></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Consultant Note */}
                        <div className="mb-6">
                          <h3 className="font-bold mb-2 italic">
                            Consultant's Note / Recommendations
                          </h3>
                          <div className="border border-black p-4 min-h-[60px] text-sm whitespace-pre-wrap">
                            {reportData.consultantNote}
                          </div>
                        </div>

                        {/* Signature */}
                        <div className="mt-12 flex justify-end">
                          <div className="text-sm">
                            <span className="font-bold">
                              Consultant Signature:
                            </span>{" "}
                            <span className="italic border-b border-black px-4">
                              {reportData.employeeName}, {companyName}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
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

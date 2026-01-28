// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { withErrorBoundary } from "./components/RouteWithErrorBoundary";
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForceChangePasswordPage from "./pages/ForceChangePasswordPage";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import ClientLayout from "./components/layout/ClientLayout";
import EmployeeLayout from "./components/layout/EmployeeLayout";

import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";

import DashboardPage from "./pages/SuperAdmin/DashboardPage.jsx";
import ReportsPage from "./pages/SuperAdmin/ReportsPage.jsx";
import Documents from "./pages/SuperAdmin/Documents";
import SuperAdminKnowledgeManagement from "./pages/SuperAdmin/SuperAdminKnowledgeManagement.jsx";
import ManageDocument from "./pages/SuperAdmin/ManageDocument.jsx";
import ManageResources from "./pages/SuperAdmin/ManageResources.jsx";
import ManageClients from "./pages/SuperAdmin/ManageClients.jsx";
import ManageProjects from "./pages/SuperAdmin/ManageProjects.jsx";
// import Mom from "./pages/SuperAdmin/Mom.jsx"; // TODO: Verify correct filename
import MomGeneratorPro from "./pages/SuperAdmin/MomGeneratorPro.jsx";
import Mom from "./pages/Mom";
import TaskManagment from "./pages/SuperAdmin/TaskManagment.jsx";
import LeadManagement from "./pages/SuperAdmin/LeadManagement.jsx";
import Calendar from "./pages/SuperAdmin/Calendar.jsx";
import Settings from "./pages/SuperAdmin/Settings.jsx";
import AddHierarchy from "./pages/SuperAdmin/AddHierarchy.jsx";
import ProjectSettings from "./pages/SuperAdmin/ProjectSettings.jsx"; // TODO: Verify path
import StatusSettings from "./pages/SuperAdmin/StatusSettings.jsx"; // TODO: Verify path
import ManagerLayout from "./components/layout/ManagerLayout";
import KnowledgeProjectDetail from "./pages/SuperAdmin/KnowledgeProjectDetail.jsx";
import KnowledgeDetailView from "./pages/SuperAdmin/KnowledgeDetailView.jsx";
import DocumentViewer from "./pages/SuperAdmin/DocumentViewer.jsx";
import ManagerKnowledgeManagement from "./pages/Manager/ManagerKnowledgeManagement.jsx";
import ManagerExpenses from "./pages/Manager/ManagerExpenses.jsx";
import ManagerDashboard from "./pages/Manager/ManagerDashboard.jsx";
import ExpenseManagement from "./pages/SuperAdmin/ExpenseManagement.jsx";


import ClientDashboard from "./pages/Client/ClientDashboard.jsx";
import ClientProjects from "./pages/Client/ClientProjects.jsx";
import ClientTasks from "./pages/Client/ClientTasks.jsx";
import ClientCalendar from "./pages/Client/ClientCalendar.jsx";
import ClientReports from "./pages/Client/ClientReports.jsx";
import ClientDocuments from "./pages/Client/ClientDocuments";
import ClientManageDocument from "./pages/Client/ClientManageDocument";

import EmployeeDashboard from "./pages/Employee/EmployeeDashboard.jsx";
import EmployeeTasks from "./pages/Employee/EmployeeTasks.jsx";
import EmployeeProjects from "./pages/Employee/EmployeeProjects.jsx";
import EmployeeCalendar from "./pages/Employee/EmployeeCalendar.jsx";
import EmployeeReports from "./pages/Employee/EmployeeReports.jsx";
import EmployeeDocuments from "./pages/Employee/EmployeeDocuments.jsx";
import EmployeeManageDocument from "./pages/Employee/EmployeeManageDocument.jsx";
import EmployeeExpenses from "./pages/Employee/EmployeeExpenses.jsx";
import EmployeeKnowledgeManagement from "./pages/Employee/EmployeeKnowledgeManagement.jsx";

import AdminDashboardPage from "./pages/Admin/AdminDashboardPage.jsx";
import AdminReportsPage from "./pages/Admin/AdminReportsPage.jsx";
import AdminExpenseManagement from "./pages/Admin/AdminExpenseManagement.jsx";
import AdminAddHierarchy from "./pages/Admin/AdminAddHierarchy.jsx";
import AdminProjectSettings from "./pages/Admin/AdminProjectSettings.jsx";
import AdminStatusSettings from "./pages/Admin/AdminStatusSettings.jsx";
import AdminManageProjects from "./pages/Admin/AdminManageProjects.jsx";
import AdminManageDocument from "./pages/Admin/AdminManageDocument.jsx";
import AdminTaskManagment from "./pages/Admin/AdminTaskManagment.jsx";
import AdminLeadManagement from "./pages/Admin/AdminLeadManagement.jsx";
import AdminCalendar from "./pages/Admin/AdminCalendar.jsx";
import AdminMomGeneratorPro from "./pages/Admin/AdminMomGeneratorPro.jsx";
import AdminDocuments from "./pages/Admin/AdminDocuments.jsx";
import AdminKnowledgeManagement from "./pages/Admin/AdminKnowledgeManagement.jsx";
import AdminManageClients from "./pages/Admin/AdminManageClients.jsx";
import AdminManageResources from "./pages/Admin/AdminManageResources.jsx";
import AdminSettings from "./pages/Admin/AdminSettings.jsx";
import AdminKnowledgeProjectDetail from "./pages/Admin/AdminKnowledgeProjectDetail.jsx";
import PortalSettings from "./pages/Shared/PortalSettings";
import PortalThemeSettings from "./pages/Shared/PortalThemeSettings";
import PortalProfileSettings from "./pages/Shared/PortalProfileSettings";

const router = createBrowserRouter([
  { path: "/login", element: withErrorBoundary(<LoginPage />) },
  { path: "/forgot-password", element: withErrorBoundary(<ForgotPasswordPage />) },
  { path: "/reset-password", element: withErrorBoundary(<ResetPasswordPage />) },
  { path: "/force-change-password", element: withErrorBoundary(<ForceChangePasswordPage />) },
  { path: "/unauthorized", element: withErrorBoundary(<Unauthorized />) },

  // Client Portal Routes
  {
    path: "/client",
    element: (
      <ProtectedRoute allowedRoles={["client"]}>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/client", element: withErrorBoundary(<ClientDashboard />) },
      { path: "/client/projects", element: withErrorBoundary(<ClientProjects />) },
      { path: "/client/tasks", element: withErrorBoundary(<ClientTasks />) },
      { path: "/client/calendar", element: withErrorBoundary(<ClientCalendar />) },
      { path: "/client/reports", element: withErrorBoundary(<ClientReports />) },
      { path: "/client/documents", element: withErrorBoundary(<ClientDocuments />) },
      { path: "/client/manage-documents", element: withErrorBoundary(<ClientManageDocument />) },
      {
        path: "/client/settings",
        element: withErrorBoundary(<PortalSettings />),
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: withErrorBoundary(<PortalThemeSettings />) },
          { path: "profile", element: withErrorBoundary(<PortalProfileSettings />) },
        ],
      },
    ],
  },

  // Employee Portal Routes (using "member" role)
  {
    path: "/employee",
    element: (
      <ProtectedRoute allowedRoles={["member", "resource"]}>
        <EmployeeLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/employee", element: withErrorBoundary(<EmployeeDashboard />) },
      { path: "/employee/tasks", element: withErrorBoundary(<EmployeeTasks />) },
      { path: "/employee/projects", element: withErrorBoundary(<EmployeeProjects />) },
      { path: "/employee/calendar", element: withErrorBoundary(<EmployeeCalendar />) },
      { path: "/employee/reports", element: withErrorBoundary(<EmployeeReports />) },
      { path: "/employee/documents", element: withErrorBoundary(<EmployeeDocuments />) },
      { path: "/employee/knowledge-management", element: withErrorBoundary(<EmployeeKnowledgeManagement />) },
      { path: "/employee/knowledge-management/:projectName", element: withErrorBoundary(<KnowledgeProjectDetail />) },
      { path: "/employee/knowledge/:id", element: withErrorBoundary(<KnowledgeDetailView />) },
      {
        path: "/employee/manage-documents",
        element: withErrorBoundary(<EmployeeManageDocument />),
      },
      { path: "/employee/expenses", element: withErrorBoundary(<EmployeeExpenses />) },
      {
        path: "/employee/settings",
        element: withErrorBoundary(<PortalSettings />),
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: withErrorBoundary(<PortalThemeSettings />) },
          { path: "profile", element: withErrorBoundary(<PortalProfileSettings />) },
        ],
      },
    ],
  },


  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/admin", element: withErrorBoundary(<AdminDashboardPage />) },
      { path: "/admin/manage-resources", element: withErrorBoundary(<AdminManageResources />) },
      { path: "/admin/manage-clients", element: withErrorBoundary(<AdminManageClients />) },
      { path: "/admin/manage-projects", element: withErrorBoundary(<AdminManageProjects />) },
      { path: "/admin/knowledge-management", element: withErrorBoundary(<AdminKnowledgeManagement />) },
      { path: "/admin/knowledge-management/:projectName", element: withErrorBoundary(<AdminKnowledgeProjectDetail />) },
      { path: "/admin/knowledge/:id", element: withErrorBoundary(<KnowledgeDetailView />) },
      { path: "/admin/manage-knowledge", element: withErrorBoundary(<AdminManageDocument />) },
      { path: "/admin/mom-pro", element: withErrorBoundary(<AdminMomGeneratorPro />) },
      { path: "/admin/task-management", element: withErrorBoundary(<AdminTaskManagment />) },
      { path: "/admin/lead-management", element: withErrorBoundary(<AdminLeadManagement />) },
      { path: "/admin/reports", element: withErrorBoundary(<AdminReportsPage />) },
      { path: "/admin/expenses", element: withErrorBoundary(<AdminExpenseManagement />) },
      { path: "/admin/calendar", element: withErrorBoundary(<AdminCalendar />) },
      {
        path: "/admin/settings",
        element: withErrorBoundary(<AdminSettings />),
        children: [
          { index: true, element: <Navigate to="add-hierarchy" replace /> },
          { path: "add-hierarchy", element: withErrorBoundary(<AdminAddHierarchy />) },
          { path: "project-settings", element: withErrorBoundary(<AdminProjectSettings />) },
          { path: "status-settings", element: withErrorBoundary(<AdminStatusSettings />) },
          { path: "theme", element: withErrorBoundary(<PortalThemeSettings />) },
          { path: "profile", element: withErrorBoundary(<PortalProfileSettings />) },
        ],
      },
    ],
  },
  // Project Manager Portal Routes (using "admin" role)
  {
    path: "/manager",
    element: (
      <ProtectedRoute allowedRoles={["manager"]}>
        <ManagerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/manager", element: withErrorBoundary(<ManagerDashboard />) },
      { path: "/manager/projects", element: withErrorBoundary(<ManageProjects onlyMyManaged={true} />) },
      { path: "/manager/tasks", element: withErrorBoundary(<TaskManagment onlyMyManagedProjects={true} />) },
      { path: "/manager/reports", element: withErrorBoundary(<ReportsPage onlyMyManagedProjects={true} />) },
      { path: "/manager/calendar", element: withErrorBoundary(<Calendar onlyMyManagedProjects={true} />) },
      { path: "/manager/knowledge-management", element: withErrorBoundary(<ManagerKnowledgeManagement />) },
      { path: "/manager/knowledge-management/:projectName", element: withErrorBoundary(<KnowledgeProjectDetail />) },
      { path: "/manager/knowledge/:id", element: withErrorBoundary(<KnowledgeDetailView />) },
      { path: "/manager/expenses", element: withErrorBoundary(<ManagerExpenses />) },
      {
        path: "/manager/settings",
        element: withErrorBoundary(<PortalSettings />),
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: withErrorBoundary(<PortalThemeSettings />) },
          { path: "profile", element: withErrorBoundary(<PortalProfileSettings />) },
        ],
      },
    ],
  },

  // Super Admin Portal Routes (using "superadmin" role)
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={["superadmin"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: withErrorBoundary(<DashboardPage />) },
      { path: "/manage-resources", element: withErrorBoundary(<ManageResources />) },
      { path: "/manage-clients", element: withErrorBoundary(<ManageClients />) },
      { path: "/manage-projects", element: withErrorBoundary(<ManageProjects />) },
      { path: "/knowledge-management", element: withErrorBoundary(<SuperAdminKnowledgeManagement />) },
      { path: "/knowledge/:id", element: withErrorBoundary(<KnowledgeDetailView />) },
      { path: "/document-viewer", element: withErrorBoundary(<DocumentViewer />) },
      { path: "/knowledge-management/:projectName", element: withErrorBoundary(<KnowledgeProjectDetail />) },
      { path: "/manage-knowledge", element: withErrorBoundary(<ManageDocument />) },
      { path: "/mom", element: withErrorBoundary(<Mom />) },
      { path: "/mom-pro", element: withErrorBoundary(<MomGeneratorPro />) },
      { path: "/task-management", element: withErrorBoundary(<TaskManagment />) },
      { path: "/lead-management", element: withErrorBoundary(<LeadManagement />) },
      { path: "/reports", element: withErrorBoundary(<ReportsPage />) },
      { path: "/expenses", element: withErrorBoundary(<ExpenseManagement />) },
      { path: "/calendar", element: withErrorBoundary(<Calendar />) },
      {
        path: "/settings",
        element: withErrorBoundary(<Settings />),
        children: [
          { index: true, element: <Navigate to="add-hierarchy" replace /> },
          { path: "add-hierarchy", element: withErrorBoundary(<AddHierarchy />) },
          { path: "project-settings", element: withErrorBoundary(<ProjectSettings />) },
          { path: "status-settings", element: withErrorBoundary(<StatusSettings />) },
          { path: "theme", element: withErrorBoundary(<PortalThemeSettings />) },
          { path: "profile", element: withErrorBoundary(<PortalProfileSettings />) },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

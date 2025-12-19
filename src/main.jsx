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
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
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
import Calendar from "./pages/SuperAdmin/Calendar.jsx";
import Settings from "./pages/SuperAdmin/Settings.jsx";
import AddHierarchy from "./pages/SuperAdmin/AddHierarchy.jsx";
import ProjectSettings from "./pages/SuperAdmin/ProjectSettings.jsx"; // TODO: Verify path
import StatusSettings from "./pages/SuperAdmin/StatusSettings.jsx"; // TODO: Verify path
import ManagerLayout from "./components/layout/ManagerLayout";
import KnowledgeProjectDetail from "./pages/SuperAdmin/KnowledgeProjectDetail.jsx";
import ManagerKnowledgeManagement from "./pages/Manager/ManagerKnowledgeManagement.jsx";
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
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <Unauthorized /> },

  // Client Portal Routes
  {
    path: "/client",
    element: (
      <ProtectedRoute allowedRoles={["client"]}>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/client", element: <ClientDashboard /> },
      { path: "/client/projects", element: <ClientProjects /> },
      { path: "/client/tasks", element: <ClientTasks /> },
      { path: "/client/calendar", element: <ClientCalendar /> },
      { path: "/client/reports", element: <ClientReports /> },
      { path: "/client/documents", element: <ClientDocuments /> },
      { path: "/client/manage-documents", element: <ClientManageDocument /> },
      {
        path: "/client/settings",
        element: <PortalSettings />,
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: <PortalThemeSettings /> },
          { path: "profile", element: <PortalProfileSettings /> },
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
      { path: "/employee", element: <EmployeeDashboard /> },
      { path: "/employee/tasks", element: <EmployeeTasks /> },
      { path: "/employee/projects", element: <EmployeeProjects /> },
      { path: "/employee/calendar", element: <EmployeeCalendar /> },
      { path: "/employee/reports", element: <EmployeeReports /> },
      { path: "/employee/documents", element: <EmployeeDocuments /> },
      { path: "/employee/knowledge-management", element: <EmployeeKnowledgeManagement /> },
      { path: "/employee/knowledge-management/:projectName", element: <KnowledgeProjectDetail /> },
      {
        path: "/employee/manage-documents",
        element: <EmployeeManageDocument />,
      },
      { path: "/employee/expenses", element: <EmployeeExpenses /> },
      {
        path: "/employee/settings",
        element: <PortalSettings />,
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: <PortalThemeSettings /> },
          { path: "profile", element: <PortalProfileSettings /> },
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
    { path: "/admin", element: <AdminDashboardPage /> },
    { path: "/admin/manage-resources", element: <AdminManageResources /> },
    { path: "/admin/manage-clients", element: <AdminManageClients /> },
    { path: "/admin/manage-projects", element: <AdminManageProjects /> },
    { path: "/admin/knowledge-management", element: <AdminKnowledgeManagement /> },
    { path: "/admin/knowledge-management/:projectName", element: <AdminKnowledgeProjectDetail /> },
    { path: "/admin/manage-knowledge", element: <AdminManageDocument /> },
    { path: "/admin/mom-pro", element: <AdminMomGeneratorPro /> },
    { path: "/admin/task-management", element: <AdminTaskManagment /> },
    { path: "/admin/reports", element: <AdminReportsPage /> },
    { path: "/admin/expenses", element: <AdminExpenseManagement /> },
    { path: "/admin/calendar", element: <AdminCalendar /> },
    {
      path: "/admin/settings",
      element: <AdminSettings />,
      children: [
        { index: true, element: <Navigate to="add-hierarchy" replace /> },
        { path: "add-hierarchy", element: <AdminAddHierarchy /> },
        { path: "project-settings", element: <AdminProjectSettings /> },
        { path: "status-settings", element: <AdminStatusSettings /> },
        { path: "theme", element: <PortalThemeSettings /> },
        { path: "profile", element: <PortalProfileSettings /> },
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
      { path: "/manager", element: <DashboardPage /> },
      { path: "/manager/projects", element: <ManageProjects onlyMyManaged={true} /> },
      { path: "/manager/tasks", element: <TaskManagment /> },
      { path: "/manager/reports", element: <ReportsPage /> },
      { path: "/manager/calendar", element: <Calendar /> },
      { path: "/manager/knowledge-management", element: <ManagerKnowledgeManagement /> },
      { path: "/manager/knowledge-management/:projectName", element: <KnowledgeProjectDetail /> },
      {
        path: "/manager/settings",
        element: <PortalSettings />,
        children: [
          { index: true, element: <Navigate to="theme" replace /> },
          { path: "theme", element: <PortalThemeSettings /> },
          { path: "profile", element: <PortalProfileSettings /> },
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
      { path: "/", element: <DashboardPage /> },
      { path: "/manage-resources", element: <ManageResources /> },
      { path: "/manage-clients", element: <ManageClients /> },
      { path: "/manage-projects", element: <ManageProjects /> },
      { path: "/knowledge-management", element: <SuperAdminKnowledgeManagement /> },
      { path: "/knowledge-management/:projectName", element: <KnowledgeProjectDetail /> },
      { path: "/manage-knowledge", element: <ManageDocument /> },
      { path: "/mom", element: <Mom /> },
      { path: "/mom-pro", element: <MomGeneratorPro /> },
      { path: "/task-management", element: <TaskManagment /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/expenses", element: <ExpenseManagement /> },
      { path: "/calendar", element: <Calendar /> },
      {
        path: "/settings",
        element: <Settings />,
        children: [
          { index: true, element: <Navigate to="add-hierarchy" replace /> },
          { path: "add-hierarchy", element: <AddHierarchy /> },
          { path: "project-settings", element: <ProjectSettings /> },
          { path: "status-settings", element: <StatusSettings /> },
          { path: "theme", element: <PortalThemeSettings /> },
          { path: "profile", element: <PortalProfileSettings /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);

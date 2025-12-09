// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/SuperAdmin/DashboardPage.jsx";
import ReportsPage from "./pages/SuperAdmin/ReportsPage.jsx";
import ClientLayout from "./components/layout/ClientLayout";
import ClientDashboard from "./pages/Client/ClientDashboard.jsx";
import ClientProjects from "./pages/Client/ClientProjects.jsx";
import ClientTasks from "./pages/Client/ClientTasks.jsx";
import ClientCalendar from "./pages/Client/ClientCalendar.jsx";
import ClientReports from "./pages/Client/ClientReports.jsx";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import EmployeeDashboard from "./pages/Employee/EmployeeDashboard.jsx";
import EmployeeTasks from "./pages/Employee/EmployeeTasks.jsx";
import EmployeeProjects from "./pages/Employee/EmployeeProjects.jsx";
import EmployeeCalendar from "./pages/Employee/EmployeeCalendar.jsx";
import EmployeeReports from "./pages/Employee/EmployeeReports.jsx";
import Documents from "./pages/SuperAdmin/Documents.jsx";
import EmployeeDocuments from "./pages/Employee/EmployeeDocuments.jsx";
import ClientDocuments from "./pages/Client/ClientDocuments.jsx";
import ManageDocument from "./pages/SuperAdmin/ManageDocument.jsx";
import ClientManageDocument from "./pages/Client/ClientManageDocument.jsx";
import EmployeeManageDocument from "./pages/Employee/EmployeeManageDocument.jsx";
import Unauthorized from "./pages/Unauthorized";

import ManageResources from "./pages/SuperAdmin/ManageResources.jsx";
import ManageClients from "./pages/SuperAdmin/ManageClients.jsx";
import ManageProjects from "./pages/SuperAdmin/ManageProjects.jsx";
// import Mom from "./pages/SuperAdmin/Mom.jsx"; // TODO: Verify correct filename
import MomGeneratorPro from "./pages/SuperAdmin/MomGeneratorPro.jsx";
import Mom from "./pages/Mom";
import TaskManagment from "./pages/SuperAdmin/TaskManagment.jsx";
import Calendar from "./pages/SuperAdmin/Calendar.jsx";
import EmployeeExpenses from "./pages/Employee/EmployeeExpenses.jsx";

import ExpenseManagement from "./pages/SuperAdmin/ExpenseManagement.jsx";

import Settings from "./pages/SuperAdmin/Settings.jsx";
import AddHierarchy from "./pages/SuperAdmin/AddHierarchy.jsx";
import ProjectSettings from "./pages/SuperAdmin/ProjectSettings.jsx"; // TODO: Verify path
import ManagerLayout from "./components/layout/ManagerLayout";
import KnowledgeProjectDetail from "./pages/SuperAdmin/KnowledgeProjectDetail.jsx";

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
      { path: "/employee/knowledge-management", element: <Documents onlyMyAssigned={true} /> },
      { path: "/employee/knowledge-management/:projectName", element: <KnowledgeProjectDetail /> },
      {
        path: "/employee/manage-documents",
        element: <EmployeeManageDocument />,
      },
      { path: "/employee/expenses", element: <EmployeeExpenses /> },
    ],
  },

  // Project Manager Portal Routes (using "admin" role)
  {
    path: "/manager",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <ManagerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/manager", element: <DashboardPage /> },
      { path: "/manager/projects", element: <ManageProjects onlyMyManaged={true} /> },
      { path: "/manager/tasks", element: <TaskManagment /> },
      { path: "/manager/reports", element: <ReportsPage /> },
      { path: "/manager/calendar", element: <Calendar /> },
      { path: "/manager/knowledge-management", element: <Documents onlyMyManaged={true} /> },
      { path: "/manager/knowledge-management/:projectName", element: <KnowledgeProjectDetail /> },
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
      { path: "/knowledge-management", element: <Documents /> },
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
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);

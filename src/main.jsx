// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import ClientLayout from "./components/layout/ClientLayout";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import ClientProjects from "./pages/ClientProjects.jsx";
import ClientTasks from "./pages/ClientTasks.jsx";
import ClientCalendar from "./pages/ClientCalendar.jsx";
import ClientReports from "./pages/ClientReports.jsx";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import EmployeeTasks from "./pages/EmployeeTasks.jsx";
import EmployeeProjects from "./pages/EmployeeProjects.jsx";
import EmployeeCalendar from "./pages/EmployeeCalendar.jsx";
import EmployeeReports from "./pages/EmployeeReports.jsx";
import EmployeeExpenses from "./pages/EmployeeExpenses.jsx";
import Unauthorized from "./pages/Unauthorized";

import ManageResources from "./pages/ManageResources.jsx";
import ManageClients from "./pages/ManageClients.jsx";
import ManageProjects from "./pages/ManageProjects.jsx";
import Mom from "./pages/Mom.jsx";
import MomNew from "./pages/MomNew.jsx";
import MomGeneratorPro from "./pages/MomGeneratorPro.jsx";
import TaskManagment from "./pages/TaskManagment.jsx";
import Calendar from "./pages/Calendar.jsx";

import ExpenseManagement from "./pages/ExpenseManagement.jsx";

import Settings from "./pages/Settings.jsx";
import AddHierarchy from "./pages/AddHierarchy.jsx";
import ProjectSettings from "./pages/ProjectSettings.jsx";

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
    ],
  },

  // Employee Portal Routes (using "resource" role)
  {
    path: "/employee",
    element: (
      <ProtectedRoute allowedRoles={["resource"]}>
        <EmployeeLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/employee", element: <EmployeeDashboard /> },
      { path: "/employee/tasks", element: <EmployeeTasks /> },
      { path: "/employee/projects", element: <EmployeeProjects /> },
      { path: "/employee/calendar", element: <EmployeeCalendar /> },
      { path: "/employee/reports", element: <EmployeeReports /> },
      { path: "/employee/expenses", element: <EmployeeExpenses /> },
    ],
  },

  // Admin Portal Routes
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/manage-resources", element: <ManageResources /> },
      { path: "/manage-clients", element: <ManageClients /> },
      { path: "/manage-projects", element: <ManageProjects /> },
      { path: "/mom", element: <MomNew /> },
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

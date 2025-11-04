// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import ClientLayout from "./components/ClientLayout";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProjects from "./pages/ClientProjects";
import ClientTasks from "./pages/ClientTasks";
import ClientCalendar from "./pages/ClientCalendar";
import ClientReports from "./pages/ClientReports";
import EmployeeLayout from "./components/EmployeeLayout";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeTasks from "./pages/EmployeeTasks";
import EmployeeProjects from "./pages/EmployeeProjects";
import EmployeeCalendar from "./pages/EmployeeCalendar";
import EmployeeReports from "./pages/EmployeeReports";
import Unauthorized from "./pages/Unauthorized";

import ManageResources from "./pages/ManageResources.jsx";
import ManageClients from "./pages/ManageClients.jsx";
import ManageProjects from "./pages/ManageProjects.jsx";
import Mom from "./pages/Mom.jsx";
import TaskManagment from "./pages/TaskManagment.jsx";
import Calendar from "./pages/Calendar.jsx";

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
      { path: "/mom", element: <Mom /> },
      { path: "/task-management", element: <TaskManagment /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/calendar", element: <Calendar /> },
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

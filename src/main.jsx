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

import ManageResources from "./pages/ManageResources.jsx";
import ManageClients from "./pages/ManageClients.jsx";
import ManageProjects from "./pages/ManageProjects.jsx";
import Mom from "./pages/Mom.jsx";
import TaskManagment from "./pages/TaskManagment.jsx";
import Calendar from "./pages/Calendar.jsx";
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    // These are the only pages an admin needs
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/manage-resources", element: <ManageResources /> },
      { path: "/manage-clients", element: <ManageClients /> },
      { path: "/manage-projects", element: <ManageProjects /> },
      { path: "/mom", element: <Mom /> },
      { path: "/task-management", element: <TaskManagment /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/calender", element: <Calendar /> },
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

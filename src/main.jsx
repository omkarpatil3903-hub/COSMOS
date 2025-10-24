// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// Import all your components
import LoginPage from "./pages/LoginPage";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import FindVotersPage from "./pages/FindVotersPage";
import ReportsPage from "./pages/ReportsPage";
import ActivateUserPage from "./pages/ActivateUserPage";
import VoterListPage from "./pages/VoterListPage";
import MasterPage from "./pages/MasterPage";
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
      { path: "/find-voters", element: <FindVotersPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/activate-users", element: <ActivateUserPage /> },
      { path: "/voter-list", element: <VoterListPage /> },
      { path: "/master", element: <MasterPage /> },
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

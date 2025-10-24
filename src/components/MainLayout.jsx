// src/components/MainLayout.jsx
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Toaster } from "react-hot-toast";
import {
  FaTachometerAlt,
  FaSearch,
  FaChartBar,
  FaUserCheck,
  FaListAlt,
  FaSignOutAlt,
  FaChevronLeft,
  FaShieldAlt,
  FaCogs, // A generic icon for the logo
} from "react-icons/fa";

// NEW: A reusable link component to keep our code clean
const SidebarLink = ({ to, icon, text, isSidebarOpen }) => {
  const baseClasses = "flex items-center p-2 rounded gap-4 transition-colors";
  const activeClasses = "bg-indigo-600 text-white";
  const inactiveClasses = "hover:bg-gray-700";

  return (
    <NavLink
      to={to}
      // The 'title' attribute provides a native browser tooltip
      title={!isSidebarOpen ? text : ""}
      className={({ isActive }) =>
        `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
      }
    >
      {icon}
      {isSidebarOpen && <span className="font-semibold">{text}</span>}
    </NavLink>
  );
};

function MainLayout() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Toaster position="top-right" />
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white p-4 flex flex-col transition-all duration-300 z-10 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-9 p-1.5 bg-gray-700 rounded-full text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <FaChevronLeft
            className={`transition-transform duration-300 ${
              !isSidebarOpen && "rotate-180"
            }`}
          />
        </button>

        {/* UPDATED: Logo/Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <FaShieldAlt size={20} />
          </div>
          {isSidebarOpen && <h2 className="text-xl font-bold">Admin Panel</h2>}
        </div>

        {/* UPDATED: Cleaner Navigation */}
        <nav className="flex-grow space-y-2">
          <SidebarLink
            to="/"
            icon={<FaTachometerAlt size={20} />}
            text="Dashboard"
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarLink
            to="/find-voters"
            icon={<FaSearch size={20} />}
            text="Find Voters"
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarLink
            to="/reports"
            icon={<FaChartBar size={20} />}
            text="Reports"
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarLink
            to="/activate-users"
            icon={<FaUserCheck size={20} />}
            text="Activate Users"
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarLink
            to="/voter-list"
            icon={<FaListAlt size={20} />}
            text="Voter List"
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarLink
            to="/master"
            icon={<FaCogs size={20} />}
            text="Masters"
            isSidebarOpen={isSidebarOpen}
          />
        </nav>

        {/* Logout Button */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-2 hover:bg-gray-700 rounded gap-4"
            title={!isSidebarOpen ? "Logout" : ""}
          >
            <FaSignOutAlt size={20} />
            {isSidebarOpen && <span className="font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`p-10 bg-gray-50 min-h-screen transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;

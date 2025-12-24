// src/components/MainLayout.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { Toaster } from "react-hot-toast";
import {
  FaTachometerAlt,
  FaSearch,
  FaChartBar,
  FaUserCheck,
  FaProjectDiagram,
  FaTasks,
  FaListAlt,
  FaSignOutAlt,
  FaChevronLeft,
  FaCalendarAlt,
  FaBars,
  FaTimes,
  FaCog,
  FaFileAlt,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import PanelSwitcher from "../PanelSwitcher";

// NEW: A reusable link component to keep our code clean
const SidebarLink = ({ to, icon, text, isCollapsed, onNavigate }) => {
  const { accent } = useTheme();

  // Get icon color based on route for black theme, otherwise use accent color
  const getIconColor = (to) => {
    if (accent === 'black') {
      // Define specific colors for each route in black theme
      if (to === '/admin' || to === '/admin/dashboard' || to === '') return 'text-blue-400';
      if (to.includes('manage-resources')) return 'text-purple-400';
      if (to.includes('manage-clients')) return 'text-green-400';
      if (to.includes('manage-projects')) return 'text-red-400';
      if (to.includes('reports')) return 'text-yellow-400';
      if (to.includes('settings')) return 'text-pink-400';
      if (to.includes('team')) return 'text-cyan-400';
      return 'text-indigo-400'; // Default color
    }

    // For non-black themes, use the accent color
    return accent === "purple"
      ? "text-purple-400"
      : accent === "blue"
        ? "text-sky-400"
        : accent === "pink"
          ? "text-pink-400"
          : accent === "violet"
            ? "text-violet-400"
            : accent === "orange"
              ? "text-amber-400"
              : accent === "teal"
                ? "text-teal-400"
                : accent === "bronze"
                  ? "text-amber-500"
                  : accent === "mint"
                    ? "text-emerald-400"
                    : "text-indigo-400";
  };

  const iconColor = getIconColor(to);

  const baseClasses = `group flex items-center ${isCollapsed ? "justify-center px-2" : "gap-3 px-3"
    } rounded-lg border border-transparent py-2 text-sm font-medium transition-colors`;
  const activeClasses =
    "border-subtle bg-surface-strong text-content-primary shadow-soft";
  const inactiveClasses =
    "text-content-secondary hover:bg-surface-subtle hover:text-content-primary";

  return (
    <NavLink
      to={to}
      end={to === "/admin"}
      // The 'title' attribute provides a native browser tooltip
      title={isCollapsed ? text : ""}
      className={({ isActive }) =>
        `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
      }
      onClick={onNavigate}
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${isActive
                ? `${accent === 'black' ? 'bg-black/20 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-surface'} ${iconColor}`
                : `${iconColor} bg-transparent ${accent === 'black' ? 'opacity-80 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`
              }`}
          >
            {icon}
          </span>
          {!isCollapsed && <span className="truncate">{text}</span>}
        </>
      )}
    </NavLink>
  );
};

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Dynamic page title based on route
  useEffect(() => {
    const pathToTitle = {
      "/": "COSMOS | Dashboard",
      "/manage-resources": "COSMOS | Manage Resources",
      "/manage-clients": "COSMOS | Manage Clients",
      "/manage-projects": "COSMOS | Manage Projects",
      "/mom-pro": "COSMOS | Minutes of Meeting",
      "/task-management": "COSMOS | Task Management",
      "/knowledge-management": "COSMOS | Knowledge Management",
      "/knowledge-management/": "COSMOS | Knowledge Management",
      "/reports": "COSMOS | Reports",
      "/expenses": "COSMOS | Expense Management",
      "/calendar": "COSMOS | Calendar",
      "/settings": "COSMOS | Settings",
      "/settings/add-hierarchy": "COSMOS | Settings | Add Hierarchy",
      "/settings/project-settings": "COSMOS | Settings | Project Level",
      "/settings/status-settings": "COSMOS | Settings | Status",

    };

    const title = pathToTitle[location.pathname] || "Admin Panel";
    document.title = title;
  }, [location.pathname]);

  const navigationItems = [
    {
      to: "/admin",
      text: "Dashboard",
      icon: <FaTachometerAlt className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/manage-resources",
      text: "Manage Resources",
      icon: <FaSearch className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/manage-clients",
      text: "Manage Clients",
      icon: <FaUserCheck className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/manage-projects",
      text: "Manage Projects",
      icon: <FaProjectDiagram className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/task-management",
      text: "Task Management",
      icon: <FaTasks className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/knowledge-management",
      text: "Knowledge Management",
      icon: <FaFileAlt className="h-4 w-4" aria-hidden="true" />,
    },

    {
      to: "/admin/expenses",
      text: "Expenses",
      icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
    },

    {
      to: "/admin/reports",
      text: "Reports",
      icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
    },

    // {
    //   to: "/mom",
    //   text: "Minutes of Meeting",
    //   icon: <FaListAlt className="h-4 w-4" aria-hidden="true" />,
    // },
    {
      to: "/admin/mom-pro",
      text: "Minutes of Meeting ",
      icon: <FaListAlt className="h-4 w-4" aria-hidden="true" />,
    },

    {
      to: "/admin/calendar",
      text: "Calendar",
      icon: <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/admin/settings",
      text: "Settings",
      icon: <FaCog className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleToggleMobileNav = () => {
    setIsMobileNavOpen((prev) => !prev);
  };

  const sidebarWidth = isCollapsed ? "lg:w-24" : "lg:w-72";
  const contentPadding = isCollapsed ? "lg:pl-24" : "lg:pl-72";

  return (
    <div className="flex min-h-screen bg-canvas text-content-primary">
      <a className="sr-only-focusable" href="#main-content">
        Skip to main content
      </a>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 100000 }}
        toastOptions={{
          style: { zIndex: 100000 },
        }}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-surface shadow-card transition-transform duration-300 ease-out lg:inset-y-auto lg:top-0 lg:h-screen lg:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarWidth} ${isCollapsed ? "p-4" : "p-6"} overflow-hidden`}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full shadow-lg border-2 border-white/30 p-1">
              <img
                src="/cosmos logo.png"
                alt="Cosmos Logo"
                className="h-12 w-12 object-cover rounded-full"
              />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-sm font-medium text-content-tertiary">
                  COSMOS
                </p>
                <h2 className="text-lg font-semibold text-content-primary">
                  Admin Panel
                </h2>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleSidebar}
            className="hidden items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FaChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""
                }`}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={handleToggleMobileNav}
            className="flex items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Panel Switcher for role hierarchy access */}
        <div className="mt-4 shrink-0">
          <PanelSwitcher isCollapsed={isCollapsed} />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin">
          {navigationItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              text={item.text}
              icon={item.icon}
              isCollapsed={isCollapsed}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-8 shrink-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            title={isCollapsed ? "Logout" : ""}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <FaSignOutAlt className="h-4 w-4" aria-hidden="true" />
            </span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {isMobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={handleToggleMobileNav}
          aria-label="Close menu overlay"
        />
      )}

      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 w-full ${contentPadding}`}
      >
        <main
          id="main-content"
          className="flex-1 px-4 py-6 sm:px-6 lg:px-6 lg:py-8 w-full max-w-full overflow-x-hidden"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={handleToggleMobileNav}
              className="flex items-center gap-2 rounded-full border border-subtle px-3 py-2 text-sm font-medium text-content-secondary transition hover:text-content-primary"
              aria-label="Open navigation"
            >
              <FaBars className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

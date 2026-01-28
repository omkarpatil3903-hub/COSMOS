/**
 * AdminLayout Component
 *
 * Purpose: Application shell for Admin portal.
 * Provides sidebar navigation, theme support, and responsive layout.
 *
 * Responsibilities:
 * - Render collapsible sidebar with navigation links
 * - Handle drag-and-drop nav item reordering
 * - Persist nav order to localStorage (navOrder_admin)
 * - Display user profile and logout button
 * - Manage mobile navigation overlay
 * - Set page titles based on route
 *
 * Dependencies:
 * - React Router (NavLink, Outlet)
 * - @hello-pangea/dnd (drag-drop)
 * - Firebase Auth (signOut)
 * - Firestore (user profile)
 * - ThemeContext (accent color)
 * - useThemeStyles (bar color)
 * - PanelSwitcher (role hierarchy access)
 *
 * Navigation Items (/admin prefix):
 * - Dashboard, Resources, Clients, Projects, Tasks
 * - Lead Management, Knowledge, Expenses, Reports
 * - MOM Pro, Calendar, Settings
 *
 * Features:
 * - Collapsible sidebar
 * - Mobile drawer with backdrop
 * - Accent-based icon colors (theme support)
 * - Dynamic document.title per route
 *
 * LocalStorage: navOrder_admin
 *
 * Last Modified: 2026-01-10
 */
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { version } from "../../../package.json";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Toaster } from "react-hot-toast";
import { useThemeStyles } from "../../hooks/useThemeStyles";
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
  FaUserTie,
  FaUser,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import PanelSwitcher from "../PanelSwitcher";

// NEW: A reusable link component to keep our code clean
const SidebarLink = ({ to, icon, text, isCollapsed, onNavigate }) => {
  const { accent, mode } = useTheme();

  // Get accent-based colors for light mode
  const getAccentColors = () => {
    const colorMap = {
      purple: {
        bg: "bg-purple-50",
        bgStrong: "bg-purple-100",
        text: "text-purple-600",
        icon: "text-purple-500",
        border: "border-purple-100",
      },
      blue: {
        bg: "bg-sky-50",
        bgStrong: "bg-sky-100",
        text: "text-sky-600",
        icon: "text-sky-500",
        border: "border-sky-100",
      },
      pink: {
        bg: "bg-pink-50",
        bgStrong: "bg-pink-100",
        text: "text-pink-600",
        icon: "text-pink-500",
        border: "border-pink-100",
      },
      violet: {
        bg: "bg-violet-50",
        bgStrong: "bg-violet-100",
        text: "text-violet-600",
        icon: "text-violet-500",
        border: "border-violet-100",
      },
      orange: {
        bg: "bg-amber-50",
        bgStrong: "bg-amber-100",
        text: "text-amber-600",
        icon: "text-amber-500",
        border: "border-amber-100",
      },
      teal: {
        bg: "bg-teal-50",
        bgStrong: "bg-teal-100",
        text: "text-teal-600",
        icon: "text-teal-500",
        border: "border-teal-100",
      },
      bronze: {
        bg: "bg-amber-50",
        bgStrong: "bg-amber-100",
        text: "text-amber-700",
        icon: "text-amber-600",
        border: "border-amber-100",
      },
      mint: {
        bg: "bg-emerald-50",
        bgStrong: "bg-emerald-100",
        text: "text-emerald-600",
        icon: "text-emerald-500",
        border: "border-emerald-100",
      },
      black: {
        bg: "bg-gray-100",
        bgStrong: "bg-gray-200",
        text: "text-gray-800",
        icon: "text-gray-600",
        border: "border-gray-200",
      },
      indigo: {
        bg: "bg-indigo-50",
        bgStrong: "bg-indigo-100",
        text: "text-indigo-600",
        icon: "text-indigo-500",
        border: "border-indigo-100",
      },
    };
    return colorMap[accent] || colorMap.indigo;
  };

  const accentColors = getAccentColors();

  // Get icon color - ALL icons use accent color in light mode
  const getIconColor = (to) => {
    if (accent === "black") {
      // Define specific colors for each route in black theme
      if (to === "/admin" || to === "/admin/dashboard" || to === "")
        return "text-blue-400";
      if (to.includes("manage-resources")) return "text-purple-400";
      if (to.includes("manage-clients")) return "text-green-400";
      if (to.includes("manage-projects")) return "text-red-400";
      if (to.includes("reports")) return "text-yellow-400";
      if (to.includes("settings")) return "text-pink-400";
      if (to.includes("team")) return "text-cyan-400";
      if (to.includes("lead-management")) return "text-orange-400";
      return "text-indigo-400"; // Default color
    }

    // For light mode, ALL icons use accent color
    if (mode === "light") {
      return accentColors.icon;
    }

    // For non-black dark themes, use the accent color
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

  // Light mode specific styling - only active tab gets background
  const activeClasses =
    mode === "light"
      ? `${accentColors.bg} ${accentColors.text} ${accentColors.border}`
      : "border-subtle bg-surface-strong text-content-primary shadow-soft";
  const inactiveClasses =
    mode === "light"
      ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      : "text-content-secondary hover:bg-surface-subtle hover:text-content-primary";

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
              ? `${accent === "black"
                ? "bg-black/20 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                : mode === "light"
                  ? accentColors.bgStrong
                  : "bg-surface"
              } ${iconColor}`
              : `${iconColor} ${mode === "light" ? "bg-gray-100" : "bg-transparent"
              } ${accent === "black"
                ? "opacity-80 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                : ""
              }`
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

const DEFAULT_NAV_ITEMS = [
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
    to: "/admin/lead-management",
    text: "Lead Management",
    icon: <FaUserTie className="h-4 w-4" aria-hidden="true" />,
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

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "", imageUrl: "" });
  const [imageLoadError, setImageLoadError] = useState(false);
  const { barColor } = useThemeStyles();

  // Fetch user profile from Firestore
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          name: data.name || data.fullName || currentUser.displayName || "Admin",
          imageUrl: data.imageUrl || "",
        });
      }
    });

    return () => unsub();
  }, []);

  // Dynamic page title based on route
  useEffect(() => {
    const pathToTitle = {
      "/admin": "COSMOS | Dashboard",
      "/admin/manage-resources": "COSMOS | Manage Resources",
      "/admin/manage-clients": "COSMOS | Manage Clients",
      "/admin/manage-projects": "COSMOS | Manage Projects",
      "/admin/mom-pro": "COSMOS | Minutes of Meeting",
      "/admin/task-management": "COSMOS | Task Management",
      "/admin/knowledge-management": "COSMOS | Knowledge Management",
      "/admin/knowledge-management/": "COSMOS | Knowledge Management",
      "/admin/reports": "COSMOS | Reports",
      "/admin/expenses": "COSMOS | Expenses",
      "/admin/calendar": "COSMOS | Calendar",
      "/admin/settings": "COSMOS | Settings",
      "/admin/settings/add-hierarchy": "COSMOS | Settings | Add Hierarchy",
      "/admin/settings/project-settings": "COSMOS | Settings | Project Level",
      "/admin/settings/status-settings": "COSMOS | Settings | Status",
      "/admin/lead-management": "COSMOS | Lead Management",
      "/admin/settings/theme": "COSMOS | Settings | Theme",
      "/admin/settings/profile": "COSMOS | Settings | Profile",
    };

    const title = pathToTitle[location.pathname] || "Admin Panel";
    document.title = title;
  }, [location.pathname]);

  // Initialize nav items from localStorage or default
  const [navItems, setNavItems] = useState(() => {
    try {
      const savedOrder = localStorage.getItem("navOrder_admin");
      if (savedOrder) {
        const order = JSON.parse(savedOrder);
        const itemMap = new Map(DEFAULT_NAV_ITEMS.map((item) => [item.to, item]));
        const orderedItems = order
          .map((path) => itemMap.get(path))
          .filter((item) => item !== undefined);
        const savedPaths = new Set(order);
        const newItems = DEFAULT_NAV_ITEMS.filter((item) => !savedPaths.has(item.to));
        return [...orderedItems, ...newItems];
      }
    } catch (error) {
      console.error("Failed to load nav order", error);
    }
    return DEFAULT_NAV_ITEMS;
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(navItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setNavItems(items);

    // Save order to localStorage
    const order = items.map((item) => item.to);
    localStorage.setItem("navOrder_admin", JSON.stringify(order));
  };

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
          duration: 2000,
        }}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-surface shadow-card transition-transform duration-300 ease-out lg:inset-y-auto lg:top-0 lg:h-screen lg:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarWidth} ${isCollapsed ? "p-4" : "p-6"} overflow-hidden`}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between gap-4 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="bg-white p-1 rounded-full shadow-lg">
                    <img
                      src="/cosmos logo.png"
                      alt="Cosmos Logo"
                      className="h-12 w-12 object-cover rounded-full"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-content-tertiary font-medium">
                  Ver. {version}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-content-tertiary">
                  COSMOS
                </p>
                <h2 className="text-lg font-semibold text-content-primary">
                  Admin Panel
                </h2>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleSidebar}
            className="hidden items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary cursor-pointer lg:flex"
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
            className="flex items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary cursor-pointer lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Panel Switcher for role hierarchy access */}
        <div className="mt-4 shrink-0">
          <PanelSwitcher isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="admin-sidebar-nav">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-col gap-1"
                >
                  {navItems.map((item, index) => (
                    <Draggable
                      key={item.to}
                      draggableId={item.to}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          <SidebarLink
                            to={item.to}
                            text={item.text}
                            icon={item.icon}
                            isCollapsed={isCollapsed}
                            onNavigate={() => setIsMobileNavOpen(false)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </nav>

        <div className="mt-auto pt-8 shrink-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 cursor-pointer"
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
              className="flex items-center gap-2 rounded-full border border-subtle px-3 py-2 text-sm font-medium text-content-secondary transition hover:text-content-primary cursor-pointer"
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

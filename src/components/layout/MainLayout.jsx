/**
 * MainLayout Component (Super Admin)
 *
 * Purpose: Application shell for Super Admin portal.
 * Provides sidebar navigation, theme support, and responsive layout.
 *
 * Responsibilities:
 * - Render collapsible sidebar with navigation links
 * - Handle drag-and-drop nav item reordering
 * - Persist nav order to localStorage
 * - Display user profile and logout button
 * - Manage mobile navigation overlay
 * - Set page titles based on route
 * - Initialize global lead reminders
 *
 * Dependencies:
 * - React Router (NavLink, Outlet)
 * - @hello-pangea/dnd (drag-drop)
 * - Firebase Auth (signOut)
 * - Firestore (user profile)
 * - ThemeContext (accent color, dark mode)
 * - useThemeStyles (bar color)
 * - PanelSwitcher (role hierarchy access)
 * - useGlobalLeadReminders (background notifications)
 *
 * Navigation Items:
 * - Dashboard, Resources, Clients, Projects, Tasks
 * - Lead Management, Knowledge, Expenses, Reports
 * - MOM Pro, Calendar, Settings
 *
 * Features:
 * - Collapsible sidebar (lg:w-24 / lg:w-72)
 * - Mobile drawer with backdrop
 * - Accent-based icon colors
 * - Light/dark mode styling
 * - Skip-to-content accessibility link
 * - Dynamic document.title per route
 *
 * LocalStorage:
 * - navOrder: Array of route paths for item order
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
import useGlobalLeadReminders from "../../hooks/useGlobalLeadReminders.jsx";
import useGlobalReminders from "../../hooks/useGlobalReminders.jsx";
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
  FaShieldAlt,
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
  const getIconColor = () => {
    if (accent === "black") {
      // Define specific colors for each route in black theme
      if (to === "/" || to === "/dashboard" || to === "")
        return "text-blue-400";
      if (to.includes("projects")) return "text-purple-400";
      if (to.includes("tasks")) return "text-green-400";
      if (to.includes("calendar")) return "text-red-400";
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

  const iconColor = getIconColor();

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
      end={to === "/"}
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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${isActive
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
    to: "/",
    text: "Dashboard",
    icon: <FaTachometerAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/manage-resources",
    text: "Manage Resources",
    icon: <FaSearch className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/manage-clients",
    text: "Manage Clients",
    icon: <FaUserCheck className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/manage-projects",
    text: "Manage Projects",
    icon: <FaProjectDiagram className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/task-management",
    text: "Task Management",
    icon: <FaTasks className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/lead-management",
    text: "Lead Management",
    icon: <FaUserTie className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/knowledge-management",
    text: "Knowledge Management",
    icon: <FaFileAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/expenses",
    text: "Expenses",
    icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/reports",
    text: "Reports",
    icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/mom-pro",
    text: "Minutes of Meeting ",
    icon: <FaListAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/calendar",
    text: "Calendar",
    icon: <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/settings",
    text: "Settings",
    icon: <FaCog className="h-4 w-4" aria-hidden="true" />,
  },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "", imageUrl: "" });
  const [imageLoadError, setImageLoadError] = useState(false);
  const { barColor } = useThemeStyles();

  // Global lead follow-up reminders
  useGlobalLeadReminders();
  useGlobalReminders();

  // Fetch user profile from Firestore
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          name: data.name || data.fullName || currentUser.displayName || "Super Admin",
          imageUrl: data.imageUrl || "",
        });
      }
    });

    return () => unsub();
  }, []);

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
      "/lead-management": "COSMOS | Lead Management",
      "/settings/add-hierarchy": "COSMOS | Settings | Add Hierarchy",
      "/settings/project-settings": "COSMOS | Settings | Project Level",
      "/settings/status-settings": "COSMOS | Settings | Status",
      "/settings/theme": "COSMOS | Settings | Theme",
      "/settings/profile": "COSMOS | Settings | Profile",

    };

    const title = pathToTitle[location.pathname] || "Super Admin Panel";
    document.title = title;
  }, [location.pathname]);

  // Initialize nav items from localStorage or default
  const [navItems, setNavItems] = useState(() => {
    try {
      const savedOrder = localStorage.getItem("navOrder");
      if (savedOrder) {
        const order = JSON.parse(savedOrder);
        // Map path to item for quick lookup
        const itemMap = new Map(DEFAULT_NAV_ITEMS.map((item) => [item.to, item]));

        // Reconstruct array based on saved order, filtering out any invalid paths
        const orderedItems = order
          .map((path) => itemMap.get(path))
          .filter((item) => item !== undefined);

        // Add any new items that weren't in the saved order
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
    localStorage.setItem("navOrder", JSON.stringify(order));
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
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 p-[2px] shadow-lg">
                    <div className="h-full w-full rounded-full bg-white p-1">
                      <img
                        src="/cosmos logo.png"
                        alt="Cosmos Logo"
                        className="h-full w-full object-cover rounded-full"
                      />
                    </div>
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
                  Super Admin Panel
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
            <Droppable droppableId="sidebar-nav">
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

export default MainLayout;

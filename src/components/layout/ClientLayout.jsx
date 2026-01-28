/**
 * ClientLayout Component
 *
 * Purpose: Application shell for Client portal.
 * Provides sidebar navigation, theme support, and responsive layout.
 *
 * Responsibilities:
 * - Render collapsible sidebar with navigation links
 * - Handle drag-and-drop nav item reordering
 * - Persist nav order to localStorage (navOrder_client)
 * - Display user profile and logout button
 * - Manage mobile navigation overlay
 * - Set page titles based on route
 * - Fetch profile from users OR clients collection
 *
 * Dependencies:
 * - React Router (NavLink, Outlet)
 * - @hello-pangea/dnd (drag-drop)
 * - Firebase Auth (signOut)
 * - Firestore (user/client profile)
 * - ThemeContext (accent color)
 * - useThemeStyles (bar color)
 *
 * Navigation Items (/client prefix):
 * - Dashboard, Projects, Tasks, Calendar, Settings
 *
 * Profile Lookup:
 * - Tries users collection first
 * - Falls back to clients collection
 * - Merges data from both sources
 *
 * Features:
 * - Collapsible sidebar
 * - Mobile drawer with backdrop
 * - Accent-based icon colors
 * - Dynamic document.title per route
 *
 * LocalStorage: navOrder_client
 *
 * Last Modified: 2026-01-10
 */
import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { version } from "../../../package.json";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuthContext } from "../../context/useAuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import {
  FaTachometerAlt,
  FaProjectDiagram,
  FaTasks,
  FaCalendarAlt,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaCog,
  FaUser,
} from "react-icons/fa";

// Reusable sidebar link component matching admin panel
const SidebarLink = ({ to, icon, text, isCollapsed, onNavigate }) => {
  const { accent } = useTheme();

  // Get icon color based on route for black theme, otherwise use accent color
  const getIconColor = (to) => {
    if (accent === 'black') {
      // Define specific colors for each route in black theme
      if (to === '/client' || to === '/client/dashboard' || to === '') return 'text-blue-400';
      if (to.includes('projects')) return 'text-purple-400';
      if (to.includes('tasks')) return 'text-green-400';
      if (to.includes('calendar')) return 'text-red-400';
      if (to.includes('reports')) return 'text-yellow-400';
      if (to.includes('documents')) return 'text-cyan-400';
      if (to.includes('settings')) return 'text-pink-400';
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
      end={to === "/client"}
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


const DEFAULT_NAV_ITEMS = [
  {
    to: "/client",
    text: "Dashboard",
    icon: <FaTachometerAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/client/projects",
    text: "Projects",
    icon: <FaProjectDiagram className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/client/tasks",
    text: "Tasks",
    icon: <FaTasks className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/client/calendar",
    text: "Calendar",
    icon: <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />,
  },
  {
    to: "/client/settings",
    text: "Settings",
    icon: <FaCog className="h-4 w-4" aria-hidden="true" />,
  },
  // {
  //   to: "/client/reports",
  //   text: "Reports",
  //   icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
  // },
];

export default function ClientLayout() {
  const { userData } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "", imageUrl: "" });
  const [imageLoadError, setImageLoadError] = useState(false);
  const { barColor } = useThemeStyles();

  // Fetch user profile from Firestore (check both users and clients collections)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let unsubUsers = () => { };
    let unsubClients = () => { };

    // Try users collection first
    const userRef = doc(db, "users", currentUser.uid);
    unsubUsers = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          name: data.name || data.fullName || currentUser.displayName || "Client",
          imageUrl: data.imageUrl || "",
        });
      }
    });

    // Also try clients collection
    const clientRef = doc(db, "clients", currentUser.uid);
    unsubClients = onSnapshot(clientRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Only update if we got data from clients and current profile is empty
        setUserProfile((prev) => ({
          name: data.clientName || data.companyName || data.name || prev.name || "Client",
          imageUrl: data.imageUrl || data.logo || prev.imageUrl || "",
        }));
      }
    });

    return () => {
      unsubUsers();
      unsubClients();
    };
  }, []);

  // Dynamic page title based on route
  useEffect(() => {
    const pathToTitle = {
      "/client": "COSMOS | Dashboard",
      "/client/projects": "COSMOS | My Projects - Client Portal",
      "/client/tasks": "COSMOS | My Tasks - Client Portal",
      "/client/calendar": "COSMOS | Calendar - Client Portal",
      "/client/reports": "COSMOS | Reports - Client Portal",
      "/client/settings": "COSMOS | Settings - Client Portal",
    };

    const title = pathToTitle[location.pathname] || "Client Portal";
    document.title = title;
  }, [location.pathname]);

  // Initialize nav items from localStorage or default
  const [navItems, setNavItems] = useState(() => {
    try {
      const savedOrder = localStorage.getItem("navOrder_client");
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
    localStorage.setItem("navOrder_client", JSON.stringify(order));
  };

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
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

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-surface shadow-card transition-transform duration-300 ease-out lg:inset-y-auto lg:top-0 lg:h-screen lg:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarWidth} ${isCollapsed ? "p-4" : "p-6"}`}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between gap-4">
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-content-tertiary">
                  COSMOS
                </p>
                <h2 className="text-lg font-semibold text-content-primary truncate">
                  Client Portal
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

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="client-sidebar-nav">
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

        <div className="mt-auto pt-8">
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
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${contentPadding}`}
      >
        <main
          id="main-content"
          className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
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

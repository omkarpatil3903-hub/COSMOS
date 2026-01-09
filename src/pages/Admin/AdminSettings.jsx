import React, { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import { FaSitemap, FaLayerGroup, FaFlag, FaPalette, FaUserCircle } from "react-icons/fa";

export default function Settings() {
  const tabs = [
    {
      to: "add-hierarchy",
      label: "Hierarchy",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-1 text-xs text-blue-600 [.dark_&]:border-blue-500/30 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-400">
          <FaSitemap className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "project-settings",
      label: "Project Level",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-1 text-xs text-violet-600 [.dark_&]:border-violet-500/30 [.dark_&]:bg-violet-900/30 [.dark_&]:text-violet-400">
          <FaLayerGroup className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "status-settings",
      label: "Status",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-xs text-amber-600 [.dark_&]:border-amber-500/30 [.dark_&]:bg-amber-900/30 [.dark_&]:text-amber-400">
          <FaFlag className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "theme",
      label: "Theme",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-xs text-indigo-600 [.dark_&]:border-indigo-500/30 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-400">
          <FaPalette className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "profile",
      label: "Profile",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-xs text-emerald-600 [.dark_&]:border-emerald-500/30 [.dark_&]:bg-emerald-900/30 [.dark_&]:text-emerald-400">
          <FaUserCircle className="h-3.5 w-3.5" />
        </span>
      ),
    },
  ];

  const location = useLocation();

  const activeTab = useMemo(() => {
    if (location.pathname.endsWith("/project-settings")) return "project";
    if (location.pathname.endsWith("/status-settings")) return "status";
    if (
      location.pathname.endsWith("/add-hierarchy") ||
      location.pathname.endsWith("/settings")
    )
      return "hierarchy";
    return "hierarchy";
  }, [location.pathname]);

  // Removed header-level add button; use per-page actions instead

  return (
    <div className="font-sans text-gray-800 [.dark_&]:text-white">
      <PageHeader title="Settings">
        Configure hierarchy and project preferences in one place.
      </PageHeader>

      <div className="space-y-6">
        <div className="flex bg-surface-subtle [.dark_&]:bg-slate-700/50 p-1 rounded-lg border border-subtle">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${isActive
                  ? "bg-white [.dark_&]:bg-slate-600 shadow text-gray-900 [.dark_&]:text-white"
                  : "text-gray-500 [.dark_&]:text-gray-400 hover:text-gray-700 [.dark_&]:hover:text-white"
                }`
              }
            >
              {t.icon}
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

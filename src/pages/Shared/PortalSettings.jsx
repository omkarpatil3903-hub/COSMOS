import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import { FaPalette, FaUserCircle } from "react-icons/fa";

export default function PortalSettings() {
  const tabs = [
    {
      to: "theme",
      label: "Theme",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-indigo-200 [.dark_&]:border-indigo-500/30 bg-indigo-50 [.dark_&]:bg-indigo-500/20 px-1.5 py-1 text-xs text-indigo-600 [.dark_&]:text-indigo-400">
          <FaPalette className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "profile",
      label: "Profile",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-emerald-200 [.dark_&]:border-emerald-500/30 bg-emerald-50 [.dark_&]:bg-emerald-500/20 px-1.5 py-1 text-xs text-emerald-600 [.dark_&]:text-emerald-400">
          <FaUserCircle className="h-3.5 w-3.5" />
        </span>
      ),
    },
  ];

  return (
    <div className="font-sans text-gray-800 [.dark_&]:text-gray-200">
      <PageHeader title="Settings">Manage your theme and profile.</PageHeader>

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


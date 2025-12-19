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
        <span className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-xs text-indigo-600">
          <FaPalette className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "profile",
      label: "Profile",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-xs text-emerald-600">
          <FaUserCircle className="h-3.5 w-3.5" />
        </span>
      ),
    },
  ];

  return (
    <div className="font-sans text-gray-800">
      <PageHeader title="Settings">Manage your theme and profile.</PageHeader>

      <div className="space-y-6">
        <Card className="p-4" tone="white">
          <div className="border-b border-subtle">
            <div className="flex items-center gap-2 -mb-px">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((t, idx) => (
                  <React.Fragment key={t.to}>
                    <NavLink
                      to={t.to}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 pb-2 pt-2 text-sm font-medium transition-colors duration-150 border-b-2 ${
                          isActive
                            ? "text-gray-900 border-gray-900"
                            : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                        }`
                      }
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </NavLink>
                    {idx < tabs.length - 1 && (
                      <span
                        className="mx-1 h-5 w-px bg-subtle"
                        aria-hidden="true"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

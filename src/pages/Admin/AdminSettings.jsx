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
        <span className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-1 text-xs text-blue-600">
          <FaSitemap className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "project-settings",
      label: "Project Level",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-1 text-xs text-violet-600">
          <FaLayerGroup className="h-3.5 w-3.5" />
        </span>
      ),
    },
    {
      to: "status-settings",
      label: "Status",
      icon: (
        <span className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-xs text-amber-600">
          <FaFlag className="h-3.5 w-3.5" />
        </span>
      ),
    },
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
    <div className="font-sans text-gray-800">
      <PageHeader title="Settings">
        Configure hierarchy and project preferences in one place.
      </PageHeader>

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
                        `flex items-center gap-2 px-4 pb-2 pt-2 text-sm font-medium transition-colors duration-150 border-b-2 ${isActive
                          ? "text-gray-900 border-gray-900"
                          : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                        }`
                      }
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </NavLink>
                    {idx < tabs.length - 1 && (
                      <span className="mx-1 h-5 w-px bg-subtle" aria-hidden="true" />
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

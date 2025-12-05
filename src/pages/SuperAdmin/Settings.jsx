import React, { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";

export default function Settings() {
  const tabs = [
    { to: "add-hierarchy", label: "Hierarchy" },
    { to: "project-settings", label: "Project Level" },
  ];

  const location = useLocation();

  const activeTab = useMemo(() => {
    if (location.pathname.endsWith("/project-settings")) return "project";
    if (
      location.pathname.endsWith("/add-hierarchy") ||
      location.pathname.endsWith("/settings")
    )
      return "hierarchy";
    return "hierarchy";
  }, [location.pathname]);

  // Removed header-level add button; use per-page actions instead

  return (
    <div>
      <PageHeader title="Settings">
        Configure hierarchy and project preferences in one place.
      </PageHeader>

      <div className="space-y-6">
        <Card className="p-4" tone="white">
          <div className="mb-2">
            <h3 className="text-base font-semibold">
              {activeTab === "project" ? "Project Level" : "Hierarchy"}
            </h3>
          </div>
          <hr className="my-3 border-subtle" />
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-lg transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-soft"
                        : "text-content-secondary hover:bg-surface-subtle hover:text-content-primary"
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              ))}
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

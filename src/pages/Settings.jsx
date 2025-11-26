import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { FaPlus } from "react-icons/fa";

export default function Settings() {
  const tabs = [
    { to: "add-hierarchy", label: "Add Hierarchy" },
    { to: "project-settings", label: "Project Settings" },
  ];

  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("az");
  const [showArchived, setShowArchived] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    if (location.pathname.endsWith("/project-settings")) return "project";
    if (location.pathname.endsWith("/add-hierarchy") || location.pathname.endsWith("/settings")) return "hierarchy";
    return "hierarchy";
  }, [location.pathname]);

  const handleAdd = () => {
    if (activeTab === "project") navigate("project-settings?add=1");
    else navigate("add-hierarchy?add=1");
  };

  const handleClear = () => {
    setSearch("");
    setSection("all");
    setStatus("all");
    setSort("az");
    setShowArchived(false);
  };

  return (
    <div>
      <PageHeader title="Settings">
        Configure hierarchy and project preferences in one place.
      </PageHeader>

      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
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
            <Button onClick={handleAdd} variant="primary" className="ml-auto">
              <FaPlus /> {activeTab === "project" ? "Add Project Setting" : "Add Hierarchy"}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings..."
              className="col-span-2 h-10 rounded border border-gray-300 px-3 text-sm"
            />
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            >
              <option value="all">All Sections</option>
              <option value="hierarchy">Hierarchy</option>
              <option value="project">Project</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            >
              <option value="az">Sort: A–Z</option>
              <option value="za">Sort: Z–A</option>
              <option value="new">Sort: Newest</option>
              <option value="old">Sort: Oldest</option>
            </select>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleClear} className="h-10">
                Clear Filters
              </Button>
              <label className="flex items-center gap-2 text-sm text-content-secondary">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show Archived
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Outlet context={{ search, section, status, sort, showArchived }} />
        </Card>
      </div>
    </div>
  );
}

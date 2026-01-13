/**
 * CalendarHeader Component
 *
 * Purpose: Renders the calendar navigation bar with month controls,
 * filter dropdowns, and action buttons.
 *
 * Responsibilities:
 * - Month navigation (previous/next/today buttons)
 * - Display current month and year
 * - Event type filter (all/meetings/tasks)
 * - Status filter (all/approved/pending/cancelled/completed)
 * - Project filter dropdown
 * - Employee schedule filter with indicator
 * - Clear all filters button
 *
 * Dependencies:
 * - Card, Button (UI components)
 * - ThemeContext (for dark mode styling)
 * - dateUtils (MONTH_NAMES)
 * - react-icons (navigation icons)
 *
 * Props:
 * - currentDate: Date for display
 * - onNavigateMonth: Callback for month change (-1 or +1)
 * - onToday: Callback to jump to current month
 * - filterType/Status/Project/Employee: Current filter values
 * - onFilter*Change: Callbacks for filter changes
 * - projects: Array of projects for dropdown
 * - resources: Array of users for employee dropdown
 * - employeeScheduleInfo: Object with employee name when filter active
 * - onClearEmployeeFilter: Callback to clear employee view
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import Card from "../Card";
import Button from "../Button";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaTasks,
  FaTimes,
} from "react-icons/fa";
import { MONTH_NAMES } from "../../utils/dateUtils";
import { useTheme } from "../../context/ThemeContext";

const CalendarHeader = ({
  currentDate,
  onNavigateMonth,
  onToday,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  filterProject,
  onFilterProjectChange,
  filterEmployee,
  onFilterEmployeeChange,
  projects,
  resources,
  onAddEvent,
  onAddTask,
  employeeScheduleInfo,
  onClearEmployeeFilter,
}) => {
  const { mode } = useTheme();

  // THEME-AWARE: Select styling based on light/dark mode
  const selectClassName = `border rounded px-3 py-2 text-sm outline-none transition-colors ${mode === "dark"
    ? "bg-gray-700 border-gray-600 text-white"
    : "bg-white border-gray-300 text-gray-900"
    }`;

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* LEFT: Navigation Controls */}
          <div className="flex items-center gap-4">
            {/* Month Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateMonth(-1)}
                className={`p-2 rounded transition-colors ${mode === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Previous month"
              >
                <FaChevronLeft />
              </button>
              <h2 className="text-lg font-bold min-w-[200px] text-center">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => onNavigateMonth(1)}
                className={`p-2 rounded transition-colors ${mode === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Next month"
              >
                <FaChevronRight />
              </button>
            </div>

            {/* Today Button */}
            <Button variant="secondary" onClick={onToday}>
              <FaCalendarAlt /> Today
            </Button>
          </div>

          {/* RIGHT: Filter Dropdowns */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className={selectClassName}
            >
              <option value="all">All Types</option>
              <option value="meeting">Meetings</option>
              <option value="task">Tasks</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className={selectClassName}
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            {/* Project Filter */}
            <select
              value={filterProject}
              onChange={(e) => onFilterProjectChange(e.target.value)}
              className={selectClassName}
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Employee Filter */}
            {/* BUSINESS RULE: Excludes clients from employee dropdown */}
            <select
              value={filterEmployee}
              onChange={(e) => onFilterEmployeeChange(e.target.value)}
              className={selectClassName}
              title="View employee schedule"
            >
              <option value="all">All Employees</option>
              {resources
                .filter((r) => (r.role || "").toLowerCase() !== "client")
                .map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
            </select>

            {/* CLEAR FILTERS: Shows only when any filter is active */}
            {(filterType !== "all" ||
              filterStatus !== "all" ||
              filterProject !== "all" ||
              filterEmployee !== "all") && (
                <button
                  onClick={() => {
                    onFilterTypeChange("all");
                    onFilterStatusChange("all");
                    onFilterProjectChange("all");
                    onFilterEmployeeChange("all");
                  }}
                  className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
                  title="Clear all filters"
                >
                  <FaTimes size={12} />
                  Clear Filters
                </button>
              )}

          </div>
        </div>
      </Card>

      {/* EMPLOYEE SCHEDULE INDICATOR: Shows when viewing specific employee's schedule */}
      {employeeScheduleInfo && (
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Employee Schedule View</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Showing: {employeeScheduleInfo.name}
              </p>
            </div>
            <Button variant="ghost" onClick={onClearEmployeeFilter}>
              <FaTimes /> Clear
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};

export default CalendarHeader;

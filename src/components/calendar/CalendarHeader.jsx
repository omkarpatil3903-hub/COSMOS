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
  return (
    <>
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Previous month"
              >
                <FaChevronLeft />
              </button>
              <h2 className="text-lg font-bold min-w-[200px] text-center">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => onNavigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Next month"
              >
                <FaChevronRight />
              </button>
            </div>

            <Button variant="secondary" onClick={onToday}>
              <FaCalendarAlt /> Today
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="meeting">Meetings</option>
              <option value="task">Tasks</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filterProject}
              onChange={(e) => onFilterProjectChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => onFilterEmployeeChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
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

          </div>
        </div>
      </Card>

      {/* Employee Schedule Indicator */}
      {employeeScheduleInfo && (
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Employee Schedule View</p>
              <p className="text-sm text-gray-600 mt-1">
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

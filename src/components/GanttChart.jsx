import React, { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import gantt from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import {
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaCompress,
  FaExpand,
  FaMapMarkerAlt,
  FaSquare,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaSpinner,
  FaCheckCircle,
  FaFlag,
} from "react-icons/fa";

const statusIconMap = {
  "to-do": renderToStaticMarkup(
    <FaClipboardList className="w-3.5 h-3.5 text-current" />
  ),
  "in progress": renderToStaticMarkup(
    <FaSpinner className="w-3.5 h-3.5 text-current animate-spin" />
  ),
  done: renderToStaticMarkup(
    <FaCheckCircle className="w-3.5 h-3.5 text-current" />
  ),
};

const priorityIconHtml = renderToStaticMarkup(
  <FaFlag className="w-3.5 h-3.5 text-current" />
);

export default function GanttChart({ data }) {
  const ganttRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [zoomLevel, setZoomLevel] = useState("day");

  useEffect(() => {
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.autosize = false;
    gantt.config.fit_tasks = true;
    gantt.config.scrollable = true;
    gantt.config.grid_resize = true;
    gantt.config.drag_scroll = true;
    // gantt.config.show_quick_add = false;

    // ------------------------------
    // ENABLE PLUGINS
    // ------------------------------
    gantt.plugins({
      marker: true,
      zoom: true,
    });

    gantt.ext.zoom.init({
      levels: [
        {
          name: "day",
          scale_height: 27,
          min_column_width: 80,
          scales: [{ unit: "day", step: 1, format: "%d %M" }],
        },
        {
          name: "week",
          scale_height: 50,
          min_column_width: 50,
          scales: [
            { unit: "week", step: 1, format: "Week %W" },
            { unit: "day", step: 1, format: "%D" },
          ],
        },
        {
          name: "month",
          scale_height: 50,
          min_column_width: 80,
          scales: [
            { unit: "month", step: 1, format: "%F %Y" },
            { unit: "week", step: 1, format: "Week #%W" },
          ],
        },
      ],
    });

    gantt.ext.zoom.setLevel("day");
    setZoomLevel("day");

    // ------------------------------------
    // TOOLTIP CONFIGURATION
    // ------------------------------------
    gantt.plugins({ tooltip: true });

    gantt.templates.tooltip_text = function (start, end, task) {
      const format = gantt.date.date_to_str("%d/%m/%Y");

      const statusIcon =
        statusIconMap[task.status?.toLowerCase()] || statusIconMap["to-do"];

      return `
    <div class="rounded-lg shadow-lg bg-white border border-gray-200 p-3 min-w-[220px]">
      
      <!-- Title -->
      <div class="font-semibold text-gray-900 text-sm mb-2 leading-tight">
        ${task.text}
      </div>

      
      <!-- Chips -->
      <div class="flex items-center gap-2 flex-wrap mb-3">
      
        ${
          task.status
            ? `<span class="px-2 py-0.5 text-xs rounded-md font-medium inline-flex items-center gap-1.5"
                style="background:${task.statusColor}20; color:${task.statusColor}; border:1px solid ${task.statusColor}40;">
                ${statusIcon}
                ${task.status}
              </span>`
            : ""
        }
        ${
          task.priority
            ? `<span class="px-2 py-0.5 text-xs rounded-md font-medium inline-flex items-center gap-1.5"
                style="background:${task.priorityColor}20; color:${task.priorityColor}; border:1px solid ${task.priorityColor}40;">
                ${priorityIconHtml}
                ${task.priority}
              </span>`
            : ""
        }
      </div>

      <!-- Info List -->
      <div class="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-2">
      <div class="flex justify-between">
          <span class="text-gray-500">Assigned To:</span>
          <span class="font-medium">${task.assignedTo}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Start Date:</span>
          <span class="font-medium">${format(start)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">End Date:</span>
          <span class="font-medium">${format(end)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Duration:</span>
          <span class="font-medium">${task.duration} days</span>
        </div>
      </div>

      <!-- Progress Bar -->
      ${
        task.progress
          ? `
        <div class="mt-3">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="text-gray-500">Progress</span>
            <span class="font-semibold text-indigo-600">${Math.round(
              task.progress * 100
            )}%</span>
          </div>
          <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full bg-indigo-500"
              style="width:${task.progress * 100}%">
            </div>
          </div>
        </div>`
          : ""
      }
    </div>
  `;
    };

    // ------------------------------------
    // APPLY CLASS TO TASK BAR ITSELF  ⭐⭐ IMPORTANT
    // ------------------------------------
    gantt.templates.task_line_class = function (start, end, task) {
      if (task.parent === 0) return `project-${task.id}`;
      return `task-${task.id}`;
    };

    // row class (optional but useful)
    gantt.templates.task_class = function (start, end, task) {
      if (task.parent === 0) return `project-${task.id}`;
      return `task-${task.id}`;
    };

    // ------------------------------
    // INIT + PARSE
    // ------------------------------
    gantt.init(ganttRef.current);
    gantt.clearAll();
    gantt.parse({ data, links: [] });

    // ------------------------------
    // TODAY MARKER (must be after init)
    // ------------------------------
    try {
      gantt.deleteMarker("todayMarker");
    } catch {
      // Ignore marker cleanup errors during init reruns
    }

    gantt.addMarker({
      id: "todayMarker",
      start_date: new Date(),
      css: "gantt-today-marker",
      text: "Today",
      title: "Today",
    });

    gantt.showDate(new Date());

    return () => {
      try {
        gantt.clearAll();
        gantt.deleteMarker("todayMarker");
      } catch {
        // Ignore teardown errors when component unmounts mid-operation
      }
    };
  }, [data]);

  // ------------------------------
  // Toolbar Helper Functions
  // ------------------------------
  const setZoom = (level) => {
    gantt.ext.zoom.setLevel(level);
    setZoomLevel(level);
  };

  const collapseAll = () => {
    gantt.eachTask((t) => (t.$open = false));
    gantt.render();
  };

  const expandAll = () => {
    gantt.eachTask((t) => (t.$open = true));
    gantt.render();
  };

  const goToToday = () => gantt.showDate(new Date());

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isFullscreen ? "bg-surface p-6" : ""}`}
    >
      {/* Enhanced Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-surface-subtle rounded-xl border border-subtle shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-surface rounded-lg shadow-soft border border-subtle p-1">
            <button
              onClick={() => setZoom("day")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                zoomLevel === "day"
                  ? "bg-indigo-600 text-white shadow-soft"
                  : "text-content-primary hover:bg-indigo-50 hover:text-indigo-700"
              }`}
              title="Day View"
            >
              <FaCalendarDay className="w-3.5 h-3.5" />
              Day
            </button>
            <button
              onClick={() => setZoom("week")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                zoomLevel === "week"
                  ? "bg-indigo-600 text-white shadow-soft"
                  : "text-content-primary hover:bg-indigo-50 hover:text-indigo-700"
              }`}
              title="Week View"
            >
              <FaCalendarWeek className="w-3.5 h-3.5" />
              Week
            </button>
            <button
              onClick={() => setZoom("month")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                zoomLevel === "month"
                  ? "bg-indigo-600 text-white shadow-soft"
                  : "text-content-primary hover:bg-indigo-50 hover:text-indigo-700"
              }`}
              title="Month View"
            >
              <FaCalendar className="w-3.5 h-3.5" />
              Month
            </button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 bg-surface rounded-lg shadow-soft border border-subtle p-1">
            <button
              onClick={collapseAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-content-primary hover:bg-surface-subtle transition-colors duration-200"
              title="Collapse All Projects"
            >
              <FaCompress className="w-3.5 h-3.5" />
              Collapse
            </button>
            <button
              onClick={expandAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-content-primary hover:bg-surface-subtle transition-colors duration-200"
              title="Expand All Projects"
            >
              <FaExpand className="w-3.5 h-3.5" />
              Expand
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={goToToday}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            title="Jump to Today"
          >
            <FaMapMarkerAlt className="w-3.5 h-3.5" />
            Today
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 shadow-soft border ${
              isFullscreen
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-surface border-subtle text-content-primary hover:bg-surface-subtle"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <FaCompressArrowsAlt className="w-3.5 h-3.5" />
            ) : (
              <FaExpandArrowsAlt className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Legend Toggle & Content */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              showLegend
                ? "bg-surface-subtle text-content-primary"
                : "text-content-secondary hover:bg-surface-subtle"
            }`}
            title={showLegend ? "Hide Legend" : "Show Legend"}
          >
            {showLegend ? (
              <FaChevronUp className="w-3 h-3" />
            ) : (
              <FaChevronDown className="w-3 h-3" />
            )}
            Legend
          </button>
        </div>
      </div>

      {/* Collapsible Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 text-xs mb-4 p-3 bg-surface-subtle rounded-lg border border-subtle">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-content-secondary">
              Status:
            </span>
            <div className="flex items-center gap-1">
              <FaSquare className="w-3 h-3 text-gray-400" />
              <span className="text-content-tertiary">To-Do</span>
            </div>
            <div className="flex items-center gap-1">
              <FaSquare className="w-3 h-3 text-blue-500" />
              <span className="text-content-tertiary">In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <FaSquare className="w-3 h-3 text-emerald-500" />
              <span className="text-content-tertiary">Done</span>
            </div>
          </div>
          <div className="h-4 w-px bg-subtle"></div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-content-secondary">
              Priority:
            </span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
              <span className="text-content-tertiary">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
              <span className="text-content-tertiary">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-content-tertiary">High</span>
            </div>
          </div>
        </div>
      )}

      {/* Gantt Container */}
      <div
        className={`w-full rounded-xl border border-subtle shadow-soft bg-surface overflow-x-auto overflow-y-auto ${
          isFullscreen ? "h-[calc(100vh-180px)]" : "h-[550px]"
        }`}
      >
        <div ref={ganttRef} className="w-full h-full" />
      </div>

      {/* Dynamic CSS for colors */}
      <style>
        {`
          /* PROJECT BARS */
          ${data
            ?.filter((t) => t.parent === 0 && t.color)
            ?.map(
              (p) => `
              .project-${p.id}.gantt_task_line,
              .project-${p.id}.gantt_task_bar {
                background-color: ${p.color} !important;
                border-color: ${p.color} !important;
              }
            `
            )
            .join("")}

          /* STATUS COLOR + PRIORITY BORDER */
          ${data
            ?.filter((t) => t.parent !== 0)
            ?.map(
              (t) => `
              .task-${t.id}.gantt_task_line,
              .task-${t.id}.gantt_task_bar {
                background-color: ${t.statusColor} !important;
                
                /* PRIORITY BORDER */
                border: 1px solid ${t.priorityColor} !important;
                border-left: 6px solid ${t.priorityColor} !important;
                box-sizing: border-box !important;
              }
            `
            )
            .join("")}

          /* Text */
          .gantt_task_content {
            color: white !important;
            font-weight: 500;
          }

          /* Task bar animations & hover */
          .gantt_task_line,
          .gantt_task_bar {
            transition: box-shadow 0.25s ease, filter 0.25s ease, opacity 0.3s ease, transform 0.3s ease;
            opacity: 0;
            transform: translateY(4px);
            animation: gantt-fade-in 0.35s ease-out forwards;
          }

          .gantt_task_line:hover,
          .gantt_task_bar:hover {
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
            filter: brightness(1.05);
          }

          /* TODAY MARKER - Enhanced visibility with project colors */
          .gantt-today-marker {
            width: 3px !important;
            background: #4f46e5 !important;
            box-shadow: 0 0 10px rgba(79, 70, 229, 0.5) !important;
            z-index: 10 !important;
            position: relative !important;
            animation: gantt-pulse 1.8s ease-in-out infinite;
          }

          .gantt_marker_content {
            background: #4f46e5 !important;
            color: white !important;
            padding: 2px 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3) !important;
          }

          /* Gantt grid and timeline styling to match project */
          .gantt_grid_scale,
          .gantt_task_scale {
            background-color: var(--color-surface-subtle, #f8fafc) !important;
            border-color: var(--color-border-subtle, #e2e8f0) !important;
            transition: background-color 0.25s ease, border-color 0.25s ease;
          }

          .gantt_grid_head_cell,
          .gantt_scale_cell {
            color: var(--color-content-secondary, #64748b) !important;
            font-weight: 600 !important;
            transition: color 0.25s ease;
          }

          .gantt_cell,
          .gantt_grid_data .gantt_cell {
            border-color: var(--color-border-subtle, #e2e8f0) !important;
          }

          .gantt_task_row.gantt_selected,
          .gantt_task_row:hover {
            background-color: var(--color-surface-subtle, #f8fafc) !important;
          }

          .gantt_tooltip {
          padding: 0 !important;
          border-radius: 10px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
}

          /* Tooltip icon styles using Font Awesome classes */
          .status-icon-todo::before {
            content: "\\f0ea"; /* FaClipboardList */
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            font-size: 12px;
          }
          
          .status-icon-progress::before {
            content: "\\f110"; /* FaSpinner */
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            font-size: 12px;
            animation: spin 1s linear infinite;
          }
          
          .status-icon-done::before {
            content: "\\f058"; /* FaCheckCircle */
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            font-size: 12px;
          }
          
          .priority-icon::before {
            content: "\\f024"; /* FaFlag */
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            font-size: 12px;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes gantt-fade-in {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes gantt-pulse {
            0% {
              box-shadow: 0 0 6px rgba(79, 70, 229, 0.4);
            }
            50% {
              box-shadow: 0 0 14px rgba(79, 70, 229, 0.85);
            }
            100% {
              box-shadow: 0 0 6px rgba(79, 70, 229, 0.4);
            }
          }

        `}
      </style>
    </div>
  );
}

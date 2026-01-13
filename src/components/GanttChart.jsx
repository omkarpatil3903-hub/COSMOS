/**
 * GanttChart Component
 *
 * Purpose: Interactive Gantt chart for project/task timeline visualization.
 * Built on dhtmlx-gantt library with theme integration.
 *
 * Responsibilities:
 * - Render project and task bars with status/priority colors
 * - Zoom controls (day, week, month views)
 * - Collapse/expand all projects
 * - Today marker with pulse animation
 * - Fullscreen mode toggle
 * - Rich tooltips with task details
 * - Dynamic CSS for theme and accent colors
 *
 * Dependencies:
 * - dhtmlx-gantt library
 * - useTheme, useThemeStyles hooks
 * - react-dom/server (renderToStaticMarkup)
 * - react-icons (FaCalendarDay, FaCalendarWeek, etc.)
 *
 * Props:
 * - data: Array of tasks/projects with:
 *   - id, text, parent, start_date, end_date, duration
 *   - status, statusColor, priority, priorityColor
 *   - assignedTo, progress, color (for projects)
 *
 * Features:
 * - Zoom plugin: Day/Week/Month scales
 * - Marker plugin: Today marker
 * - Tooltip plugin: Rich task details
 * - Dark/light mode aware
 * - Legend component (collapsible)
 *
 * Last Modified: 2026-01-10
 */

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
import { useTheme } from "../context/ThemeContext";
import { useThemeStyles } from "../hooks/useThemeStyles";

const ACCENT_COLORS = {
  purple: "#9333ea",
  blue: "#0284c7",
  pink: "#db2777",
  violet: "#7c3aed",
  orange: "#d97706",
  teal: "#0d9488",
  bronze: "#d97706",
  mint: "#059669",
  black: "#2563eb",
  indigo: "#4f46e5",
};


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
  const { mode, accent } = useTheme();
  const { buttonClass, headerIconClass } = useThemeStyles();
  const activeColor = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;
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

      const bgClass = mode === 'dark' ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200';
      const textMain = mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
      const textSub = mode === 'dark' ? 'text-gray-400' : 'text-gray-600';
      const textLabel = mode === 'dark' ? 'text-gray-500' : 'text-gray-500';
      const separator = mode === 'dark' ? 'border-gray-700' : 'border-gray-100';

      return `
    <div class="rounded-lg shadow-lg ${bgClass} border p-3 min-w-[220px]">
      
      <!-- Title -->
      <div class="font-semibold ${textMain} text-sm mb-2 leading-tight">
        ${task.text}
      </div>

      
      <!-- Chips -->
      <div class="flex items-center gap-2 flex-wrap mb-3">
      
        ${task.status
          ? `<span class="px-2 py-0.5 text-xs rounded-md font-medium inline-flex items-center gap-1.5"
                style="background:${task.statusColor}20; color:${task.statusColor}; border:1px solid ${task.statusColor}40;">
                ${statusIcon}
                ${task.status}
              </span>`
          : ""
        }
        ${task.priority
          ? `<span class="px-2 py-0.5 text-xs rounded-md font-medium inline-flex items-center gap-1.5"
                style="background:${task.priorityColor}20; color:${task.priorityColor}; border:1px solid ${task.priorityColor}40;">
                ${priorityIconHtml}
                ${task.priority}
              </span>`
          : ""
        }
      </div>

      <!-- Info List -->
      <div class="space-y-1.5 text-xs ${textSub} border-t ${separator} pt-2">
      <div class="flex justify-between">
          <span class="${textLabel}">Assigned To:</span>
          <span class="font-medium">${task.assignedTo}</span>
        </div>
        <div class="flex justify-between">
          <span class="${textLabel}">Start Date:</span>
          <span class="font-medium">${format(start)}</span>
        </div>
        <div class="flex justify-between">
          <span class="${textLabel}">End Date:</span>
          <span class="font-medium">${format(end)}</span>
        </div>
        <div class="flex justify-between">
          <span class="${textLabel}">Duration:</span>
          <span class="font-medium">${task.duration} days</span>
        </div>
      </div>

      <!-- Progress Bar -->
      ${task.progress
          ? `
        <div class="mt-3">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="${textLabel}">Progress</span>
            <span class="font-semibold text-indigo-600">${Math.round(
            task.progress * 100
          )}%</span>
          </div>
          <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full"
              style="width:${task.progress * 100}%; background-color: ${activeColor};">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${zoomLevel === "day"
                ? buttonClass
                : "text-content-primary hover:bg-surface-subtle"
                }`}
              title="Day View"
            >
              <FaCalendarDay className="w-3.5 h-3.5" />
              Day
            </button>
            <button
              onClick={() => setZoom("week")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${zoomLevel === "week"
                ? buttonClass
                : "text-content-primary hover:bg-surface-subtle"
                }`}
              title="Week View"
            >
              <FaCalendarWeek className="w-3.5 h-3.5" />
              Week
            </button>
            <button
              onClick={() => setZoom("month")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${zoomLevel === "month"
                ? buttonClass
                : "text-content-primary hover:bg-surface-subtle"
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
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 shadow-soft focus-visible:outline-none ${buttonClass}`}
            title="Jump to Today"
          >
            <FaMapMarkerAlt className="w-3.5 h-3.5" />
            Today
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 shadow-soft border ${isFullscreen
              ? headerIconClass
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
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showLegend
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
        className={`w-full rounded-xl border border-subtle shadow-soft bg-surface overflow-x-auto overflow-y-auto ${isFullscreen ? "h-[calc(100vh-180px)]" : "h-[550px]"
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
            background: ${activeColor} !important;
            box-shadow: 0 0 10px ${activeColor}80 !important;
            z-index: 10 !important;
            position: relative !important;
            animation: gantt-pulse 1.8s ease-in-out infinite;
          }

          .gantt_marker_content {
            background: ${activeColor} !important;
            color: white !important;
            padding: 2px 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 6px ${activeColor}4D !important;
          }

          /* Gantt grid and timeline styling to match project */
          .gantt_grid_scale,
          .gantt_task_scale {
            background-color: ${mode === 'dark' ? '#1f2937' : '#f8fafc'} !important;
            border-color: ${mode === 'dark' ? '#374151' : '#e2e8f0'} !important;
            color: ${mode === 'dark' ? '#e5e7eb' : '#64748b'} !important;
            transition: background-color 0.25s ease, border-color 0.25s ease;
          }

          .gantt_grid_head_cell,
          .gantt_scale_cell {
            color: ${mode === 'dark' ? '#e5e7eb' : '#64748b'} !important;
            font-weight: 600 !important;
            transition: color 0.25s ease;
          }

          .gantt_cell,
          .gantt_grid_data .gantt_cell {
            border-color: ${mode === 'dark' ? '#374151' : '#e2e8f0'} !important;
            color: ${mode === 'dark' ? '#f3f4f6' : '#1e293b'} !important;
            background-color: ${mode === 'dark' ? '#111827' : '#ffffff'} !important;
          }

          .gantt_task_row, 
          .gantt_row {
             background-color: ${mode === 'dark' ? '#111827' : '#ffffff'} !important;
             border-color: ${mode === 'dark' ? '#374151' : '#e2e8f0'} !important;
             color: ${mode === 'dark' ? '#f3f4f6' : '#1e293b'} !important;
          }

          .gantt_task_row.gantt_selected,
          .gantt_task_row:hover,
          .gantt_row.gantt_selected,
          .gantt_row:hover {
            background-color: ${mode === 'dark' ? '#1f2937' : '#f8fafc'} !important;
          }
          
          .gantt_grid_data,
          .gantt_task_bg,
          .gantt_data_area,
          .gantt_task_content {
             background-color: ${mode === 'dark' ? '#111827' : '#ffffff'} !important;
          }
          
          /* In dark mode, hide the default background image grid and use cell borders instead if needed, 
             OR let dhtmlx default grid lines work if we just change the bg color. 
             Usually dhtmlx uses bg image for lines. We can try recoloring specifically if supported, 
             or broadly applying borders. For now, let's trust the background-color override 
             and ensure the cells have transparent backgrounds so lines show, or similar.
             Actually, .gantt_task_bg usually holds the grid image. */
          
          ${mode === 'dark' ? `
            .gantt_task_bg {
              background-image: linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px) !important;
              background-size: 100% 100%, 100% 100% !important; 
              /* This is a rough approx, typically we just want to suppress the light grid or simple bg color */
              background-image: none !important; 
            }
            .gantt_task_cell {
              border-right: 1px solid #374151 !important;
            }
          ` : ''}

          .gantt_hor_scroll {
             background-color: ${mode === 'dark' ? '#111827' : '#ffffff'} !important;
          }

          .gantt_task {
             background-color: ${mode === 'dark' ? '#111827' : '#ffffff'} !important;
          }

          .gantt_task_row {
             border-bottom: 1px solid ${mode === 'dark' ? '#374151' : '#e2e8f0'} !important;
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
              box-shadow: 0 0 6px ${activeColor}66;
            }
            50% {
              box-shadow: 0 0 14px ${activeColor}D9;
            }
            100% {
              box-shadow: 0 0 6px ${activeColor}66;
            }
          }

        `}
      </style>
    </div>
  );
}

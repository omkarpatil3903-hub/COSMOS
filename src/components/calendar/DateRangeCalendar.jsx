/**
 * DateRangeCalendar Component
 *
 * Purpose: Interactive date range picker with drag-to-select functionality.
 * Allows users to select a date range by clicking and dragging across dates.
 *
 * Responsibilities:
 * - Render monthly calendar grid with navigation
 * - Handle click-drag range selection
 * - Support disabling past dates and minimum date constraints
 * - Emit selected range with start, end, and day count
 * - Support compact variant for embedded use
 *
 * Dependencies:
 * - dateUtils (MONTH_NAMES, DAY_NAMES, calendar utilities)
 *
 * Props:
 * - valueStart/valueEnd: Initial range values (YYYY-MM-DD strings)
 * - onChange: Callback with { start, end, days } object
 * - disablePast: Boolean to prevent selecting past dates
 * - minDate: Earliest selectable date (YYYY-MM-DD)
 * - compact: Boolean for smaller size variant
 * - accent: Tailwind color keyword for selection highlighting
 * - initialMonth: Date to initialize the calendar view
 *
 * Interaction Model:
 * 1. Click on start date (mousedown)
 * 2. Drag to end date (mousemove)
 * 3. Release to confirm selection (mouseup)
 *
 * Output Format:
 * { start: "YYYY-MM-DD", end: "YYYY-MM-DD", days: number }
 *
 * Last Modified: 2026-01-10
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MONTH_NAMES,
  DAY_NAMES,
  dateToInputValue,
  getCalendarDates,
  isPast,
  isToday,
} from "../../utils/dateUtils";

export default function DateRangeCalendar({
  valueStart = null,
  valueEnd = null,
  onChange,
  disablePast = false,
  minDate = null,
  className = "",
  initialMonth,
  compact = false,
  accent = "indigo",
}) {
  // INITIALIZE: Determine starting month from props or current date
  const initialMonthDate = useMemo(() => {
    if (initialMonth instanceof Date) return new Date(initialMonth);
    if (valueStart) return new Date(valueStart + "T00:00:00");
    return new Date();
  }, [initialMonth, valueStart]);

  // STATE: Current display month and selected range
  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialMonthDate.getFullYear(), initialMonthDate.getMonth(), 1)
  );
  const [start, setStart] = useState(() =>
    valueStart ? new Date(valueStart + "T00:00:00") : null
  );
  const [end, setEnd] = useState(() =>
    valueEnd ? new Date(valueEnd + "T00:00:00") : null
  );
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef(null);

  // SYNC: Update internal state when external values change
  useEffect(() => {
    if (valueStart) setStart(new Date(valueStart + "T00:00:00"));
    if (valueEnd) setEnd(new Date(valueEnd + "T00:00:00"));
  }, [valueStart, valueEnd]);

  // CALCULATE: Generate 42 dates for 6-week calendar grid
  const dates = useMemo(() => getCalendarDates(currentMonth), [currentMonth]);

  // CONSTRAINT: Parse minDate if provided
  const minDateObj = useMemo(
    () => (minDate ? new Date(minDate + "T00:00:00") : null),
    [minDate]
  );

  /**
   * Check if a date should be disabled (non-selectable).
   */
  const isDisabled = (date) => {
    if (disablePast && isPast(date)) return true;
    if (minDateObj && date < minDateObj) return true;
    return false;
  };

  /**
   * Normalize range to ensure start <= end.
   */
  const normalizeRange = (a, b) => {
    if (!a || !b) return [a, b];
    return a <= b ? [a, b] : [b, a];
  };

  /**
   * Check if a date falls within the selected range.
   */
  const inRange = (date) => {
    if (!start || !end) return false;
    const [s, e] = normalizeRange(start, end);
    return date >= s && date <= e;
  };

  // DRAG START: Begin range selection
  const handleMouseDown = (date) => {
    if (isDisabled(date)) return;
    setDragging(true);
    dragStartRef.current = date;
    setStart(date);
    setEnd(date);
  };

  // DRAG CONTINUE: Extend range while dragging
  const handleMouseEnter = (date) => {
    if (!dragging) return;
    if (isDisabled(date)) return;
    setEnd(date);
  };

  /**
   * Complete drag selection and emit onChange.
   */
  const finishDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (!start || !end) return;
    const [s, e] = normalizeRange(start, end);
    const startStr = dateToInputValue(s);
    const endStr = dateToInputValue(e);
    // CALCULATE: Number of days in range (inclusive)
    const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
    onChange && onChange({ start: startStr, end: endStr, days });
  };

  // GLOBAL LISTENERS: Handle mouseup/mouseleave outside component
  useEffect(() => {
    const up = () => finishDrag();
    const leave = () => finishDrag();
    window.addEventListener("mouseup", up);
    window.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mouseleave", leave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, start, end]);

  /**
   * Navigate to previous/next month.
   */
  const goMonth = (delta) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  // STYLING: Dynamic classes based on accent color and compact mode
  const accentRing = `ring-2 ring-${accent}-300`;
  const accentBg = `bg-${accent}-100 border-${accent}-300`;
  const hoverBg = compact ? `hover:bg-${accent}-50` : "hover:bg-indigo-50";

  /**
   * Generate cell classes based on date state.
   */
  const cellClass = (date) => {
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const disabled = isDisabled(date);
    const selected = inRange(date);
    const today = isToday(date);
    return [
      compact ? "h-14 p-1.5" : "h-24 p-2",
      "border cursor-pointer select-none relative transition-colors",
      isCurrentMonth
        ? compact
          ? "bg-sky-50"
          : "bg-white"
        : "bg-gray-50 text-gray-400",
      disabled ? "opacity-40 cursor-not-allowed" : hoverBg,
      selected ? accentBg : "border-gray-200",
      today ? accentRing : "",
      compact ? "text-[11px]" : "text-sm",
    ].join(" ");
  };

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]
    } ${currentMonth.getFullYear()}`;

  return (
    <div className={className + (compact ? " w-64" : "")}>
      {/* HEADER: Month label and navigation */}
      <div
        className={`flex items-center justify-between mb-2 ${compact ? "text-[12px]" : ""
          }`}
      >
        <div className="font-semibold text-gray-700 truncate">{monthLabel}</div>
        <div className="flex gap-1">
          <button
            type="button"
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
            onClick={() => goMonth(-1)}
            aria-label="Previous Month"
          >
            {compact ? "‹" : "←"}
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
            onClick={() => setCurrentMonth(new Date())}
            aria-label="Current Month"
          >
            {compact ? "•" : "Today"}
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
            onClick={() => goMonth(1)}
            aria-label="Next Month"
          >
            {compact ? "›" : "→"}
          </button>
        </div>
      </div>

      {/* DAY HEADERS */}
      <div
        className={`grid grid-cols-7 mb-1 ${compact ? "text-[10px] font-semibold" : "text-xs font-medium"
          } text-gray-600`}
      >
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center">
            {d.slice(0, 2)}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 rounded border overflow-hidden bg-sky-100">
        {dates.map((date) => (
          <div
            key={date.toISOString()}
            className={cellClass(date)}
            onMouseDown={() =>
              handleMouseDown(
                new Date(date.getFullYear(), date.getMonth(), date.getDate())
              )
            }
            onMouseEnter={() =>
              handleMouseEnter(
                new Date(date.getFullYear(), date.getMonth(), date.getDate())
              )
            }
          >
            <div className={compact ? "font-medium" : "text-sm font-semibold"}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* SELECTION INDICATOR */}
      <div className="mt-2 text-[10px] text-gray-600">
        {start && end ? (
          <span>
            {dateToInputValue(normalizeRange(start, end)[0])} →{" "}
            {dateToInputValue(normalizeRange(start, end)[1])}
          </span>
        ) : (
          <span>Drag to select range</span>
        )}
      </div>
    </div>
  );
}

/**
 * CalendarGrid Component
 *
 * Purpose: Renders the main monthly calendar grid with date cells,
 * event indicators, and meeting request badges.
 *
 * Responsibilities:
 * - Display 7-column grid representing days of the week
 * - Render day cells with visual indicators for today, selected, and past dates
 * - Show event pills (max 2 visible) with type and priority coloring
 * - Display meeting request count badges with click handler
 * - Handle date selection via click
 *
 * Dependencies:
 * - colorMaps (TYPE_CLASSES, PRIORITY_CLASSES for styling)
 *
 * Props:
 * - currentDate: Date object for the displayed month
 * - selectedDate: Currently selected date (highlighted)
 * - onSelectDate: Callback when user clicks a date
 * - getEventsForDate: Function to retrieve events for a specific date
 * - getRequestsForDate: Function to retrieve pending requests for a date
 * - onShowRequests: Callback when user clicks request badge
 *
 * Visual Indicators:
 * - Today: Blue background and border
 * - Selected: Indigo ring outline
 * - Past dates: Gray background
 * - Events: Colored pills with type badge and priority dot
 * - Requests: Orange pulsing badge in top-right corner
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { TYPE_CLASSES, PRIORITY_CLASSES } from "../../utils/colorMaps";

// Day labels for calendar header
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CalendarGrid = ({
    currentDate,
    selectedDate,
    onSelectDate,
    getEventsForDate,
    getRequestsForDate,
    onShowRequests
}) => {
    // CALCULATE: Month boundaries and starting day
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    /**
     * Renders all day cells for the current month.
     * Includes empty cells for days before month start.
     */
    const renderDays = () => {
        const days = [];

        // EMPTY CELLS: Fill space before first day of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-28 border border-gray-100 bg-gray-50" />);
        }

        // ACTUAL DAYS: Render each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEvents = getEventsForDate(date);
            const dayRequests = getRequestsForDate(date);

            // NORMALIZE: Compare dates without time component
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currDateNorm = new Date(date);
            currDateNorm.setHours(0, 0, 0, 0);

            // DATE CLASSIFICATION: Determine visual styling
            const isPast = currDateNorm < today;
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            days.push(
                <div
                    key={day}
                    className={`min-h-28 max-h-48 border border-gray-200 p-2 cursor-pointer relative transition-all duration-200 overflow-hidden ${isPast ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-blue-50"
                        } ${isToday ? "bg-blue-50 border-blue-400 border-2" : ""} 
             ${isSelected ? "ring-2 ring-indigo-400 border-indigo-400" : ""}`}
                    onClick={() => onSelectDate(date)}
                >
                    {/* Day Number */}
                    <div className={`text-sm font-bold mb-1 ${isToday ? "text-blue-700" : "text-gray-800"}`}>
                        {day}
                    </div>

                    {/* REQUEST BADGE: Pulsing indicator for pending meeting requests */}
                    {dayRequests.length > 0 && (
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onShowRequests(date); }}
                                className="w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse"
                                title={`${dayRequests.length} meeting request(s)`}
                            >
                                {dayRequests.length}
                            </button>
                        </div>
                    )}

                    {/* EVENT PILLS: Show max 2 events, then "+N more" */}
                    <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                            // Get type-based styling
                            const typeKey = (event.type || "").toLowerCase();
                            const typeBadge = TYPE_CLASSES[typeKey]?.badge || "bg-gray-100 text-gray-700";

                            // Get priority-based dot color (for non-meeting events)
                            const priorityKey = (event.priority || "").toLowerCase();
                            const priorityDot = PRIORITY_CLASSES[priorityKey]?.dot || "bg-gray-400";

                            return (
                                <div key={event.id} className={`text-xs p-1 rounded ${typeBadge} truncate relative`}>
                                    {/* PRIORITY DOT: Visual indicator for task priority */}
                                    {event.type !== "meeting" && (
                                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${priorityDot}`} />
                                    )}
                                    <span className="pl-2">{event.time || ""} {event.title}</span>
                                </div>
                            );
                        })}
                        {/* OVERFLOW INDICATOR: Show count of additional events */}
                        {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500 font-medium text-center">
                                +{dayEvents.length - 2} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div>
            {/* DAY HEADERS: Sunday through Saturday */}
            <div className="grid grid-cols-7 gap-0 mb-4">
                {DAY_NAMES.map((day) => (
                    <div key={day} className="p-3 text-center font-semibold text-gray-700 border-b">
                        {day.slice(0, 3)}
                    </div>
                ))}
            </div>
            {/* CALENDAR GRID: 7-column layout for days */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded overflow-hidden">
                {renderDays()}
            </div>
        </div>
    );
};

export default CalendarGrid;
import React from "react";
import { TYPE_CLASSES, PRIORITY_CLASSES } from "../../utils/colorMaps";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CalendarGrid = ({
    currentDate,
    selectedDate,
    onSelectDate,
    getEventsForDate,
    getRequestsForDate,
    onShowRequests
}) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const renderDays = () => {
        const days = [];
        // Empty cells for days before start of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-28 border border-gray-100 bg-gray-50" />);
        }

        // Actual Days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEvents = getEventsForDate(date);
            const dayRequests = getRequestsForDate(date);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currDateNorm = new Date(date);
            currDateNorm.setHours(0, 0, 0, 0);

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
                    <div className={`text-sm font-bold mb-1 ${isToday ? "text-blue-700" : "text-gray-800"}`}>
                        {day}
                    </div>

                    {/* Request Indicator */}
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

                    {/* Event Pills */}
                    <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                            const typeKey = (event.type || "").toLowerCase();
                            const typeBadge = TYPE_CLASSES[typeKey]?.badge || "bg-gray-100 text-gray-700";

                            // Safely handle priority check
                            const priorityKey = (event.priority || "").toLowerCase();
                            const priorityDot = PRIORITY_CLASSES[priorityKey]?.dot || "bg-gray-400";

                            return (
                                <div key={event.id} className={`text-xs p-1 rounded ${typeBadge} truncate relative`}>
                                    {event.type !== "meeting" && (
                                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${priorityDot}`} />
                                    )}
                                    <span className="pl-2">{event.time || ""} {event.title}</span>
                                </div>
                            );
                        })}
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
            <div className="grid grid-cols-7 gap-0 mb-4">
                {DAY_NAMES.map((day) => (
                    <div key={day} className="p-3 text-center font-semibold text-gray-700 border-b">
                        {day.slice(0, 3)}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded overflow-hidden">
                {renderDays()}
            </div>
        </div>
    );
};

export default CalendarGrid;
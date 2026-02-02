import React from "react";
import { FaRegCalendarAlt, FaChevronRight } from "react-icons/fa";

/**
 * RecurrencePreview Component
 * 
 * Purpose: Displays a visual preview of the next 5 recurring task occurrences.
 * Helps users understand exactly when tasks will repeat.
 * 
 * Features:
 * - Shows next 5 dates in readable format
 * - Uses arrows to show progression
 * - Highlighted boxes for easy scanning
 * - Responsive layout
 */

export default function RecurrencePreview({ dates }) {
    if (!dates || dates.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 pt-3 border-t border-gray-100 [.dark_&]:border-white/10">
            <label className="block text-xs font-medium text-gray-500 [.dark_&]:text-gray-400 mb-2 flex items-center gap-1">
                <FaRegCalendarAlt /> Next {dates.length} Occurrences
            </label>

            {/* Desktop view - horizontal with arrows */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {dates.map((date, idx) => (
                    <React.Fragment key={idx}>
                        <div className="px-3 py-1.5 bg-indigo-50 [.dark_&]:bg-indigo-900/20 text-indigo-700 [.dark_&]:text-indigo-400 text-xs font-medium rounded-lg border border-indigo-100 [.dark_&]:border-indigo-500/20 whitespace-nowrap">
                            {date}
                        </div>
                        {idx < dates.length - 1 && (
                            <FaChevronRight className="text-indigo-300 [.dark_&]:text-indigo-600 text-xs flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Mobile view - vertical stack */}
            <div className="flex flex-col gap-1.5 sm:hidden">
                {dates.map((date, idx) => (
                    <div
                        key={idx}
                        className="px-3 py-1.5 bg-indigo-50 [.dark_&]:bg-indigo-900/20 text-indigo-700 [.dark_&]:text-indigo-400 text-xs font-medium rounded-lg border border-indigo-100 [.dark_&]:border-indigo-500/20 flex items-center gap-2"
                    >
                        <span className="text-indigo-300 [.dark_&]:text-indigo-600 font-bold text-[10px]">
                            #{idx + 1}
                        </span>
                        <span>{date}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

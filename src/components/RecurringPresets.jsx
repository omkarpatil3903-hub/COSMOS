import React from "react";
import { FaCalendarDay, FaCalendarWeek, FaCalendar, FaCog, FaRedoAlt } from "react-icons/fa";

/**
 * RecurringPresets Component
 * 
 * Purpose: Provides smart preset buttons for common recurring task patterns.
 * Simplifies recurring task setup from 9 steps to 2 clicks.
 * 
 * Features:
 * - 4 preset options: Daily, Weekly, Monthly, Custom
 * - Each preset auto-configures pattern, interval, and skip settings
 * - Visual feedback for selected preset
 * - Responsive grid layout
 */

// Preset configurations
const PRESETS = [
    {
        id: 'daily-weekdays',
        label: 'Daily',
        description: 'Mon-Fri',
        Icon: FaCalendarDay,
        config: {
            pattern: 'daily',
            interval: 1,
            skipWeekends: true,
            customDays: false,
            selectedWeekDays: [1, 2, 3, 4, 5] // Mon-Fri
        }
    },
    {
        id: 'weekly',
        label: 'Weekly',
        description: 'Mondays',
        Icon: FaCalendarWeek,
        config: {
            pattern: 'weekly',
            interval: 1,
            skipWeekends: false,
            customDays: false,
            selectedWeekDays: [1] // Monday only
        }
    },
    {
        id: 'monthly',
        label: 'Monthly',
        description: '1st of month',
        Icon: FaCalendar,
        config: {
            pattern: 'monthly',
            interval: 1,
            skipWeekends: false,
            customDays: false,
            selectedWeekDays: [0, 1, 2, 3, 4, 5, 6] // All days
        }
    },
    {
        id: 'custom',
        label: 'Custom',
        description: 'Advanced',
        Icon: FaCog,
        custom: true
    }
];

export default function RecurringPresets({ selected, onSelect }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <FaRedoAlt className="text-indigo-600 [.dark_&]:text-indigo-400 text-sm" />
                <label className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-200">
                    How often should this repeat?
                </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map(preset => {
                    const isSelected = selected === preset.id;
                    const IconComponent = preset.Icon;

                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onSelect(preset)}
                            className={`
                relative flex flex-col items-center justify-center
                py-4 px-3 rounded-xl border-2 transition-all duration-200
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${isSelected
                                    ? 'border-indigo-600 bg-indigo-50 [.dark_&]:bg-indigo-900/20 shadow-md scale-[1.02]'
                                    : 'border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#1F2234] hover:border-indigo-300 hover:scale-[1.01]'
                                }
              `}
                        >
                            {/* Selected indicator */}
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            {/* Icon */}
                            <div className={`mb-2 transition-colors ${isSelected ? 'text-indigo-600 [.dark_&]:text-indigo-400' : 'text-gray-400 [.dark_&]:text-gray-500'}`}>
                                <IconComponent className="text-2xl" />
                            </div>

                            {/* Label */}
                            <div className={`text-sm font-bold mb-0.5 transition-colors ${isSelected ? 'text-indigo-700 [.dark_&]:text-indigo-300' : 'text-gray-900 [.dark_&]:text-white'}`}>
                                {preset.label}
                            </div>

                            {/* Description */}
                            <div className={`text-[11px] transition-colors ${isSelected ? 'text-indigo-600 [.dark_&]:text-indigo-400' : 'text-gray-500 [.dark_&]:text-gray-400'}`}>
                                {preset.description}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Export presets for use in parent component
export { PRESETS };

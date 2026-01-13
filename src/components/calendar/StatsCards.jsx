/**
 * StatsCards Component
 *
 * Purpose: Displays dashboard statistics for the calendar view in a
 * responsive card grid layout.
 *
 * Responsibilities:
 * - Display 4 key calendar metrics
 * - Apply theme-aware styling (light/dark mode)
 * - Show colored left border and icon for each stat
 *
 * Dependencies:
 * - Card (UI component)
 * - ThemeContext (for dark mode detection)
 * - react-icons (stat icons)
 *
 * Props:
 * - stats: Object containing:
 *   - totalEvents: Total scheduled events
 *   - approvedMeetings: Approved meeting count
 *   - upcomingDeadlines: Tasks due within 7 days
 *   - pendingRequests: Meeting requests awaiting approval
 *
 * Card Styling:
 * - Indigo: Total Scheduled (FaCalendarAlt)
 * - Green: Approved Meetings (FaCheckCircle)
 * - Orange: Upcoming Deadlines (FaClock)
 * - Red: Pending Requests (FaHourglassHalf)
 *
 * Dark Mode:
 * - Uses brighter border colors for visibility
 * - Adjusts icon opacity for contrast
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import Card from "../Card";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";

const StatsCards = ({ stats }) => {
  const { mode } = useTheme();

  // CARD CONFIGURATION: Define all stat cards with their styling
  const cards = [
    {
      label: "Total Scheduled",
      value: stats.totalEvents,
      icon: FaCalendarAlt,
      color: "#4f46e5", // indigo-600
      darkBorderColor: "#818cf8", // indigo-400 - brighter for dark mode visibility
      darkBg: "rgba(79, 70, 229, 0.05)",
      lightBg: "rgba(79, 70, 229, 0.05)",
      iconColor: "text-indigo-600",
      darkIconColor: "text-indigo-400",
    },
    {
      label: "Approved Meetings",
      value: stats.approvedMeetings,
      icon: FaCheckCircle,
      color: "#10b981", // green-500
      darkBorderColor: "#4ade80", // green-400
      darkBg: "rgba(16, 185, 129, 0.05)",
      lightBg: "rgba(16, 185, 129, 0.05)",
      iconColor: "text-green-600",
      darkIconColor: "text-green-400",
    },
    {
      label: "Upcoming Deadlines",
      value: stats.upcomingDeadlines,
      icon: FaClock,
      color: "#f97316", // orange-500
      darkBorderColor: "#fb923c", // orange-400
      darkBg: "rgba(249, 115, 22, 0.05)",
      lightBg: "rgba(249, 115, 22, 0.05)",
      iconColor: "text-orange-600",
      darkIconColor: "text-orange-400",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: FaHourglassHalf,
      color: "#ef4444", // red-500
      darkBorderColor: "#f87171", // red-400
      darkBg: "rgba(239, 68, 68, 0.05)",
      lightBg: "rgba(239, 68, 68, 0.05)",
      iconColor: "text-red-600",
      darkIconColor: "text-red-400",
    },
  ];

  return (
    // RESPONSIVE GRID: 1 column mobile, 2 tablet, 4 desktop
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border-l-4"
          // DYNAMIC STYLING: Apply theme-appropriate colors
          style={{
            borderLeftColor: mode === 'dark' ? card.darkBorderColor : card.color,
            backgroundColor: mode === 'dark' ? card.darkBg : card.lightBg,
          }}
        >
          <div className="flex items-center justify-between">
            {/* STAT VALUES */}
            <div>
              <p className="text-sm text-content-tertiary">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
            </div>
            {/* STAT ICON: Adjusted opacity for light/dark modes */}
            <card.icon className={`h-8 w-8 ${mode === 'dark' ? card.darkIconColor : card.iconColor} ${mode === 'dark' ? 'opacity-80' : 'opacity-50'}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

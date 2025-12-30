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
  const cards = [
    {
      label: "Total Scheduled",
      value: stats.totalEvents,
      icon: FaCalendarAlt,
      color: "#4f46e5",
      darkBorderColor: "#818cf8", // indigo-400 - brighter for dark mode
      darkBg: "rgba(79, 70, 229, 0.05)",
      lightBg: "rgba(79, 70, 229, 0.05)",
      iconColor: "text-indigo-600",
      darkIconColor: "text-indigo-400",
    },
    {
      label: "Approved Meetings",
      value: stats.approvedMeetings,
      icon: FaCheckCircle,
      color: "#10b981",
      darkBorderColor: "#4ade80", // green-400 - brighter for dark mode
      darkBg: "rgba(16, 185, 129, 0.05)",
      lightBg: "rgba(16, 185, 129, 0.05)",
      iconColor: "text-green-600",
      darkIconColor: "text-green-400",
    },
    {
      label: "Upcoming Deadlines",
      value: stats.upcomingDeadlines,
      icon: FaClock,
      color: "#f97316",
      darkBorderColor: "#fb923c", // orange-400 - brighter for dark mode
      darkBg: "rgba(249, 115, 22, 0.05)",
      lightBg: "rgba(249, 115, 22, 0.05)",
      iconColor: "text-orange-600",
      darkIconColor: "text-orange-400",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: FaHourglassHalf,
      color: "#ef4444",
      darkBorderColor: "#f87171", // red-400 - brighter for dark mode
      darkBg: "rgba(239, 68, 68, 0.05)",
      lightBg: "rgba(239, 68, 68, 0.05)",
      iconColor: "text-red-600",
      darkIconColor: "text-red-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border-l-4"
          style={{
            borderLeftColor: mode === 'dark' ? card.darkBorderColor : card.color,
            backgroundColor: mode === 'dark' ? card.darkBg : card.lightBg,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-content-tertiary">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
            </div>
            <card.icon className={`h-8 w-8 ${mode === 'dark' ? card.darkIconColor : card.iconColor} ${mode === 'dark' ? 'opacity-80' : 'opacity-50'}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

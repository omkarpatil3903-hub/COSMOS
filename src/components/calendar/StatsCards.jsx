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
      iconColor: "text-indigo-600",
    },
    {
      label: "Approved Meetings",
      value: stats.approvedMeetings,
      icon: FaCheckCircle,
      color: "#10b981",
      iconColor: "text-green-600",
    },
    {
      label: "Upcoming Deadlines",
      value: stats.upcomingDeadlines,
      icon: FaClock,
      color: "#f97316",
      iconColor: "text-orange-600",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: FaHourglassHalf,
      color: "#ef4444",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border-l-4"
          style={{ borderLeftColor: card.color }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-content-tertiary">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
            </div>
            <card.icon className={`h-8 w-8 ${card.iconColor} opacity-50`} />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

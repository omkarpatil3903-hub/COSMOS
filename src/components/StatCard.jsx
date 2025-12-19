// src/components/StatCard.jsx
import React from "react";
import { useTheme } from "../context/ThemeContext";

const StatCard = ({ icon, label, value, subValue, color = "indigo" }) => {
  const { mode } = useTheme();

  // Light pastel backgrounds with strong, visible icon colors
  const colors = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      icon: "text-blue-500 dark:text-blue-400",
    },
    green: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      icon: "text-emerald-500 dark:text-emerald-400",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      icon: "text-indigo-500 dark:text-indigo-400",
    },
    sky: {
      bg: "bg-sky-50 dark:bg-sky-500/10",
      icon: "text-sky-500 dark:text-sky-400",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      icon: "text-amber-500 dark:text-amber-400",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-500/10",
      icon: "text-purple-500 dark:text-purple-400",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-500/10",
      icon: "text-red-500 dark:text-red-400",
    },
    gray: {
      bg: "bg-gray-100 dark:bg-gray-500/10",
      icon: "text-gray-500 dark:text-gray-400",
    },
  };

  const colorConfig = colors[color] || colors.indigo;

  return (
    <div
      className="rounded-xl border px-5 py-4 shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{
        backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff',
        borderColor: mode === 'dark' ? '#374151' : '#f3f4f6'
      }}
    >
      <div className="flex items-center gap-4">
        {/* Icon Circle */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${colorConfig.bg}`}
        >
          <span className={colorConfig.icon}>
            {icon}
          </span>
        </div>

        {/* Text Content */}
        <div className="flex flex-col">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{
              color: mode === 'dark' ? '#9ca3af' : '#6b7280'
            }}
          >
            {label}
          </p>
          <div
            className="text-2xl font-bold mt-0.5"
            style={{
              color: mode === 'dark' ? '#ffffff' : '#111827'
            }}
          >
            {value}
          </div>
          {subValue && (
            <p
              className="text-xs font-medium mt-0.5"
              style={{
                color: mode === 'dark' ? '#9ca3af' : '#6b7280'
              }}
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

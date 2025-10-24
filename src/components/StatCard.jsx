// src/components/StatCard.jsx
import React from "react";
import Card from "./Card"; // Assuming Card is in the same folder

const StatCard = ({ icon, label, value, color = "indigo" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    indigo: "bg-indigo-100 text-indigo-600",
    sky: "bg-sky-100 text-sky-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${colors[color]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-content-tertiary">
            {label}
          </p>
          <p className="text-3xl font-semibold text-content-primary sm:text-3xl">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;

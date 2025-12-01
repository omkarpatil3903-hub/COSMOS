// src/components/StatCard.jsx
import React from "react";
import Card from "./Card"; // Assuming Card is in the same folder

const StatCard = ({ icon, label, value, subValue, color = "indigo" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    indigo: "bg-indigo-100 text-indigo-600",
    sky: "bg-sky-100 text-sky-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
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
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-content-primary">
              {value}
            </div>
            {subValue && (
              <p className="text-xs font-medium text-content-secondary mt-0.5">
                {subValue}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;

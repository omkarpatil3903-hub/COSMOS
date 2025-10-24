// src/components/StatCard.jsx
import React from "react";
import Card from "./Card"; // Assuming Card is in the same folder

const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };

  return (
    <Card>
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colors[color]}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;

// src/components/Card.jsx
import React from "react";

function Card({ title, children, actions }) {
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Card Header */}
      {(title || actions) && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          {title && (
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Card Body */}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default Card;

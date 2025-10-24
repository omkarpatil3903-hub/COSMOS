// src/components/PageHeader.jsx
import React from "react";

function PageHeader({ title, children, actions }) {
  return (
    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
      {/* Title and Subtitle Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        {children && <p className="mt-2 text-gray-600">{children}</p>}
      </div>

      {/* Actions Section (for buttons) */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;

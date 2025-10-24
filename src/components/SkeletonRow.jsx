// src/components/SkeletonRow.jsx
import React from "react";

// The 'columns' prop tells the component how many skeleton cells to create.
function SkeletonRow({ columns }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-4 px-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded-md"></div>
        </td>
      ))}
    </tr>
  );
}

export default SkeletonRow;

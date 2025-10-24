// src/components/Spinner.jsx
import React from "react";

function Spinner() {
  return (
    <div className="flex justify-center items-center p-10">
      <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-indigo-600"></div>
    </div>
  );
}

export default Spinner;

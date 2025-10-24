// src/components/Spinner.jsx
import React from "react";

function Spinner() {
  return (
    <div className="flex items-center justify-center p-10">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

export default Spinner;

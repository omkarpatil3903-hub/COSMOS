import React from "react";
import { FaSearch } from "react-icons/fa";

function SearchActions({
  value,
  onChange,
  placeholder = "Search by name, location or tag",
  rightActions,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xl">
        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary [.dark_&]:text-gray-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-subtle [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] pl-9 pr-3 py-2 text-sm [.dark_&]:text-white focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
        />
      </div>
      {rightActions && (
        <div className="flex items-center gap-2 shrink-0">{rightActions}</div>
      )}
    </div>
  );
}

export default SearchActions;

// src/components/Accordion.jsx
import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

// This component takes an array of 'items', where each item has a 'title' and 'content'.
function Accordion({ items }) {
  // This state keeps track of which accordion item is currently open.
  const [activeIndex, setActiveIndex] = useState(0); // Open the first item by default

  const handleItemClick = (index) => {
    // If the clicked item is already open, close it. Otherwise, open the new one.
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          {/* Accordion Header */}
          <button
            onClick={() => handleItemClick(index)}
            className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none"
          >
            <span className="text-lg font-semibold text-gray-800">
              {item.title}
            </span>
            <FaChevronDown
              className={`transition-transform duration-300 ${
                activeIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Accordion Content */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              activeIndex === index ? "max-h-[1000px]" : "max-h-0"
            }`}
          >
            <div className="p-4 bg-white">{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Accordion;

// src/components/Button.jsx
import React from "react";

// The component now accepts 'className' as a prop
function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  ...props
}) {
  // Base styles for all buttons
  const baseStyle =
    "px-4 py-2 font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Variant-specific styles
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  // Disabled styles
  const disabledStyle = "disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      // This line is now updated to include the external className
      className={`${baseStyle} ${styles[variant]} ${disabledStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

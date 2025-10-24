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
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  // Variant-specific styles
  const styles = {
    primary:
      "bg-indigo-600 text-white shadow-soft hover:bg-indigo-700 focus-visible:ring-indigo-500",
    secondary:
      "border border-subtle bg-surface text-content-primary hover:border-indigo-200 hover:text-indigo-700 focus-visible:ring-indigo-500",
    ghost:
      "text-content-secondary hover:bg-surface-subtle hover:text-content-primary focus-visible:ring-indigo-500",
    danger:
      "bg-red-600 text-white shadow-soft hover:bg-red-700 focus-visible:ring-red-500",
  };

  // Disabled styles
  const disabledStyle = "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      // This line is now updated to include the external className
      className={`${baseStyle} ${
        styles[variant] || styles.primary
      } ${disabledStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

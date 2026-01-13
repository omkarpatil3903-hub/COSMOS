/**
 * Button Component
 *
 * Purpose: Reusable button component with multiple variants.
 * Base styles with variant-specific colors and states.
 *
 * Responsibilities:
 * - Render button with consistent base styling
 * - Apply variant-specific colors
 * - Handle disabled state with opacity
 * - Support custom className override for "custom" variant
 *
 * Props:
 * - children: Button content
 * - onClick: Click handler
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'custom'
 * - type: Button type (default: 'button')
 * - disabled: Disable button
 * - className: Additional classes (used fully in 'custom' variant)
 *
 * Variants:
 * - primary: Indigo background, white text
 * - secondary: Border, surface bg, hover indigo
 * - ghost: Transparent, hover subtle bg
 * - danger: Red background, white text
 * - custom: No default styles, fully controlled by className
 *
 * Last Modified: 2026-01-10
 */

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
    custom:
      "", // No default styles - allows full control via className prop
  };

  // Disabled styles
  const disabledStyle = "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      // When using custom variant, className should override everything
      className={`${baseStyle} ${variant === 'custom' ? className : `${styles[variant] || styles.primary} ${className}`}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

/**
 * PanelSwitcher Component
 *
 * Purpose: Dropdown for switching between accessible panels/dashboards.
 * Allows users with multiple roles to navigate between their panels.
 *
 * Responsibilities:
 * - Show current panel as trigger button
 * - Display dropdown with all accessible panels
 * - Handle panel switching via navigation
 * - Support collapsed sidebar mode
 * - Theme-aware accent colors
 *
 * Dependencies:
 * - useAuthContext for accessiblePanels
 * - useTheme for accent colors
 * - React Router (useNavigate, useLocation)
 * - react-icons (FaShieldAlt, FaUserShield, FaUserTie, etc.)
 *
 * Props:
 * - isCollapsed: Whether sidebar is collapsed (changes layout)
 *
 * Features:
 * - Only renders if user has >1 accessible panel
 * - Panel detection based on current pathname
 * - Icon mapping for panel types
 * - Checkmark on currently active panel
 * - Click outside to close dropdown
 * - Accent-based color theming
 *
 * Panel Detection:
 * - /admin -> Admin panel
 * - /manager -> Manager panel
 * - /employee -> Employee panel
 * - /client -> Client panel
 * - / -> SuperAdmin root
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";

import {
    FaShieldAlt,
    FaUserShield,
    FaUserTie,
    FaUser,
    FaBriefcase,
    FaExchangeAlt,
    FaCheck,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

// Icon mapping for panel types
const ICON_MAP = {
    FaShieldAlt: FaShieldAlt,
    FaUserShield: FaUserShield,
    FaUserTie: FaUserTie,
    FaUser: FaUser,
    FaBriefcase: FaBriefcase,
};

function PanelSwitcher({ isCollapsed = false, setIsCollapsed }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { accessiblePanels } = useAuthContext();
    const { accent, mode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const wasCollapsedRef = useRef(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                // If we auto-expanded and click outside, revert state
                if (isOpen && wasCollapsedRef.current && setIsCollapsed) {
                    setIsCollapsed(true);
                    wasCollapsedRef.current = false;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, setIsCollapsed]);

    // Only show if user can access more than one panel
    if (!accessiblePanels || accessiblePanels.length <= 1) {
        return null;
    }

    // Determine current panel based on pathname
    const getCurrentPanel = () => {
        const path = location.pathname;
        if (path.startsWith("/admin")) return "/admin";
        if (path.startsWith("/manager")) return "/manager";
        if (path.startsWith("/employee")) return "/employee";
        if (path.startsWith("/client")) return "/client";
        return "/"; // SuperAdmin root
    };

    const currentPanel = getCurrentPanel();
    const currentPanelData = accessiblePanels.find(
        (p) => p.path === currentPanel
    );

    // Get accent-based colors
    const getAccentColors = () => {
        const colorMap = {
            purple: {
                bg: "bg-purple-100",
                text: "text-purple-600",
                hover: "hover:bg-purple-50",
                darkBg: "bg-purple-900/30",
                darkText: "text-purple-400",
            },
            blue: {
                bg: "bg-sky-100",
                text: "text-sky-600",
                hover: "hover:bg-sky-50",
                darkBg: "bg-sky-900/30",
                darkText: "text-sky-400",
            },
            pink: {
                bg: "bg-pink-100",
                text: "text-pink-600",
                hover: "hover:bg-pink-50",
                darkBg: "bg-pink-900/30",
                darkText: "text-pink-400",
            },
            violet: {
                bg: "bg-violet-100",
                text: "text-violet-600",
                hover: "hover:bg-violet-50",
                darkBg: "bg-violet-900/30",
                darkText: "text-violet-400",
            },
            orange: {
                bg: "bg-amber-100",
                text: "text-amber-600",
                hover: "hover:bg-amber-50",
                darkBg: "bg-amber-900/30",
                darkText: "text-amber-400",
            },
            teal: {
                bg: "bg-teal-100",
                text: "text-teal-600",
                hover: "hover:bg-teal-50",
                darkBg: "bg-teal-900/30",
                darkText: "text-teal-400",
            },
            bronze: {
                bg: "bg-amber-100",
                text: "text-amber-700",
                hover: "hover:bg-amber-50",
                darkBg: "bg-amber-900/30",
                darkText: "text-amber-500",
            },
            mint: {
                bg: "bg-emerald-100",
                text: "text-emerald-600",
                hover: "hover:bg-emerald-50",
                darkBg: "bg-emerald-900/30",
                darkText: "text-emerald-400",
            },
            black: {
                bg: "bg-gray-200",
                text: "text-gray-800",
                hover: "hover:bg-gray-100",
                darkBg: "bg-white/10",
                darkText: "text-gray-300",
            },
            indigo: {
                bg: "bg-indigo-100",
                text: "text-indigo-600",
                hover: "hover:bg-indigo-50",
                darkBg: "bg-indigo-900/30",
                darkText: "text-indigo-400",
            },
        };
        return colorMap[accent] || colorMap.indigo;
    };

    const accentColors = getAccentColors();
    const isDark = mode === "dark";

    // Check for auto-collapse flag on mount (persisted across layout unmounts)
    useEffect(() => {
        const shouldAutoCollapse = localStorage.getItem("cosmos_auto_collapse_sidebar");
        if (shouldAutoCollapse === "true" && setIsCollapsed) {
            setIsCollapsed(true);
            localStorage.removeItem("cosmos_auto_collapse_sidebar");
        }
    }, [setIsCollapsed]);

    const handleTriggerClick = () => {
        if (!isOpen) { // Opening
            if (isCollapsed && setIsCollapsed) {
                setIsCollapsed(false);
                wasCollapsedRef.current = true;
            } else {
                wasCollapsedRef.current = false;
            }
            setIsOpen(true);
        } else { // Closing
            setIsOpen(false);
            if (wasCollapsedRef.current && setIsCollapsed) {
                setIsCollapsed(true);
                wasCollapsedRef.current = false;
            }
        }
    };

    const handlePanelSwitch = (panelPath) => {
        setIsOpen(false);

        // If we auto-expanded, set a flag for the NEXT layout to read
        if (wasCollapsedRef.current) {
            localStorage.setItem("cosmos_auto_collapse_sidebar", "true");
            wasCollapsedRef.current = false;
        }

        if (panelPath !== currentPanel) {
            navigate(panelPath);
        }
    };

    const getIconComponent = (iconName) => {
        const IconComponent = ICON_MAP[iconName] || FaUser;
        return IconComponent;
    };

    const getPanelIconColor = (path) => {
        if (accent === "black" && isDark) {
            if (path === "/") return "text-indigo-400"; // Super Admin
            if (path.startsWith("/admin")) return "text-blue-400"; // Admin
            if (path.startsWith("/manager")) return "text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"; // Manager
            if (path.startsWith("/employee")) return "text-amber-400"; // Employee
            if (path.startsWith("/client")) return "text-cyan-400"; // Client
        }
        return "";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={handleTriggerClick}
                className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${isDark
                    ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                    : `bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200`
                    } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? "Switch Panel" : ""}
            >
                <FaExchangeAlt
                    className={`h-4 w-4 shrink-0 ${isDark ? accentColors.darkText : accentColors.text
                        }`}
                />
                {!isCollapsed && (
                    <>
                        <span className="truncate flex-1 text-left">
                            {currentPanelData?.label || "Switch Panel"}
                        </span>
                        <svg
                            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`absolute ${isCollapsed ? "left-full ml-2" : "left-0 right-0"
                        } top-full mt-2 z-50 rounded-xl shadow-lg border overflow-hidden ${isDark
                            ? "bg-[#1F2234] border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                    style={{ minWidth: isCollapsed ? "200px" : "auto" }}
                >
                    <div
                        className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDark
                            ? "text-gray-500 border-b border-white/5"
                            : "text-gray-500 border-b border-gray-100"
                            }`}
                    >
                        Switch Panel
                    </div>
                    <div className="py-1">
                        {accessiblePanels.map((panel) => {
                            const IconComponent = getIconComponent(panel.icon);
                            const isActive = panel.path === currentPanel;
                            const iconColorClass = getPanelIconColor(panel.path);

                            return (
                                <button
                                    key={panel.path}
                                    onClick={() => handlePanelSwitch(panel.path)}
                                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors cursor-pointer ${isActive
                                        ? isDark
                                            ? `${accentColors.darkBg} ${accentColors.darkText}`
                                            : `${accentColors.bg} ${accentColors.text}`
                                        : isDark
                                            ? "text-gray-300 hover:bg-white/5"
                                            : `text-gray-700 ${accentColors.hover}`
                                        }`}
                                >
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive
                                            ? isDark
                                                ? "bg-white/10"
                                                : accentColors.bg
                                            : isDark
                                                ? "bg-white/5"
                                                : "bg-gray-100"
                                            } ${iconColorClass}`}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                    </span>
                                    <span className="flex-1 text-left font-medium">
                                        {panel.label}
                                    </span>
                                    {isActive && <FaCheck className="h-3.5 w-3.5 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PanelSwitcher;

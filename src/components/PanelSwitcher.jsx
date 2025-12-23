// src/components/PanelSwitcher.jsx
// Reusable component for switching between accessible panels
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

function PanelSwitcher({ isCollapsed = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { accessiblePanels } = useAuthContext();
    const { accent, mode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const handlePanelSwitch = (panelPath) => {
        setIsOpen(false);
        if (panelPath !== currentPanel) {
            navigate(panelPath);
        }
    };

    const getIconComponent = (iconName) => {
        const IconComponent = ICON_MAP[iconName] || FaUser;
        return IconComponent;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isDark
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

                            return (
                                <button
                                    key={panel.path}
                                    onClick={() => handlePanelSwitch(panel.path)}
                                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${isActive
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
                                            }`}
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

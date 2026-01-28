/**
 * useThemeStyles Hook
 *
 * Purpose: Provides centralized, theme-aware Tailwind CSS class names
 * based on the current accent color from ThemeContext.
 *
 * Responsibilities:
 * - Maps accent color selections to corresponding Tailwind CSS classes
 * - Provides consistent styling across all UI components
 * - Handles both light and dark mode variants using Tailwind's dark: prefix
 * - Returns pre-computed class strings for immediate use in className props
 *
 * Dependencies:
 * - ThemeContext (useTheme hook for current accent color)
 * - Tailwind CSS (all returned classes are Tailwind utilities)
 *
 * Supported Accent Colors:
 * - indigo (default), purple, blue, pink, violet, orange, teal, bronze, mint, black
 *
 * Last Modified: 2026-01-10
 */

import { useTheme } from "../context/ThemeContext";

/**
 * Custom hook for theme-aware styling classes.
 *
 * @returns {Object} Theme style classes and utilities:
 *   - buttonClass: Primary button styling (bg, hover, shadow, text)
 *   - iconColor: Icon text color class
 *   - headerIconClass: Icon container styling for headers (bg + text, light/dark)
 *   - badgeClass: Badge/pill styling (bg, text, border, light/dark)
 *   - gradientClass: Gradient from/to classes for accent gradients
 *   - hoverBorderClass: Border color on hover (light/dark)
 *   - linkColor: Text color for links
 *   - emailLinkClass: Email/URL link styling with dark mode support
 *   - barColor: Solid background color for progress bars, dividers
 *   - accent: Raw accent color name for custom logic
 *
 * @example
 * const { buttonClass, iconColor, gradientClass } = useThemeStyles();
 * <button className={buttonClass}>Submit</button>
 * <Icon className={iconColor} />
 * <div className={`bg-gradient-to-r ${gradientClass}`}>...</div>
 */
export const useThemeStyles = () => {
    const { accent } = useTheme();

    /**
     * Returns primary button classes based on current accent.
     * Includes background, hover state, shadow, and text color.
     *
     * DESIGN DECISION: 'black' accent maps to blue for better visual contrast
     * Reason: Pure black buttons lack visual appeal; blue provides brand consistency
     */
    const getButtonClass = () => {
        if (accent === 'black') return 'bg-blue-600 hover:bg-blue-700 shadow-sm text-white';
        switch (accent) {
            case 'purple': return 'bg-purple-600 hover:bg-purple-700 shadow-sm text-white';
            case 'blue': return 'bg-sky-600 hover:bg-sky-700 shadow-sm text-white';
            case 'pink': return 'bg-pink-600 hover:bg-pink-700 shadow-sm text-white';
            case 'violet': return 'bg-violet-600 hover:bg-violet-700 shadow-sm text-white';
            case 'orange': return 'bg-amber-600 hover:bg-amber-700 shadow-sm text-white';
            case 'teal': return 'bg-teal-600 hover:bg-teal-700 shadow-sm text-white';
            case 'bronze': return 'bg-amber-600 hover:bg-amber-700 shadow-sm text-white';
            case 'mint': return 'bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white';
            default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white';
        }
    };

    /**
     * Returns icon text color class based on current accent.
     * Uses 500 shade for good visibility on both light and dark backgrounds.
     */
    const getIconColor = () => {
        if (accent === 'black') return 'text-blue-500';
        switch (accent) {
            case 'purple': return 'text-purple-500';
            case 'blue': return 'text-sky-500';
            case 'pink': return 'text-pink-500';
            case 'violet': return 'text-violet-500';
            case 'orange': return 'text-amber-500';
            case 'teal': return 'text-teal-500';
            case 'bronze': return 'text-amber-600';
            case 'mint': return 'text-emerald-500';
            default: return 'text-indigo-500';
        }
    };

    const getHeaderIconClass = () => {
        if (accent === 'black') return 'bg-blue-100 text-blue-600 [.dark_&]:bg-blue-500/20 [.dark_&]:text-blue-300';
        switch (accent) {
            case 'purple': return 'bg-purple-100 text-purple-600 [.dark_&]:bg-purple-500/20 [.dark_&]:text-purple-300';
            case 'blue': return 'bg-sky-100 text-sky-600 [.dark_&]:bg-sky-500/20 [.dark_&]:text-sky-300';
            case 'pink': return 'bg-pink-100 text-pink-600 [.dark_&]:bg-pink-500/20 [.dark_&]:text-pink-300';
            case 'violet': return 'bg-violet-100 text-violet-600 [.dark_&]:bg-violet-500/20 [.dark_&]:text-violet-300';
            case 'orange': return 'bg-amber-100 text-amber-600 [.dark_&]:bg-amber-500/20 [.dark_&]:text-amber-300';
            case 'teal': return 'bg-teal-100 text-teal-600 [.dark_&]:bg-teal-500/20 [.dark_&]:text-teal-300';
            case 'bronze': return 'bg-amber-100 text-amber-700 [.dark_&]:bg-amber-500/20 [.dark_&]:text-amber-300';
            case 'mint': return 'bg-emerald-100 text-emerald-600 [.dark_&]:bg-emerald-500/20 [.dark_&]:text-emerald-300';
            default: return 'bg-indigo-100 text-indigo-600 [.dark_&]:bg-indigo-500/20 [.dark_&]:text-indigo-300';
        }
    };

    const getBadgeClass = () => {
        if (accent === 'black') return 'bg-blue-50 text-blue-700 border-blue-100 [.dark_&]:bg-blue-500/10 [.dark_&]:text-blue-300 [.dark_&]:border-blue-500/30';
        switch (accent) {
            case 'purple': return 'bg-purple-50 text-purple-700 border-purple-100 [.dark_&]:bg-purple-500/10 [.dark_&]:text-purple-300 [.dark_&]:border-purple-500/30';
            case 'blue': return 'bg-sky-50 text-sky-700 border-sky-100 [.dark_&]:bg-sky-500/10 [.dark_&]:text-sky-300 [.dark_&]:border-sky-500/30';
            case 'pink': return 'bg-pink-50 text-pink-700 border-pink-100 [.dark_&]:bg-pink-500/10 [.dark_&]:text-pink-300 [.dark_&]:border-pink-500/30';
            case 'violet': return 'bg-violet-50 text-violet-700 border-violet-100 [.dark_&]:bg-violet-500/10 [.dark_&]:text-violet-300 [.dark_&]:border-violet-500/30';
            case 'orange': return 'bg-amber-50 text-amber-700 border-amber-100 [.dark_&]:bg-amber-500/10 [.dark_&]:text-amber-300 [.dark_&]:border-amber-500/30';
            case 'teal': return 'bg-teal-50 text-teal-700 border-teal-100 [.dark_&]:bg-teal-500/10 [.dark_&]:text-teal-300 [.dark_&]:border-teal-500/30';
            case 'bronze': return 'bg-amber-50 text-amber-700 border-amber-100 [.dark_&]:bg-amber-500/10 [.dark_&]:text-amber-300 [.dark_&]:border-amber-500/30';
            case 'mint': return 'bg-emerald-50 text-emerald-700 border-emerald-100 [.dark_&]:bg-emerald-500/10 [.dark_&]:text-emerald-300 [.dark_&]:border-emerald-500/30';
            default: return 'bg-indigo-50 text-indigo-700 border-indigo-100 [.dark_&]:bg-indigo-500/10 [.dark_&]:text-indigo-300 [.dark_&]:border-indigo-500/30';
        }
    };

    const getGradientClass = () => {
        if (accent === 'black') return 'from-blue-400 to-blue-600';
        switch (accent) {
            case 'purple': return 'from-purple-400 to-purple-600';
            case 'blue': return 'from-sky-400 to-sky-600';
            case 'pink': return 'from-pink-400 to-pink-600';
            case 'violet': return 'from-violet-400 to-violet-600';
            case 'orange': return 'from-amber-400 to-amber-600';
            case 'teal': return 'from-teal-400 to-teal-600';
            case 'bronze': return 'from-amber-500 to-amber-700';
            case 'mint': return 'from-emerald-400 to-emerald-600';
            default: return 'from-indigo-400 to-purple-500';
        }
    };

    const getHoverBorderClass = () => {
        if (accent === 'black') return 'hover:border-blue-100 [.dark_&]:hover:border-blue-400';
        switch (accent) {
            case 'purple': return 'hover:border-purple-100 [.dark_&]:hover:border-purple-400';
            case 'blue': return 'hover:border-sky-100 [.dark_&]:hover:border-sky-400';
            case 'pink': return 'hover:border-pink-100 [.dark_&]:hover:border-pink-400';
            case 'violet': return 'hover:border-violet-100 [.dark_&]:hover:border-violet-400';
            case 'orange': return 'hover:border-amber-100 [.dark_&]:hover:border-amber-400';
            case 'teal': return 'hover:border-teal-100 [.dark_&]:hover:border-teal-400';
            case 'bronze': return 'hover:border-amber-100 [.dark_&]:hover:border-amber-400';
            case 'mint': return 'hover:border-emerald-100 [.dark_&]:hover:border-emerald-400';
            default: return 'hover:border-indigo-100 [.dark_&]:hover:border-indigo-400';
        }
    };

    const getLinkColor = () => {
        if (accent === 'black') return 'text-blue-600';
        switch (accent) {
            case 'purple': return 'text-purple-600';
            case 'blue': return 'text-sky-600';
            case 'pink': return 'text-pink-600';
            case 'violet': return 'text-violet-600';
            case 'orange': return 'text-amber-600';
            case 'teal': return 'text-teal-600';
            case 'bronze': return 'text-amber-700';
            case 'mint': return 'text-emerald-600';
            default: return 'text-indigo-600';
        }
    };

    const getEmailLinkClass = () => {
        if (accent === 'black') return 'text-blue-600 [.dark_&]:text-blue-400';
        switch (accent) {
            case 'purple': return 'text-purple-600 [.dark_&]:text-purple-400';
            case 'blue': return 'text-sky-600 [.dark_&]:text-sky-400';
            case 'pink': return 'text-pink-600 [.dark_&]:text-pink-400';
            case 'violet': return 'text-violet-600 [.dark_&]:text-violet-400';
            case 'orange': return 'text-amber-600 [.dark_&]:text-amber-400';
            case 'teal': return 'text-teal-600 [.dark_&]:text-teal-400';
            case 'bronze': return 'text-amber-700 [.dark_&]:text-amber-400';
            case 'mint': return 'text-emerald-600 [.dark_&]:text-emerald-400';
            default: return 'text-indigo-600 [.dark_&]:text-indigo-400';
        }
    };

    const getBarColor = () => {
        if (accent === 'black') return 'bg-blue-600';
        switch (accent) {
            case 'purple': return 'bg-purple-600';
            case 'blue': return 'bg-sky-600';
            case 'pink': return 'bg-pink-600';
            case 'violet': return 'bg-violet-600';
            case 'orange': return 'bg-amber-600';
            case 'teal': return 'bg-teal-600';
            case 'bronze': return 'bg-amber-700';
            case 'mint': return 'bg-emerald-600';
            default: return 'bg-indigo-600';
        }
    };

    /**
     * Returns selected/active state background class (light tint).
     * Use for row selections, active tabs, highlighted items.
     */
    const getSelectedBgClass = () => {
        if (accent === 'black') return 'bg-blue-50 [.dark_&]:bg-blue-900/20';
        switch (accent) {
            case 'purple': return 'bg-purple-50 [.dark_&]:bg-purple-900/20';
            case 'blue': return 'bg-sky-50 [.dark_&]:bg-sky-900/20';
            case 'pink': return 'bg-pink-50 [.dark_&]:bg-pink-900/20';
            case 'violet': return 'bg-violet-50 [.dark_&]:bg-violet-900/20';
            case 'orange': return 'bg-amber-50 [.dark_&]:bg-amber-900/20';
            case 'teal': return 'bg-teal-50 [.dark_&]:bg-teal-900/20';
            case 'bronze': return 'bg-amber-50 [.dark_&]:bg-amber-900/20';
            case 'mint': return 'bg-emerald-50 [.dark_&]:bg-emerald-900/20';
            default: return 'bg-indigo-50 [.dark_&]:bg-indigo-900/20';
        }
    };

    /**
     * Returns hover accent classes for interactive elements.
     * Use for icon buttons, list items that need hover feedback.
     */
    const getHoverAccentClass = () => {
        if (accent === 'black') return 'hover:text-blue-600 hover:bg-blue-50 [.dark_&]:hover:text-blue-400 [.dark_&]:hover:bg-blue-900/20';
        switch (accent) {
            case 'purple': return 'hover:text-purple-600 hover:bg-purple-50 [.dark_&]:hover:text-purple-400 [.dark_&]:hover:bg-purple-900/20';
            case 'blue': return 'hover:text-sky-600 hover:bg-sky-50 [.dark_&]:hover:text-sky-400 [.dark_&]:hover:bg-sky-900/20';
            case 'pink': return 'hover:text-pink-600 hover:bg-pink-50 [.dark_&]:hover:text-pink-400 [.dark_&]:hover:bg-pink-900/20';
            case 'violet': return 'hover:text-violet-600 hover:bg-violet-50 [.dark_&]:hover:text-violet-400 [.dark_&]:hover:bg-violet-900/20';
            case 'orange': return 'hover:text-amber-600 hover:bg-amber-50 [.dark_&]:hover:text-amber-400 [.dark_&]:hover:bg-amber-900/20';
            case 'teal': return 'hover:text-teal-600 hover:bg-teal-50 [.dark_&]:hover:text-teal-400 [.dark_&]:hover:bg-teal-900/20';
            case 'bronze': return 'hover:text-amber-700 hover:bg-amber-50 [.dark_&]:hover:text-amber-400 [.dark_&]:hover:bg-amber-900/20';
            case 'mint': return 'hover:text-emerald-600 hover:bg-emerald-50 [.dark_&]:hover:text-emerald-400 [.dark_&]:hover:bg-emerald-900/20';
            default: return 'hover:text-indigo-600 hover:bg-indigo-50 [.dark_&]:hover:text-indigo-400 [.dark_&]:hover:bg-indigo-900/20';
        }
    };

    /**
     * Returns text color for selected/highlighted items.
     * Use for text inside selected rows, active menu items.
     */
    const getSelectedTextClass = () => {
        if (accent === 'black') return 'text-blue-700 [.dark_&]:text-blue-300';
        switch (accent) {
            case 'purple': return 'text-purple-700 [.dark_&]:text-purple-300';
            case 'blue': return 'text-sky-700 [.dark_&]:text-sky-300';
            case 'pink': return 'text-pink-700 [.dark_&]:text-pink-300';
            case 'violet': return 'text-violet-700 [.dark_&]:text-violet-300';
            case 'orange': return 'text-amber-700 [.dark_&]:text-amber-300';
            case 'teal': return 'text-teal-700 [.dark_&]:text-teal-300';
            case 'bronze': return 'text-amber-800 [.dark_&]:text-amber-300';
            case 'mint': return 'text-emerald-700 [.dark_&]:text-emerald-300';
            default: return 'text-indigo-700 [.dark_&]:text-indigo-300';
        }
    };

    /**
     * Returns focus ring and border classes for forms and buttons.
     * Use for input focus states, checkbox accents.
     */
    const getRingClass = () => {
        if (accent === 'black') return 'focus:ring-blue-500 focus:border-blue-500';
        switch (accent) {
            case 'purple': return 'focus:ring-purple-500 focus:border-purple-500';
            case 'blue': return 'focus:ring-sky-500 focus:border-sky-500';
            case 'pink': return 'focus:ring-pink-500 focus:border-pink-500';
            case 'violet': return 'focus:ring-violet-500 focus:border-violet-500';
            case 'orange': return 'focus:ring-amber-500 focus:border-amber-500';
            case 'teal': return 'focus:ring-teal-500 focus:border-teal-500';
            case 'bronze': return 'focus:ring-amber-600 focus:border-amber-600';
            case 'mint': return 'focus:ring-emerald-500 focus:border-emerald-500';
            default: return 'focus:ring-indigo-500 focus:border-indigo-500';
        }
    };

    /**
     * Returns group-hover text color class.
     * Use for child elements that change color when parent group is hovered.
     * IMPORTANT: Tailwind requires complete class names - cannot interpolate.
     */
    const getGroupHoverTextClass = () => {
        if (accent === 'black') return 'group-hover:text-blue-600 [.dark_&]:group-hover:text-blue-400';
        switch (accent) {
            case 'purple': return 'group-hover:text-purple-600 [.dark_&]:group-hover:text-purple-400';
            case 'blue': return 'group-hover:text-sky-600 [.dark_&]:group-hover:text-sky-400';
            case 'pink': return 'group-hover:text-pink-600 [.dark_&]:group-hover:text-pink-400';
            case 'violet': return 'group-hover:text-violet-600 [.dark_&]:group-hover:text-violet-400';
            case 'orange': return 'group-hover:text-amber-600 [.dark_&]:group-hover:text-amber-400';
            case 'teal': return 'group-hover:text-teal-600 [.dark_&]:group-hover:text-teal-400';
            case 'bronze': return 'group-hover:text-amber-700 [.dark_&]:group-hover:text-amber-400';
            case 'mint': return 'group-hover:text-emerald-600 [.dark_&]:group-hover:text-emerald-400';
            default: return 'group-hover:text-indigo-600 [.dark_&]:group-hover:text-indigo-400';
        }
    };

    return {
        buttonClass: getButtonClass(),
        iconColor: getIconColor(),
        headerIconClass: getHeaderIconClass(),
        badgeClass: getBadgeClass(),
        gradientClass: getGradientClass(),
        hoverBorderClass: getHoverBorderClass(),
        linkColor: getLinkColor(),
        emailLinkClass: getEmailLinkClass(),
        barColor: getBarColor(),
        selectedBgClass: getSelectedBgClass(),
        hoverAccentClass: getHoverAccentClass(),
        selectedTextClass: getSelectedTextClass(),
        ringClass: getRingClass(),
        groupHoverTextClass: getGroupHoverTextClass(),
        accent, // Expose accent for custom logic
    };
};

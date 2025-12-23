import { useTheme } from "../context/ThemeContext";

/**
 * Custom hook that provides theme-aware styling classes
 * This centralizes all theme-based styling logic in one place
 */
export const useThemeStyles = () => {
    const { accent } = useTheme();

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
    };
};

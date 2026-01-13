/**
 * UserAvatar Component
 *
 * Purpose: Reusable avatar component for displaying user profile images.
 * Falls back to initials when no image is available.
 *
 * Responsibilities:
 * - Display user profile image with rounded styling
 * - Show initial badge when image not available or fails
 * - Handle image load errors gracefully
 * - Support multiple size variants
 * - Optional status indicator dot
 *
 * Dependencies:
 * - React useState for image error tracking
 *
 * Props:
 * - user: Object with name and imageUrl
 * - size: 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
 * - className: Additional CSS classes
 * - showStatusDot: Show status indicator (default: false)
 * - status: Task status for dot color (Done/In Progress/other)
 *
 * Size Variants:
 * - xs: w-6 h-6, text-[10px]
 * - sm: w-8 h-8, text-xs
 * - md: w-10 h-10, text-sm
 * - lg: w-12 h-12, text-base
 *
 * Status Dot Colors:
 * - Done: green-500
 * - In Progress: amber-500
 * - Other: gray-400
 *
 * Fallback Behavior:
 * - Uses first letter of user.name as initial
 * - Shows '?' if name not available
 * - Tracks imageError state to switch to fallback
 *
 * Last Modified: 2026-01-10
 */

import React, { useState } from 'react';
const UserAvatar = ({
    user,
    size = 'md',
    className = '',
    showStatusDot = false,
    status = null
}) => {
    const [imageError, setImageError] = useState(false);

    // Size mappings
    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    const dotSizeClasses = {
        xs: 'w-2 h-2',
        sm: 'w-2.5 h-2.5',
        md: 'w-3 h-3',
        lg: 'w-3.5 h-3.5'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const dotSizeClass = dotSizeClasses[size] || dotSizeClasses.md;

    const hasImage = user?.imageUrl && !imageError;
    const initial = user?.name?.[0]?.toUpperCase() || '?';

    // Status dot color
    const getStatusDotColor = () => {
        if (status === 'Done') return 'bg-green-500';
        if (status === 'In Progress') return 'bg-amber-500';
        return 'bg-gray-400';
    };

    return (
        <div className={`relative ${sizeClass} ${className}`}>
            {hasImage ? (
                <img
                    src={user.imageUrl}
                    alt={user.name || 'User'}
                    className={`${sizeClass} rounded-full object-cover border-2 border-white [.dark_&]:border-[#181B2A]`}
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className={`${sizeClass} rounded-full bg-indigo-100 [.dark_&]:bg-indigo-800 border-2 border-white [.dark_&]:border-[#181B2A] flex items-center justify-center font-bold text-indigo-700 [.dark_&]:text-indigo-300`}>
                    {initial}
                </div>
            )}

            {showStatusDot && status && (
                <div
                    className={`absolute -bottom-0.5 -right-0.5 ${dotSizeClass} ${getStatusDotColor()} border-2 border-white [.dark_&]:border-[#1e212b] rounded-full`}
                    title={status}
                />
            )}
        </div>
    );
};

export default UserAvatar;

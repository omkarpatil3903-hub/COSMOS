import React, { useState } from 'react';

/**
 * UserAvatar - Reusable avatar component that displays user profile image or initials
 * @param {Object} user - User object with name and imageUrl
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} className - Additional CSS classes
 * @param {boolean} showStatusDot - Whether to show status indicator
 * @param {string} status - User's task status (Done, In Progress, etc.)
 */
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

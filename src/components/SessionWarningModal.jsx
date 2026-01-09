/**
 * Session Warning Modal Component
 * 
 * Purpose: Displays a warning modal before automatic logout due to inactivity.
 * 
 * Responsibilities:
 * - Shows countdown timer before auto-logout
 * - Provides "Stay Logged In" button to reset inactivity timer
 * - Provides "Logout Now" button for immediate logout
 * - Standard UI styling matching other project modals (e.g. ChangePasswordModal)
 * 
 * Dependencies:
 * - react-icons (FaClock, FaSignOutAlt, FaShieldAlt)
 * - Tailwind CSS for styling
 */
import { FaClock, FaSignOutAlt, FaShieldAlt } from "react-icons/fa";

/**
 * Modal component that warns users before automatic logout.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {number} props.remainingTime - Seconds remaining before logout
 * @param {Function} props.onStayLoggedIn - Callback when user wants to stay logged in
 * @param {Function} props.onLogout - Callback when user wants to logout immediately
 * 
 * @returns {JSX.Element|null} The warning modal or null if not open
 */
function SessionWarningModal({
    isOpen,
    remainingTime,
    onStayLoggedIn,
    onLogout,
}) {
    if (!isOpen) return null;

    // URGENCY INDICATOR
    // Business Rule: Show red text for timer when less than 10 seconds remain
    const isUrgent = remainingTime <= 10;

    /**
     * Formats seconds into MM:SS display format.
     */
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            // No onClick to dismiss - security requirement
            />

            {/* Modal Content - Matching Project Standard */}
            <div className="relative bg-white [.dark_&]:bg-[#1F2234] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">

                {/* Header Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 [.dark_&]:bg-indigo-500/10 flex items-center justify-center">
                        <FaClock className="text-3xl text-indigo-500 [.dark_&]:text-indigo-400" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-center text-gray-900 [.dark_&]:text-white mb-2">
                    Session Timeout
                </h2>

                {/* Description */}
                <p className="text-center text-gray-600 [.dark_&]:text-gray-400 text-sm mb-6">
                    You will be logged out due to inactivity.
                </p>

                {/* Countdown Timer */}
                <div className="text-center mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-500 [.dark_&]:text-gray-500 mb-1">
                        Logging out in
                    </p>
                    <p
                        className={`text-4xl font-bold font-mono ${isUrgent
                                ? "text-red-600 [.dark_&]:text-red-400"
                                : "text-gray-900 [.dark_&]:text-white"
                            }`}
                    >
                        {formatTime(remainingTime)}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {/* Logout Button */}
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 [.dark_&]:border-white/10 text-gray-700 [.dark_&]:text-gray-300 hover:bg-gray-50 [.dark_&]:hover:bg-white/5 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <FaSignOutAlt className="text-sm" />
                        Logout
                    </button>

                    {/* Stay Logged In Button */}
                    <button
                        type="button"
                        onClick={onStayLoggedIn}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <FaShieldAlt className="text-sm" />
                        Stay Active
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SessionWarningModal;

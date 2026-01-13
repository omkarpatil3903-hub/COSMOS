/**
 * useSessionSecurity Hook
 * 
 * Purpose: Manages session security through inactivity timeout and session duration limits.
 * 
 * Responsibilities:
 * - Tracks user activity (mouse, keyboard, clicks, touch, scroll)
 * - Auto-logout after configurable period of inactivity
 * - Force logout after maximum session duration regardless of activity
 * - Shows warning modal before auto-logout with option to stay logged in
 * 
 * Dependencies:
 * - Firebase Auth (signOut)
 * - React Router (useNavigate for redirect)
 * - react-hot-toast (for notifications)
 * 
 * Configuration:
 * - INACTIVITY_TIMEOUT_MS: Default 30 minutes (1800000ms)
 * - SESSION_DURATION_MS: Default 8 hours (28800000ms)
 * - WARNING_BEFORE_LOGOUT_MS: Default 60 seconds (60000ms)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
// BUSINESS RULE: Inactivity timeout set to 30 minutes for security.
// Reason: Standard for business applications to protect sensitive data.
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// BUSINESS RULE: Maximum session duration of 8 hours.
// Reason: Aligns with typical work day; forces re-authentication for audit trail.
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// BUSINESS RULE: Show warning 60 seconds before auto-logout.
// Reason: Gives user reasonable time to save work and stay logged in.
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000; // 60 seconds

// Local storage key for session start timestamp
const SESSION_START_KEY = "sessionStartTime";

// Events that indicate user activity
// NOTE: Removed 'mousemove' as it fires constantly and would prevent timeout
// Only track intentional user actions
const ACTIVITY_EVENTS = [
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
];

/**
 * Custom hook for managing session security timeouts.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether session security is enabled (default: true)
 * @param {number} options.inactivityTimeout - Inactivity timeout in ms (default: 30 min)
 * @param {number} options.sessionDuration - Max session duration in ms (default: 8 hours)
 * @param {number} options.warningTime - Warning time before logout in ms (default: 60 sec)
 * 
 * @returns {Object} Session security state and controls
 * @returns {boolean} showWarning - Whether to show the warning modal
 * @returns {number} remainingTime - Seconds remaining before logout
 * @returns {Function} stayLoggedIn - Call to reset inactivity timer
 * @returns {Function} logoutNow - Call to logout immediately
 * 
 * Business Logic:
 * 1. On mount, check if session duration has exceeded maximum
 * 2. Track user activity and reset inactivity timer on any event
 * 3. When inactivity timeout approaches, show warning modal
 * 4. If user doesn't respond to warning, auto-logout
 * 5. Session duration check runs periodically (every minute)
 * 
 * Side Effects:
 * - Adds event listeners to window for activity tracking
 * - Signs out user from Firebase Auth on timeout
 * - Clears session data from localStorage
 * - Redirects to login page on logout
 */
function useSessionSecurity(options = {}) {
    const {
        enabled = true,
        inactivityTimeout = INACTIVITY_TIMEOUT_MS,
        sessionDuration = SESSION_DURATION_MS,
        warningTime = WARNING_BEFORE_LOGOUT_MS,
    } = options;

    const navigate = useNavigate();

    // State for warning modal
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(warningTime / 1000);

    // Refs for timers (avoid re-renders)
    const inactivityTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    /**
     * Performs logout and cleanup.
     * 
     * Business Logic:
     * - Clears all session-related localStorage data
     * - Signs out from Firebase Auth
     * - Redirects to login page
     * - Shows appropriate notification
     * 
     * @param {string} reason - Reason for logout ('inactivity' | 'session_expired' | 'manual')
     */
    const performLogout = useCallback(async (reason = "manual") => {
        // Clear all timers
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        // Clear session data from localStorage
        localStorage.removeItem(SESSION_START_KEY);

        try {
            await signOut(auth);

            // Show appropriate message based on logout reason
            if (reason === "inactivity") {
                toast("You have been logged out due to inactivity", { icon: "⏰" });
            } else if (reason === "session_expired") {
                toast("Your session has expired. Please log in again.", { icon: "🔒" });
            }

            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout error:", error);
            // Force redirect even if signOut fails
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    /**
     * Resets the inactivity timer.
     * Called on any user activity or when user clicks "Stay Logged In".
     * 
     * Business Logic:
     * - Clears existing timers
     * - Hides warning modal if visible
     * - Starts new inactivity timer
     * - After (timeout - warningTime), shows warning
     * - After warning period, logs out
     */
    const resetInactivityTimer = useCallback(() => {
        if (!enabled) return;

        // Clear existing timers
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        // Hide warning if showing
        setShowWarning(false);
        setRemainingTime(warningTime / 1000);

        // Update last activity timestamp
        lastActivityRef.current = Date.now();

        // Calculate time until warning should appear
        const timeUntilWarning = inactivityTimeout - warningTime;

        // Set timer to show warning
        inactivityTimerRef.current = setTimeout(() => {
            // Show warning modal
            setShowWarning(true);
            setRemainingTime(warningTime / 1000);

            // Start countdown
            countdownIntervalRef.current = setInterval(() => {
                setRemainingTime((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Set final logout timer
            warningTimerRef.current = setTimeout(() => {
                performLogout("inactivity");
            }, warningTime);

        }, timeUntilWarning);

    }, [enabled, inactivityTimeout, warningTime, performLogout]);

    /**
     * Handler for user activity events.
     * Resets inactivity timer on any tracked activity.
     */
    const handleActivity = useCallback(() => {
        // Only reset if warning is not showing
        // (If warning is showing, user must click button)
        if (!showWarning) {
            resetInactivityTimer();
        }
    }, [showWarning, resetInactivityTimer]);

    /**
     * Called when user clicks "Stay Logged In" in warning modal.
     * Resets the inactivity timer and hides the warning.
     */
    const stayLoggedIn = useCallback(() => {
        resetInactivityTimer();
    }, [resetInactivityTimer]);

    /**
     * Called when user clicks "Logout Now" in warning modal.
     * Performs immediate logout.
     */
    const logoutNow = useCallback(() => {
        performLogout("manual");
    }, [performLogout]);

    /**
     * Checks if session duration has exceeded maximum.
     * Called on mount and periodically.
     * 
     * Business Logic:
     * - Reads session start time from localStorage
     * - If elapsed time > max duration, forces logout
     * - No warning shown for session expiry (immediate logout)
     */
    const checkSessionDuration = useCallback(() => {
        if (!enabled) return;

        const sessionStartStr = localStorage.getItem(SESSION_START_KEY);
        if (!sessionStartStr) return;

        const sessionStart = parseInt(sessionStartStr, 10);
        const elapsed = Date.now() - sessionStart;

        // SESSION DURATION CHECK
        // Business Rule: Force logout after max session duration (8 hours default)
        // Reason: Security best practice for sensitive business applications
        if (elapsed >= sessionDuration) {
            performLogout("session_expired");
        }
    }, [enabled, sessionDuration, performLogout]);

    // ============================================================================
    // EFFECT: Initialize activity tracking and session checks
    // ============================================================================
    useEffect(() => {
        if (!enabled) return;

        // Start inactivity timer only once on mount
        resetInactivityTimer();

        // Check session duration immediately
        checkSessionDuration();

        // Check session duration periodically (every minute)
        const sessionCheckInterval = setInterval(checkSessionDuration, 60 * 1000);

        // Cleanup on unmount
        return () => {
            // Clear all timers
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            clearInterval(sessionCheckInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]); // Only depend on enabled - we don't want to reset on every callback change

    // Separate effect for activity event listeners to avoid reset loop
    useEffect(() => {
        if (!enabled) return;

        // Create stable handler that reads showWarning from closure
        const activityHandler = (event) => {
            // Only reset if warning is not showing
            if (!showWarning) {
                resetInactivityTimer();
            }
        };

        // Add activity event listeners
        ACTIVITY_EVENTS.forEach((eventType) => {
            window.addEventListener(eventType, activityHandler, { passive: true });
        });

        // Cleanup
        return () => {
            ACTIVITY_EVENTS.forEach((eventType) => {
                window.removeEventListener(eventType, activityHandler);
            });
        };
    }, [enabled, showWarning, resetInactivityTimer]);

    return {
        showWarning,
        remainingTime,
        stayLoggedIn,
        logoutNow,
    };
}

export default useSessionSecurity;

// Export constants for external use (e.g., testing)
export {
    INACTIVITY_TIMEOUT_MS,
    SESSION_DURATION_MS,
    WARNING_BEFORE_LOGOUT_MS,
    SESSION_START_KEY,
};

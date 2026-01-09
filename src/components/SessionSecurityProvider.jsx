/**
 * Session Security Provider Component
 * 
 * Purpose: Provides session security functionality to the application.
 * Wraps protected routes to enable inactivity timeout and session duration limits.
 * 
 * Responsibilities:
 * - Initializes session security hook
 * - Renders warning modal when needed
 * - Acts as a wrapper for protected content
 * 
 * Dependencies:
 * - useSessionSecurity hook
 * - SessionWarningModal component
 * - useAuthContext for checking authentication state
 * 
 * Usage:
 * Wrap this around layout components that require session security:
 * <SessionSecurityProvider>
 *   <MainLayout />
 * </SessionSecurityProvider>
 */
import { useAuthContext } from "../context/useAuthContext";
import useSessionSecurity from "../hooks/useSessionSecurity";
import SessionWarningModal from "./SessionWarningModal";

/**
 * Provider component that enables session security for its children.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * 
 * @returns {JSX.Element} Children wrapped with session security
 * 
 * Business Logic:
 * - Only enables session security when user is authenticated
 * - Renders warning modal as overlay when needed
 * - Children render normally regardless of session state
 * 
 * Side Effects:
 * - Adds activity event listeners when enabled
 * - May trigger logout and redirect
 */
function SessionSecurityProvider({ children }) {
    const { user } = useAuthContext();

    // SESSION SECURITY ACTIVATION
    // Business Rule: Only track session security for authenticated users
    // Reason: No need to track timeout for users who aren't logged in
    const isEnabled = Boolean(user);

    const { showWarning, remainingTime, stayLoggedIn, logoutNow } =
        useSessionSecurity({
            enabled: isEnabled,
        });

    return (
        <>
            {children}

            {/* SESSION WARNING MODAL
          Renders as overlay above all other content
          Only shown when inactivity timeout is approaching */}
            <SessionWarningModal
                isOpen={showWarning}
                remainingTime={remainingTime}
                onStayLoggedIn={stayLoggedIn}
                onLogout={logoutNow}
            />
        </>
    );
}

export default SessionSecurityProvider;

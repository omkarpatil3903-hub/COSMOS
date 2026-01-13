/**
 * AuthContext Provider Component
 *
 * Purpose: Provides authentication state and user data to the entire application
 * through React Context, enabling role-based access control and session management.
 *
 * Responsibilities:
 * - Listens to Firebase Auth state changes and maintains user session
 * - Fetches and caches user profile data from Firestore (users/clients collections)
 * - Determines user role and computes accessible panels based on RBAC configuration
 * - Handles inactive account detection and forced logout
 * - Initializes required app folders on startup
 *
 * Dependencies:
 * - Firebase Auth (onAuthStateChanged, signOut)
 * - Firestore (users, clients collections)
 * - AuthContextBase (base context object)
 * - roles config (getAccessiblePanels for RBAC)
 * - initializeAppFolders utility
 *
 * Last Modified: 2026-01-10
 */

import { useState, useEffect, useContext, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import toast from "react-hot-toast";
import AppLoader from "../components/AppLoader";
import { getAccessiblePanels } from "../config/roles";
import { initializeAppFolders } from "../utils/initializeAppFolders";

import AuthContext from "./AuthContextBase";

/**
 * AuthProvider - Main authentication context provider component.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with auth context
 *
 * Business Logic:
 * - On mount, subscribes to Firebase Auth state changes
 * - When user is authenticated, fetches their profile from 'users' collection first
 * - If not found in 'users', checks 'clients' collection (for client portal users)
 * - If user exists in Auth but not in Firestore, assigns minimum 'member' role
 * - Automatically logs out users with 'Inactive' status
 *
 * Side Effects:
 * - Initializes app folders on mount (MOMs folder for admin roles)
 * - May trigger signOut for inactive accounts
 * - Displays toast notifications on account deactivation
 *
 * @returns {JSX.Element} Context provider wrapping children with loading state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  // PROJECT MANAGER ACCESS: Track if user is assigned as PM for any project
  // This allows members to access /manager panel when they're assigned as project managers
  const [isProjectManager, setIsProjectManager] = useState(false);

  useEffect(() => {
    // Initialize app folders (e.g., MOMs folder for superadmin/admin)
    initializeAppFolders();

    let unsubDataListener = null; // Track the data listener for cleanup

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Clean up previous data listener if exists
      if (unsubDataListener) {
        unsubDataListener();
        unsubDataListener = null;
      }

      if (currentUser) {
        // Set up real-time listener for users collection
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          // SECURITY RULE: Default to 'member' role (lowest privilege) if role is missing or empty
          // Reason: Prevents privilege escalation if admin accidentally creates user without role
          // Business Decision: Safer to deny access than accidentally grant elevated permissions
          setUserData({
            ...data,
            role: data.role ? data.role.trim() : "member",
          });

          // SECURITY RULE: Force logout for deactivated accounts
          // Reason: Ensures terminated employees or suspended users cannot access the system
          // even if they have a valid Firebase Auth session (e.g., remember me, cached token)
          // Business Decision: Immediate access revocation takes priority over user experience
          if (data.status === "Inactive") {
            await signOut(auth);
            setUserData(null);
            setUser(null);
            toast.error("Your account has been deactivated. Contact your administrator.");
            setLoading(false);
            return;
          }
          setLoading(false);
        } else {
          // USER LOOKUP HIERARCHY: Check 'clients' collection as fallback
          // Reason: System has two user types - internal staff (users collection) and external clients
          // Business Decision: Staff users are checked first as they have higher access privileges
          const clientDocRef = doc(db, "clients", currentUser.uid);
          const clientDoc = await getDoc(clientDocRef);
          if (clientDoc.exists()) {
            const data = clientDoc.data();

            // Check client status if applicable
            if (data.status === "Inactive") {
              await signOut(auth);
              setUserData(null);
              setUser(null);
              toast.error("Your account has been deactivated. Contact your administrator.");
              setLoading(false);
              return;
            }

            setUserData({
              ...data,
              uid: currentUser.uid,
              role: data.role ? data.role.trim() : "client",
            });
            setLoading(false);
          } else {
            // FALLBACK HANDLING: User exists in Firebase Auth but has no Firestore profile
            // Scenario: This can happen if:
            //   1. User was created via Firebase Console directly (bypass app flow)
            //   2. Firestore document was accidentally deleted
            //   3. Data migration issue or sync failure
            // Security Decision: Assign minimal 'member' role to prevent unauthorized access
            // while still allowing the user to log in (they can request role upgrade from admin)
            setUserData({
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email,
              role: "member",
              uid: currentUser.uid,
            });
            setLoading(false);
          }
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDataListener) {
        unsubDataListener();
      }
    };
  }, []);

  // PROJECT MANAGER DETECTION: Listen for projects where user is assigned as PM
  // Business Rule: Members assigned as projectManagerId should access /manager panel
  useEffect(() => {
    if (!user) {
      setIsProjectManager(false);
      return;
    }

    // Listen for any projects where this user is the project manager
    const projectsQuery = query(
      collection(db, "projects"),
      where("projectManagerId", "==", user.uid)
    );

    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      // If user is PM for at least one project, grant manager panel access
      setIsProjectManager(!snapshot.empty);
    });

    return () => unsubProjects();
  }, [user]);

  // RBAC PANEL COMPUTATION: Determines which navigation panels the user can access
  // Memoized to prevent unnecessary recalculations on every render
  // Uses lowercase normalization to handle inconsistent role casing from Firestore
  // PROJECT MANAGER ENHANCEMENT: If user is a PM, include manager panel in accessible panels
  const accessiblePanels = useMemo(() => {
    const role = userData?.role?.toLowerCase() || '';
    const panels = getAccessiblePanels(role);

    // If user is assigned as project manager but doesn't have manager role,
    // add manager panel to their accessible panels
    if (isProjectManager && role !== 'manager' && role !== 'admin' && role !== 'superadmin') {
      const hasManagerPanel = panels.some(p => p.path === '/manager');
      if (!hasManagerPanel) {
        return [
          ...panels,
          { path: '/manager', label: 'Manager Panel', icon: 'FaUserTie' }
        ];
      }
    }

    return panels;
  }, [userData?.role, isProjectManager]);

  const value = { user, userData, loading, accessiblePanels, isProjectManager };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        // Minimal loader instead of full dashboard skeleton
        // This prevents dashboard skeleton from flashing on public pages
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-500"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext - Custom hook to access authentication context.
 *
 * @returns {Object} Authentication context containing:
 *   - user: Firebase Auth user object (null if not authenticated)
 *   - userData: User profile from Firestore (role, name, email, etc.)
 *   - loading: Boolean indicating if auth state is being determined
 *   - accessiblePanels: Array of panel names the user can access based on role
 *
 * @example
 * const { user, userData, loading, accessiblePanels } = useAuthContext();
 * if (loading) return <Spinner />;
 * if (!user) return <Navigate to="/login" />;
 */
export const useAuthContext = () => {
  return useContext(AuthContext);
};

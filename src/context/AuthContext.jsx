// src/context/AuthContext.jsx
import { useState, useEffect, useContext, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import toast from "react-hot-toast";
import AppLoader from "../components/AppLoader";
import { getAccessiblePanels } from "../config/roles";
import { initializeAppFolders } from "../utils/initializeAppFolders";

import AuthContext from "./AuthContextBase";

// 2. Create the Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize app folders (e.g., MOMs folder for superadmin/admin)
    initializeAppFolders();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // First check users collection
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          // If user is in 'users' collection but doesn't have a role, default to 'member' for safety
          setUserData({
            ...data,
            role: data.role ? data.role.trim() : "member",
          });

          // Force logout if account is inactive
          if (data.status === "Inactive") {
            await signOut(auth);
            setUserData(null);
            setUser(null);
            toast.error("Your account has been deactivated. Contact your administrator.");
            setLoading(false);
            return;
          }
        } else {
          // If not in users, check clients collection
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
              role: data.role ? data.role.trim() : "client",
            });
          } else {
            // User exists in Auth but not in Firestore - treat as superadmin ONLY if email matches a hardcoded safe list or similar, otherwise member
            // For now, we will default to 'member' to prevent unauthorized admin access for broken records
            setUserData({
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email,
              role: "member", // Changed from 'admin' to 'member' for security
              uid: currentUser.uid,
            });
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener
  }, []);

  // Compute accessible panels based on user's role
  const accessiblePanels = useMemo(() => {
    const role = userData?.role?.toLowerCase() || '';
    return getAccessiblePanels(role);
  }, [userData?.role]);

  const value = { user, userData, loading, accessiblePanels };

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

export const useAuthContext = () => {
  return useContext(AuthContext);
};


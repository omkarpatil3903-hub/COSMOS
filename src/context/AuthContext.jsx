// src/context/AuthContext.jsx
import { useState, useEffect, useContext, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
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

    let unsubDataListener = null; // Track the data listener for cleanup

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Clean up previous data listener if exists
      if (unsubDataListener) {
        unsubDataListener();
        unsubDataListener = null;
      }

      if (currentUser) {
        // Set up real-time listener for users collection
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubDataListener = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              ...data,
              uid: currentUser.uid,
              role: data.role ? data.role.trim() : "member",
            });
            setLoading(false);
          } else {
            // If not in users, check clients collection
            const clientDocRef = doc(db, "clients", currentUser.uid);
            unsubDataListener = onSnapshot(clientDocRef, (clientDoc) => {
              if (clientDoc.exists()) {
                const data = clientDoc.data();
                setUserData({
                  ...data,
                  uid: currentUser.uid,
                  role: data.role ? data.role.trim() : "client",
                });
              } else {
                // User exists in Auth but not in Firestore
                setUserData({
                  email: currentUser.email,
                  name: currentUser.displayName || currentUser.email,
                  role: "member",
                  uid: currentUser.uid,
                });
              }
              setLoading(false);
            });
          }
        });
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


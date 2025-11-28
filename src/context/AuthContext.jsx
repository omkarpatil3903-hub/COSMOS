// src/context/AuthContext.jsx
import { useState, useEffect, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import AuthContext from "./AuthContextBase";

// 2. Create the Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // First check users collection
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          // If user is in 'users' collection but doesn't have a role, default to 'admin'
          setUserData({
            ...data,
            role: data.role || "admin",
          });
        } else {
          // If not in users, check clients collection
          const clientDocRef = doc(db, "clients", currentUser.uid);
          const clientDoc = await getDoc(clientDocRef);
          if (clientDoc.exists()) {
            setUserData(clientDoc.data());
          } else {
            // User exists in Auth but not in Firestore - treat as admin (for manually created admin accounts)
            setUserData({
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email,
              role: "admin",
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

  const value = { user, userData, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  return useContext(AuthContext);
};

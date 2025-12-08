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
          // If user is in 'users' collection but doesn't have a role, default to 'member' for safety
          setUserData({
            ...data,
            role: data.role ? data.role.trim() : "member",
          });
        } else {
          // If not in users, check clients collection
          const clientDocRef = doc(db, "clients", currentUser.uid);
          const clientDoc = await getDoc(clientDocRef);
          if (clientDoc.exists()) {
            const data = clientDoc.data();
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

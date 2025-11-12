/**
 * Data Service
 * Handles subscriptions to reference data (clients, projects, users)
 */

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Subscribe to clients collection
 * @param {function} callback - Called with clients array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToClients = (callback) => {
  return onSnapshot(collection(db, "clients"), (snap) => {
    const clients = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    }));
    callback(clients);
  });
};

/**
 * Subscribe to users/resources collection
 * @param {function} callback - Called with users array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToUsers = (callback) => {
  const q = query(collection(db, "users"), orderBy("name", "asc"));
  
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name || d.data().email || "Unknown",
      email: d.data().email || "",
      role: d.data().role || "resource",
    }));
    callback(users);
  });
};

/**
 * Subscribe to projects collection
 * @param {function} callback - Called with projects array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToProjects = (callback) => {
  const q = query(collection(db, "projects"), orderBy("projectName", "asc"));
  
  return onSnapshot(q, (snap) => {
    const projects = snap.docs
      .map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.projectName || data.name || "",
          ...data,
        };
      })
      .filter((p) => !p.deleted && !p.isDeleted);
    
    callback(projects);
  });
};

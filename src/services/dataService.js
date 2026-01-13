/**
 * Data Service - Reference Data Subscriptions
 *
 * Purpose: Provides real-time subscription functions for core reference data
 * (clients, users, projects) used across the application.
 *
 * Responsibilities:
 * - Subscribes to clients collection for client dropdowns and lookups
 * - Subscribes to users collection for assignee selection and user lookups
 * - Subscribes to projects collection for project selection and filtering
 * - Returns unsubscribe functions for proper cleanup on component unmount
 *
 * Dependencies:
 * - Firestore (onSnapshot for real-time updates)
 * - Firebase configuration (db instance)
 *
 * Usage Pattern:
 * These functions are typically called in useEffect hooks:
 * useEffect(() => {
 *   const unsub = subscribeToClients(setClients);
 *   return () => unsub();
 * }, []);
 *
 * Last Modified: 2026-01-10
 */

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Subscribe to clients collection for real-time updates.
 *
 * @param {function} callback - Called with clients array whenever data changes
 * @returns {function} Unsubscribe function to stop listening
 *
 * @example
 * const unsubscribe = subscribeToClients((clients) => setClients(clients));
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
 * Subscribe to users/resources collection for real-time updates.
 * Users are sorted alphabetically by name for consistent UI ordering.
 *
 * @param {function} callback - Called with users array whenever data changes
 * @returns {function} Unsubscribe function to stop listening
 *
 * Business Logic:
 * - Extracts name, email, and role from each user document
 * - Falls back to email or "Unknown" if name is missing
 * - Defaults role to "resource" for legacy compatibility
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
 * Subscribe to projects collection for real-time updates.
 * Projects are sorted alphabetically by project name.
 *
 * @param {function} callback - Called with projects array whenever data changes
 * @returns {function} Unsubscribe function to stop listening
 *
 * Business Logic:
 * - Filters out soft-deleted projects (deleted or isDeleted flags)
 * - Normalizes project name to 'name' field for consistent access
 * - Preserves all other project data for flexible usage
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
      // SOFT DELETE FILTER: Exclude projects marked as deleted
      // Allows for data recovery while hiding from active views
      .filter((p) => !p.deleted && !p.isDeleted);

    callback(projects);
  });
};

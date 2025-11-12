/**
 * Event Service
 * Handles all Firestore operations for events
 */

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { tsToDate } from "../utils/dateUtils";

/**
 * Subscribe to events collection
 * @param {function} callback - Called with events array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToEvents = (callback) => {
  const q = query(collection(db, "events"), orderBy("date", "asc"));
  
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        title: data.title || "",
        type: String(data.type || "meeting").toLowerCase(),
        status: String(data.status || "pending").toLowerCase(),
        date: data.date || "",
        time: data.time || "",
        duration: data.duration || 60,
        clientId: data.clientId || "",
        clientName: data.clientName || "",
        description: data.description || "",
        priority: String(data.priority || "medium").toLowerCase(),
        location: data.location || "",
        attendees: data.attendees || [],
        attendeeIds: data.attendeeIds || [],
        createdBy: data.createdBy || "",
        objectives: data.objectives || [],
        cancelReason: data.cancelReason || "",
        cancelledBy: data.cancelledBy || "",
        cancelledAt: tsToDate(data.cancelledAt),
        completedAt: tsToDate(data.completedAt),
        createdAt: tsToDate(data.createdAt),
        assignee: data.assignee || "",
        progress: data.progress || 0,
      };
    });
    
    callback(events);
  });
};

/**
 * Create a new event
 * @param {object} eventData
 * @returns {Promise<string>} - Document ID
 */
export const createEvent = async (eventData) => {
  const docRef = await addDoc(collection(db, "events"), {
    ...eventData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Update an existing event
 * @param {string} eventId
 * @param {object} updates
 * @returns {Promise<void>}
 */
export const updateEvent = async (eventId, updates) => {
  await updateDoc(doc(db, "events", eventId), updates);
};

/**
 * Delete an event
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, "events", eventId));
};

/**
 * Mark event as completed
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export const completeEvent = async (eventId) => {
  await updateDoc(doc(db, "events", eventId), {
    status: "completed",
    completedAt: serverTimestamp(),
  });
};

/**
 * Cancel an event
 * @param {string} eventId
 * @param {string} reason
 * @param {string} cancelledBy
 * @returns {Promise<void>}
 */
export const cancelEvent = async (eventId, reason, cancelledBy) => {
  await updateDoc(doc(db, "events", eventId), {
    status: "cancelled",
    cancelReason: reason,
    cancelledBy,
    cancelledAt: serverTimestamp(),
  });
};

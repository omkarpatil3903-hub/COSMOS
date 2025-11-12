/**
 * Meeting Request Service
 * Handles all Firestore operations for meeting requests
 */

import {
  collection,
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
 * Subscribe to meeting requests collection
 * @param {function} callback - Called with requests array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToMeetingRequests = (callback) => {
  return onSnapshot(collection(db, "meetingRequests"), (snap) => {
    const requests = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        clientId: data.clientId || "",
        clientName: data.clientName || "",
        companyName: data.companyName || "",
        requestedDate: data.requestedDate || "",
        requestedTime: data.requestedTime || "",
        duration: data.duration || 60,
        purpose: data.purpose || "",
        priority: data.priority || "medium",
        status: data.status || "pending",
        requestedAt: tsToDate(data.requestedAt),
        rejectedAt: tsToDate(data.rejectedAt),
        rejectedBy: data.rejectedBy || "",
        rejectionReason: data.rejectionReason || "",
        email: data.email || "",
        phone: data.phone || "",
      };
    });
    
    callback(requests);
  });
};

/**
 * Create a meeting request
 * @param {object} requestData
 * @returns {Promise<string>} - Document ID
 */
export const createMeetingRequest = async (requestData) => {
  const docRef = await addDoc(collection(db, "meetingRequests"), {
    ...requestData,
    status: "pending",
    requestedAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Approve a meeting request (creates event and deletes request)
 * @param {string} requestId
 * @param {object} eventData
 * @returns {Promise<string>} - Event ID
 */
export const approveMeetingRequest = async (requestId, eventData) => {
  // Create event
  const eventRef = await addDoc(collection(db, "events"), {
    ...eventData,
    createdAt: serverTimestamp(),
  });
  
  // Delete request
  await deleteDoc(doc(db, "meetingRequests", requestId));
  
  return eventRef.id;
};

/**
 * Reject a meeting request
 * @param {string} requestId
 * @param {string} reason
 * @param {string} rejectedBy
 * @returns {Promise<void>}
 */
export const rejectMeetingRequest = async (requestId, reason, rejectedBy) => {
  await updateDoc(doc(db, "meetingRequests", requestId), {
    status: "rejected",
    rejectedAt: serverTimestamp(),
    rejectedBy,
    rejectionReason: reason,
  });
};

/**
 * Delete a meeting request
 * @param {string} requestId
 * @returns {Promise<void>}
 */
export const deleteMeetingRequest = async (requestId) => {
  await deleteDoc(doc(db, "meetingRequests", requestId));
};

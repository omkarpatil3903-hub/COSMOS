/**
 * Meeting Service - Meeting Request Operations
 *
 * Purpose: Handles all Firestore operations for meeting requests from clients,
 * including creation, approval/rejection workflow, and conversion to events.
 *
 * Responsibilities:
 * - Real-time subscription to meeting requests collection
 * - Meeting request CRUD operations
 * - Approval workflow (creates event, deletes request)
 * - Rejection workflow with reason tracking
 *
 * Dependencies:
 * - Firestore (meetingRequests, events collections)
 * - dateUtils (tsToDate for Timestamp conversion)
 *
 * Meeting Request Workflow:
 * 1. Client submits request (status: pending)
 * 2. Admin reviews request
 * 3a. Approved → Creates event, deletes request
 * 3b. Rejected → Updates status, records reason
 *
 * Last Modified: 2026-01-10
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
 * Subscribe to meeting requests collection for real-time updates.
 *
 * @param {function} callback - Called with requests array whenever data changes
 * @returns {function} Unsubscribe function to stop listening
 *
 * Business Logic:
 * - Normalizes all fields with default values
 * - Converts Firestore Timestamps to JavaScript Dates
 * - Includes client contact info for admin follow-up
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
 * Create a meeting request (typically from client portal).
 *
 * @param {object} requestData - Meeting request data
 * @returns {Promise<string>} Document ID of created request
 *
 * Business Logic:
 * - Sets initial status to "pending" for admin review
 * - Records request timestamp for queue ordering
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
 * Approve a meeting request and convert to calendar event.
 *
 * @param {string} requestId - ID of request to approve
 * @param {object} eventData - Event data (may differ from request)
 * @returns {Promise<string>} Event ID of created event
 *
 * Business Logic:
 * - ATOMIC OPERATION: Creates event first, then deletes request
 * - Admin can modify event details during approval (e.g., reschedule)
 * - Request is deleted (not soft-deleted) to keep clean request queue
 *
 * IMPORTANT: This is not a true transaction. If delete fails after
 * event creation, manual cleanup may be needed.
 */
export const approveMeetingRequest = async (requestId, eventData) => {
  // Step 1: Create the calendar event
  const eventRef = await addDoc(collection(db, "events"), {
    ...eventData,
    createdAt: serverTimestamp(),
  });

  // Step 2: Delete the original request
  await deleteDoc(doc(db, "meetingRequests", requestId));

  return eventRef.id;
};

/**
 * Reject a meeting request with reason.
 *
 * @param {string} requestId - ID of request to reject
 * @param {string} reason - Rejection reason for client feedback
 * @param {string} rejectedBy - Admin user ID/name who rejected
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Keeps request document for client visibility (they can see rejection)
 * - Records who rejected and why for accountability
 * - Client can potentially re-submit with updated details
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
 * Delete a meeting request permanently.
 *
 * @param {string} requestId - ID of request to delete
 * @returns {Promise<void>}
 *
 * Usage: Cleanup of old/stale requests by admin
 */
export const deleteMeetingRequest = async (requestId) => {
  await deleteDoc(doc(db, "meetingRequests", requestId));
};

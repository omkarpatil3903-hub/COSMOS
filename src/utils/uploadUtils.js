/**
 * Upload Utilities - File Upload Management
 *
 * Purpose: Utility functions for managing file uploads in Firestore,
 * including queries, soft/hard deletes, statistics, and display helpers.
 *
 * Responsibilities:
 * - Query uploads by client, task, or project
 * - Real-time subscription to upload changes
 * - Soft delete (marks as inactive) and hard delete (removes from storage)
 * - Calculate upload statistics for dashboards
 * - Format file sizes and provide file type icons
 *
 * Dependencies:
 * - Firestore (uploads collection)
 * - Firebase Storage (for hard deletes)
 *
 * Upload Status:
 * - "active": Currently available upload
 * - "deleted": Soft-deleted (hidden but recoverable)
 *
 * Last Modified: 2026-01-10
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

// ============================================================================
// CLIENT/TASK UPLOAD QUERIES
// ============================================================================

/**
 * Get all active uploads for a specific client.
 *
 * @param {string} clientId - The client's user ID
 * @returns {Promise<Array>} Array of upload documents
 *
 * Business Logic:
 * - Only returns active (non-deleted) uploads
 * - Sorted by upload date descending (newest first)
 */
export const getClientUploads = async (clientId) => {
  try {
    const q = query(
      collection(db, "uploads"),
      where("clientId", "==", clientId),
      where("status", "==", "active"),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching client uploads:", error);
    throw error;
  }
};

/**
 * Get all active uploads for a specific task.
 *
 * @param {string} taskId - The task ID
 * @returns {Promise<Array>} Array of upload documents
 */
export const getTaskUploads = async (taskId) => {
  try {
    const q = query(
      collection(db, "uploads"),
      where("taskId", "==", taskId),
      where("status", "==", "active"),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching task uploads:", error);
    throw error;
  }
};

/**
 * Get all active uploads with optional filters (admin view).
 *
 * @param {Object} filters - Optional filters { clientId, taskId, projectId }
 * @returns {Promise<Array>} Array of upload documents
 */
export const getAllUploads = async (filters = {}) => {
  try {
    let q = collection(db, "uploads");

    const constraints = [where("status", "==", "active")];

    // DYNAMIC FILTERS: Add constraints based on provided filters
    if (filters.clientId) {
      constraints.push(where("clientId", "==", filters.clientId));
    }

    if (filters.taskId) {
      constraints.push(where("taskId", "==", filters.taskId));
    }

    if (filters.projectId) {
      constraints.push(where("projectId", "==", filters.projectId));
    }

    constraints.push(orderBy("uploadedAt", "desc"));

    q = query(q, ...constraints);

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all uploads:", error);
    throw error;
  }
};

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Listen to uploads in real-time.
 *
 * @param {Function} callback - Callback function receiving updated uploads array
 * @param {Object} filters - Optional filters { clientId, taskId }
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsubscribe = listenToUploads(setUploads, { taskId: "task123" });
 * // Later: unsubscribe();
 */
export const listenToUploads = (callback, filters = {}) => {
  let q = collection(db, "uploads");

  const constraints = [where("status", "==", "active")];

  if (filters.clientId) {
    constraints.push(where("clientId", "==", filters.clientId));
  }

  if (filters.taskId) {
    constraints.push(where("taskId", "==", filters.taskId));
  }

  constraints.push(orderBy("uploadedAt", "desc"));

  q = query(q, ...constraints);

  return onSnapshot(q, (querySnapshot) => {
    const uploads = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(uploads);
  });
};

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Soft delete an upload (marks as inactive).
 * File remains in storage for potential recovery.
 *
 * @param {string} uploadId - The upload document ID
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Sets status to "deleted" and records deletion timestamp
 * - Does NOT remove file from Firebase Storage
 * - Use permanentlyDeleteUpload for full deletion
 */
export const deleteUpload = async (uploadId) => {
  try {
    await updateDoc(doc(db, "uploads", uploadId), {
      status: "deleted",
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error deleting upload:", error);
    throw error;
  }
};

/**
 * Permanently delete an upload (removes from storage and database).
 * CAUTION: This action cannot be undone.
 *
 * @param {string} uploadId - The upload document ID
 * @param {string} storagePath - The Firebase Storage path of the file
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - First deletes file from Firebase Storage
 * - Then deletes metadata document from Firestore
 */
export const permanentlyDeleteUpload = async (uploadId, storagePath) => {
  try {
    // STEP 1: Delete from Firebase Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // STEP 2: Delete metadata from Firestore
    await deleteDoc(doc(db, "uploads", uploadId));
  } catch (error) {
    console.error("Error permanently deleting upload:", error);
    throw error;
  }
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get upload statistics for dashboards.
 *
 * @param {Object} filters - Optional filters to scope statistics
 * @returns {Promise<Object>} Statistics object
 *
 * Returns:
 * - totalUploads: Total number of uploads
 * - totalSize: Combined file size in bytes
 * - fileTypes: Count by MIME type
 * - clientCounts: Count by client
 * - taskCounts: Count by task
 * - monthlyUploads: Count by YYYY-MM
 */
export const getUploadStats = async (filters = {}) => {
  try {
    const uploads = await getAllUploads(filters);

    const stats = {
      totalUploads: uploads.length,
      totalSize: uploads.reduce((sum, upload) => sum + (upload.fileSize || 0), 0),
      fileTypes: {},
      clientCounts: {},
      taskCounts: {},
      monthlyUploads: {}
    };

    uploads.forEach(upload => {
      // AGGREGATE: File types
      const fileType = upload.fileType || 'unknown';
      stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;

      // AGGREGATE: Client counts
      const clientName = upload.clientName || 'Unknown';
      stats.clientCounts[clientName] = (stats.clientCounts[clientName] || 0) + 1;

      // AGGREGATE: Task counts
      const taskTitle = upload.taskTitle || 'Unknown';
      stats.taskCounts[taskTitle] = (stats.taskCounts[taskTitle] || 0) + 1;

      // AGGREGATE: Monthly uploads
      if (upload.uploadedAt && upload.uploadedAt.toDate) {
        const month = upload.uploadedAt.toDate().toISOString().slice(0, 7); // YYYY-MM
        stats.monthlyUploads[month] = (stats.monthlyUploads[month] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error getting upload stats:", error);
    throw error;
  }
};

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format file size for human-readable display.
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get emoji icon for file type.
 *
 * @param {string} fileType - MIME type of the file
 * @returns {string} Emoji icon representing the file type
 */
export const getFileTypeIcon = (fileType) => {
  if (!fileType) return '📄';

  // IMAGE FILES
  if (fileType.startsWith('image/')) return '🖼️';
  // VIDEO FILES
  if (fileType.startsWith('video/')) return '🎥';
  // AUDIO FILES
  if (fileType.startsWith('audio/')) return '🎵';
  // DOCUMENT TYPES
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word')) return '📘';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋';
  // ARCHIVES
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';

  // DEFAULT
  return '📄';
};

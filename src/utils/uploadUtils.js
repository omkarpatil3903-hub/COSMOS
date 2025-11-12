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

/**
 * Get all uploads for a specific client
 * @param {string} clientId - The client's user ID
 * @returns {Promise<Array>} Array of upload documents
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
 * Get all uploads for a specific task
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
 * Get all uploads (admin view)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of upload documents
 */
export const getAllUploads = async (filters = {}) => {
  try {
    let q = collection(db, "uploads");
    
    const constraints = [where("status", "==", "active")];
    
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

/**
 * Listen to uploads in real-time
 * @param {Function} callback - Callback function to handle updates
 * @param {Object} filters - Optional filters
 * @returns {Function} Unsubscribe function
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

/**
 * Delete an upload (soft delete - marks as inactive)
 * @param {string} uploadId - The upload document ID
 * @returns {Promise<void>}
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
 * Permanently delete an upload (removes from storage and database)
 * @param {string} uploadId - The upload document ID
 * @param {string} storagePath - The storage path of the file
 * @returns {Promise<void>}
 */
export const permanentlyDeleteUpload = async (uploadId, storagePath) => {
  try {
    // Delete from storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    
    // Delete from database
    await deleteDoc(doc(db, "uploads", uploadId));
  } catch (error) {
    console.error("Error permanently deleting upload:", error);
    throw error;
  }
};

/**
 * Get upload statistics
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Upload statistics
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
      // File types
      const fileType = upload.fileType || 'unknown';
      stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;
      
      // Client counts
      const clientName = upload.clientName || 'Unknown';
      stats.clientCounts[clientName] = (stats.clientCounts[clientName] || 0) + 1;
      
      // Task counts
      const taskTitle = upload.taskTitle || 'Unknown';
      stats.taskCounts[taskTitle] = (stats.taskCounts[taskTitle] || 0) + 1;
      
      // Monthly uploads
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

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type icon
 * @param {string} fileType - MIME type of the file
 * @returns {string} Icon class or emoji
 */
export const getFileTypeIcon = (fileType) => {
  if (!fileType) return '📄';
  
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word')) return '📘';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  
  return '📄';
};

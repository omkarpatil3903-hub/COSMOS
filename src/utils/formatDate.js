// src/utils/dateUtils.js

export const formatDate = (dateString) => {
  if (!dateString) return "-";

  // Convert to string if it's a Date object or timestamp
  let dateStr = dateString;

  // Handle Firestore Timestamp objects (they have a toDate method)
  if (dateString && typeof dateString === 'object' && typeof dateString.toDate === 'function') {
    dateStr = dateString.toDate().toISOString().split('T')[0];
  } else if (dateString instanceof Date) {
    dateStr = dateString.toISOString().split('T')[0];
  } else if (typeof dateString === 'number') {
    dateStr = new Date(dateString).toISOString().split('T')[0];
  } else if (typeof dateString !== 'string') {
    // If it's some other type, try to convert to string
    dateStr = String(dateString);
  }

  // Check if it matches yyyy-mm-dd format to be safe
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  return dateStr;
};
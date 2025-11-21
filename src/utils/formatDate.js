// src/utils/dateUtils.js

export const formatDate = (dateString) => {
  if (!dateString) return "-";
  
  // Check if it matches yyyy-mm-dd format to be safe
  if (dateString.includes("-")) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }
  
  return dateString;
};
/**
 * Form Builder Utilities
 * Handles form validation and data transformation
 */

/**
 * Validate event form
 * @param {object} form
 * @returns {object} { isValid, errors }
 */
export const validateEventForm = (form) => {
  const errors = {};

  if (!form.title?.trim()) {
    errors.title = "Title is required";
  }

  if (!form.date) {
    errors.date = "Date is required";
  }

  if (!form.time) {
    errors.time = "Time is required";
  }

  if (form.type === "meeting" && !form.clientId) {
    errors.clientId = "Client is required for meetings";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate task form
 * @param {object} form
 * @returns {object} { isValid, errors }
 */
export const validateTaskForm = (form) => {
  const errors = {};

  if (!form.title?.trim()) {
    errors.title = "Task title is required";
  }

  // Ensure due date is not before assigned date when both are provided
  if (form.dueDate && form.assignedDate) {
    const assigned = new Date(form.assignedDate + "T00:00:00");
    const due = new Date(form.dueDate + "T00:00:00");
    if (
      !Number.isNaN(assigned.getTime()) &&
      !Number.isNaN(due.getTime()) &&
      due < assigned
    ) {
      errors.dueDate = "Due date cannot be before assigned date";
    }
  }

  if (!form.projectId) {
    errors.projectId = "Project is required";
  }

  if (!form.assigneeId) {
    errors.assigneeId = "Assignee is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Transform event form to Firestore document
 * @param {object} form
 * @param {Array} selectedAttendees
 * @param {object} clientsById
 * @returns {object}
 */
export const transformEventFormToDoc = (
  form,
  selectedAttendees,
  clientsById
) => {
  const client = clientsById.get(form.clientId);
  const attendeeNames = selectedAttendees
    .map((id) => {
      const attendee = Array.from(clientsById.values()).find(
        (c) => c.id === id
      );
      return (
        attendee?.clientName || attendee?.companyName || attendee?.name || ""
      );
    })
    .filter(Boolean);

  return {
    title: form.title.trim(),
    type: form.type,
    status: form.status,
    date: form.date,
    time: form.time,
    duration: Number(form.duration) || 60,
    clientId: form.clientId,
    clientName: client?.clientName || client?.companyName || "",
    description: form.description.trim(),
    priority: form.priority,
    location: form.location.trim(),
    attendees: attendeeNames,
    attendeeIds: selectedAttendees,
  };
};

/**
 * Transform task form to Firestore document
 * @param {object} form
 * @returns {object}
 */
export const transformTaskFormToDoc = (form) => {
  const dueDateObj = new Date(form.dueDate + "T23:59:59");

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    projectId: form.projectId,
    assigneeId: form.assigneeId,
    assigneeType: form.assigneeType,
    status: form.status,
    priority: form.priority,
    dueDate: dueDateObj,
  };
};

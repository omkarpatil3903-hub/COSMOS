/**
 * Form Builder Utilities
 *
 * Purpose: Form validation and data transformation utilities for event
 * and task forms in the calendar/task management system.
 *
 * Responsibilities:
 * - Validate event and task form inputs
 * - Transform form data to Firestore document format
 * - Handle field normalization and defaults
 *
 * Dependencies:
 * - None (pure JavaScript validation logic)
 *
 * Validation Rules:
 * - Events: title, date, time required; clientId required for meetings
 * - Tasks: title required; dueDate must be >= assignedDate; project and assignee required
 *
 * Last Modified: 2026-01-10
 */

/**
 * Validate event form data.
 *
 * @param {object} form - Event form data
 * @returns {object} { isValid: boolean, errors: object }
 *
 * Validation Rules:
 * - title: Required, non-empty
 * - date: Required
 * - time: Required
 * - clientId: Required if type is "meeting"
 *
 * @example
 * const { isValid, errors } = validateEventForm(formData);
 * if (!isValid) {
 *   setFormErrors(errors);
 *   return;
 * }
 */
export const validateEventForm = (form) => {
  const errors = {};

  // REQUIRED: Title must be non-empty
  if (!form.title?.trim()) {
    errors.title = "Title is required";
  }

  // REQUIRED: Date for scheduling
  if (!form.date) {
    errors.date = "Date is required";
  }

  // REQUIRED: Time for calendar placement
  if (!form.time) {
    errors.time = "Time is required";
  }

  // CONDITIONAL: Client required for meeting type
  // Business Rule: Meetings must be associated with a client for billing/tracking
  if (form.type === "meeting" && !form.clientId) {
    errors.clientId = "Client is required for meetings";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate task form data.
 *
 * @param {object} form - Task form data
 * @returns {object} { isValid: boolean, errors: object }
 *
 * Validation Rules:
 * - title: Required, non-empty
 * - dueDate: Must be >= assignedDate (if both provided)
 * - projectId: Required
 * - assigneeId: Required
 *
 * @example
 * const { isValid, errors } = validateTaskForm(formData);
 */
export const validateTaskForm = (form) => {
  const errors = {};

  // REQUIRED: Task title
  if (!form.title?.trim()) {
    errors.title = "Task title is required";
  }

  // LOGICAL: Due date cannot be before assigned date
  // Business Rule: Prevents impossible scheduling
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

  // REQUIRED: Project association for organization
  if (!form.projectId) {
    errors.projectId = "Project is required";
  }

  // REQUIRED: Someone must be responsible for the task
  if (!form.assigneeId) {
    errors.assigneeId = "Assignee is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Transform event form data to Firestore document format.
 *
 * @param {object} form - Event form data
 * @param {Array<string>} selectedAttendees - Array of attendee IDs
 * @param {Map<string, object>} clientsById - Map of client ID to client object
 * @returns {object} Firestore-ready event document
 *
 * Transformations:
 * - Trims string fields
 * - Resolves client name from clientId
 * - Converts duration to number
 * - Resolves attendee names from IDs
 */
export const transformEventFormToDoc = (
  form,
  selectedAttendees,
  clientsById
) => {
  // LOOKUP: Resolve client object for name
  const client = clientsById.get(form.clientId);

  // RESOLVE: Convert attendee IDs to display names
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
    duration: Number(form.duration) || 60, // Default 60 minutes
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
 * Transform task form data to Firestore document format.
 *
 * @param {object} form - Task form data
 * @returns {object} Firestore-ready task document
 *
 * Transformations:
 * - Trims string fields
 * - Converts dueDate string to Date object with end-of-day time
 *
 * DESIGN DECISION: Due date is set to 23:59:59 of the selected day
 * Reason: Tasks are "due by end of day", not at a specific time
 */
export const transformTaskFormToDoc = (form) => {
  // END OF DAY: Set due time to 23:59:59 for "due by end of day" semantics
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

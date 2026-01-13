/**
 * Calendar Business Logic Utilities
 *
 * Purpose: Core business logic for calendar views including event filtering,
 * task transformation, conflict detection, and statistics calculation.
 *
 * Responsibilities:
 * - Build default form objects for events and tasks
 * - Transform tasks into calendar-compatible event objects
 * - Filter events by type, status, project, and employee
 * - Detect scheduling conflicts between events
 * - Calculate calendar dashboard statistics
 * - Provide helper functions for event display (icons, colors, badges)
 *
 * Dependencies:
 * - dateUtils (tsToDate, dateToInputValue)
 *
 * Data Flow:
 * Tasks → transformTasksToEvents → Combined Events → filterEvents → Display
 *
 * Last Modified: 2026-01-10
 */

import { tsToDate, dateToInputValue } from "./dateUtils";

// ============================================================================
// FORM BUILDERS
// ============================================================================

/**
 * Build default event form object.
 * Used to initialize new event creation forms.
 *
 * @param {Date} baseDate - Default date for the event (defaults to today)
 * @returns {object} Default event form object
 */
export const buildDefaultEventForm = (baseDate = new Date()) => ({
  title: "",
  type: "meeting",
  status: "pending",
  date: dateToInputValue(baseDate),
  time: "09:00",
  duration: 60,
  clientId: "",
  description: "",
  priority: "medium",
  location: "",
  attendeesText: "",
});

/**
 * Build default task form object.
 * Used to initialize new task creation forms.
 *
 * @param {Date} baseDate - Default due date for the task (defaults to today)
 * @returns {object} Default task form object
 */
export const buildDefaultTaskForm = (baseDate = new Date()) => ({
  title: "",
  description: "",
  projectId: "",
  assigneeId: "",
  assigneeType: "user",
  status: "To-Do",
  priority: "Medium",
  dueDate: dateToInputValue(baseDate),
});

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform tasks into calendar event objects.
 * Allows tasks to be displayed alongside events in calendar views.
 *
 * @param {Array} tasks - Array of task objects
 * @param {Array} clients - Array of client objects for name lookup
 * @returns {Array} Array of calendar event objects
 *
 * Business Logic:
 * - Filters out archived tasks and tasks without due dates
 * - Sets time to 23:59 (end of day deadline)
 * - Calculates progress based on status (Done=100%, In Progress=50%, else=0%)
 * - Marks events with isTask=true for UI differentiation
 */
export const transformTasksToEvents = (tasks, clients) => {
  return tasks
    .filter((task) => task.dueDate && !task.archived)
    .map((task) => {
      const dueDate = task.dueDate instanceof Date ? task.dueDate : tsToDate(task.dueDate);

      // FORMAT: Convert to YYYY-MM-DD string for calendar matching
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, "0");
      const day = String(dueDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // RESOLVE: Get assignee name for display
      let assigneeName = "";
      if (task.assigneeType === "client") {
        const client = clients.find((c) => c.id === task.assigneeId);
        assigneeName = client?.clientName || client?.companyName || "Client";
      } else {
        assigneeName = "Team Member";
      }

      return {
        id: `task_${task.id}`,
        title: `Task: ${task.title}`,
        type: "task",
        status: task.status === "Done" ? "completed" : "pending",
        date: dateStr,
        time: "23:59", // END OF DAY: Tasks are due by end of day
        duration: 0,
        clientId: task.assigneeType === "client" ? task.assigneeId : "",
        clientName: assigneeName,
        description: `Task assigned to ${assigneeName}`,
        priority: task.priority.toLowerCase(),
        location: "",
        attendees: [assigneeName],
        createdBy: "",
        objectives: [],
        assignee: task.assigneeId,
        // PROGRESS CALCULATION: Map status to percentage
        progress: task.status === "Done" ? 100 : task.status === "In Progress" ? 50 : 0,
        isTask: true, // FLAG: Distinguishes tasks from events in UI
        taskId: task.id,
        projectId: task.projectId,
      };
    });
};

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filter events by multiple criteria.
 *
 * @param {Array} events - Array of events to filter
 * @param {object} filters - Filter criteria { type, status, project, employee }
 * @returns {Array} Filtered events
 *
 * Filter Logic:
 * - "all" value means no filtering for that criterion
 * - Employee filter checks attendeeIds for events, assignee for tasks
 */
export const filterEvents = (events, filters) => {
  const { type, status, project, employee } = filters;

  return events.filter((event) => {
    // TYPE FILTER: meeting, task, milestone, etc.
    if (type !== "all" && event.type !== type) return false;

    // STATUS FILTER: pending, completed, cancelled, etc.
    if (status !== "all" && event.status !== status) return false;

    // PROJECT FILTER: For tasks only
    if (project !== "all" && event.projectId !== project) return false;

    // EMPLOYEE FILTER: Different logic for tasks vs events
    if (employee !== "all") {
      if (event.isTask && event.assignee !== employee) return false;
      if (!event.isTask && !event.attendeeIds?.includes(employee)) return false;
    }

    return true;
  });
};

/**
 * Get events for a specific date.
 *
 * @param {Array} events - Array of events
 * @param {Date} date - Target date
 * @returns {Array} Events on that date, sorted by time
 */
export const getEventsForDate = (events, date) => {
  if (!date) return [];

  const dateStr = dateToInputValue(date);
  return events
    .filter((event) => event.date === dateStr)
    .sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
};

/**
 * Get pending meeting requests for a specific date.
 *
 * @param {Array} requests - Array of meeting requests
 * @param {Date} date - Target date
 * @returns {Array} Pending requests for that date
 */
export const getRequestsForDate = (requests, date) => {
  if (!date) return [];

  const dateStr = dateToInputValue(date);
  return requests.filter((req) => req.requestedDate === dateStr && req.status === "pending");
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate calendar dashboard statistics.
 *
 * @param {Array} events - Array of events
 * @param {Array} requests - Array of meeting requests
 * @param {Array} tasks - Array of tasks
 * @returns {object} Statistics { totalEvents, approvedMeetings, upcomingDeadlines, pendingRequests }
 *
 * Business Logic:
 * - upcomingDeadlines: Non-archived, non-done tasks due within 7 days
 * - pendingRequests: Meeting requests waiting for approval
 */
export const calculateCalendarStats = (events, requests, tasks) => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalEvents = events.length;
  const approvedMeetings = events.filter(
    (e) => e.type === "meeting" && e.status === "approved"
  ).length;

  // UPCOMING DEADLINES: Active tasks due within next 7 days
  const upcomingDeadlines = tasks.filter((task) => {
    if (!task.dueDate || task.archived || task.status === "Done") return false;
    const dueDate = task.dueDate instanceof Date ? task.dueDate : tsToDate(task.dueDate);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  }).length;

  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  return {
    totalEvents,
    approvedMeetings,
    upcomingDeadlines,
    pendingRequests,
  };
};

/**
 * Get next 5 upcoming events.
 *
 * @param {Array} events - Array of events
 * @returns {Array} Next 5 upcoming events sorted by datetime
 */
export const getUpcomingEvents = (events) => {
  const now = new Date();

  return [...events]
    .filter((event) => {
      if (!event.date) return false;
      const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}`);
      return eventDateTime >= now;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const bTime = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return aTime - bTime;
    })
    .slice(0, 5);
};

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Check for scheduling conflicts with existing events.
 *
 * @param {object} newEvent - Event to check for conflicts
 * @param {Array} existingEvents - Existing events to check against
 * @returns {Array} Array of conflicting events (empty if no conflicts)
 *
 * Business Logic:
 * - Only checks events on the same date
 * - Compares time ranges using start time + duration
 * - Overlap exists if: newStart < existingEnd AND newEnd > existingStart
 */
export const checkEventConflicts = (newEvent, existingEvents) => {
  if (!newEvent.date || !newEvent.time) return [];

  const newStart = new Date(`${newEvent.date}T${newEvent.time}`);
  const newEnd = new Date(newStart.getTime() + (newEvent.duration || 60) * 60000);

  return existingEvents.filter((event) => {
    if (event.id === newEvent.id) return false; // Skip self-comparison
    if (event.date !== newEvent.date) return false; // Different day
    if (!event.time) return false;

    const eventStart = new Date(`${event.date}T${event.time}`);
    const eventEnd = new Date(eventStart.getTime() + (event.duration || 60) * 60000);

    // OVERLAP CHECK: Two ranges overlap if start1 < end2 AND end1 > start2
    return newStart < eventEnd && newEnd > eventStart;
  });
};

/**
 * Group events by date for calendar grid display.
 *
 * @param {Array} events - Array of events
 * @returns {Map<string, Array>} Map of date string to events array
 */
export const groupEventsByDate = (events) => {
  const grouped = new Map();

  events.forEach((event) => {
    if (!event.date) return;

    if (!grouped.has(event.date)) {
      grouped.set(event.date, []);
    }
    grouped.get(event.date).push(event);
  });

  return grouped;
};

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get emoji icon for event type.
 *
 * @param {string} type - Event type
 * @returns {string} Emoji icon
 */
export const getEventIcon = (type) => {
  const icons = {
    meeting: "📅",
    task: "✅",
    deadline: "⏰",
    milestone: "🎯",
    review: "📊",
  };
  return icons[type] || "📌";
};

/**
 * Get text color class for priority level.
 *
 * @param {string} priority - Priority level (low, medium, high)
 * @returns {string} Tailwind text color class
 */
export const getPriorityColor = (priority) => {
  const colors = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  };
  return colors[priority?.toLowerCase()] || colors.medium;
};

/**
 * Get badge class for status.
 *
 * @param {string} status - Event status
 * @returns {string} Tailwind badge class
 */
export const getStatusBadgeClass = (status) => {
  const classes = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return classes[status?.toLowerCase()] || classes.pending;
};

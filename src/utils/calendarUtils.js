/**
 * Calendar Business Logic Utilities
 * Handles filtering, sorting, and calendar-specific computations
 */

import { tsToDate, dateToInputValue } from "./dateUtils";

/**
 * Build default event form
 * @param {Date} baseDate
 * @returns {object}
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
 * Build default task form
 * @param {Date} baseDate
 * @returns {object}
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

/**
 * Transform tasks into calendar events
 * @param {Array} tasks
 * @param {Array} clients
 * @returns {Array}
 */
export const transformTasksToEvents = (tasks, clients) => {
  return tasks
    .filter((task) => task.dueDate && !task.archived)
    .map((task) => {
      const dueDate = task.dueDate instanceof Date ? task.dueDate : tsToDate(task.dueDate);
      
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, "0");
      const day = String(dueDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
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
        time: "23:59",
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
        progress: task.status === "Done" ? 100 : task.status === "In Progress" ? 50 : 0,
        isTask: true,
        taskId: task.id,
        projectId: task.projectId,
      };
    });
};

/**
 * Filter events by criteria
 * @param {Array} events
 * @param {object} filters
 * @returns {Array}
 */
export const filterEvents = (events, filters) => {
  const { type, status, project, employee } = filters;
  
  return events.filter((event) => {
    // Type filter
    if (type !== "all" && event.type !== type) return false;
    
    // Status filter
    if (status !== "all" && event.status !== status) return false;
    
    // Project filter (for tasks)
    if (project !== "all" && event.projectId !== project) return false;
    
    // Employee filter
    if (employee !== "all") {
      if (event.isTask && event.assignee !== employee) return false;
      if (!event.isTask && !event.attendeeIds?.includes(employee)) return false;
    }
    
    return true;
  });
};

/**
 * Get events for a specific date
 * @param {Array} events
 * @param {Date} date
 * @returns {Array}
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
 * Get meeting requests for a specific date
 * @param {Array} requests
 * @param {Date} date
 * @returns {Array}
 */
export const getRequestsForDate = (requests, date) => {
  if (!date) return [];
  
  const dateStr = dateToInputValue(date);
  return requests.filter((req) => req.requestedDate === dateStr && req.status === "pending");
};

/**
 * Calculate calendar statistics
 * @param {Array} events
 * @param {Array} requests
 * @param {Array} tasks
 * @returns {object}
 */
export const calculateCalendarStats = (events, requests, tasks) => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const totalEvents = events.length;
  const approvedMeetings = events.filter(
    (e) => e.type === "meeting" && e.status === "approved"
  ).length;
  
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
 * Get upcoming events (next 5)
 * @param {Array} events
 * @returns {Array}
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

/**
 * Check for event conflicts (overlapping times)
 * @param {object} newEvent
 * @param {Array} existingEvents
 * @returns {Array} - Conflicting events
 */
export const checkEventConflicts = (newEvent, existingEvents) => {
  if (!newEvent.date || !newEvent.time) return [];
  
  const newStart = new Date(`${newEvent.date}T${newEvent.time}`);
  const newEnd = new Date(newStart.getTime() + (newEvent.duration || 60) * 60000);
  
  return existingEvents.filter((event) => {
    if (event.id === newEvent.id) return false; // Skip self
    if (event.date !== newEvent.date) return false; // Different day
    if (!event.time) return false;
    
    const eventStart = new Date(`${event.date}T${event.time}`);
    const eventEnd = new Date(eventStart.getTime() + (event.duration || 60) * 60000);
    
    // Check overlap
    return newStart < eventEnd && newEnd > eventStart;
  });
};

/**
 * Group events by date
 * @param {Array} events
 * @returns {Map<string, Array>}
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

/**
 * Get event icon based on type
 * @param {string} type
 * @returns {string}
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
 * Get priority color
 * @param {string} priority
 * @returns {string}
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
 * Get status badge class
 * @param {string} status
 * @returns {string}
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

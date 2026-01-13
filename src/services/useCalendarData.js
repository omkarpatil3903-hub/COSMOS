/**
 * useCalendarData Hook - Aggregated Calendar Data Subscriptions
 *
 * Purpose: Provides a single hook that subscribes to all data needed for
 * calendar views (events, meeting requests, tasks, clients, resources, projects).
 *
 * Responsibilities:
 * - Subscribes to 6 Firestore collections in parallel
 * - Normalizes Firestore Timestamps to JavaScript Dates
 * - Manages loading state for initial data fetch
 * - Handles cleanup of all subscriptions on unmount
 *
 * Dependencies:
 * - Firestore (events, meetingRequests, clients, tasks, users, projects)
 * - React (useState, useEffect)
 *
 * Usage:
 * const { events, tasks, clients, loading } = useCalendarData();
 *
 * Performance Considerations:
 * - All subscriptions are initialized in parallel for faster load
 * - Loading state is set to false after tasks load (last critical data)
 * - Consider pagination for large datasets
 *
 * Last Modified: 2026-01-10
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Converts Firestore Timestamp to JavaScript Date.
 * Safe for null/undefined values.
 *
 * @param {Timestamp|Date|null} timestamp - Firestore Timestamp or Date
 * @returns {Date} JavaScript Date object
 */
const tsToDate = (timestamp) => {
  return timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
};

/**
 * Hook providing real-time calendar data from multiple collections.
 *
 * @returns {Object} Calendar data state:
 *   - events: Calendar events array
 *   - meetingRequests: Pending meeting requests array
 *   - clients: Clients lookup array
 *   - resources: Users/resources lookup array
 *   - tasks: Tasks with due dates array
 *   - projects: Projects lookup array
 *   - loading: Boolean indicating if initial data is loading
 *
 * Business Logic:
 * - All collections are subscribed to in parallel on mount
 * - Each subscription normalizes data and converts timestamps
 * - Loading state transitions to false after tasks are loaded
 * - All subscriptions are cleaned up on component unmount
 *
 * @example
 * function CalendarView() {
 *   const { events, tasks, loading } = useCalendarData();
 *   if (loading) return <Spinner />;
 *   return <Calendar events={events} tasks={tasks} />;
 * }
 */
export const useCalendarData = () => {
  // State for each data collection
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscription cleanup functions
    let unsubEvents, unsubRequests, unsubClients, unsubTasks, unsubResources, unsubProjects;

    const initSubscriptions = async () => {
      // 1. EVENTS: Calendar events sorted by date
      unsubEvents = onSnapshot(query(collection(db, "events"), orderBy("date", "asc")), (snap) => {
        const loaded = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          // Convert Firestore Timestamps to JS Dates for consistent handling
          cancelledAt: d.data().cancelledAt ? tsToDate(d.data().cancelledAt) : null,
          createdAt: d.data().createdAt ? tsToDate(d.data().createdAt) : null
        }));
        setEvents(loaded);
      });

      // 2. MEETING REQUESTS: Client meeting requests (pending, rejected)
      unsubRequests = onSnapshot(collection(db, "meetingRequests"), (snap) => {
        setMeetingRequests(snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          requestedAt: d.data().requestedAt ? tsToDate(d.data().requestedAt) : null,
          rejectedAt: d.data().rejectedAt ? tsToDate(d.data().rejectedAt) : null
        })));
      });

      // 3. CLIENTS: Client data for event associations
      unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
        setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // 4. TASKS: Tasks with due dates for calendar display
      // Loading state is set to false here as tasks are typically the last critical data
      unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("dueDate", "asc")), (snap) => {
        setTasks(snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          dueDate: d.data().dueDate ? tsToDate(d.data().dueDate) : null,
          createdAt: d.data().createdAt ? tsToDate(d.data().createdAt) : null
        })));
        // Set loading to false after tasks load (critical for calendar rendering)
        setLoading(false);
      });

      // 5. RESOURCES: Users for attendee/assignee lookups
      unsubResources = onSnapshot(query(collection(db, "users"), orderBy("name", "asc")), (snap) => {
        setResources(snap.docs.map(d => ({
          id: d.id,
          name: d.data().name || d.data().email || "Unknown",
          email: d.data().email,
          role: d.data().role
        })));
      });

      // 6. PROJECTS: Project data for task associations
      unsubProjects = onSnapshot(query(collection(db, "projects"), orderBy("projectName", "asc")), (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, name: d.data().projectName, ...d.data() })));
      });
    };

    initSubscriptions();

    // CLEANUP: Unsubscribe from all listeners on unmount
    // Prevents memory leaks and unnecessary Firestore reads
    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubRequests) unsubRequests();
      if (unsubClients) unsubClients();
      if (unsubTasks) unsubTasks();
      if (unsubResources) unsubResources();
      if (unsubProjects) unsubProjects();
    };
  }, []);

  return { events, meetingRequests, clients, resources, tasks, projects, loading };
};
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { tsToDate } from "../utils/dateUtils";

/**
 * Shared hook for calendar data subscriptions.
 * Provides real-time data for events, meeting requests, clients, resources, tasks, and projects.
 */
export const useCalendarData = () => {
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubEvents,
      unsubRequests,
      unsubClients,
      unsubTasks,
      unsubResources,
      unsubProjects;

    const initSubscriptions = async () => {
      // 1. Events - with full data transformation
      unsubEvents = onSnapshot(
        query(collection(db, "events"), orderBy("date", "asc")),
        (snap) => {
          const loadedEvents = snap.docs.map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              title: data.title || "",
              type: String(data.type || "meeting").toLowerCase(),
              status: String(data.status || "pending").toLowerCase(),
              date: data.date || "",
              time: data.time || "",
              duration: data.duration || 60,
              clientId: data.clientId || "",
              clientName: data.clientName || "",
              description: data.description || "",
              priority: String(data.priority || "medium").toLowerCase(),
              location: data.location || "",
              attendees: data.attendees || [],
              attendeeIds: data.attendeeIds || [],
              createdBy: data.createdBy || "",
              objectives: data.objectives || [],
              cancelReason: data.cancelReason || "",
              cancelledBy: data.cancelledBy || "",
              cancelledAt: data.cancelledAt ? tsToDate(data.cancelledAt) : null,
              completedAt: data.completedAt ? tsToDate(data.completedAt) : null,
              createdAt: data.createdAt ? tsToDate(data.createdAt) : null,
              assignee: data.assignee || "",
              progress: data.progress || 0,
            };
          });
          setEvents(loadedEvents);
        }
      );

      // 2. Meeting Requests - with full data transformation
      unsubRequests = onSnapshot(collection(db, "meetingRequests"), (snap) => {
        setMeetingRequests(
          snap.docs.map((d) => {
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
              requestedAt: data.requestedAt ? tsToDate(data.requestedAt) : null,
              rejectedAt: data.rejectedAt ? tsToDate(data.rejectedAt) : null,
              rejectedBy: data.rejectedBy || "",
              rejectionReason: data.rejectionReason || "",
              email: data.email || "",
              phone: data.phone || "",
            };
          })
        );
      });

      // 3. Clients
      unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
      });

      // 4. Tasks - with full data transformation
      unsubTasks = onSnapshot(
        query(collection(db, "tasks"), orderBy("dueDate", "asc")),
        (snap) => {
          setTasks(
            snap.docs.map((d) => {
              const data = d.data() || {};
              return {
                id: d.id,
                title: data.title || "",
                description: data.description || "",
                projectId: data.projectId || "",
                assigneeId: data.assigneeId || "",
                assigneeType: data.assigneeType || "user",
                status: data.status || "To-Do",
                priority: data.priority || "Medium",
                dueDate: data.dueDate ? tsToDate(data.dueDate) : null,
                createdAt: data.createdAt ? tsToDate(data.createdAt) : null,
                completedAt: data.completedAt
                  ? tsToDate(data.completedAt)
                  : null,
                archived: data.archived || false,
                isRecurring: data.isRecurring || false,
                recurrencePattern: data.recurrencePattern || null,
                parentTaskId: data.parentTaskId || null,
              };
            })
          );
          setLoading(false);
        }
      );

      // 5. Resources (Users)
      unsubResources = onSnapshot(
        query(collection(db, "users"), orderBy("name", "asc")),
        (snap) => {
          setResources(
            snap.docs.map((d) => ({
              id: d.id,
              name: d.data().name || d.data().email || "Unknown",
              email: d.data().email || "",
              role: d.data().role || "resource",
            }))
          );
        }
      );

      // 6. Projects - with deleted filter
      unsubProjects = onSnapshot(
        query(collection(db, "projects"), orderBy("projectName", "asc")),
        (snap) => {
          const loadedProjects = snap.docs
            .map((d) => {
              const data = d.data() || {};
              return {
                id: d.id,
                name: data.projectName || data.name || "",
                ...data,
              };
            })
            .filter((p) => !p.deleted && !p.isDeleted);
          setProjects(loadedProjects);
        }
      );
    };

    initSubscriptions();

    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubRequests) unsubRequests();
      if (unsubClients) unsubClients();
      if (unsubTasks) unsubTasks();
      if (unsubResources) unsubResources();
      if (unsubProjects) unsubProjects();
    };
  }, []);

  return {
    events,
    meetingRequests,
    clients,
    resources,
    tasks,
    projects,
    loading,
  };
};

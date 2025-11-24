import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

// Helper to convert Firestore Timestamp to Date
const tsToDate = (timestamp) => {
  return timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
};

export const useCalendarData = () => {
  const [events, setEvents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubEvents, unsubRequests, unsubClients, unsubTasks, unsubResources, unsubProjects;

    const initSubscriptions = async () => {
      // 1. Events
      unsubEvents = onSnapshot(query(collection(db, "events"), orderBy("date", "asc")), (snap) => {
        const loaded = snap.docs.map(d => ({
            id: d.id, 
            ...d.data(),
            cancelledAt: d.data().cancelledAt ? tsToDate(d.data().cancelledAt) : null,
            createdAt: d.data().createdAt ? tsToDate(d.data().createdAt) : null
        }));
        setEvents(loaded);
      });

      // 2. Meeting Requests
      unsubRequests = onSnapshot(collection(db, "meetingRequests"), (snap) => {
        setMeetingRequests(snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            requestedAt: d.data().requestedAt ? tsToDate(d.data().requestedAt) : null,
            rejectedAt: d.data().rejectedAt ? tsToDate(d.data().rejectedAt) : null
        })));
      });

      // 3. Clients
      unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
        setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // 4. Tasks
      unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("dueDate", "asc")), (snap) => {
        setTasks(snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            dueDate: d.data().dueDate ? tsToDate(d.data().dueDate) : null,
            createdAt: d.data().createdAt ? tsToDate(d.data().createdAt) : null
        })));
        setLoading(false); 
      });

      // 5. Resources (Users)
      unsubResources = onSnapshot(query(collection(db, "users"), orderBy("name", "asc")), (snap) => {
        setResources(snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || d.data().email || "Unknown",
            email: d.data().email,
            role: d.data().role
        })));
      });

      // 6. Projects
      unsubProjects = onSnapshot(query(collection(db, "projects"), orderBy("projectName", "asc")), (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, name: d.data().projectName, ...d.data() })));
      });
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

  return { events, meetingRequests, clients, resources, tasks, projects, loading };
};
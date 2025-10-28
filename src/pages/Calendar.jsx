import React, { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaClock,
  FaUsers,
  FaFlag,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
} from "react-icons/fa";

// Add meeting requests data
const sampleMeetingRequests = [
  {
    id: "req1",
    clientId: "c1",
    clientName: "Tech Corp",
    companyName: "Tech Corp Solutions Ltd.",
    requestedDate: "2025-10-03",
    requestedTime: "10:00",
    duration: 120,
    purpose: "Discuss Q4 project requirements and budget allocation",
    priority: "high",
    status: "pending", // pending, approved, rejected
    requestedAt: "2025-09-28T14:30:00Z",
    email: "contact@techcorp.com",
    phone: "+1-555-0123",
  },
  {
    id: "req2",
    clientId: "c2",
    clientName: "StartupXYZ",
    companyName: "StartupXYZ Inc.",
    requestedDate: "2025-10-03",
    requestedTime: "14:00",
    duration: 90,
    purpose: "Product demo and feature discussion",
    priority: "medium",
    status: "pending",
    requestedAt: "2025-09-29T09:15:00Z",
    email: "hello@startupxyz.com",
    phone: "+1-555-0456",
  },
  {
    id: "req3",
    clientId: "c3",
    clientName: "Retail Solutions",
    companyName: "Retail Solutions Group",
    requestedDate: "2025-10-03",
    requestedTime: "16:00",
    duration: 60,
    purpose: "Review project timeline and deliverables",
    priority: "low",
    status: "pending",
    requestedAt: "2025-09-30T11:45:00Z",
    email: "info@retail.com",
    phone: "+1-555-0789",
  },
  // October 24, 27, 30 - Meeting Requests
  {
    id: "req24",
    clientId: "c11",
    clientName: "Metro Corp",
    companyName: "Metro Corporation Limited",
    requestedDate: "2025-10-24",
    requestedTime: "09:00",
    duration: 90,
    purpose: "Infrastructure upgrade consultation",
    priority: "high",
    status: "pending",
    requestedAt: "2025-10-20T08:30:00Z",
    email: "info@metrocorp.com",
    phone: "+1-555-2410",
  },
  {
    id: "req25",
    clientId: "c12",
    clientName: "Bright Solutions",
    companyName: "Bright Solutions Inc.",
    requestedDate: "2025-10-24",
    requestedTime: "14:30",
    duration: 120,
    purpose: "Solar energy project proposal",
    priority: "medium",
    status: "pending",
    requestedAt: "2025-10-21T10:15:00Z",
    email: "contact@brightsolutions.com",
    phone: "+1-555-2411",
  },
  {
    id: "req26",
    clientId: "c13",
    clientName: "DataFlow Systems",
    companyName: "DataFlow Systems Ltd.",
    requestedDate: "2025-10-27",
    requestedTime: "11:00",
    duration: 150,
    purpose: "Database optimization and performance review",
    priority: "high",
    status: "pending",
    requestedAt: "2025-10-23T13:45:00Z",
    email: "tech@dataflow.com",
    phone: "+1-555-2710",
  },
  {
    id: "req27",
    clientId: "c14",
    clientName: "CloudTech",
    companyName: "CloudTech Solutions",
    requestedDate: "2025-10-27",
    requestedTime: "15:30",
    duration: 75,
    purpose: "Cloud migration strategy discussion",
    priority: "medium",
    status: "pending",
    requestedAt: "2025-10-24T09:20:00Z",
    email: "hello@cloudtech.com",
    phone: "+1-555-2711",
  },
  {
    id: "req28",
    clientId: "c15",
    clientName: "SecureNet",
    companyName: "SecureNet Technologies",
    requestedDate: "2025-10-30",
    requestedTime: "10:30",
    duration: 100,
    purpose: "Cybersecurity assessment and recommendations",
    priority: "high",
    status: "pending",
    requestedAt: "2025-10-26T14:10:00Z",
    email: "security@securenet.com",
    phone: "+1-555-3010",
  },
  {
    id: "req29",
    clientId: "c16",
    clientName: "WebCraft",
    companyName: "WebCraft Digital Agency",
    requestedDate: "2025-10-30",
    requestedTime: "16:00",
    duration: 60,
    purpose: "Website redesign project kickoff",
    priority: "low",
    status: "pending",
    requestedAt: "2025-10-27T11:30:00Z",
    email: "projects@webcraft.com",
    phone: "+1-555-3011",
  },
  {
    id: "req4",
    clientId: "c4",
    clientName: "Enterprise Solutions",
    companyName: "Enterprise Solutions Corp",
    requestedDate: "2025-10-15",
    requestedTime: "11:00",
    duration: 180,
    purpose: "Strategic planning and roadmap discussion",
    priority: "high",
    status: "pending",
    requestedAt: "2025-10-01T16:20:00Z",
    email: "contact@enterprise.com",
    phone: "+1-555-0321",
  },
];

// Sample data for events
const sampleEvents = [
  // October 3, 5, 10, 18, 23 - Approved Meetings
  {
    id: "e_oct3",
    title: "Client Meeting - Project Strategy Review",
    type: "meeting",
    status: "approved",
    date: "2025-10-03",
    time: "09:30",
    duration: 120,
    clientId: "c20",
    clientName: "Strategic Partners",
    description: "Quarterly strategy review and planning session",
    priority: "high",
    location: "Conference Room B",
    attendees: ["Strategic Partners Team", "Project Managers"],
    createdBy: "admin",
    objectives: [
      { id: "o20", text: "Review Q3 performance", completed: true },
      { id: "o21", text: "Set Q4 objectives", completed: false },
    ],
  },
  {
    id: "e_oct5",
    title: "Client Meeting - Technical Architecture Discussion",
    type: "meeting",
    status: "approved",
    date: "2025-10-05",
    time: "14:00",
    duration: 90,
    clientId: "c21",
    clientName: "TechFlow Industries",
    description: "Technical architecture review and system design",
    priority: "medium",
    location: "Meeting Room A",
    attendees: ["TechFlow Team", "Lead Architects"],
    createdBy: "admin",
    objectives: [
      { id: "o22", text: "Review system architecture", completed: true },
      { id: "o23", text: "Discuss scalability options", completed: true },
    ],
  },
  {
    id: "e_oct10",
    title: "Client Meeting - Product Demo and Feedback",
    type: "meeting",
    status: "approved",
    date: "2025-10-10",
    time: "11:15",
    duration: 150,
    clientId: "c22",
    clientName: "Innovation Labs",
    description: "Product demonstration and client feedback session",
    priority: "high",
    location: "Demo Room",
    attendees: ["Innovation Labs Team", "Product Team"],
    createdBy: "admin",
    objectives: [
      { id: "o24", text: "Demonstrate new features", completed: true },
      { id: "o25", text: "Collect client feedback", completed: true },
      { id: "o26", text: "Plan next iterations", completed: false },
    ],
  },
  {
    id: "e_oct18",
    title: "Client Meeting - Security Audit Results",
    type: "meeting",
    status: "approved",
    date: "2025-10-18",
    time: "10:00",
    duration: 105,
    clientId: "c23",
    clientName: "SecureBase",
    description: "Security audit findings and remediation plan",
    priority: "high",
    location: "Secure Conference Room",
    attendees: ["SecureBase Team", "Security Team"],
    createdBy: "admin",
    objectives: [
      { id: "o27", text: "Present audit findings", completed: true },
      { id: "o28", text: "Discuss remediation steps", completed: true },
      { id: "o29", text: "Set implementation timeline", completed: false },
    ],
  },
  {
    id: "e_oct23",
    title: "Client Meeting - Mobile App Wireframe Review",
    type: "meeting",
    status: "approved",
    date: "2025-10-23",
    time: "15:30",
    duration: 75,
    clientId: "c24",
    clientName: "MobileFirst",
    description: "Mobile application wireframe and UX review",
    priority: "medium",
    location: "Design Studio",
    attendees: ["MobileFirst Team", "UX Designers"],
    createdBy: "admin",
    objectives: [
      { id: "o30", text: "Review wireframes", completed: true },
      { id: "o31", text: "Validate user flows", completed: true },
      { id: "o32", text: "Approve design direction", completed: true },
    ],
  },
  {
    id: "e1",
    title: "Client Meeting - Project Alpha Review",
    type: "meeting",
    status: "approved",
    date: "2025-11-15",
    time: "10:00",
    duration: 120,
    clientId: "c1",
    clientName: "Tech Corp",
    description: "Review project milestones and discuss next phase",
    priority: "high",
    location: "Conference Room A",
    attendees: ["John Doe", "Jane Smith"],
    createdBy: "admin",
    objectives: [
      { id: "o1", text: "Review Q4 deliverables", completed: true },
      { id: "o2", text: "Discuss budget allocation", completed: false },
      { id: "o3", text: "Plan next sprint", completed: false },
    ],
  },
  {
    id: "e2",
    title: "Task Deadline - Database Migration",
    type: "task",
    status: "pending",
    date: "2025-11-18",
    time: "23:59",
    duration: 0,
    clientId: "c2",
    clientName: "StartupXYZ",
    description: "Complete database migration to new server",
    priority: "high",
    assignee: "Dev Team",
    progress: 75,
    objectives: [
      { id: "o4", text: "Backup current database", completed: true },
      { id: "o5", text: "Setup new server environment", completed: true },
      { id: "o6", text: "Migrate data", completed: false },
      { id: "o7", text: "Test connectivity", completed: false },
    ],
  },
  {
    id: "e3",
    title: "Client Presentation - Mobile App Demo",
    type: "meeting",
    status: "cancelled",
    date: "2025-11-20",
    time: "14:00",
    duration: 90,
    clientId: "c3",
    clientName: "Retail Solutions",
    description: "Demo of new mobile application features",
    priority: "medium",
    location: "Client Office",
    cancelReason: "Client requested postponement due to internal conflicts",
    cancelledBy: "client",
    cancelledAt: "2025-11-18T09:30:00Z",
  },
  {
    id: "e4",
    title: "Project Milestone - Beta Release",
    type: "milestone",
    status: "completed",
    date: "2025-11-12",
    time: "17:00",
    duration: 0,
    clientId: "c1",
    clientName: "Tech Corp",
    description: "Beta version release and client notification",
    priority: "high",
    completedAt: "2025-11-12T16:45:00Z",
    objectives: [
      { id: "o8", text: "Deploy to staging environment", completed: true },
      { id: "o9", text: "Conduct internal testing", completed: true },
      { id: "o10", text: "Send release notes to client", completed: true },
    ],
  },
  {
    id: "e5",
    title: "Follow-up Call - Project Requirements",
    type: "call",
    status: "approved",
    date: "2025-11-25",
    time: "11:00",
    duration: 60,
    clientId: "c4",
    clientName: "Enterprise Solutions",
    description: "Clarify project requirements and scope",
    priority: "medium",
    objectives: [
      { id: "o11", text: "Review technical specifications", completed: false },
      { id: "o12", text: "Confirm timeline expectations", completed: false },
    ],
  },
];

const sampleClients = [
  {
    id: "c1",
    name: "Tech Corp",
    email: "contact@techcorp.com",
    status: "active",
  },
  {
    id: "c2",
    name: "StartupXYZ",
    email: "hello@startupxyz.com",
    status: "active",
  },
  {
    id: "c3",
    name: "Retail Solutions",
    email: "info@retail.com",
    status: "active",
  },
  {
    id: "c4",
    name: "Enterprise Solutions",
    email: "contact@enterprise.com",
    status: "active",
  },
];

function Calendar() {
  const [events, setEvents] = useState(sampleEvents);
  const [meetingRequests, setMeetingRequests] = useState(sampleMeetingRequests);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter((event) => {
      const eventDate = event.date;
      let typeMatch = filterType === "all" || event.type === filterType;
      let statusMatch = filterStatus === "all" || event.status === filterStatus;
      return eventDate === dateStr && typeMatch && statusMatch;
    });
  };

  // Get all filtered events
  const getFilteredEvents = () => {
    return events.filter((event) => {
      let typeMatch = filterType === "all" || event.type === filterType;
      let statusMatch = filterStatus === "all" || event.status === filterStatus;
      return typeMatch && statusMatch;
    });
  };

  // Get meeting requests for a specific date
  const getMeetingRequestsForDate = (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return meetingRequests.filter((req) => req.requestedDate === dateStr);
  };

  // Handle event actions
  const handleApproveEvent = (eventId) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, status: "approved" } : event
      )
    );
    toast.success("Event approved successfully!");
  };

  const handleCancelEvent = (eventId, reason) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "cancelled",
              cancelReason: reason,
              cancelledBy: "admin",
              cancelledAt: new Date().toISOString(),
            }
          : event
      )
    );
    toast.success("Event cancelled successfully!");
  };

  const handleCompleteTask = (eventId) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : event
      )
    );
    toast.success("Task marked as completed!");
  };

  const toggleObjective = (eventId, objectiveId) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === eventId) {
          const updatedObjectives = event.objectives?.map((obj) =>
            obj.id === objectiveId ? { ...obj, completed: !obj.completed } : obj
          );
          return { ...event, objectives: updatedObjectives };
        }
        return event;
      })
    );
  };

  const deleteEvent = (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      toast.success("Event deleted successfully!");
    }
  };

  // Handle meeting request approval
  const handleApproveRequest = (requestId) => {
    const request = meetingRequests.find((req) => req.id === requestId);
    if (!request) return;

    // Remove only the approved request (not all requests for the same date)
    setMeetingRequests((prev) => prev.filter((req) => req.id !== requestId));

    // Update selectedRequests to remove only the approved request
    setSelectedRequests((prev) => prev.filter((req) => req.id !== requestId));

    // Create new event from approved request
    const newEvent = {
      id: `e_${Date.now()}`,
      title: `Client Meeting - ${request.purpose}`,
      type: "meeting",
      status: "approved",
      date: request.requestedDate,
      time: request.requestedTime,
      duration: request.duration,
      clientId: request.clientId,
      clientName: request.clientName,
      description: request.purpose,
      priority: request.priority,
      location: "Conference Room",
      attendees: [request.clientName],
      createdBy: "admin",
      objectives: [
        {
          id: `o_${Date.now()}`,
          text: "Discuss project requirements",
          completed: false,
        },
        {
          id: `o_${Date.now() + 1}`,
          text: "Review timeline",
          completed: false,
        },
      ],
    };

    setEvents((prev) => [...prev, newEvent]);
    toast.success(`Meeting with ${request.clientName} approved and scheduled!`);

    // Close modal only if no more requests for this date
    const remainingRequestsForDate = meetingRequests.filter(
      (req) =>
        req.requestedDate === request.requestedDate && req.id !== requestId
    );
    if (remainingRequestsForDate.length === 0) {
      setShowRequestModal(false);
    }
  };

  // Handle meeting request rejection
  const handleRejectRequest = (requestId) => {
    const request = meetingRequests.find((req) => req.id === requestId);
    if (!request) return;

    // Remove only the rejected request
    setMeetingRequests((prev) => prev.filter((req) => req.id !== requestId));

    // Update selectedRequests to remove this specific request
    setSelectedRequests((prev) => prev.filter((req) => req.id !== requestId));

    toast.success(`Meeting request from ${request.clientName} rejected.`);

    // Close modal if no more requests for this date
    const remainingRequestsForDate = meetingRequests.filter(
      (req) =>
        req.requestedDate === request.requestedDate && req.id !== requestId
    );
    if (remainingRequestsForDate.length === 0) {
      setShowRequestModal(false);
    }
  };

  // Show requests for a specific date
  const showRequestsForDate = (date) => {
    const requests = getMeetingRequestsForDate(date);
    if (requests.length > 0) {
      setSelectedRequests(requests);
      setShowRequestModal(true);
    }
  };

  // Calculate stats including meeting requests
  const calendarStats = {
    totalEvents: events.length,
    pendingApprovals: events.filter((e) => e.status === "pending").length,
    approvedMeetings: events.filter(
      (e) => e.type === "meeting" && e.status === "approved"
    ).length,
    cancelledEvents: events.filter((e) => e.status === "cancelled").length,
    completedTasks: events.filter((e) => e.status === "completed").length,
    upcomingDeadlines: events.filter((e) => {
      const eventDate = new Date(e.date);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return (
        eventDate >= today && eventDate <= nextWeek && e.status !== "completed"
      );
    }).length,
    pendingRequests: meetingRequests.filter((req) => req.status === "pending")
      .length,
  };

  // Calendar rendering
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-100"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const dayRequests = getMeetingRequestsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 relative ${
            isToday ? "bg-blue-50 border-blue-200" : ""
          } ${isSelected ? "bg-indigo-50 border-indigo-300" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-medium ${
              isToday ? "text-blue-600" : "text-gray-900"
            }`}
          >
            {day}
          </div>

          {/* Meeting requests indicator */}
          {dayRequests.length > 0 && (
            <div className="absolute top-1 right-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showRequestsForDate(date);
                }}
                className="w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-orange-600"
                title={`${dayRequests.length} meeting request(s)`}
              >
                {dayRequests.length}
              </button>
            </div>
          )}

          <div className="mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map((event) => {
              const colors = {
                meeting: "bg-blue-100 text-blue-700",
                task: "bg-green-100 text-green-700",
                milestone: "bg-purple-100 text-purple-700",
                call: "bg-yellow-100 text-yellow-700",
              };

              const statusColors = {
                approved: "border-l-4 border-green-500",
                pending: "border-l-4 border-yellow-500",
                cancelled: "border-l-4 border-red-500",
                completed: "border-l-4 border-blue-500",
              };

              return (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded ${colors[event.type]} ${
                    statusColors[event.status]
                  } truncate`}
                  title={event.title}
                >
                  {event.time} - {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div>
      <PageHeader
        title="Project Calendar"
        description="Manage meetings, tasks, milestones, and client interactions in one place."
      />

      <div className="space-y-6">
        {/* Calendar Controls */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaChevronLeft />
                </button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center">
                  {monthNames[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaChevronRight />
                </button>
              </div>

              <Button
                variant="secondary"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="meeting">Meetings</option>
                <option value="task">Tasks</option>
                <option value="milestone">Milestones</option>
                <option value="call">Calls</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>

              <Button onClick={() => setShowEventModal(true)}>
                <FaPlus /> Add Event
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3 p-4">
            <div className="grid grid-cols-7 gap-0 mb-4">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center font-medium text-gray-600 border-b"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0">{renderCalendarDays()}</div>
          </Card>

          {/* Event Details Sidebar */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-4">
              {selectedDate
                ? `Events for ${selectedDate.toLocaleDateString()}`
                : "Select a date"}
            </h3>

            {selectedDate ? (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No events on this date
                  </p>
                ) : (
                  getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingEvent(event)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Time: {event.time}</div>
                        <div>Client: {event.clientName}</div>
                        <div>
                          Duration:{" "}
                          {event.duration ? `${event.duration} minutes` : "—"}
                        </div>
                        <div>
                          Email:{" "}
                          {event.email ||
                            event.clientName
                              ?.toLowerCase()
                              .replace(/\s+/g, "") + "@company.com" ||
                            "—"}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {event.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApproveEvent(event.id)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              <FaCheck size={10} /> Approve
                            </button>
                            <button
                              onClick={() =>
                                handleCancelEvent(
                                  event.id,
                                  "Cancelled by admin"
                                )
                              }
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                            >
                              <FaTimes size={10} /> Cancel
                            </button>
                          </>
                        )}
                        {event.type === "task" &&
                          event.status !== "completed" && (
                            <button
                              onClick={() => handleCompleteTask(event.id)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              <FaCheck size={10} /> Complete
                            </button>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <FaCalendarAlt size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Click on a date to view events</p>
              </div>
            )}
          </Card>
        </div>

        {/* Meeting Requests Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowRequestModal(false)}
            />
            <Card className="z-10 w-full max-w-4xl max-h-[90vh] overflow-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Meeting Requests -{" "}
                  {selectedRequests[0]?.requestedDate &&
                    new Date(
                      selectedRequests[0].requestedDate
                    ).toLocaleDateString()}
                </h2>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="rounded-lg p-2 text-content-secondary hover:bg-surface-subtle"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-content-primary">
                          {request.companyName}
                        </h3>
                        <p className="text-sm text-content-secondary">
                          Contact: {request.clientName}
                        </p>
                      </div>
                      {/* Remove status badge */}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-content-secondary">
                          Requested Time:
                        </span>
                        <div>{request.requestedTime}</div>
                      </div>
                      <div>
                        <span className="font-medium text-content-secondary">
                          Duration:
                        </span>
                        <div>{request.duration} minutes</div>
                      </div>
                      <div>
                        <span className="font-medium text-content-secondary">
                          Email:
                        </span>
                        <div>{request.email}</div>
                      </div>
                      <div>
                        <span className="font-medium text-content-secondary">
                          Phone:
                        </span>
                        <div>{request.phone}</div>
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-content-secondary">
                        Purpose:
                      </span>
                      <p className="mt-1 text-sm text-content-primary">
                        {request.purpose}
                      </p>
                    </div>

                    {/* Remove priority section */}

                    <div className="text-xs text-content-tertiary">
                      Requested on:{" "}
                      {new Date(request.requestedAt).toLocaleString()}
                    </div>

                    {/* Remove conditional status check and always show buttons */}
                    <div className="flex gap-3 pt-3 border-t">
                      <Button
                        variant="primary"
                        onClick={() => handleApproveRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <FaCheck /> Accept
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <FaTimes /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Export events for use in dashboard
export { sampleEvents };
export default Calendar;

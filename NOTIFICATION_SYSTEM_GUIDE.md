# Notification System Implementation Guide

## Overview
Implement a real-time notification system for the admin panel using Firebase Firestore and React Context.

---

## Architecture

### **1. Notification Types**
- 🔔 **Meeting Requests** - New client meeting requests
- ✅ **Task Updates** - Task status changes, assignments
- 📅 **Deadlines** - Upcoming task/project deadlines
- 👥 **Team Updates** - New team members, role changes
- 📊 **Project Updates** - Project status changes
- 💬 **Comments** - New comments on tasks/projects
- ⚠️ **System Alerts** - Important system messages

### **2. Features**
- ✅ Real-time notifications (Firestore listeners)
- ✅ Notification bell with unread count
- ✅ Dropdown notification panel
- ✅ Mark as read/unread
- ✅ Mark all as read
- ✅ Delete notifications
- ✅ Filter by type
- ✅ Notification sounds (optional)
- ✅ Browser notifications (optional)
- ✅ Notification history page

---

## Implementation Steps

### **Step 1: Firestore Collection Structure**

```javascript
// Collection: "notifications"
{
  id: "auto-generated",
  userId: "user123",              // Recipient user ID
  type: "meeting_request",        // notification type
  title: "New Meeting Request",
  message: "John Doe requested a meeting",
  data: {                         // Additional context data
    requestId: "req123",
    clientName: "John Doe",
    meetingDate: "2025-11-10"
  },
  read: false,                    // Read status
  createdAt: Timestamp,
  readAt: Timestamp | null,
  actionUrl: "/calendar",         // Where to navigate on click
  priority: "high"                // low, medium, high
}
```

### **Step 2: Create Notification Context**

**File: `src/contexts/NotificationContext.jsx`**

```javascript
import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext"; // Your auth context

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth(); // Get current logged-in user
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: new Date(),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadNotifs = notifications.filter((n) => !n.read);
      
      unreadNotifs.forEach((notif) => {
        batch.update(doc(db, "notifications", notif.id), {
          read: true,
          readAt: new Date(),
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        batch.delete(doc(db, "notifications", notif.id));
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

### **Step 3: Create Notification Bell Component**

**File: `src/components/NotificationBell.jsx`**

```javascript
import React, { useState, useRef, useEffect } from "react";
import { FaBell, FaCheck, FaTrash, FaTimes, FaCheckDouble } from "react-icons/fa";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      meeting_request: "📅",
      task_update: "✅",
      deadline: "⏰",
      team_update: "👥",
      project_update: "📊",
      comment: "💬",
      system: "⚠️",
    };
    return icons[type] || "🔔";
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <FaBell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <FaCheckDouble className="text-xs" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaBell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        title="Delete"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

### **Step 4: Add to MainLayout**

**Update: `src/components/MainLayout.jsx`**

```javascript
import NotificationBell from "./NotificationBell";

// Inside your header/navbar section, add:
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* Your existing user menu, etc. */}
</div>
```

### **Step 5: Wrap App with NotificationProvider**

**Update: `src/main.jsx` or `src/App.jsx`**

```javascript
import { NotificationProvider } from "./contexts/NotificationContext";

// Wrap your app:
<AuthProvider>
  <NotificationProvider>
    <RouterProvider router={router} />
  </NotificationProvider>
</AuthProvider>
```

### **Step 6: Create Notification Helper Functions**

**File: `src/utils/notificationHelpers.js`**

```javascript
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Send a notification to a user
 */
export const sendNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
  priority = "medium",
}) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      title,
      message,
      data,
      actionUrl,
      priority,
      read: false,
      createdAt: Timestamp.now(),
      readAt: null,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

/**
 * Send notification to multiple users
 */
export const sendBulkNotifications = async (userIds, notificationData) => {
  const promises = userIds.map((userId) =>
    sendNotification({ userId, ...notificationData })
  );
  await Promise.all(promises);
};

/**
 * Notify admins about new meeting request
 */
export const notifyNewMeetingRequest = async (adminIds, clientName, requestData) => {
  await sendBulkNotifications(adminIds, {
    type: "meeting_request",
    title: "New Meeting Request",
    message: `${clientName} has requested a meeting`,
    data: requestData,
    actionUrl: "/calendar",
    priority: "high",
  });
};

/**
 * Notify user about task assignment
 */
export const notifyTaskAssignment = async (userId, taskTitle, projectName) => {
  await sendNotification({
    userId,
    type: "task_update",
    title: "New Task Assigned",
    message: `You've been assigned: ${taskTitle} in ${projectName}`,
    actionUrl: "/task-management",
    priority: "high",
  });
};

/**
 * Notify about upcoming deadline
 */
export const notifyUpcomingDeadline = async (userId, taskTitle, daysLeft) => {
  await sendNotification({
    userId,
    type: "deadline",
    title: "Deadline Reminder",
    message: `${taskTitle} is due in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
    actionUrl: "/task-management",
    priority: daysLeft <= 1 ? "high" : "medium",
  });
};
```

### **Step 7: Integrate into Existing Features**

**Example: Meeting Request Approval**

```javascript
// In Calendar.jsx or wherever meeting requests are handled
import { sendNotification } from "../utils/notificationHelpers";

const handleApproveMeetingRequest = async (request) => {
  // ... existing approval logic ...
  
  // Send notification to client
  await sendNotification({
    userId: request.clientId,
    type: "meeting_request",
    title: "Meeting Approved",
    message: `Your meeting request for ${request.meetingDate} has been approved`,
    actionUrl: "/client-calendar",
    priority: "high",
  });
};
```

### **Step 8: Create Notifications Page (Optional)**

**File: `src/pages/Notifications.jsx`**

```javascript
import React, { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { FaBell, FaCheckDouble, FaTrash } from "react-icons/fa";

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState("all"); // all, unread, read

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  return (
    <div>
      <PageHeader title="Notifications">
        Manage all your notifications
      </PageHeader>

      <div className="space-y-6">
        {/* Actions */}
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={filter === "all" ? "primary" : "ghost"}
                onClick={() => setFilter("all")}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === "unread" ? "primary" : "ghost"}
                onClick={() => setFilter("unread")}
              >
                Unread ({notifications.filter((n) => !n.read).length})
              </Button>
              <Button
                variant={filter === "read" ? "primary" : "ghost"}
                onClick={() => setFilter("read")}
              >
                Read ({notifications.filter((n) => n.read).length})
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={markAllAsRead}>
                <FaCheckDouble /> Mark All Read
              </Button>
              <Button variant="ghost" onClick={clearAll}>
                <FaTrash /> Clear All
              </Button>
            </div>
          </div>
        </Card>

        {/* Notification List */}
        <Card>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <FaBell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 ${!notification.read ? "bg-blue-50" : ""}`}
                >
                  {/* Notification content similar to dropdown */}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
```

---

## Usage Examples

### **1. When a client submits a meeting request:**

```javascript
import { sendNotification } from "../utils/notificationHelpers";

// Get all admin user IDs
const adminIds = users.filter(u => u.role === "admin").map(u => u.id);

// Send notifications
await sendBulkNotifications(adminIds, {
  type: "meeting_request",
  title: "New Meeting Request",
  message: `${clientName} requested a meeting on ${date}`,
  data: { requestId, clientId, meetingDate },
  actionUrl: "/calendar",
  priority: "high",
});
```

### **2. When a task is assigned:**

```javascript
await notifyTaskAssignment(assigneeId, taskTitle, projectName);
```

### **3. Daily deadline reminders (cron job or Cloud Function):**

```javascript
// Run daily to check upcoming deadlines
const upcomingTasks = tasks.filter(/* tasks due in 1-3 days */);

for (const task of upcomingTasks) {
  await notifyUpcomingDeadline(task.assigneeId, task.title, daysLeft);
}
```

---

## Advanced Features (Optional)

### **1. Browser Notifications**

```javascript
// Request permission
const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

// Show browser notification
const showBrowserNotification = (title, body) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/logo.png",
      badge: "/badge.png",
    });
  }
};
```

### **2. Notification Sounds**

```javascript
const playNotificationSound = () => {
  const audio = new Audio("/notification.mp3");
  audio.play().catch(() => {});
};
```

### **3. Email Notifications (Firebase Cloud Functions)**

```javascript
// functions/index.js
exports.sendEmailNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    // Send email using SendGrid, Nodemailer, etc.
  });
```

---

## Summary

✅ **Real-time notifications** with Firestore  
✅ **Notification bell** with unread count  
✅ **Dropdown panel** with actions  
✅ **Mark as read/unread**  
✅ **Delete notifications**  
✅ **Notification history page**  
✅ **Easy integration** with existing features  
✅ **Scalable architecture**  

**Next Steps:**
1. Create NotificationContext
2. Add NotificationBell to MainLayout
3. Integrate notification helpers into existing features
4. Test with real data
5. Add browser notifications (optional)

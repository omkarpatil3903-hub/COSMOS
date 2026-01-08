<div align="center">
reset pass production url

https://yourdomain.com/reset-password
# PM Admin Panel

Modern administrative dashboard for managing clients, projects, resources, tasks, and schedules with real‑time updates powered by Firebase.

</div>

## Table of Contents

- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Data Model](#data-model)
- [Environment Setup](#environment-setup)
- [Available Scripts](#available-scripts)
- [Key Workflows](#key-workflows)
- [Extending the Project](#extending-the-project)

## Project Overview

The PM Admin Panel is a single-page React application built with Vite. It centralizes project management operations for administrators, providing dashboards, CRUD tooling, analytics, and calendar scheduling. Firebase Authentication secures access, while Firestore delivers real-time data for all business entities.

## Core Features

- **Secure Authentication** – Login is gated by Firebase Auth with an `AuthProvider` that resolves the matching Firestore user profile before rendering protected routes.
- **Dashboard Analytics** – Aggregated project, task, and resource insights with live charts, progress cards, and health indicators.
- **Resource Management** – Create, edit, and archive user records; optionally provision Firebase Auth accounts via a secondary app instance.
- **Client & Project CRUD** – Maintain client directories and project portfolios, including derived progress based on linked task completions.
- **Task Management** – Kanban workflows with WIP limits, archiving, reassignment safeguards, and detailed status normalization.
- **Calendar & Scheduling** – Real-time calendar that merges events, meeting requests, and task deadlines. Supports Firestore-backed event CRUD, approvals, cancellations, and inline statistics.
- **Reporting Suite** – Exports and visualizations derived from live Firestore collections (projects, users, clients, tasks) with status normalization.
- **Reusable UI Kit** – Shared components (`Card`, `Button`, `Modal`, skeleton loaders, etc.) ensure consistency across views.

## Technology Stack

- **Frontend:** React 19, React Router v7, React Hot Toast, React Icons
- **Build Tooling:** Vite 7, Tailwind CSS (via `@tailwindcss/vite`), ESLint 9
- **Backend-as-a-Service:** Firebase (Auth, Firestore, Storage)
- **Utilities:** ExcelJS for CSV/XLSX reporting, dotenv for local environment hydration

## Application Structure

```
src/
  components/        Shared UI building blocks (cards, modals, layout, form controls)
  context/           Auth context and hooks wrapping Firebase Auth + Firestore user profiles
  pages/             Route-level views (Dashboard, Calendar, Reports, CRUD screens)
  styles/            Global CSS overrides layered on Tailwind utilities
  firebase.js        Firebase app bootstrapping and exported SDK clients
  main.jsx           Router configuration wrapped in AuthProvider
```

Route-level pages are protected by `ProtectedRoute`, which waits for authentication state resolution before rendering the nested `MainLayout`. The layout provides top-level navigation, toasts, and route outlet rendering.

## Data Model

All business data is stored in Firestore collections. Key collections observed in the codebase include:

| Collection         | Purpose & Notable Fields |
|--------------------|---------------------------|
| `users`            | Resource records rendered in Manage Resources. Fields: `name`, `email`, `resourceType`, `joinDate`, `department`, `skills`, `status`. Linked to Firebase Auth UID. |
| `clients`          | Client roster for dropdowns and CRUD pages. Fields: `companyName`, contact details, metadata. |
| `projects`         | Project metadata plus references to `clientId`. Progress is derived at runtime from related `tasks`. |
| `tasks`            | Task board items with statuses (`To-Do`, `In Progress`, `In Review`, `Done`), priority, due dates, archival flag, and project/user references. |
| `events`           | Calendar events spanning meetings, milestones, and task deadlines. Contains scheduling info, status, attendees, and optional client linkage. |
| `meetingRequests`  | Pending requests that can be converted into approved `events`. |

Timestamp fields are normalized with helper utilities (e.g., `tsToDate`, `normalizeStatus`) to ensure consistent treatment across Firestore snapshots.

## Environment Setup

1. **Prerequisites**
   - Node.js 18+ (verify with `node --version`)
   - npm 9+
   - Firebase project configured with Auth, Firestore, and (optionally) Storage

2. **Install dependencies**

   ```powershell
   npm install
   ```

3. **Configure environment variables**

	Create a `.env` (or `.env.local`) file at the project root with your Firebase credentials:

	 ```bash
	 VITE_API_KEY=your-api-key
	 VITE_AUTH_DOMAIN=your-project.firebaseapp.com
	 VITE_PROJECT_ID=your-project-id
	 VITE_STORAGE_BUCKET=your-project.appspot.com
	 VITE_MESSAGING_SENDER_ID=your-messaging-sender-id
	 VITE_APP_ID=your-app-id
	 ```

	Additional Firestore collections referenced above must exist in your Firebase project. Seed data manually or via import scripts as needed.

## Available Scripts

- `npm run dev` – Start the Vite dev server with hot module replacement.
- `npm run build` – Produce a production build under `dist/`.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint against the entire source tree.

## Key Workflows

- **Authentication Flow:** `AuthProvider` listens to `onAuthStateChanged`, fetches the matching Firestore user document, and exposes `user` + `userData` via context. `ProtectedRoute` blocks access until `loading` clears and redirects unauthenticated users to `/login`.
- **Realtime Synchronization:** Pages subscribe to Firestore via `onSnapshot`, transforming document snapshots into UI-friendly shapes. Subscriptions are cleaned up on unmount.
- **CRUD Operations:** Pages such as Manage Projects, Manage Resources, and Calendar rely on Firestore SDK methods (`addDoc`, `updateDoc`, `deleteDoc`, `setDoc`) with error handling surfaced through toast notifications.
- **Derived Analytics:** Dashboard and Reports normalize task statuses, compute project progress from tasks, and display cumulative metrics, charts, and exportable summaries built from live Firestore data.
- **Calendar Management:** Calendar merges event documents with task due dates into a unified view, supports approval/cancellation workflows, and automatically reflects meeting requests when they exist.

## Extending the Project

- **Adding New Collections:** Create Firestore indexes where necessary, then extend the relevant page hook to subscribe to the new collection.
- **Role-Based Access:** The current `AuthContext` exposes `userData`; you can add role/permission checks within `ProtectedRoute` or layout components.
- **Styling Enhancements:** Tailwind utilities are available; global overrides live under `src/styles/globals.css`. For custom themes, adjust the design tokens there or in the Tailwind config.
- **Testing:** No automated tests are present yet. Consider integrating React Testing Library for component/unit coverage and Cypress or Playwright for end-to-end validation.

---

For architectural questions or onboarding new contributors, start with `src/main.jsx` for routing, `src/context/AuthContext.jsx` for authentication, and `src/pages` for domain-specific logic.

# COSMOS - Product Overview

Modern PM/admin SPA built with Vite + React 19, Firebase (Auth, Firestore, Storage, Functions), and Tailwind. Multi-role portals: superadmin, admin, manager, employee, client.

## What It Solves
- Centralized CRUD for clients, projects, tasks, resources, documents, expenses.
- Role-based experiences with protected routing and session security.
- Realtime data via Firestore subscriptions and Firebase Auth session state.
- Reporting, exports (ExcelJS), MoM generation, calendar and reminders.

## Key Personas and Panels
- Super Admin: full control, org-wide settings, recurring tasks job coverage.
- Admin: operational CRUD, knowledge, expenses, reports, calendar.
- Manager: own portfolio (tasks, projects, knowledge, expenses), limited scope.
- Employee/Resource: personal tasks, projects, knowledge, expenses.
- Client: project/task visibility, docs, reports, calendar.

## Feature Map (at a glance)
- Auth/RBAC: Firebase Auth + Firestore profiles with role resolution and manager elevation.
- Routing: createBrowserRouter with nested layouts per role; error boundaries on routes.
- Tasks/Kanban: drag-and-drop, recurring logic, status normalization, exports.
- Calendar: merges events, meeting requests, task due dates; approval/cancel flows.
- Knowledge/Documents: upload, manage, view; MoM generator variants.
- Expenses: submissions (employee), approvals (manager/admin), exports.
- Reports: charts via Recharts, XLSX via ExcelJS, normalized metrics.
- Notifications: Firestore-backed (guide in NOTIFICATION_SYSTEM_GUIDE.md).
- Theming: light/dark/auto + accent via ThemeProvider and useThemeStyles hook.

## Entry Points
- Routing root: src/main.jsx (providers + RouterProvider configuration).
- Firebase boot: src/firebase.js (env-driven config).
- Auth state: src/context/AuthContext.jsx.
- Guard: src/components/ProtectedRoute.jsx.
- Theming: src/context/ThemeContext.jsx and src/hooks/useThemeStyles.js.

## Documentation Map
- setup.md - install, env, Firebase wiring.
- architecture.md - stack, data flows, diagram.
- routing.md - route map and layouts.
- auth-rbac.md - auth flow and roles.
- data-model.md - collections and key fields.
- features/* - deeper module notes (reuse existing guides where present).
- cloud-functions.md - callable endpoints, schedulers.
- theming.md - theme system and refactor notes.
- operations.md - lint/build/deploy habits.

## Existing Guides to Reference
- docs/USER_WORKFLOW_GUIDE.md - role walkthroughs.
- RECURRING_TASKS_DEEP_GUIDE.md - recurrence logic.
- NOTIFICATION_SYSTEM_GUIDE.md - notifications.
- THEME_REFACTOR_GUIDE.md - theme hook migration.
- SETTINGS_UPDATE_NOTES.md - admin settings dark-mode updates.

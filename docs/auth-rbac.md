# Auth and RBAC

## Overview
- Firebase Auth is the source of identity.
- Firestore `users` (and `clients` fallback) provide role, status, and profile data.
- ProtectedRoute enforces access by role and session status.

## Auth Flow
```mermaid
sequenceDiagram
  participant UI as UI
  participant Auth as Firebase Auth
  participant FS as Firestore

  UI->>Auth: onAuthStateChanged
  Auth-->>UI: user
  UI->>FS: fetch user profile
  FS-->>UI: role + status
  UI-->>UI: compute allowed panels
```

## Role Resolution
- Default role from Firestore profile.
- Manager elevation if the user manages any project.
- Inactive users are forced to sign out.

```mermaid
graph TD
  A[Auth user] --> B{Has profile?}
  B -->|users| C[Role from users]
  B -->|clients| D[Role from clients]
  C --> E{Active?}
  D --> E
  E -->|No| F[Sign out]
  E -->|Yes| G[Resolve panels]
  G --> H{Manages projects?}
  H -->|Yes| I[Elevate to Manager panel]
  H -->|No| J[Keep role]
```

## Access Control
- UI gating via route guards and layout selection.
- Firestore rules should mirror role constraints (see `firestore.rules`).

## Related Files
- src/context/AuthContext.jsx
- src/components/ProtectedRoute.jsx
- src/routes/*

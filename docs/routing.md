# Routing

## Overview
Routes are organized by role with dedicated layouts. ProtectedRoute ensures session and role access.

## Layout Map
```mermaid
graph TD
  R[RouterProvider] --> A[MainLayout - Superadmin]
  R --> B[AdminLayout]
  R --> C[ManagerLayout]
  R --> D[EmployeeLayout]
  R --> E[ClientLayout]

  A --> A1[Superadmin pages]
  B --> B1[Admin pages]
  C --> C1[Manager pages]
  D --> D1[Employee pages]
  E --> E1[Client pages]
```

## Guard Flow
```mermaid
graph TD
  A[Route request] --> B{Authenticated?}
  B -->|No| C[Redirect to sign-in]
  B -->|Yes| D{Role allowed?}
  D -->|No| E[Access denied]
  D -->|Yes| F[Render route]
```

## Related Files
- src/main.jsx
- src/components/ProtectedRoute.jsx
- src/routes/*

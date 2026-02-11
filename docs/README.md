# COSMOS Documentation

This folder is the source of the COSMOS technical documentation. The docs are Markdown with Mermaid diagrams.

## How To Read
Start here:
- overview.md
- setup.md
- architecture.md

Then go deeper:
- routing.md
- auth-rbac.md
- data-model.md
- cloud-functions.md
- theming.md
- operations.md
- features/index.md
- USER_WORKFLOW_GUIDE.md (role walkthroughs)

## Diagram Conventions
- Mermaid graphs describe flow and relationships.
- Direction: top-down unless noted.

## Docs Map
```mermaid
graph TD
  A[overview.md] --> B[setup.md]
  A --> C[architecture.md]
  C --> D[routing.md]
  C --> E[auth-rbac.md]
  C --> F[data-model.md]
  C --> G[cloud-functions.md]
  C --> H[theming.md]
  C --> I[operations.md]
  C --> J[features/index.md]
  J --> K[features/tasks.md]
  J --> L[features/calendar.md]
  J --> M[features/knowledge-docs.md]
  J --> N[features/expenses.md]
  J --> O[features/reports.md]
  J --> P[features/notifications.md]
```

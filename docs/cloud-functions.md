# Cloud Functions

## Overview
Functions are used for admin-only operations and scheduled recurring task processing.

## Callable Functions
- updateUserPassword
- deleteUserAuth

## Scheduled Jobs
- checkRecurringTasks (daily at 02:00 UTC)

## Flow
```mermaid
graph TD
  A[Client Action] --> B[Callable Function]
  B --> C{Auth + Role Check}
  C -->|Allow| D[Operate on Firebase Auth/Firestore]
  C -->|Deny| E[Return error]

  F[Scheduler] --> G[checkRecurringTasks]
  G --> H[Compute next tasks]
  H --> I[Create tasks in Firestore]
```

## Related Files
- functions/index.js
- functions/utils/recurring.js

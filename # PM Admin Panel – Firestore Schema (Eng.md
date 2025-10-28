# PM Admin Panel – Firestore Schema (English Only)

This document defines the Firestore collections and fields used by the app. All labels are English-only. Use Firestore Timestamp for date/time fields.

```
├── users/
│   └── {uid}/
│       ├── email: string
│       ├── displayName: string
│       ├── role: string               // "admin","manager","employee","client"
│       ├── status: string             // "active","inactive"
│       ├── phone: string
│       ├── photoURL: string
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── clients/
│   └── {clientId}/
│       ├── companyName: string
│       ├── primaryContactName: string
│       ├── primaryContactEmail: string
│       ├── primaryContactPhone: string
│       ├── status: string             // "Active","Inactive"
│       ├── joinDate: timestamp
│       ├── addressLine1: string
│       ├── addressCity: string
│       ├── addressState: string
│       ├── addressZip: string
│       ├── addressCountry: string
│       ├── userId: string | null      // users/{uid} if client logs in
│       ├── companyName_lc: string     // for prefix search
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── projects/
│   └── {projectId}/
│       ├── name: string
│       ├── clientId: string           // clients/{clientId}
│       ├── clientName: string         // denormalized
│       ├── progress: number           // 0–100
│       ├── status: string             // "Planning","Active","On Hold","Completed","Cancelled"
│       ├── startDate: timestamp
│       ├── endDate: timestamp
│       ├── objectives: string
│       ├── goals: string
│       ├── managerId: string | null   // users/{uid}
│       ├── name_lc: string
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── resources/
│   └── {resourceId}/
│       ├── fullName: string
│       ├── email: string
│       ├── mobile: string
│       ├── resourceType: string       // "In-house","Outsourced"
│       ├── department: string
│       ├── skills: string[]           // or comma-separated string
│       ├── status: string             // "Active","Inactive"
│       ├── joinDate: timestamp
│       ├── userId: string | null      // users/{uid} if they have login
│       ├── fullName_lc: string
│       ├── email_lc: string
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── tasks/
│   └── {taskId}/
│       ├── title: string
│       ├── description: string
│       ├── projectId: string          // projects/{projectId}
│       ├── projectName: string        // denormalized
│       ├── assigneeId: string | null  // resources/{resourceId} or users/{uid}
│       ├── assigneeName: string | null
│       ├── priority: string           // "Low","Medium","High"
│       ├── status: string             // "To-Do","In Progress","In Review","Done"
│       ├── dueDate: timestamp | null
│       ├── createdAt: timestamp
│       ├── completedAt: timestamp | null
│       ├── createdBy: string          // users/{uid}
│       ├── momId: string | null       // moms/{momId}
│       ├── labels: string[]
│       └── archived: boolean
│
├── events/
│   └── {eventId}/
│       ├── title: string
│       ├── type: string               // "meeting","task","milestone","call"
│       ├── status: string             // "approved","pending","cancelled","completed"
│       ├── date: timestamp            // event date
│       ├── time: string               // "HH:mm"
│       ├── duration: number           // minutes
│       ├── clientId: string | null    // clients/{clientId}
│       ├── clientName: string | null
│       ├── projectId: string | null   // projects/{projectId}
│       ├── location: string
│       ├── attendees: string[]        // userIds or names
│       ├── description: string
│       ├── priority: string           // "low","medium","high"
│       ├── objectives: { id: string, text: string, completed: boolean }[]
│       ├── cancelReason: string | null
│       ├── cancelledBy: string | null // users/{uid}
│       ├── cancelledAt: timestamp | null
│       ├── createdBy: string          // users/{uid}
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── meetingRequests/
│   └── {requestId}/
│       ├── clientId: string | null    // clients/{clientId}
│       ├── clientName: string | null
│       ├── companyName: string | null
│       ├── requestedDate: timestamp
│       ├── requestedTime: string      // "HH:mm"
│       ├── duration: number
│       ├── purpose: string
│       ├── priority: string           // "low","medium","high"
│       ├── status: string             // "pending","approved","rejected"
│       ├── requestedAt: timestamp
│       ├── email: string
│       ├── phone: string
│       ├── handledBy: string | null   // users/{uid}
│       └── handledAt: timestamp | null
│
├── moms/
│   └── {momId}/
│       ├── title: string
│       ├── attendees: string[]        // names or userIds
│       ├── points: string[]
│       ├── projectId: string          // projects/{projectId}
│       ├── meetingDate: timestamp
│       ├── meetingTime: string
│       ├── generated: string
│       ├── actionItems: string        // or string[]
│       ├── paragraphSummary: string
│       ├── versionHistory: { timestamp: timestamp, content: string, actionItems: string }[]
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│       │
│       ├── comments/
│       │   └── {commentId}/
│       │       ├── text: string
│       │       ├── authorId: string   // users/{uid}
│       │       └── createdAt: timestamp
│       │
│       └── attachments/
│           └── {attachmentId}/
│               ├── name: string
│               ├── storagePath: string
│               ├── size: number
│               ├── contentType: string
│               ├── uploadedBy: string // users/{uid}
│               └── createdAt: timestamp
│
├── categories/
│   └── {categoryId}/
│       ├── type: string               // "department","label","priority", etc.
│       ├── name: string               // English only
│       ├── active: boolean
│       ├── sortOrder: number          // optional
│       └── createdAt: timestamp
│
├── activityLogs/
│   └── {logId}/
│       ├── actorId: string            // users/{uid}
│       ├── actorName: string
│       ├── action: string             // "create_task","update_project", etc.
│       ├── targetType: string         // "task","project","client","resource","mom","event"
│       ├── targetId: string
│       ├── changes: map               // before/after deltas
│       └── timestamp: timestamp
│
└── attachments/                       // optional top-level
    └── {attachmentId}/
        ├── ownerType: string          // "task","mom","project","event"
        ├── ownerId: string
        ├── name: string
        ├── storagePath: string
        ├── size: number
        ├── contentType: string
        ├── uploadedBy: string         // users/{uid}
        └── createdAt: timestamp
```
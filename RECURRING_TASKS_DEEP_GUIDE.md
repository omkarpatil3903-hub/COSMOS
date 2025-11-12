# Recurring Tasks – Deep Guide

> This document complements `RECURRING_TASKS_GUIDE.md` by explaining the internal logic, data flow, and recent enhancements (preview, weekend skipping, robust end-after enforcement).

## 1. Conceptual Model
A recurring task is a *series* defined by a root task (the first one you create). Each subsequent generated instance inherits series metadata and links back to the root via `parentRecurringTaskId`.

### Core Fields
```js
{
  isRecurring: boolean,
  recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurringInterval: number,          // step size e.g. every 2 weeks
  recurringEndType: 'never' | 'date' | 'after',
  recurringEndDate?: string,          // YYYY-MM-DD if endType = 'date'
  recurringEndAfter?: string,         // numeric string if endType = 'after'
  parentRecurringTaskId?: string,     // set on generated children
  recurringOccurrenceCount: number,   // legacy counter (still present)
  skipWeekends?: boolean              // NEW: exclude Saturday/Sunday
}
```

## 2. Creation & Lifecycle
1. User creates initial task with recurrence checked.
2. When the task is marked **Done**, the system evaluates whether to spawn next instance using `shouldCreateNextInstanceAsync` (async to support counting in Firestore).
3. A child instance is created with a new `dueDate`, status reset to `To-Do`, and `parentRecurringTaskId` pointing to the root.
4. Calendar expansion renders only root tasks via `expandRecurringOccurrences` to avoid double counting.

## 3. Recent Enhancements
| Enhancement | File | Purpose |
|-------------|------|---------|
| Async end-after enforcement | `utils/recurringTasks.js` | Ensures series count uses Firestore, not a local counter only |
| Weekend skipping | `utils/recurringTasks.js` + `TaskModal.jsx` | Allows excluding Saturdays & Sundays from occurrences |
| Preview panel | `TaskModal.jsx` | Shows up to 10 upcoming dates before saving |
| Duplicate prevention | `Calendar.jsx` | Expands only tasks without `parentRecurringTaskId` |

## 4. Occurrence Logic (Simplified)
Daily pattern: Occurs if `diffDays % interval === 0`.
Weekly pattern: Same weekday as base date and `weeks % interval === 0`.
Monthly pattern: Same day-of-month and `months % interval === 0`.
Yearly pattern: Same month & day and `years % interval === 0`.
Weekend skip: If `skipWeekends` enabled and `dayOfWeek` is 0 (Sun) or 6 (Sat) → excluded.

## 5. End Conditions
| End Type | Enforcement Strategy |
|----------|----------------------|
| never | Always generate next (subject to future constraints like global caps) |
| date | Compare current due date to `recurringEndDate` before generating |
| after | Count children + root via Firestore query; stop at or beyond limit |

### Async Check
```js
await shouldCreateNextInstanceAsync(task)
// - Validates status === 'Done'
// - Checks date & after limits with live counts
```

## 6. Preview Generation
Implemented inside `TaskModal.jsx` using a lightweight simulation loop:
- Start at base `dueDate`.
- Iterate day by day (max 1000 guard) collecting up to 10 valid occurrence dates.
- Applies skip weekends, end date, and after limits.
- Does not persist; purely UI feedback.

Potential Improvement: Advance cursor by interval-aware jumps (e.g., add 7 days for weekly) for performance. Current day-by-day scan is acceptable for small preview size.

## 7. Firestore Series Counting
```js
export async function countSeriesOccurrences(seriesId) {
  const q = query(collection(db, 'tasks'), where('parentRecurringTaskId', '==', seriesId));
  const snap = await getDocs(q);
  return snap.size + 1; // children + root
}
```
Used to enforce `recurringEndAfter` reliably even if tasks were archived or loaded out of order.

## 8. Calendar Rendering Adjustment
In `Calendar.jsx`:
```js
if (task.isRecurring && !task.parentRecurringTaskId) {
  // Expand occurrences for root only
} else {
  // Render single event for non-recurring or child instances
}
```
Prevents duplication when children begin to appear.

## 9. Edge Cases & Guard Rails
| Case | Handling |
|------|----------|
| Due date missing | Preview & generation skip (requires base) |
| End date before start | User prevented by input min attribute; consider server-side guard |
| After occurrences set extremely high | Generates until cap; could impose maximum (e.g., 1000) |
| Timezone drift | All logic normalized to local midnight; consider storing canonical UTC dates |
| Weekend skip with monthly pattern on day 31 | Next month lacking 31 → occurrence only when diffDays logic hits a matching date; no compensation currently |

## 10. Recommended Next Steps
1. Multi-weekday selection (array of allowed weekdays).
2. Monthly "nth weekday" rules (e.g., 3rd Tuesday).
3. Series-level pause/resume flag (`recurringPaused: boolean`).
4. Consolidated series record (separate collection) for analytics & fast counting.
5. Background Cloud Function invoking `processRecurringTasks()` daily for redundancy.
6. Notification hooks (before due date, after creation).
7. Interval-aware preview generation for efficiency.

## 11. Minimal Cloud Function Stub (Suggested)
```js
// functions/recurringRunner.js
import * as functions from 'firebase-functions';
import { processRecurringTasks } from '../src/utils/recurringTasks.js';

export const recurringDailyJob = functions.pubsub
  .schedule('0 2 * * *') // 02:00 UTC daily
  .onRun(async () => {
    const results = await processRecurringTasks();
    console.log('Recurring job results', results);
    return null;
  });
```

## 12. Performance Notes
- Counting via Firestore per completion adds network round trip; acceptable for low volume. Batch / cached series counts recommended for scale.
- Preview loop iterates per day; negligible for ≤10 occurrences. Could optimize.

## 13. Data Quality Suggestions
Implement validation before save:
```js
if (recurringEndType === 'date' && recurringEndDate < dueDate) { /* reject */ }
if (recurringEndType === 'after' && parseInt(recurringEndAfter) <= 0) { /* reject */ }
```

## 14. Testing Ideas (Add Later)
- Unit test `occursOnDate` with weekend skip combinations.
- Integration test: Mark task done → verify next instance.
- End-after boundary: create N-1 children, mark done, ensure last creates; Nth completion no creation.
- Calendar rendering: root vs child duplication check.

---
**Maintainer Notes:** This deep guide should be updated when advanced patterns or series pause/resume are added.

_Last updated: 2025-11-11_

/**
 * Expense Service - Expense Management Operations
 *
 * Purpose: Handles all Firestore and Storage operations for the expense
 * management module including CRUD, approvals, and receipt uploads.
 *
 * Responsibilities:
 * - Receipt file upload to Firebase Storage
 * - Expense document CRUD operations
 * - Role-based expense viewing (employee vs admin)
 * - Expense workflow transitions (submit, approve, reject, pay)
 *
 * Dependencies:
 * - Firestore (expenses collection)
 * - Firebase Storage (receipts folder)
 * - expenseConfig (categories, statuses, currencies)
 *
 * Expense Workflow:
 * Draft → Submitted → Approved/Rejected → Paid
 *
 * Permission Model:
 * - Employees: Can CRUD their own expenses
 * - Admins: Can view all expenses, approve/reject/mark as paid
 *
 * Last Modified: 2026-01-10
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// Reference to expenses collection
const expensesCol = collection(db, "expenses");

/**
 * Upload receipt file to Firebase Storage.
 *
 * @param {File} file - The receipt file to upload
 * @param {string} employeeId - Employee ID for folder organization
 * @returns {Promise<string|null>} Download URL or null if no file
 *
 * Business Logic:
 * - Organizes receipts by employee ID for easy access
 * - Adds timestamp prefix to prevent filename collisions
 * - Sanitizes filename to remove special characters
 *
 * Storage Path: receipts/{employeeId}/{timestamp}_{sanitizedFilename}
 */
export const uploadReceipt = async (file, employeeId = "unknown") => {
  if (!file) return null;

  try {
    // Create a unique filename with timestamp to prevent collisions
    const timestamp = Date.now();
    // SECURITY: Remove special characters from filename to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `receipts/${employeeId}/${timestamp}_${safeName}`;

    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error("Failed to upload receipt to storage:", error);
    throw error;
  }
};

/**
 * Create a new expense document.
 *
 * @param {object} data - Expense data
 * @returns {Promise<string>} Document ID of created expense
 *
 * Business Logic:
 * - Sets default values for optional fields
 * - Defaults to "Submitted" status (ready for approval)
 * - Records submittedAt timestamp if status is "Submitted"
 * - INR is the default currency
 */
export const createExpense = async (data) => {
  const now = serverTimestamp();
  const payload = {
    // Default values for all optional fields
    title: "",
    description: "",
    date: null,
    category: "Other",
    amount: 0,
    currency: "INR",
    status: "Submitted",
    receiptRefs: [],
    receiptUrl: null,
    // Override with provided data
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  // WORKFLOW: Track submission time for SLA reporting
  if (payload.status === "Submitted") {
    payload.submittedAt = now;
  }

  const ref = await addDoc(expensesCol, payload);
  return ref.id;
};

/**
 * Update an existing expense.
 *
 * @param {string} id - Expense document ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateExpense = async (id, updates) => {
  const ref = doc(db, "expenses", id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete an expense permanently.
 *
 * @param {string} id - Expense document ID
 * @returns {Promise<void>}
 *
 * CAUTION: Hard delete - cannot be recovered
 * Consider restricting to Draft status only in business rules
 */
export const deleteExpense = async (id) => {
  await deleteDoc(doc(db, "expenses", id));
};

// ============================================================================
// EMPLOYEE VIEW FUNCTIONS
// ============================================================================

/**
 * Subscribe to a specific employee's expenses.
 *
 * @param {string} employeeId - Employee's user ID
 * @param {function} callback - Called with expenses array
 * @returns {function} Unsubscribe function
 *
 * Business Logic:
 * - Only returns expenses where employeeId matches
 * - Sorted by createdAt descending (newest first)
 * - Uses client-side sorting to avoid composite index requirement
 */
export const subscribeToEmployeeExpenses = (employeeId, callback) => {
  const q = query(
    expensesCol,
    where("employeeId", "==", employeeId)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // CLIENT-SIDE SORT: Avoids need for composite Firestore index
    // (employeeId + createdAt would require manual index creation)
    items.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });
    callback(items);
  });
};

// ============================================================================
// ADMIN VIEW FUNCTIONS
// ============================================================================

/**
 * Subscribe to all expenses with optional status filter.
 *
 * @param {string} statusFilter - Status to filter by, or "all" for all statuses
 * @param {function} callback - Called with expenses array
 * @returns {function} Unsubscribe function
 *
 * Business Logic:
 * - Admins can see all expenses regardless of employee
 * - Filter by status for workflow management (e.g., pending approvals)
 * - Sorted by createdAt descending (newest first)
 */
export const subscribeToAllExpenses = (statusFilter, callback) => {
  let qBase = expensesCol;

  if (statusFilter && statusFilter !== "all") {
    qBase = query(qBase, where("status", "==", statusFilter));
  }

  const q = query(qBase, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
};

// ============================================================================
// ADMIN WORKFLOW ACTIONS
// ============================================================================

/**
 * Approve an expense.
 *
 * @param {string} id - Expense document ID
 * @param {object} approver - Approver user object (uid, name, email)
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Records who approved and when for audit trail
 * - Clears any previous rejection reason
 * - Transitions status to "Approved"
 */
export const approveExpense = (id, approver) => {
  // APPROVER FALLBACK: Handle various user object formats
  const approverId = approver?.uid || approver?.id || null;
  const approverName =
    approver?.name || approver?.displayName || approver?.email || "Admin";

  return updateExpense(id, {
    status: "Approved",
    approvedAt: serverTimestamp(),
    approverId,
    approverName,
    rejectionReason: null, // Clear any previous rejection
  });
};

/**
 * Reject an expense with reason.
 *
 * @param {string} id - Expense document ID
 * @param {object} approver - Approver user object
 * @param {string} reason - Rejection reason for employee feedback
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Requires rejection reason for employee to understand why
 * - Records who rejected and when for audit trail
 */
export const rejectExpense = (id, approver, reason) => {
  const approverId = approver?.uid || approver?.id || null;
  const approverName =
    approver?.name || approver?.displayName || approver?.email || "Admin";

  return updateExpense(id, {
    status: "Rejected",
    rejectedAt: serverTimestamp(),
    approverId,
    approverName,
    rejectionReason: reason || "No reason provided",
  });
};

/**
 * Mark expense as paid (final state).
 *
 * @param {string} id - Expense document ID
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Terminal state - expense workflow complete
 * - Should only be called on "Approved" expenses
 * - Records payment timestamp for finance reporting
 */
export const markExpensePaid = (id) =>
  updateExpense(id, {
    status: "Paid",
    paidAt: serverTimestamp(),
  });

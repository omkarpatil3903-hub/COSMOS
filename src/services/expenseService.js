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

const expensesCol = collection(db, "expenses");

/**
 * Upload receipt to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} employeeId - Employee ID for folder organization
 * @returns {Promise<string|null>} - Download URL or null
 */
export const uploadReceipt = async (file, employeeId = "unknown") => {
  if (!file) return null;

  try {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
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

// Employee creates an expense (usually status "Submitted" or "Draft")
export const createExpense = async (data) => {
  const now = serverTimestamp();
  const payload = {
    title: "",
    description: "",
    date: null,
    category: "Other",
    amount: 0,
    currency: "INR",
    status: "Submitted",
    receiptRefs: [],
    receiptUrl: null,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  if (payload.status === "Submitted") {
    payload.submittedAt = now;
  }

  const ref = await addDoc(expensesCol, payload);
  return ref.id;
};

export const updateExpense = async (id, updates) => {
  const ref = doc(db, "expenses", id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteExpense = async (id) => {
  await deleteDoc(doc(db, "expenses", id));
};

// Employee view – only their own expenses
export const subscribeToEmployeeExpenses = (employeeId, callback) => {
  const q = query(
    expensesCol,
    where("employeeId", "==", employeeId)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Client-side sort to avoid needing a composite index
    items.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });
    callback(items);
  });
};

// Admin view – all expenses, filtered by status if provided
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

// Admin helpers
export const approveExpense = (id, approver) => {
  const approverId = approver?.uid || approver?.id || null;
  const approverName =
    approver?.name || approver?.displayName || approver?.email || "Admin";

  return updateExpense(id, {
    status: "Approved",
    approvedAt: serverTimestamp(),
    approverId,
    approverName,
    rejectionReason: null,
  });
};

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

export const markExpensePaid = (id) =>
  updateExpense(id, {
    status: "Paid",
    paidAt: serverTimestamp(),
  });


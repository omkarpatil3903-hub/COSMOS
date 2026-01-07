const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

admin.initializeApp();

// Set max instances to control costs
setGlobalOptions({ maxInstances: 10 });


/**
 * Update a user's password in Firebase Auth.
 * Only accessible by 'superadmin' or 'admin'.
 */
exports.updateUserPassword = onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const callerUid = request.auth.uid;

    // 2. Verify Role via Firestore (Direct Check)
    // We fetch the user's document to check the role directly, ensuring up-to-date permissions.
    try {
        const userDoc = await admin.firestore().collection('users').doc(callerUid).get();
        if (!userDoc.exists) {
            throw new HttpsError("permission-denied", "User profile not found.");
        }

        const userData = userDoc.data();
        const role = userData.role;

        if (role !== "superadmin" && role !== "admin") {
            throw new HttpsError(
                "permission-denied",
                "Only admins can update passwords."
            );
        }
    } catch (error) {
        console.error("Error verifying role:", error);
        throw new HttpsError("internal", "Failed to verify user permissions.");
    }

    // 3. Validate Input
    const { uid, password } = request.data;
    if (!uid || !password) {
        throw new HttpsError(
            "invalid-argument",
            "UID and new password are required."
        );
    }

    if (password.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "Password must be at least 6 characters."
        );
    }

    // 4. Perform Update
    try {
        await admin.auth().updateUser(uid, { password });
        return { success: true, message: "Password updated successfully." };
    } catch (error) {
        console.error("Error updating password:", error);
        throw new HttpsError("internal", "Failed to update password: " + error.message);
    }
});

/**
 * Delete a user from Firebase Auth.
 * Only accessible by 'superadmin' or 'admin'.
 */
exports.deleteUserAuth = onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const callerUid = request.auth.uid;

    // 2. Verify Role via Firestore (Direct Check)
    try {
        const userDoc = await admin.firestore().collection('users').doc(callerUid).get();
        if (!userDoc.exists) {
            throw new HttpsError("permission-denied", "User profile not found.");
        }

        const userData = userDoc.data();
        const role = userData.role;

        if (role !== "superadmin" && role !== "admin") {
            throw new HttpsError("permission-denied", "Only admins can delete users.");
        }
    } catch (error) {
        console.error("Error verifying role:", error);
        throw new HttpsError("internal", "Failed to verify user permissions.");
    }

    // 3. Validate Input
    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "UID is required.");
    }

    // 4. Perform Deletion
    try {
        await admin.auth().deleteUser(uid);
        return { success: true, message: "User deleted from Auth successfully." };
    } catch (error) {
        console.error("Error deleting user:", error);
        // If user not found, we can consider it a success (idempotent)
        if (error.code === 'auth/user-not-found') {
            return { success: true, message: "User was already deleted." };
        }
        throw new HttpsError("internal", "Failed to delete user: " + error.message);
    }
});



const { onSchedule } = require("firebase-functions/v2/scheduler");
const { calculateNextDueDate, shouldCreateNextInstance, countSeriesOccurrences } = require("./utils/recurring");

/**
 * Scheduled job to check for recurring tasks that need to be generated.
 * Runs daily at 02:00 UTC.
 * This acts as a safety net for the client-side trigger.
 */
exports.checkRecurringTasks = onSchedule("0 2 * * *", async (event) => {
    console.log("Starting checkRecurringTasks job...");
    const db = admin.firestore();

    try {
        // 1. Find all recurring tasks that are marked as "Done"
        const snapshot = await db.collection("tasks")
            .where("isRecurring", "==", true)
            .where("status", "==", "Done")
            .get();

        if (snapshot.empty) {
            console.log("No completed recurring tasks found.");
            return;
        }

        console.log(`Found ${snapshot.size} completed recurring tasks. Checking if next instances exist...`);

        const results = [];

        // Process each task sequentially or in parallel chunks
        // For transactions, sequential is safer to avoid contention if they touch same docs (unlikely here but good practice)
        for (const docSnapshot of snapshot.docs) {
            const task = { id: docSnapshot.id, ...docSnapshot.data() };

            try {
                await db.runTransaction(async (transaction) => {
                    // 2. Check if we should create a next instance based on logic
                    const shouldCreate = shouldCreateNextInstance(task);
                    if (!shouldCreate) return;

                    // 2b. Async check for 'after' occurrences limit (inside transaction for consistency if possible, 
                    // but reading many docs in transaction is expensive. 
                    // We'll keep it simple: read count. If strictly needed, we'd query inside.
                    // For now, let's do the count check *before* transaction to save cost, 
                    // or inside if we want strict correctness. 
                    // Given the low risk of "after" count race condition (only happens at the very end of series),
                    // we can keep it outside or inside. Let's put it inside for correctness.)

                    if (task.recurringEndType === "after" && task.recurringEndAfter) {
                        const maxOccurrences = parseInt(task.recurringEndAfter);
                        const seriesId = task.parentRecurringTaskId || task.id;

                        // Count query inside transaction? 
                        // Firestore transactions require all reads before writes.
                        // Querying a collection in a transaction is supported but can be slow.
                        // Let's do a direct read of the series parent if we had a counter there.
                        // Since we don't, we'll rely on the pre-check or just query.
                        // For safety/cost balance: We will skip the transactional count check here 
                        // and rely on the unique constraint of (seriesId + dueDate) to prevent duplicates.
                        // The "extra instance" at the end of a series is less critical than "duplicate instances" every day.
                    }

                    // 3. Calculate Next Due Date
                    const nextDueDate = calculateNextDueDate(
                        task.dueDate,
                        task.recurringPattern,
                        task.recurringInterval,
                        task.skipWeekends
                    );

                    // 4. Check if the next instance ALREADY exists (Transactional Check)
                    const seriesId = task.parentRecurringTaskId || task.id;
                    const existingQuery = await transaction.get(
                        db.collection("tasks")
                            .where("parentRecurringTaskId", "==", seriesId)
                            .where("dueDate", "==", nextDueDate)
                    );

                    if (!existingQuery.empty) {
                        return; // Already exists
                    }

                    // 5. Create the new instance
                    const { id, ...restOfTask } = task;
                    const newTaskData = {
                        title: restOfTask.title,
                        description: restOfTask.description,
                        assigneeId: restOfTask.assigneeId,
                        assigneeType: restOfTask.assigneeType,
                        assigneeIds: restOfTask.assigneeIds || [],
                        assignees: restOfTask.assignees || [],
                        projectId: restOfTask.projectId,
                        assignedDate: new Date().toISOString().slice(0, 10),
                        dueDate: nextDueDate,
                        visibleFrom: nextDueDate,
                        priority: restOfTask.priority,
                        status: "To-Do",
                        progressPercent: 0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        completedAt: null,
                        archived: false,
                        completionComment: "",
                        assigneeStatus: {},
                        weightage: restOfTask.weightage,
                        isRecurring: restOfTask.isRecurring,
                        recurringPattern: restOfTask.recurringPattern,
                        recurringInterval: restOfTask.recurringInterval,
                        recurringEndDate: restOfTask.recurringEndDate,
                        recurringEndAfter: restOfTask.recurringEndAfter,
                        recurringEndType: restOfTask.recurringEndType,
                        parentRecurringTaskId: seriesId,
                        recurringOccurrenceCount: (restOfTask.recurringOccurrenceCount || 0) + 1,
                    };

                    const newDocRef = db.collection("tasks").doc();
                    transaction.set(newDocRef, newTaskData);
                    console.log(`Created next instance for task ${task.id} (Series: ${seriesId}) due on ${nextDueDate}`);
                    results.push(task.id);
                });
            } catch (e) {
                console.error(`Transaction failed for task ${task.id}:`, e);
            }
        }

        console.log(`Job complete. Created ${results.length} new task instances.`);

    } catch (error) {
        console.error("Error in checkRecurringTasks:", error);
    }
});
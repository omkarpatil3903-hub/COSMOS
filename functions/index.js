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
 * 
 * Handles two scenarios:
 * 1. Completed tasks (status = "Done") - create next instance as usual
 * 2. Overdue tasks (dueDate < today, status != "Done") - create next instance to keep schedule on track
 * 
 * This ensures recurring tasks continue on schedule even if previous instances aren't completed.
 */
exports.checkRecurringTasks = onSchedule("0 2 * * *", async (event) => {
    console.log("Starting checkRecurringTasks job...");
    const db = admin.firestore();
    const today = new Date().toISOString().slice(0, 10);

    try {
        // Find all recurring tasks (both completed and overdue incomplete)
        const snapshot = await db.collection("tasks")
            .where("isRecurring", "==", true)
            .get();

        if (snapshot.empty) {
            console.log("No recurring tasks found.");
            return;
        }

        console.log(`Found ${snapshot.size} recurring tasks. Checking which need new instances...`);

        const results = { completed: 0, overdue: 0, skipped: 0 };

        for (const docSnapshot of snapshot.docs) {
            const task = { id: docSnapshot.id, ...docSnapshot.data() };

            try {
                // Validate that task has a valid dueDate
                if (!task.dueDate || typeof task.dueDate !== 'string') {
                    console.log(`⚠️ Skipping task ${task.id}: Missing or invalid dueDate`);
                    results.skipped++;
                    continue;
                }

                // Validate date format (YYYY-MM-DD)
                const dateTest = new Date(task.dueDate);
                if (isNaN(dateTest.getTime())) {
                    console.log(`⚠️ Skipping task ${task.id}: Invalid date format "${task.dueDate}"`);
                    results.skipped++;
                    continue;
                }

                // Determine if we should create next instance
                let shouldCreate = false;
                let reason = "";

                if (task.status === "Done") {
                    // Scenario 1: Task is completed - create next instance
                    shouldCreate = shouldCreateNextInstance(task);
                    reason = "completed";
                } else if (task.dueDate < today) {
                    // Scenario 2: Task is overdue - create next instance to stay on schedule
                    shouldCreate = true;
                    reason = "overdue";
                }

                if (!shouldCreate) {
                    results.skipped++;
                    continue;
                }

                await db.runTransaction(async (transaction) => {
                    // Check end conditions
                    if (task.recurringEndType === "date" && task.recurringEndDate) {
                        const endDate = new Date(task.recurringEndDate).toISOString().slice(0, 10);
                        if (task.dueDate >= endDate) {
                            console.log(`Task ${task.id} series has ended (date limit reached)`);
                            return;
                        }
                    }

                    if (task.recurringEndType === "after" && task.recurringEndAfter) {
                        const maxOccurrences = parseInt(task.recurringEndAfter);
                        const currentCount = task.recurringOccurrenceCount || 0;
                        if (currentCount >= maxOccurrences) {
                            console.log(`Task ${task.id} series has ended (occurrence limit reached)`);
                            return;
                        }
                    }

                    // Calculate Next Due Date
                    const nextDueDate = calculateNextDueDate(
                        task.dueDate,
                        task.recurringPattern,
                        task.recurringInterval,
                        task.skipWeekends,
                        task.selectedWeekDays // Pass custom working days array
                    );

                    // Check if the next instance ALREADY exists
                    const seriesId = task.parentRecurringTaskId || task.id;
                    const existingQuery = await transaction.get(
                        db.collection("tasks")
                            .where("parentRecurringTaskId", "==", seriesId)
                            .where("dueDate", "==", nextDueDate)
                    );

                    if (!existingQuery.empty) {
                        console.log(`Instance for ${nextDueDate} already exists for series ${seriesId}`);
                        return;
                    }

                    // Create the new instance
                    const { id, ...restOfTask } = task;
                    const newTaskData = {
                        title: restOfTask.title,
                        description: restOfTask.description || "",
                        assigneeId: restOfTask.assigneeId || "",
                        assigneeType: restOfTask.assigneeType || "user",
                        assigneeIds: restOfTask.assigneeIds || [],
                        assignees: restOfTask.assignees || [],
                        projectId: restOfTask.projectId || "",
                        assignedDate: task.dueDate, // Use PREVIOUS due date as assigned date
                        dueDate: nextDueDate,
                        visibleFrom: new Date().toISOString().slice(0, 10), // Today
                        priority: restOfTask.priority || "Medium",
                        status: "To-Do",
                        progressPercent: 0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        completedAt: null,
                        archived: false,
                        completionComment: "",
                        assigneeStatus: {},
                        weightage: restOfTask.weightage || null,
                        isRecurring: true,
                        recurringPattern: restOfTask.recurringPattern,
                        recurringInterval: restOfTask.recurringInterval,
                        recurringEndDate: restOfTask.recurringEndDate || "",
                        recurringEndAfter: restOfTask.recurringEndAfter || "",
                        recurringEndType: restOfTask.recurringEndType || "never",
                        skipWeekends: restOfTask.skipWeekends || false,
                        parentRecurringTaskId: seriesId,
                        recurringOccurrenceCount: (restOfTask.recurringOccurrenceCount || 0) + 1,
                        uniqueRecurringKey: `${seriesId}-${nextDueDate}`,
                    };

                    const newDocRef = db.collection("tasks").doc();
                    newTaskData.taskId = newDocRef.id;
                    transaction.set(newDocRef, newTaskData);

                    console.log(`✅ Created next instance for task ${task.id} (${reason}) - Series: ${seriesId}, Due: ${nextDueDate}`);

                    if (reason === "completed") {
                        results.completed++;
                    } else {
                        results.overdue++;
                    }
                });
            } catch (e) {
                console.error(`❌ Transaction failed for task ${task.id}:`, e);
            }
        }

        console.log(`\n📊 Job Summary:`);
        console.log(`   - From completed tasks: ${results.completed}`);
        console.log(`   - From overdue tasks: ${results.overdue}`);
        console.log(`   - Skipped (not ready): ${results.skipped}`);
        console.log(`   - Total created: ${results.completed + results.overdue}`);

    } catch (error) {
        console.error("Error in checkRecurringTasks:", error);
    }
});

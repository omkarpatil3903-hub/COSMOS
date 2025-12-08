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
  // 1. Verify Authentication & Role
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const role = request.auth.token.role;
  if (role !== "superadmin" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can update passwords."
    );
  }

  // 2. Validate Input
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

  // 3. Perform Update
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
  // 1. Verify Authentication & Role
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const role = request.auth.token.role;
  if (role !== "superadmin" && role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users.");
  }

  // 2. Validate Input
  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }

  // 3. Perform Deletion
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

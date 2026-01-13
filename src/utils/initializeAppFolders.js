/**
 * App Folder Initialization Utility
 *
 * Purpose: Ensures essential system folders exist in the documents collection
 * on application startup.
 *
 * Responsibilities:
 * - Creates the "MOMs" (Minutes of Meeting) system folder if it doesn't exist
 * - Maintains folder metadata (color, visibility permissions, system flag)
 * - Preserves existing user-created folders while adding system folders
 *
 * Dependencies:
 * - Firestore (documents collection, folders document)
 *
 * System Folders:
 * - MOMs: Purple color (#8B5CF6), visible to superadmin and admin only
 *
 * Called By:
 * - AuthContext.jsx on mount (ensures folders exist on app load)
 *
 * SECURITY: This function only ADDS missing system folders.
 * It does not modify or delete existing folders.
 *
 * Last Modified: 2026-01-10
 */

import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Initializes essential app folders in Firestore.
 * Safe to call multiple times - only creates folders if they don't exist.
 *
 * @returns {Promise<void>}
 *
 * Business Logic:
 * 1. Check if folders document exists in 'documents' collection
 * 2. If exists, check if MOMs folder is already present
 * 3. If MOMs doesn't exist, add it to the folders array
 * 4. If no folders document exists, create it with MOMs folder
 *
 * Side Effects:
 * - Creates/updates 'documents/folders' document in Firestore
 * - Logs success/error to console
 *
 * Folder Object Structure:
 * {
 *   name: string,
 *   color: string (hex),
 *   isSystem: boolean (prevents user deletion),
 *   visibleTo: string[] (role-based visibility)
 * }
 */
export const initializeAppFolders = async () => {
    try {
        const foldersDocRef = doc(db, "documents", "folders");
        const foldersSnap = await getDoc(foldersDocRef);

        if (foldersSnap.exists()) {
            const data = foldersSnap.data();
            const folders = data.folders || [];

            // CHECK EXISTENCE: Handle both legacy (string) and new (object) folder formats
            const momsExists = folders.some(f => {
                const folderName = typeof f === 'string' ? f : f.name;
                return folderName === "MOMs";
            });

            // ADD MOMS FOLDER: Only if it doesn't already exist
            if (!momsExists) {
                const momsFolder = {
                    name: "MOMs",
                    color: "#8B5CF6", // Purple - distinct color for official minutes
                    isSystem: true, // SYSTEM FLAG: Prevents deletion by users
                    visibleTo: ["superadmin", "admin"] // RBAC: Only visible to admin roles
                };

                // SORT ALPHABETICALLY: Maintain consistent ordering
                const updatedFolders = [...folders, momsFolder].sort((a, b) => {
                    const nameA = typeof a === 'string' ? a : a.name;
                    const nameB = typeof b === 'string' ? b : b.name;
                    return nameA.localeCompare(nameB);
                });

                await setDoc(foldersDocRef, {
                    folders: updatedFolders,
                    updatedAt: new Date().toISOString()
                });

                console.log("MOMs folder initialized successfully");
            }
        } else {
            // FIRST RUN: Create folders document with MOMs folder
            await setDoc(foldersDocRef, {
                folders: [
                    {
                        name: "MOMs",
                        color: "#8B5CF6",
                        isSystem: true,
                        visibleTo: ["superadmin", "admin"]
                    }
                ],
                updatedAt: new Date().toISOString()
            });

            console.log("Folders document created with MOMs folder");
        }
    } catch (error) {
        // SILENT FAIL: App should continue even if folder init fails
        // Users can still use the app, just without the system folder
        console.error("Error initializing app folders:", error);
    }
};

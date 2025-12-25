import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Ensures essential folders exist in the documents collection.
 * This function should be called when the app initializes (e.g., in App.jsx or main layout).
 * The "MOMs" folder is reserved for Minutes of Meeting documents and should only be visible
 * to superadmin and admin users.
 */
export const initializeAppFolders = async () => {
    try {
        const foldersDocRef = doc(db, "documents", "folders");
        const foldersSnap = await getDoc(foldersDocRef);

        if (foldersSnap.exists()) {
            const data = foldersSnap.data();
            const folders = data.folders || [];

            // Check if "MOMs" folder already exists
            const momsExists = folders.some(f => {
                const folderName = typeof f === 'string' ? f : f.name;
                return folderName === "MOMs";
            });

            // Add "MOMs" folder if it doesn't exist
            if (!momsExists) {
                const momsFolder = {
                    name: "MOMs",
                    color: "#8B5CF6", // Purple color for MOMs
                    isSystem: true, // Mark as system folder (cannot be deleted by users)
                    visibleTo: ["superadmin", "admin"] // Only visible to these roles
                };

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
            // No folders document exists, create it with MOMs folder
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
        console.error("Error initializing app folders:", error);
    }
};

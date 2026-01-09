import React, { useState, useEffect, useRef } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { auth, db, storage } from "../../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { updateProfile, updateEmail } from "firebase/auth";
import { FaUser, FaEnvelope, FaShieldAlt, FaCalendar, FaEdit, FaSave, FaTimes, FaLock, FaCamera } from "react-icons/fa";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import toast from "react-hot-toast";
import VoiceInput from "../../components/Common/VoiceInput";
import ChangePasswordModal from "../../components/ChangePasswordModal";

export default function PortalProfileSettings() {
  const { buttonClass, barColor } = useThemeStyles();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubUsers = () => { };
    let unsubClients = () => { };

    // Set up real-time listener for user data from Firestore (users collection)
    const userDocRef = doc(db, "users", currentUser.uid);
    unsubUsers = onSnapshot(
      userDocRef,
      (docSnap) => {
        const userData = docSnap.exists() ? docSnap.data() : {};

        setUserInfo({
          uid: currentUser.uid,
          email: currentUser.email,
          name: userData.name || "Not set",
          imageUrl: userData.imageUrl || null,
          role: userData.role || "User",
          createdAt: currentUser.metadata.creationTime,
          lastSignIn: currentUser.metadata.lastSignInTime,
        });

        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user info:", error);
        setLoading(false);
      }
    );

    // Also check clients collection for client users
    const clientDocRef = doc(db, "clients", currentUser.uid);
    unsubClients = onSnapshot(
      clientDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const clientData = docSnap.data();
          // Update with client data if available
          setUserInfo((prev) => ({
            ...prev,
            name: clientData.clientName || clientData.companyName || prev?.name || "Not set",
            imageUrl: clientData.imageUrl || clientData.logo || prev?.imageUrl || null,
            role: clientData.role || prev?.role || "Client",
          }));
        }
      },
      (error) => {
        console.error("Error fetching client info:", error);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      unsubUsers();
      unsubClients();
    };
  }, []);

  const handleStartEdit = () => {
    setEditForm({
      name: userInfo.name,
      email: userInfo.email,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: "",
      email: "",
    });
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!editForm.email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      const file = fileInputRef.current?.file;
      let downloadURL = userInfo.imageUrl;
      let storagePath = null;

      // Upload image if selected
      if (file) {
        setUploadingImage(true);
        try {
          // Determine user type and email
          const isClient = userInfo.role === "Client" || userInfo.role === "client";
          const folder = isClient ? 'client' : 'resource';
          const email = (currentUser.email || userInfo.email || "unknown").toLowerCase();

          // Delete all existing profile image variants before uploading new one
          const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          for (const ext of extensions) {
            const oldPath = `profiles/${folder}/${email}.${ext}`;
            try {
              await deleteObject(ref(storage, oldPath));
              console.log(`Deleted old image: ${oldPath}`);
            } catch (err) {
              // Silently ignore - file might not exist
            }
          }

          const ext = file.type === 'image/jpeg' ? 'jpg' : (file.type.split('/')[1] || 'png');
          const path = `profiles/${folder}/${email}.${ext}`;
          const storageRef = ref(storage, path);

          // Upload file
          await uploadBytes(storageRef, file);

          // Get download URL
          downloadURL = await getDownloadURL(storageRef);
          storagePath = path;
        } catch (uploadError) {
          console.error("Error uploading image during save:", uploadError);
          toast.error("Failed to upload image, but continuing with profile update.");
        } finally {
          setUploadingImage(false);
          // Clear file ref
          if (fileInputRef.current) delete fileInputRef.current.file;
        }
      }

      // Update display name in Firebase Auth
      const profileUpdates = {
        displayName: editForm.name,
      };

      if (editForm.name !== userInfo.name || (file && downloadURL)) {
        await updateProfile(currentUser, profileUpdates);
      }

      // Update email in Firebase Auth (if changed)
      if (editForm.email !== userInfo.email) {
        await updateEmail(currentUser, editForm.email);
      }

      // Update in Firestore
      const isClient = userInfo.role === "Client" || userInfo.role === "client";
      const userTypeCollection = isClient ? "clients" : "users";
      const userDocRef = doc(db, userTypeCollection, currentUser.uid);

      const firestoreUpdates = {
        name: editForm.name,
        email: editForm.email,
        ...(isClient ? { clientName: editForm.name } : {}),
      };

      if (file && downloadURL) {
        firestoreUpdates.imageUrl = downloadURL;
        if (storagePath) firestoreUpdates.imageStoragePath = storagePath;
      }

      await updateDoc(userDocRef, firestoreUpdates);

      // Update local state
      setUserInfo({
        ...userInfo,
        name: editForm.name,
        email: editForm.email,
        imageUrl: downloadURL || userInfo.imageUrl,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in to update your email");
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("This email is already in use by another account");
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create local preview and store file
    const reader = new FileReader();
    reader.onloadend = () => {
      // Temporary preview
      setUserInfo(prev => ({
        ...prev,
        imageUrl: reader.result
      }));
    };
    reader.readAsDataURL(file);

    // Store file for upload on save
    if (!fileInputRef.current) fileInputRef.current = {};
    fileInputRef.current.file = file;
    setIsEditing(true); // Ensure edit mode is on so save button is available
  };

  if (loading) {
    return (
      <Card className="p-6 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 [.dark_&]:bg-gray-700"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 [.dark_&]:bg-gray-700"></div>
        </div>
      </Card>
    );
  }

  if (!userInfo) {
    return (
      <Card className="p-6 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <p className="text-sm text-gray-500 [.dark_&]:text-gray-400">
          Unable to load user information. Please try again.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6 sm:p-8 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 relative group">
            {userInfo.imageUrl && !imageLoadError ? (
              <img
                src={userInfo.imageUrl}
                alt={userInfo.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-100 [.dark_&]:border-gray-700"
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${barColor} flex items-center justify-center border-4 border-gray-100 [.dark_&]:border-gray-700`}>
                <FaUser className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            )}
            {/* Camera Button Overlay */}
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white [.dark_&]:bg-slate-700 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-100 [.dark_&]:border-gray-600 hover:bg-gray-50 [.dark_&]:hover:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Change profile picture"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaCamera className="w-4 h-4 text-gray-600 [.dark_&]:text-gray-300" />
                )}
              </button>
            )}
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* User Info */}
          <div className="flex-grow space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 [.dark_&]:text-white">
              {userInfo.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 [.dark_&]:text-gray-400 flex items-center gap-2">
              <FaEnvelope className="w-4 h-4" />
              {userInfo.email}
            </p>
            <div className="flex items-center gap-2">
              <FaShieldAlt className="w-4 h-4 text-indigo-600 [.dark_&]:text-indigo-400" />
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 [.dark_&]:bg-indigo-900/30 [.dark_&]:text-indigo-300">
                {userInfo.role}
              </span>
            </div>
          </div>

          {/* Edit/Save/Cancel Buttons */}
          <div className="w-full sm:w-auto flex gap-2">
            {!isEditing ? (
              <Button
                variant="custom"
                className={`w-full sm:w-auto flex items-center justify-center gap-2 ${buttonClass}`}
                onClick={handleStartEdit}
              >
                <FaEdit />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2 [.dark_&]:text-gray-300 [.dark_&]:hover:bg-white/10"
                >
                  <FaTimes />
                  Cancel
                </Button>
                <Button
                  variant="custom"
                  className={`flex items-center gap-2 ${buttonClass}`}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  <FaSave />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card className="p-6 sm:p-8 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 [.dark_&]:text-white">
            Account Details
          </h2>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              Name {isEditing && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
              <VoiceInput
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all [.dark_&]:bg-[#1F2234] [.dark_&]:border-gray-700 [.dark_&]:text-white"
                placeholder="Enter your name"
                disabled={saving}
                required
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
                <p className="text-sm text-gray-900 [.dark_&]:text-white">
                  {userInfo.name}
                </p>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              Email Address
            </label>
            {isEditing ? (
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="email"
                    value={editForm.email}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed text-sm outline-none transition-all [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700 [.dark_&]:text-gray-400"
                    placeholder="Enter your email address"
                    disabled={true}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
                <p className="text-sm text-gray-900 [.dark_&]:text-white">
                  {userInfo.email}
                </p>
              </div>
            )}
          </div>

          {/* User ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              User ID
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
              <p className="text-sm font-mono text-gray-900 [.dark_&]:text-white break-all">
                {userInfo.uid}
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              Role
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
              <p className="text-sm text-gray-900 [.dark_&]:text-white capitalize">
                {userInfo.role}
              </p>
            </div>
          </div>

          {/* Account Created */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400 flex items-center gap-2">
              <FaCalendar className="w-4 h-4" />
              Account Created
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
              <p className="text-sm text-gray-900 [.dark_&]:text-white">
                {new Date(userInfo.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>

          {/* Last Sign In */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400 flex items-center gap-2">
              <FaCalendar className="w-4 h-4" />
              Last Sign In
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
              <p className="text-sm text-gray-900 [.dark_&]:text-white">
                {new Date(userInfo.lastSignIn).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6 sm:p-8 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 [.dark_&]:text-white mb-6 flex items-center gap-2">
          <FaLock className="text-indigo-500" />
          Security Settings
        </h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-900 [.dark_&]:text-white">Password</h3>
            <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-1">
              Change your account password
            </p>
          </div>
          <Button
            variant="custom"
            className={`flex items-center gap-2 ${buttonClass}`}
            onClick={() => setShowChangePassword(true)}
          >
            <FaLock className="text-sm" />
            Change Password
          </Button>
        </div>
      </Card>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}

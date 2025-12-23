import React, { useState, useEffect } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile, updateEmail } from "firebase/auth";
import { FaUser, FaEnvelope, FaShieldAlt, FaCalendar, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import toast from "react-hot-toast";
import VoiceInput from "../../components/Common/VoiceInput";

export default function PortalProfileSettings() {
  const { buttonClass } = useThemeStyles();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Try to get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          setUserInfo({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || userData.name || "Not set",
            photoURL: currentUser.photoURL || userData.photoURL || null,
            role: userData.role || "User",
            createdAt: currentUser.metadata.creationTime,
            lastSignIn: currentUser.metadata.lastSignInTime,
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleStartEdit = () => {
    setEditForm({
      displayName: userInfo.displayName,
      email: userInfo.email,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      displayName: "",
      email: "",
    });
  };

  const handleSaveProfile = async () => {
    if (!editForm.displayName.trim()) {
      toast.error("Display name cannot be empty");
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

      // Update display name in Firebase Auth
      if (editForm.displayName !== userInfo.displayName) {
        await updateProfile(currentUser, {
          displayName: editForm.displayName,
        });
      }

      // Update email in Firebase Auth (if changed)
      if (editForm.email !== userInfo.email) {
        await updateEmail(currentUser, editForm.email);
      }

      // Update in Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: editForm.displayName,
        email: editForm.email,
      });

      // Update local state
      setUserInfo({
        ...userInfo,
        displayName: editForm.displayName,
        email: editForm.email,
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
          <div className="flex-shrink-0">
            {userInfo.photoURL ? (
              <img
                src={userInfo.photoURL}
                alt={userInfo.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-100 [.dark_&]:border-gray-700"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-gray-100 [.dark_&]:border-gray-700">
                <FaUser className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-grow space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 [.dark_&]:text-white">
              {userInfo.displayName}
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

          {/* Edit Button */}
          {!isEditing && (
            <div className="w-full sm:w-auto">
              <Button
                variant="custom"
                className={`w-full sm:w-auto flex items-center justify-center gap-2 ${buttonClass}`}
                onClick={handleStartEdit}
              >
                <FaEdit />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Account Details */}
      <Card className="p-6 sm:p-8 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 [.dark_&]:text-white">
            Account Details
          </h2>
          {isEditing && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              Display Name {isEditing && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
              <VoiceInput
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all [.dark_&]:bg-[#1F2234] [.dark_&]:border-gray-700 [.dark_&]:text-white"
                placeholder="Enter your display name"
                disabled={saving}
                required
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 [.dark_&]:bg-gray-800/50 [.dark_&]:border-gray-700">
                <p className="text-sm text-gray-900 [.dark_&]:text-white">
                  {userInfo.displayName}
                </p>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 [.dark_&]:text-gray-400">
              Email Address {isEditing && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
              <div className="space-y-1">
                <VoiceInput
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all [.dark_&]:bg-[#1F2234] [.dark_&]:border-gray-700 [.dark_&]:text-white"
                  placeholder="Enter your email address"
                  disabled={saving}
                  required
                />
                <p className="text-xs text-amber-600 [.dark_&]:text-amber-400">
                  ⚠️ Changing email may require re-login
                </p>
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
    </div>
  );
}

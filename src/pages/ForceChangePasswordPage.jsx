// src/pages/ForceChangePasswordPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import loginBgVideo from "../assets/loginbg.mp4";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

function ForceChangePasswordPage() {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        document.title = "Change Password - Triology Consultancy";

        // Check if user needs to change password
        const checkUser = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate("/login", { replace: true });
                return;
            }

            // Get user data to determine role for redirect
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                    // If already changed password, redirect
                    if (!userDoc.data().mustChangePassword) {
                        redirectToDashboard(userDoc.data().role);
                    }
                } else {
                    const clientDoc = await getDoc(doc(db, "clients", user.uid));
                    if (clientDoc.exists()) {
                        setUserRole("client");
                        if (!clientDoc.data().mustChangePassword) {
                            navigate("/client", { replace: true });
                        }
                    }
                }
            } catch (err) {
                console.error("Error checking user:", err);
            }
        };

        checkUser();
    }, [navigate]);

    const redirectToDashboard = (role) => {
        const r = (role || "").trim().toLowerCase();
        switch (r) {
            case "superadmin":
                navigate("/", { replace: true });
                break;
            case "admin":
                navigate("/admin", { replace: true });
                break;
            case "manager":
                navigate("/manager", { replace: true });
                break;
            case "client":
                navigate("/client", { replace: true });
                break;
            default:
                navigate("/employee", { replace: true });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (currentPassword === newPassword) {
            setError("New password must be different from current password");
            return;
        }

        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                throw new Error("No authenticated user found");
            }

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password in Firebase Auth
            await updatePassword(user, newPassword);

            // Update Firestore - clear flag and update devPassword
            const collection = userRole === "client" ? "clients" : "users";
            const userDocRef = doc(db, collection, user.uid);
            await updateDoc(userDocRef, {
                mustChangePassword: false,
                devPassword: newPassword,
            });

            toast.success("Password changed successfully!");
            redirectToDashboard(userRole);
        } catch (err) {
            console.error("Password change error:", err);
            switch (err?.code) {
                case "auth/wrong-password":
                    setError("Current password is incorrect");
                    break;
                case "auth/weak-password":
                    setError("New password is too weak");
                    break;
                case "auth/too-many-requests":
                    setError("Too many attempts. Please wait and try again.");
                    break;
                default:
                    setError(err.message || "Failed to change password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover">
                <source src={loginBgVideo} type="video/mp4" />
            </video>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <FaExclamationCircle className="text-amber-400 text-3xl" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Password Change Required</h2>
                        <p className="text-gray-400 text-sm mt-2">
                            For security, you must change your password before continuing.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                                Current Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <FaLock className="h-4 w-4 text-gray-400" />
                                </span>
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                >
                                    {showCurrent ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <FaLock className="h-4 w-4 text-gray-400" />
                                </span>
                                <input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                >
                                    {showNew ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <FaLock className="h-4 w-4 text-gray-400" />
                                </span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                >
                                    {showConfirm ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                                </button>
                            </div>
                            {confirmPassword && newPassword === confirmPassword && (
                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                    <FaCheckCircle className="text-[10px]" /> Passwords match
                                </p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200 border border-red-500/50">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
                                    Changing...
                                </span>
                            ) : (
                                "Change Password & Continue"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ForceChangePasswordPage;

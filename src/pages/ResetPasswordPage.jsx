// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import loginBgVideo from "../assets/loginbg.mp4";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import {
    FaLock,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
    FaExclamationTriangle,
    FaArrowLeft,
} from "react-icons/fa";

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [email, setEmail] = useState("");
    const [success, setSuccess] = useState(false);
    const [invalidLink, setInvalidLink] = useState(false);

    // Get the oobCode from URL (Firebase sends this)
    const oobCode = searchParams.get("oobCode");

    useEffect(() => {
        document.title = "COSMOS | Reset Password";

        // Verify the reset code is valid
        const verifyCode = async () => {
            if (!oobCode) {
                setInvalidLink(true);
                setVerifying(false);
                return;
            }

            try {
                const userEmail = await verifyPasswordResetCode(auth, oobCode);
                setEmail(userEmail);
                setVerifying(false);
            } catch (err) {
                console.error("Invalid reset code:", err);
                setInvalidLink(true);
                setVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setPasswordError("");

        // Validation
        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        // Password validation regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setPasswordError("Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*_-).");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);

            // Update devpassword in Firestore
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    await updateDoc(userDoc.ref, { devPassword: newPassword });
                }
            } catch (firestoreErr) {
                console.warn("Failed to update devpassword in Firestore:", firestoreErr);
            }

            setSuccess(true);
            toast.success("Password reset successfully!");
        } catch (err) {
            console.error("Reset error:", err);
            switch (err?.code) {
                case "auth/expired-action-code":
                    setError("This reset link has expired. Please request a new one.");
                    break;
                case "auth/invalid-action-code":
                    setError("This reset link is invalid. Please request a new one.");
                    break;
                case "auth/weak-password":
                    setError("Password is too weak. Use at least 6 characters.");
                    break;
                default:
                    setError("Failed to reset password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Loading state while verifying code
    if (verifying) {
        return (
            <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
                <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover">
                    <source src={loginBgVideo} type="video/mp4" />
                </video>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>
                <div className="relative z-10 text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    // Invalid/Expired link state
    if (invalidLink) {
        return (
            <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
                <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover">
                    <source src={loginBgVideo} type="video/mp4" />
                </video>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>
                <div className="relative z-10 w-full max-w-md px-4">
                    <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <FaExclamationTriangle className="text-red-400 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all"
                        >
                            Request New Reset Link
                        </Link>
                        <Link
                            to="/login"
                            className="block mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <FaArrowLeft className="inline mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
                <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover">
                    <source src={loginBgVideo} type="video/mp4" />
                </video>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>
                <div className="relative z-10 w-full max-w-md px-4">
                    <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-green-400 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Reset Complete!</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Your password has been successfully reset. You can now log in with your new password.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Password reset form
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover">
                <source src={loginBgVideo} type="video/mp4" />
            </video>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8">
                    {/* Logo */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-2 rounded-full shadow-lg">
                                <img
                                    src="/cosmos logo.png"
                                    alt="Cosmos Logo"
                                    className="h-16 w-16 object-cover rounded-full"
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Create New Password</h2>
                        <p className="text-gray-400 text-sm mt-2">
                            Enter a new password for <span className="text-indigo-400">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <FaLock className="h-5 w-5 text-gray-400" />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                >
                                    {showPassword ? (
                                        <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                                    ) : (
                                        <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {passwordError ? (
                                    <span className="text-red-400">{passwordError}</span>
                                ) : (
                                    "Password must be strong"
                                )}
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <FaLock className="h-5 w-5 text-gray-400" />
                                </span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                >
                                    {showConfirm ? (
                                        <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                                    ) : (
                                        <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                                    )}
                                </button>
                            </div>
                            {confirmPassword && newPassword === confirmPassword && (
                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                    <FaCheckCircle className="text-[10px]" /> Passwords match
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200 border border-red-500/50">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
                                    Resetting...
                                </span>
                            ) : (
                                "Reset Password"
                            )}
                        </button>
                    </form>

                    <Link
                        to="/login"
                        className="block mt-6 text-center text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <FaArrowLeft className="inline mr-2" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;

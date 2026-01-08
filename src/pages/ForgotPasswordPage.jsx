// src/pages/ForgotPasswordPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import loginBgVideo from "../assets/loginbg.mp4";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import toast from "react-hot-toast";
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        document.title = "Reset Password - Triology Consultancy";
    }, []);

    const friendlyError = (code) => {
        switch (code) {
            case "auth/invalid-email":
                return "Invalid email address.";
            case "auth/user-not-found":
                return "No account found with this email.";
            case "auth/too-many-requests":
                return "Too many requests. Please wait and try again.";
            default:
                return "Failed to send reset email. Please try again.";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSent(true);
            toast.success("Password reset email sent!");
        } catch (err) {
            const message = friendlyError(err?.code);
            setErrorMsg(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover"
            >
                <source src={loginBgVideo} type="video/mp4" />
            </video>

            {/* Dark Overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8">
                    {/* Back to Login */}
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <FaArrowLeft className="text-sm" />
                        <span className="text-sm">Back to Login</span>
                    </Link>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                        <p className="text-gray-400 text-sm mt-2">
                            Enter your email and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {sent ? (
                        // Success State
                        <div className="text-center py-6">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <FaCheckCircle className="text-green-400 text-3xl" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Check your email
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                We've sent a password reset link to <br />
                                <span className="text-indigo-400 font-medium">{email}</span>
                            </p>
                            <p className="text-gray-500 text-xs mb-4">
                                Didn't receive the email? Check your spam folder or try again.
                            </p>
                            <button
                                onClick={() => {
                                    setSent(false);
                                    setEmail("");
                                }}
                                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                            >
                                Try another email
                            </button>
                        </div>
                    ) : (
                        // Form State
                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-200"
                                >
                                    Email address
                                </label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <FaEnvelope className="h-5 w-5 text-gray-400" />
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div
                                    className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200 border border-red-500/50"
                                    role="alert"
                                >
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
                                        Sending...
                                    </span>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";

/**
 * NotFoundPage — Theme-aware COSMOS 404 page.
 * Automatically switches between light/dark based on the user's chosen theme.
 */
export default function NotFoundPage() {
    const navigate = useNavigate();
    const { userData } = useAuthContext();

    useEffect(() => {
        document.title = "COSMOS | Page Not Found";
    }, []);

    const getDashboardPath = () => {
        const role = (userData?.role || "").toLowerCase();
        switch (role) {
            case "superadmin": return "/";
            case "admin": return "/admin";
            case "manager": return "/manager";
            case "client": return "/client";
            default: return "/employee";
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-100 dark:bg-[#0f1117] transition-colors duration-300">

            {/* Animated background grid */}
            <div
                className="absolute inset-0 opacity-5 dark:opacity-10"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Glowing orbs */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-300/20 dark:bg-indigo-700/20 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-300/20 dark:bg-purple-700/20 blur-[100px] pointer-events-none" />

            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-indigo-50/30 dark:from-black/60 dark:via-black/50 dark:to-black/60" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/80 dark:border-white/10 p-8 text-center transition-colors duration-300">

                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white p-2 rounded-full shadow-lg border border-gray-100 dark:border-white/10">
                            <img
                                src="/cosmos logo.png"
                                alt="COSMOS Logo"
                                className="h-16 w-16 object-cover rounded-full"
                            />
                        </div>
                    </div>

                    {/* 404 badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-ping inline-block" />
                        Error 404
                    </div>

                    {/* Big 404 ghost number */}
                    <h1 className="text-8xl font-black text-gray-200 dark:text-white/10 select-none leading-none mb-1 tracking-tight">
                        404
                    </h1>

                    {/* Icon */}
                    <div className="flex justify-center -mt-2 mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Page Not Found
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                        The page you're looking for doesn't exist or has been moved.
                    </p>

                    {/* Invalid URL pill */}
                    <div className="flex items-center justify-center gap-2 mb-7 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-400 dark:text-gray-500 font-mono mx-auto w-fit max-w-full overflow-hidden">
                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span className="truncate">{window.location.pathname}</span>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all duration-200"
                        >
                            ← Go Back
                        </button>
                        <button
                            onClick={() => navigate(getDashboardPath())}
                            className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/40 transition-all duration-200 active:scale-95"
                        >
                            Go to Dashboard →
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 dark:text-white/25 text-xs mt-5">
                    COSMOS | Page Not Found
                </p>
            </div>
        </div>
    );
}

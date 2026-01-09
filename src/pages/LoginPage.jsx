// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import loginBgVideo from "../assets/loginbg.mp4";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  FaShieldAlt,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import Card from "../components/Card";
import Button from "../components/Button";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = "COSMOS | Login";
  }, []);

  const friendlyAuthError = (code) => {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email address. Please check and try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact your administrator.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a bit and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection and try again.";
      default:
        return "Failed to log in. Please check your credentials.";
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const emailTrimmed = email.trim();
      const passwordTrimmed = password;
      console.log("Attempting login for:", emailTrimmed);

      const cred = await signInWithEmailAndPassword(
        auth,
        emailTrimmed,
        passwordTrimmed
      );
      console.log("Firebase Auth successful. User UID:", cred.user.uid);

      toast.success("Logged in successfully");

      // Determine role and resource role type for redirect
      let role = null;
      let resourceRoleType = null;
      let mustChangePassword = false;

      try {
        const tokenRes = await cred.user.getIdTokenResult();
        role = tokenRes?.claims?.role || null;
        console.log("Claims role:", role);
      } catch (e) {
        console.warn("Error fetching token claims:", e);
      }

      try {
        const uSnap = await getDoc(doc(db, "users", cred.user.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          console.log("User data found in 'users':", uData);

          // BLOCK INACTIVE USERS
          if (uData.status === "Inactive") {
            const msg = "Account is inactive. Please contact administrator.";
            console.log("User is Inactive. Blocking login.");
            await signOut(auth); // Force sign out
            toast.error(msg);
            setErrorMsg(msg);
            setLoading(false);
            return;
          }

          if (!role && uData?.role) role = uData.role?.trim();
          if (uData?.resourceRoleType)
            resourceRoleType = String(uData.resourceRoleType)
              .trim()
              .toLowerCase();
          // Check if password change is required
          if (uData?.mustChangePassword === true) {
            mustChangePassword = true;
          }
        } else {
          console.log("User not found in 'users', checking 'clients'...");
          const cSnap = await getDoc(doc(db, "clients", cred.user.uid));
          if (cSnap.exists()) {
            console.log("User data found in 'clients':", cSnap.data());

            // BLOCK INACTIVE CLIENTS
            if (cSnap.data()?.status === "Inactive") {
              const msg = "Account is inactive. Please contact administrator.";
              console.log("Client is Inactive. Blocking login.");
              await signOut(auth);
              toast.error(msg);
              setErrorMsg(msg);
              setLoading(false);
              return;
            }

            if (cSnap.data()?.role) {
              role = cSnap.data().role?.trim();
            }
            // Check if password change is required for client
            if (cSnap.data()?.mustChangePassword === true) {
              mustChangePassword = true;
            }
          } else {
            console.log("User not found in 'clients' either.");

            // Auto-recovery for Super Admin
            if (emailTrimmed.toLowerCase() === "admin@gmail.com") {
              console.log(
                "Detected orphan Super Admin account. Attempting recovery..."
              );

              const newAdminData = {
                name: "Super Admin",
                email: emailTrimmed,
                role: "superadmin",
                resourceRoleType: "admin",
                status: "Active",
                createdAt: serverTimestamp(),
                resourceType: "In-house",
                employmentType: "Full-time",
              };

              await setDoc(doc(db, "users", cred.user.uid), newAdminData);
              console.log("Super Admin account recovered in Firestore.");
              toast.success("Super Admin account recovered!");
              role = "superadmin";
            }
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }

      console.log("Final determined role:", role);
      console.log("Final resourceRoleType:", resourceRoleType);
      console.log("Must change password:", mustChangePassword);

      // Wait for auth state to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // SESSION SECURITY: Store login timestamp for session duration tracking
      // This timestamp is used by useSessionSecurity hook to enforce max session duration
      localStorage.setItem("sessionStartTime", Date.now().toString());

      // If password change is required, redirect to force change page
      if (mustChangePassword) {
        console.log("Redirecting to /force-change-password");
        navigate("/force-change-password", { replace: true });
        return;
      }

      // Redirect based on role priority: client > resourceRoleType > role
      if (role === "client") {
        console.log("Redirecting to /client");
        navigate("/client", { replace: true });
      } else if (role === "superadmin") {
        console.log("Redirecting to / (superadmin)");
        navigate("/", { replace: true });
      } else if (role === "admin") {
        // Admin: dedicated admin dashboard
        console.log("Redirecting to /admin");
        navigate("/admin", { replace: true });
      } else if (role === "manager") {
        // Manager: manager dashboard
        console.log("Redirecting to /manager");
        navigate("/manager", { replace: true });
      } else if (
        role === "member" ||
        role === "resource" ||
        resourceRoleType === "member"
      ) {
        console.log("Redirecting to /employee");
        navigate("/employee", { replace: true });
      } else {
        // Default fallback
        console.log("Redirecting to / (fallback)");
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message = friendlyAuthError(err?.code);
      setErrorMsg(message);
      toast.error(message);
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
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
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay for better readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-2 rounded-full shadow-lg">
                <img
                  src="/cosmos logo.png"
                  alt="Cosmos Logo"
                  className="h-20 w-20 object-cover rounded-full"
                />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Login Page </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            {/* Email Input */}
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

            {/* Password Input with Eye Button */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Password
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 text-white bg-slate-700/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label="Toggle password visibility"
                >
                  {isPasswordVisible ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200 border border-red-500/50"
                role="alert"
                aria-live="assertive"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            {/* Forgot Password Link - Centered below Sign In */}
            <div className="flex justify-center">
              <Link
                to="/forgot-password"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

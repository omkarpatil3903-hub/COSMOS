// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
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
    document.title = "Login - Triology Consultancy";
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
      const cred = await signInWithEmailAndPassword(
        auth,
        emailTrimmed,
        passwordTrimmed
      );

      toast.success("Logged in successfully");

      // Try to determine role from token claims first
      let role = null;
      try {
        const tokenRes = await cred.user.getIdTokenResult();
        role = tokenRes?.claims?.role || null;
      } catch {
        // ignore
      }

      // Fallback to Firestore profile (users or clients)
      if (!role) {
        try {
          const uSnap = await getDoc(doc(db, "users", cred.user.uid));
          if (uSnap.exists() && uSnap.data()?.role) {
            role = uSnap.data().role;
          } else {
            const cSnap = await getDoc(doc(db, "clients", cred.user.uid));
            if (cSnap.exists() && cSnap.data()?.role) role = cSnap.data().role;
          }
        } catch {
          // ignore
        }
      }

      // Redirect based on role
      setTimeout(() => {
        if (role === "client") {
          navigate("/client");
        } else if (role === "resource") {
          navigate("/employee");
        } else {
          navigate("/");
        }
      }, 700);
    } catch (err) {
      const message = friendlyAuthError(err?.code);
      setErrorMsg(message);
      toast.error(message);
      console.error("Login failed:", err);
      setLoading(false);
    }
    // We don't set loading to false in the success case because the page will navigate away
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-8">
            <div className="inline-block bg-indigo-600 p-4 rounded-full mb-4">
              <FaShieldAlt size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Login Page </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
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
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Input with Eye Button */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
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
                  className="w-full pl-10 pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label="Toggle password visibility"
                >
                  {isPasswordVisible ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-500" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200"
                role="alert"
                aria-live="assertive"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;

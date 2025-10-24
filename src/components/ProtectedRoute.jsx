import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <div>Loading....</div>;
  }

  if (!user) {
    // If not loading and no user, redirect to the login page
    return <Navigate to="/login" />;
  }

  // If the user is logged in, show the page they requested
  return children;
}

export default ProtectedRoute;

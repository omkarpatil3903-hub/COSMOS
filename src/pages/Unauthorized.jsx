import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page immediately
    navigate("/login", { replace: true });
  }, [navigate]);

  // Return null or loading spinner since user will be redirected
  return null;
}

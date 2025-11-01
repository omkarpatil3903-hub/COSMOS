import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaExclamationTriangle, FaHome, FaSignInAlt } from "react-icons/fa";
import Card from "../components/Card";
import Button from "../components/Button";

export default function Unauthorized() {
  // Set page title
  useEffect(() => {
    document.title = "Access Denied - Triology Consultancy";
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <FaExclamationTriangle className="text-red-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to view this page. Your account does not
            have the required permissions to access this area.
          </p>
          <div className="space-y-3">
            <Link to="/login" className="block">
              <Button className="w-full flex items-center justify-center">
                <FaSignInAlt className="mr-2" />
                Go to Login
              </Button>
            </Link>
            <p className="text-sm text-gray-500">
              If you think this is a mistake, contact your administrator.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

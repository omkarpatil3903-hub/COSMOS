// src/components/RouteWithErrorBoundary.jsx
import React from "react";
import PageErrorBoundary from "./PageErrorBoundary";

/**
 * RouteWithErrorBoundary
 * A wrapper component that wraps any page element with PageErrorBoundary.
 * Use this to wrap route elements for isolated error handling.
 */
const RouteWithErrorBoundary = ({ children }) => {
    return <PageErrorBoundary>{children}</PageErrorBoundary>;
};

/**
 * Helper function to wrap a route element with error boundary
 * Usage: withErrorBoundary(<YourComponent />)
 */
export const withErrorBoundary = (element) => {
    return <PageErrorBoundary>{element}</PageErrorBoundary>;
};

export default RouteWithErrorBoundary;

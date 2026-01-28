// src/components/ErrorBoundary.jsx
import React from "react";

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console (you can also send to an error reporting service)
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });

        // Optional: Send error to an external service like Sentry, LogRocket, etc.
        // logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            // Render fallback UI
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        {/* Error Icon */}
                        <div style={styles.iconContainer}>
                            <svg
                                style={styles.icon}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>

                        {/* Error Title */}
                        <h1 style={styles.title}>Something went wrong</h1>

                        {/* Error Message */}
                        <p style={styles.message}>
                            We're sorry, but something unexpected happened. Our team has been
                            notified and we're working to fix the issue.
                        </p>

                        {/* Error Details (only in development) */}
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details style={styles.details}>
                                <summary style={styles.summary}>Error Details</summary>
                                <pre style={styles.errorText}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div style={styles.buttonContainer}>
                            <button
                                onClick={this.handleReload}
                                style={styles.primaryButton}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#4338ca";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "#4f46e5";
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={styles.secondaryButton}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#f3f4f6";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "#ffffff";
                                }}
                            >
                                Go to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Inline styles for the error boundary UI
const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "20px",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: "40px",
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
    },
    iconContainer: {
        marginBottom: "24px",
    },
    icon: {
        width: "64px",
        height: "64px",
        color: "#ef4444",
        margin: "0 auto",
    },
    title: {
        fontSize: "24px",
        fontWeight: "600",
        color: "#111827",
        marginBottom: "12px",
        margin: "0 0 12px 0",
    },
    message: {
        fontSize: "16px",
        color: "#6b7280",
        lineHeight: "1.5",
        marginBottom: "24px",
        margin: "0 0 24px 0",
    },
    details: {
        textAlign: "left",
        marginBottom: "24px",
        backgroundColor: "#fef2f2",
        borderRadius: "8px",
        padding: "12px",
    },
    summary: {
        cursor: "pointer",
        fontWeight: "500",
        color: "#991b1b",
        marginBottom: "8px",
    },
    errorText: {
        fontSize: "12px",
        color: "#7f1d1d",
        overflow: "auto",
        maxHeight: "200px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: "8px 0 0 0",
    },
    buttonContainer: {
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        flexWrap: "wrap",
    },
    primaryButton: {
        backgroundColor: "#4f46e5",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    secondaryButton: {
        backgroundColor: "#ffffff",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
};

export default ErrorBoundary;

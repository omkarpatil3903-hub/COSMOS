// src/components/PageErrorBoundary.jsx
import React from "react";

/**
 * PageErrorBoundary Component
 * A lightweight error boundary for individual pages/routes.
 * Allows users to navigate away or retry without losing the entire app state.
 */
class PageErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("PageErrorBoundary caught an error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        {/* Error Icon */}
                        <div style={styles.iconWrapper}>
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
                                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                />
                            </svg>
                        </div>

                        <h2 style={styles.title}>This page encountered an error</h2>
                        <p style={styles.message}>
                            Something went wrong while loading this page. You can try again or
                            navigate to a different section.
                        </p>

                        {/* Error details in development */}
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details style={styles.details}>
                                <summary style={styles.summary}>View Error Details</summary>
                                <pre style={styles.errorText}>{this.state.error.toString()}</pre>
                            </details>
                        )}

                        <div style={styles.actions}>
                            <button
                                onClick={this.handleRetry}
                                style={styles.retryButton}
                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#4338ca")}
                                onMouseLeave={(e) => (e.target.style.backgroundColor = "#4f46e5")}
                            >
                                <svg
                                    style={styles.buttonIcon}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        padding: "40px 20px",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        padding: "32px",
        maxWidth: "420px",
        width: "100%",
        textAlign: "center",
    },
    iconWrapper: {
        marginBottom: "16px",
    },
    icon: {
        width: "48px",
        height: "48px",
        color: "#f59e0b",
        margin: "0 auto",
    },
    title: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#111827",
        margin: "0 0 8px 0",
    },
    message: {
        fontSize: "14px",
        color: "#6b7280",
        lineHeight: "1.5",
        margin: "0 0 20px 0",
    },
    details: {
        textAlign: "left",
        marginBottom: "20px",
        backgroundColor: "#fffbeb",
        borderRadius: "8px",
        padding: "12px",
        border: "1px solid #fcd34d",
    },
    summary: {
        cursor: "pointer",
        fontWeight: "500",
        color: "#92400e",
        fontSize: "13px",
    },
    errorText: {
        fontSize: "11px",
        color: "#78350f",
        overflow: "auto",
        maxHeight: "120px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: "8px 0 0 0",
    },
    actions: {
        display: "flex",
        justifyContent: "center",
    },
    retryButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "#4f46e5",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    buttonIcon: {
        width: "16px",
        height: "16px",
    },
};

export default PageErrorBoundary;

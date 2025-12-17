import React from "react";
import Documents from "./Documents";

// Thin wrapper so the Super Admin Knowledge Management "Documentation" tab
// can render the existing project list UI as its own page component,
// without repeating the main page header.
export default function SuperAdminDocumentsPage() {
  return <Documents hideHeader={true} />;
}

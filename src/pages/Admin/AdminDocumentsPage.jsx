import React from "react";
import AdminDocuments from "./AdminDocuments";

// Thin wrapper so the Admin Knowledge Management "Documentation" tab
// can render the existing project list UI without changing the route.
export default function AdminDocumentsPage() {
  return <AdminDocuments />;
}

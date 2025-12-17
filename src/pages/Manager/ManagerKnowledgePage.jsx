import React from "react";
import SuperAdminKnowledgePage from "../SuperAdmin/SuperAdminKnowledgePage";

// Manager Knowledge page reuses the global knowledge UI.
// If you need different access rules later, you can fork this component.
export default function ManagerKnowledgePage() {
  return <SuperAdminKnowledgePage />;
}

import React from "react";
import SuperAdminKnowledgePage from "../SuperAdmin/SuperAdminKnowledgePage";

// Employee Knowledge page currently reuses the global knowledge UI.
// If you need different access rules later, you can fork this component.
export default function EmployeeKnowledgePage() {
  return <SuperAdminKnowledgePage />;
}

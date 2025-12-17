import React from "react";
import SuperAdminKnowledgePage from "../SuperAdmin/SuperAdminKnowledgePage";

// For now, Admin shares the same global knowledge UI as Super Admin.
// If later you need different access rules for Admin, you can fork this component.
export default function AdminKnowledgePage() {
  return <SuperAdminKnowledgePage />;
}

import React from "react";
import Documents from "../SuperAdmin/Documents";

// Employee Documentation tab: show projects where the user is assigned
export default function EmployeeDocumentsPage() {
  return <Documents onlyMyAssigned={true} hideHeader={true} />;
}

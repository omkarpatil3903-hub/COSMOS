import React from "react";
import Documents from "../SuperAdmin/Documents";

// Manager Documentation tab: show projects that the manager has access to.
// Using onlyMyManaged={true} to filter projects where the current user is a manager.
export default function ManagerDocumentsPage() {
  return <Documents onlyMyManaged={true} hideHeader={true} />;
}

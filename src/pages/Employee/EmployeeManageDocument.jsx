import React, { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import SearchActions from "../../components/SearchActions";
import DocumentsTable from "../../components/documents/DocumentsTable";

export default function EmployeeManageDocument() {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-6">
      <PageHeader title="Manage Documents">
        Manage your documents and shared files.
      </PageHeader>
      <Card title="Search & Actions" tone="muted">
        <SearchActions
          value={search}
          onChange={setSearch}
          placeholder="Search documents"
        />
      </Card>
      <Card title="Document List" tone="muted">
        <DocumentsTable query={search} />
      </Card>
    </div>
  );
}

// src/components/DashboardSkeleton.jsx
import React from "react";
import PageHeader from "./PageHeader";
import Card from "./Card";

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-subtle bg-surface p-6 shadow-soft">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-surface-strong" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-surface-strong" />
        <div className="h-6 w-1/2 rounded bg-surface-strong" />
      </div>
    </div>
  </div>
);

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader title="Welcome, Admin!">
        Here's a summary of your workspace and quick access to your tools.
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-content-primary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <div className="h-20 animate-pulse rounded-lg bg-surface-strong"></div>
          </Card>
          <Card>
            <div className="h-20 animate-pulse rounded-lg bg-surface-strong"></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;

// src/components/DashboardSkeleton.jsx
import React from "react";
import PageHeader from "./PageHeader";
import Card from "./Card";

const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
    <div className="flex items-center">
      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
      <div className="ml-4 flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="h-20 animate-pulse"></div>
          </Card>
          <Card>
            <div className="h-20 animate-pulse"></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;

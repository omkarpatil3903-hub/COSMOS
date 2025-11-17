// src/components/DashboardSkeleton.jsx
import React from "react";
import PageHeader from "./PageHeader";
import Card from "./Card";

const SkeletonStatCard = () => (
  <div className="animate-pulse rounded-xl border border-subtle bg-surface p-6 shadow-soft">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded bg-surface-strong" />
        <div className="h-8 w-16 rounded bg-surface-strong" />
      </div>
      <div className="h-8 w-8 rounded bg-surface-strong" />
    </div>
  </div>
);

const SkeletonChart = ({ height = "h-64" }) => (
  <div className={`animate-pulse ${height} rounded-lg bg-surface-strong`}>
    <div className="flex h-full items-end justify-between p-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-8 bg-surface-subtle rounded-t"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  </div>
);

const SkeletonCalendar = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-6 w-40 rounded bg-surface-strong mx-auto" />
    <div className="grid grid-cols-7 gap-1">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-6 w-full rounded bg-surface-strong" />
      ))}
    </div>
    <div className="grid grid-cols-7 gap-1">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="h-8 w-full rounded bg-surface-strong" />
      ))}
    </div>
  </div>
);

const SkeletonPieChart = () => (
  <div className="animate-pulse flex items-center gap-6">
    <div className="h-40 w-40 rounded-full bg-surface-strong" />
    <div className="flex-1 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-surface-strong" />
            <div className="h-3 w-20 rounded bg-surface-strong" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-8 rounded bg-surface-strong" />
            <div className="h-2 w-10 rounded bg-surface-strong" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonProgressBars = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-6 w-48 rounded bg-surface-strong" />
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-surface-strong" />
            <div className="h-4 w-20 rounded bg-surface-strong" />
          </div>
          <div className="h-4 w-24 rounded bg-surface-strong" />
        </div>
        <div className="h-2 w-full rounded-full bg-surface-strong" />
      </div>
    ))}
  </div>
);

const SkeletonProjectsProgress = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-surface-strong" />
          <div className="h-3 w-24 rounded bg-surface-strong" />
        </div>
        <div className="h-2 w-full rounded-full bg-surface-strong" />
      </div>
    ))}
  </div>
);

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader
        title="Welcome, MASH Tech Solutions!"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 rounded bg-surface-strong" />
              <div className="h-9 w-44 rounded-md bg-surface-strong" />
            </div>
          </div>
        }
      >
        Monitor project performance, client engagement, and manage resources
        from a single control center.
      </PageHeader>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Analytics Dashboard Skeleton */}
      <div className="mt-10">
        <div className="animate-pulse mb-6">
          <div className="h-8 w-80 rounded bg-surface-strong" />
        </div>

        {/* Top Row - Project Progress and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-surface-strong animate-pulse" />
              <SkeletonChart />
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-surface-strong animate-pulse" />
              <SkeletonCalendar />
            </div>
          </Card>
        </div>

        {/* Bottom Row - Resource Allocation and Project Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-surface-strong animate-pulse" />
              <SkeletonProjectsProgress />
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-surface-strong animate-pulse" />
              <SkeletonProgressBars />
              <div className="mt-6 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 rounded bg-surface-strong" />
                    <div className="h-4 w-8 rounded bg-surface-strong" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-36 rounded bg-surface-strong" />
                    <div className="h-4 w-12 rounded bg-surface-strong" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;

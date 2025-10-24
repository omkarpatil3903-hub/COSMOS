// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext"; // To get the user's name
import {
  FaUsers,
  FaUserCheck,
  FaPoll,
  FaSearch,
  FaChartBar,
} from "react-icons/fa";
import { HiOutlineDocumentArrowDown } from "react-icons/hi2";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import StatCard from "../components/StatCard"; // The new external component
import DashboardSkeleton from "../components/DashboardSkeleton"; // The new skeleton loader

function DashboardPage() {
  const { userData } = useAuthContext(); // Get user data for personalization
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStats({
        totalVoters: "1,234",
        activeUsers: "12",
        totalBooths: "3",
      });
      setLoading(false);
    }, 1200); // Simulated fetch latency for skeleton state

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Use the skeleton loader while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Use the user's name in the title, with a fallback
  const welcomeTitle = `Welcome, ${userData?.name || "Admin"}!`;

  return (
    <div>
      <PageHeader title={welcomeTitle}>
        Monitor field performance, voter engagement, and manage programs from a
        single control center.
      </PageHeader>

      {/* --- Stat Cards Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<FaUsers className="h-5 w-5" />}
          label="Total Voters"
          value={stats.totalVoters}
          color="blue"
        />
        <StatCard
          icon={<FaUserCheck className="h-5 w-5" />}
          label="Active Users"
          value={stats.activeUsers}
          color="green"
        />
        <StatCard
          icon={<FaPoll className="h-5 w-5" />}
          label="Total Booths"
          value={stats.totalBooths}
          color="indigo"
        />
      </div>

      {/* --- Quick Actions Section --- */}
      <div className="mt-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold text-content-primary sm:text-2xl">
            Operational Toolkit
          </h2>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Download weekly report
            <HiOutlineDocumentArrowDown
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link to="/find-voters" className="block">
            <Card className="h-full hover:border-indigo-200 hover:shadow-card">
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-content-primary">
                    <FaSearch className="h-4 w-4" /> Find Voters
                  </h3>
                  <p className="mt-2 text-sm text-content-secondary">
                    Search, filter, and view the complete voter list.
                  </p>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                  Average query response · 230ms
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/reports" className="block">
            <Card className="h-full hover:border-indigo-200 hover:shadow-card">
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-content-primary">
                    <FaChartBar className="h-4 w-4" /> Generate Reports
                  </h3>
                  <p className="mt-2 text-sm text-content-secondary">
                    Use advanced filters to generate specific voter reports.
                  </p>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                  Scheduled exports · Daily 18:00 IST
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

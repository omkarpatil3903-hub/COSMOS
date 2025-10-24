// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext"; // To get the user's name
import {
  FaUsers,
  FaUserCheck,
  FaPoll,
  FaSearch,
  FaChartBar,
} from "react-icons/fa";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import StatCard from "../components/StatCard"; // The new external component
import DashboardSkeleton from "../components/DashboardSkeleton"; // The new skeleton loader

function DashboardPage() {
  const { userData } = useAuthContext(); // Get user data for personalization
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data
  useEffect(() => {
    setTimeout(() => {
      setStats({
        totalVoters: "1,234",
        activeUsers: "12",
        totalBooths: "3",
      });
      setLoading(false);
    }, 1500); // Increased delay to better see skeleton
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
        Here's a summary of your workspace and quick access to your tools.
      </PageHeader>

      {/* --- Stat Cards Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<FaUsers size={24} />}
          label="Total Voters"
          value={stats.totalVoters}
          color="blue"
        />
        <StatCard
          icon={<FaUserCheck size={24} />}
          label="Active Users"
          value={stats.activeUsers}
          color="green"
        />
        <StatCard
          icon={<FaPoll size={24} />}
          label="Total Booths"
          value={stats.totalBooths}
          color="indigo"
        />
      </div>

      {/* --- Quick Actions Section --- */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/find-voters" className="block group">
            <Card>
              <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-3 group-hover:text-indigo-600 transition-colors">
                <FaSearch /> Find Voters
              </h3>
              <p className="mt-2 text-gray-600">
                Search, filter, and view the complete voter list.
              </p>
            </Card>
          </Link>
          <Link to="/reports" className="block group">
            <Card>
              <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-3 group-hover:text-indigo-600 transition-colors">
                <FaChartBar /> Generate Reports
              </h3>
              <p className="mt-2 text-gray-600">
                Use advanced filters to generate specific voter reports.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

// src/pages/ClientProjects.jsx
import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import { useAuthContext } from "../context/useAuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  FaProjectDiagram,
  FaCalendar,
  FaTasks,
  FaSearch,
} from "react-icons/fa";

export default function ClientProjects() {
  const { user, userData } = useAuthContext();
  const uid = user?.uid || userData?.uid;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "projects"), where("clientId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(
        snap.docs.map((d) => {
          const data = d.data();
          console.log("client project data ", data);
          return {
            id: d.id,
            ...data,
            startDate: data.startDate?.toDate
              ? data.startDate.toDate().toISOString().slice(0, 10)
              : data.startDate || "",
            endDate: data.endDate?.toDate
              ? data.endDate.toDate().toISOString().slice(0, 10)
              : data.endDate || "",
          };
        })
      );
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  // Filter projects by search term (client requested)
  const filteredProjects = projects.filter((project) => {
    if (!searchTerm) return true;
    const s = searchTerm.trim().toLowerCase();
    return (
      (project.name || project.projectName || "").toLowerCase().includes(s) ||
      (project.description || "").toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <p className="text-gray-600 mt-1">
          View and manage all your assigned projects
        </p>
      </div>

      {/* Search (client requested) */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FaProjectDiagram className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No projects found
            </h3>
            <p className="text-gray-600">
              No projects have been assigned to you yet
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="space-y-4">
                {/* Project Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {project.name ||
                        project.projectName ||
                        "Untitled Project"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Project ID: {project.id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      project.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : project.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : project.status === "On Hold"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {project.status || "Active"}
                  </span>
                </div>

                {/* Progress Bar */}
                {project.progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Project Objectives */}
                {project.objectives && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Project Objectives
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {project.objectives}
                    </p>
                  </div>
                )}

                {/* Project Goals */}
                {project.goals && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Project Goals
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {project.goals}
                    </p>
                  </div>
                )}

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {project.startDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaCalendar className="mr-2 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="font-medium">
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaCalendar className="mr-2 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="font-medium">
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Budget/Cost (if available) */}
                {project.budget && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-semibold text-gray-900">
                        ${project.budget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Project Manager/Contact */}
                {project.manager && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Project Manager</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {project.manager}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

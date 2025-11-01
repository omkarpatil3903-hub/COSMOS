import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/useAuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { FaProjectDiagram } from "react-icons/fa";

const EmployeeProjects = () => {
  const { user } = useAuthContext();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Get tasks assigned to this employee
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigneeId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => task.assigneeType === "user");
      setTasks(taskData);

      // Get unique project IDs from tasks
      const projectIds = [
        ...new Set(taskData.map((t) => t.projectId).filter(Boolean)),
      ];

      // Get projects
      if (projectIds.length > 0) {
        const projectsQuery = query(
          collection(db, "projects"),
          where("__name__", "in", projectIds)
        );

        const unsubProjects = onSnapshot(projectsQuery, (projectSnapshot) => {
          const projectData = projectSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProjects(projectData);
          setLoading(false);
        });

        return () => {
          unsubProjects();
          unsubTasks();
        };
      } else {
        setProjects([]);
        setLoading(false);
      }
    });

    return () => unsubTasks();
  }, [user]);

  const getProjectTasks = (projectId) => {
    return tasks.filter((t) => t.projectId === projectId);
  };

  const getProjectProgress = (projectId) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(
      (t) => t.status === "Done"
    ).length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Projects" description="Your assigned projects" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Projects"
        description="View projects you're working on"
        icon={<FaProjectDiagram />}
      />

      {projects.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            You are not assigned to any projects yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectTasks = getProjectTasks(project.id);
            const progress = getProjectProgress(project.id);
            const startDate =
              project.startDate?.toDate?.() || new Date(project.startDate);
            const endDate =
              project.endDate?.toDate?.() || new Date(project.endDate);

            return (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.projectName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {project.description || "No description"}
                    </p>
                  </div>

                  {/* Project Objectives */}
                  {project.objectives && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Objectives
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {project.objectives}
                      </p>
                    </div>
                  )}

                  {/* Project Goals */}
                  {project.goals && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Goals
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {project.goals}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-900">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                    <div>
                      <p className="text-gray-500">Your Tasks</p>
                      <p className="font-semibold text-gray-900">
                        {projectTasks.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Completed</p>
                      <p className="font-semibold text-green-600">
                        {projectTasks.filter((t) => t.status === "Done").length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>{startDate.toLocaleDateString()}</span>
                    <span>→</span>
                    <span>{endDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeProjects;

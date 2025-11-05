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

                  {/* OKRs (Objectives and Key Results) */}
                  {project.okrs && project.okrs.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        OKRs (Objectives & Key Results)
                      </p>
                      <div className="space-y-2">
                        {project.okrs.slice(0, 2).map((okr, index) => (
                          <div key={index} className="bg-gray-50 p-2 rounded">
                            <p className="text-xs font-medium text-gray-900 mb-1">
                              {index + 1}. {okr.objective || "No objective"}
                            </p>
                            {okr.keyResults && okr.keyResults.some((kr) => kr) && (
                              <ul className="ml-3 space-y-0.5">
                                {okr.keyResults.slice(0, 2).map((kr, krIndex) =>
                                  kr ? (
                                    <li
                                      key={krIndex}
                                      className="text-xs text-gray-600 flex items-start gap-1"
                                    >
                                      <span className="text-indigo-600">•</span>
                                      <span className="line-clamp-1">{kr}</span>
                                    </li>
                                  ) : null
                                )}
                              </ul>
                            )}
                          </div>
                        ))}
                        {project.okrs.length > 2 && (
                          <p className="text-xs text-gray-500 italic">
                            +{project.okrs.length - 2} more objective(s)
                          </p>
                        )}
                      </div>
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

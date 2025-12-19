import { useState, useMemo, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import {
  FaChevronRight,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaFlag,
  FaTimes,
} from "react-icons/fa";

// Utility function for progress color
const getProgressColor = (progress) => {
  if (progress === 0) return "bg-gray-400";
  if (progress < 30) return "bg-red-500";
  if (progress < 70) return "bg-yellow-500";
  if (progress < 100) return "bg-blue-500";
  return "bg-green-500";
};

export default function SevenStageProjectKanban({ projects, onUpdate }) {
  const [STAGES, setSTAGES] = useState([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [currentProgressPage, setCurrentProgressPage] = useState(0);
  const STAGES_PER_PAGE = 7;

  // Load pipeline stages from Firestore settings/projectValues
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        // Fetch from settings/projectValues document
        const settingsDocRef = doc(db, "settings", "project-levels");
        const settingsDoc = await getDoc(settingsDocRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();

          // Check if levels array exists in the document
          if (data.levels && Array.isArray(data.levels)) {
            // Map Firestore levels data to component format and sort by level number
            const stagesWithIcons = data.levels
              .filter((stage) => stage.level && stage.name) // Filter out invalid entries
              .sort((a, b) => {
                // Parse level as integer for proper numerical sorting
                const levelA = parseInt(a.level, 10);
                const levelB = parseInt(b.level, 10);
                return levelA - levelB;
              })
              .map((stage) => {
                const levelNum = parseInt(stage.level, 10);
                return {
                  id: stage.name, // Use name as ID for matching with project pipelineStage
                  label: stage.name, // Project level name from database
                  level: levelNum, // Parse as integer
                  description: `Level ${levelNum}`, // Use level as description
                  color: getColorForLevel(levelNum), // Assign color based on level
                  icon: getIconForStage(stage.name),
                };
              });

            setSTAGES(stagesWithIcons);
            console.log(
              "✅ Pipeline stages loaded from Firestore:",
              stagesWithIcons
            );
          } else {
            console.warn(
              "⚠️ No 'levels' array found in projectValues document"
            );
            setSTAGES(getDefaultStages());
            toast.error("Pipeline stages not configured in settings");
          }
        } else {
          console.warn("⚠️ settings/projectValues document does not exist");
          setSTAGES(getDefaultStages());
          toast.error("Pipeline stages not configured in settings");
        }
      } catch (error) {
        console.error("❌ Error loading pipeline stages:", error);
        toast.error("Failed to load pipeline stages");
        setSTAGES(getDefaultStages());
      } finally {
        setLoadingStages(false);
      }
    };

    loadPipelineStages();
  }, []);

  // Helper function to get color based on level number (1-indexed)
  const getColorForLevel = (level) => {
    const colors = [
      "bg-purple-500", // Level 1
      "bg-blue-500", // Level 2
      "bg-cyan-500", // Level 3
      "bg-indigo-500", // Level 4
      "bg-orange-500", // Level 5
      "bg-green-500", // Level 6
      "bg-emerald-500", // Level 7
      "bg-pink-500", // Level 8
      "bg-teal-500", // Level 9
      "bg-red-500", // Level 10
      "bg-amber-500", // Level 11
      "bg-lime-500", // Level 12
      "bg-sky-500", // Level 13
      "bg-violet-500", // Level 14
      "bg-fuchsia-500", // Level 15
      "bg-rose-500", // Level 16
      "bg-slate-500", // Level 17
      "bg-zinc-500", // Level 18
      "bg-stone-500", // Level 19
      "bg-neutral-500", // Level 20
    ];
    // level is 1-indexed, array is 0-indexed
    return colors[level - 1] || "bg-gray-500";
  };

  // Helper function to get icon based on stage name
  const getIconForStage = (stageName) => {
    const name = stageName.toLowerCase();

    // Map based on your screenshot levels
    if (name.includes("system") || name.includes("design")) {
      return <FaCheckCircle className="h-4 w-4" />;
    }
    if (name.includes("design") || name.includes("solution")) {
      return <FaEdit className="h-4 w-4" />;
    }
    if (name.includes("roadmap") || name.includes("plan")) {
      return <FaClock className="h-4 w-4" />;
    }
    if (name.includes("test") || name.includes("quality")) {
      return <FaFlag className="h-4 w-4" />;
    }
    if (name.includes("deploy") || name.includes("launch")) {
      return <FaCheckCircle className="h-4 w-4" />;
    }
    if (name.includes("deliver") || name.includes("complete")) {
      return <FaCheckCircle className="h-4 w-4" />;
    }

    // Default icon
    return <FaEye className="h-4 w-4" />;
  };

  // Default stages as fallback (properly ordered Level 1-7)
  const getDefaultStages = () => [
    {
      id: "Diagnose",
      label: "Diagnose",
      level: 1,
      description: "Level 1",
      color: "bg-purple-500",
      icon: <FaEye className="h-4 w-4" />,
    },
    {
      id: "Design Solution",
      label: "Design Solution",
      level: 2,
      description: "Level 2",
      color: "bg-blue-500",
      icon: <FaEdit className="h-4 w-4" />,
    },
    {
      id: "Roadmap",
      label: "Roadmap",
      level: 3,
      description: "Level 3",
      color: "bg-cyan-500",
      icon: <FaClock className="h-4 w-4" />,
    },
    {
      id: "System Designing",
      label: "System Designing",
      level: 4,
      description: "Level 4",
      color: "bg-indigo-500",
      icon: <FaCheckCircle className="h-4 w-4" />,
    },
    {
      id: "Testing",
      label: "Testing",
      level: 5,
      description: "Level 5",
      color: "bg-orange-500",
      icon: <FaFlag className="h-4 w-4" />,
    },
    {
      id: "Deployment",
      label: "Deployment",
      level: 6,
      description: "Level 6",
      color: "bg-green-500",
      icon: <FaCheckCircle className="h-4 w-4" />,
    },
    {
      id: "Delivered",
      label: "Delivered",
      level: 7,
      description: "Level 7",
      color: "bg-emerald-500",
      icon: <FaCheckCircle className="h-4 w-4" />,
    },
  ];

  // Group projects by pipeline stage from database
  const groupedProjects = useMemo(() => {
    if (!STAGES.length) return {};

    const groups = {};
    STAGES.forEach((stage) => {
      groups[stage.id] = projects.filter(
        (p) => (p.pipelineStage || STAGES[0]?.id || "Diagnose") === stage.id
      );
    });
    return groups;
  }, [projects, STAGES]);

  const move = async (project, direction) => {
    const idx = STAGES.findIndex(
      (s) => s.id === (project.pipelineStage || "Diagnose")
    );
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= STAGES.length) return;
    const newStage = STAGES[nextIdx].id;
    const subs = project.pipelineSubstages || {};
    const patch = {
      pipelineStage: newStage,
      pipelineUpdatedAt: new Date(),
    };
    if (!subs[newStage]) {
      patch[`pipelineSubstages.${newStage}`] = [];
    }
    try {
      await updateDoc(doc(db, "projects", project.id), patch);
      onUpdate?.(project.id, {
        pipelineStage: newStage,
        pipelineSubstages: { ...subs, [newStage]: subs[newStage] || [] },
      });
      toast.success(`Moved to ${newStage}`);
    } catch (e) {
      console.error("Stage update failed", e);
      toast.error("Failed to update stage");
    }
  };

  const [newSubstageName, setNewSubstageName] = useState({});

  const addSubstage = async (project) => {
    const name = (newSubstageName[project.id] || "").trim();
    if (!name) return;
    const subs = project.pipelineSubstages || {};
    const stageKey = project.pipelineStage;
    const newEntry = {
      id: Date.now().toString(),
      name,
      status: "open",
      createdAt: Date.now(),
      completedAt: null,
    };
    try {
      await updateDoc(doc(db, "projects", project.id), {
        [`pipelineSubstages.${stageKey}`]: [
          ...(subs[stageKey] || []),
          newEntry,
        ],
      });
      onUpdate?.(project.id, {
        pipelineSubstages: {
          ...subs,
          [stageKey]: [...(subs[stageKey] || []), newEntry],
        },
      });
      setNewSubstageName((prev) => ({ ...prev, [project.id]: "" }));
      toast.success("Substage added");
    } catch (e) {
      console.error("Add substage failed", e);
      toast.error("Failed to add substage");
    }
  };

  const toggleSubstage = async (project, sub) => {
    const subs = project.pipelineSubstages || {};
    const stageKey = project.pipelineStage;
    const updated = (subs[stageKey] || []).map((s) =>
      s.id === sub.id
        ? {
          ...s,
          status: s.status === "open" ? "done" : "open",
          completedAt: s.status === "open" ? Date.now() : null,
        }
        : s
    );
    try {
      await updateDoc(doc(db, "projects", project.id), {
        [`pipelineSubstages.${stageKey}`]: updated,
      });
      onUpdate?.(project.id, {
        pipelineSubstages: { ...subs, [stageKey]: updated },
      });
    } catch (e) {
      console.error("Toggle substage failed", e);
      toast.error("Failed to update substage");
    }
  };

  // Calculate visible stages for progress bar
  const totalProgressPages = Math.ceil(STAGES.length / STAGES_PER_PAGE);
  const visibleProgressStages = STAGES.slice(
    currentProgressPage * STAGES_PER_PAGE,
    (currentProgressPage + 1) * STAGES_PER_PAGE
  );

  const handlePrevProgressPage = () => {
    setCurrentProgressPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextProgressPage = () => {
    setCurrentProgressPage((prev) =>
      Math.min(totalProgressPages - 1, prev + 1)
    );
  };

  if (loadingStages) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading pipeline stages...</p>
        </div>
      </div>
    );
  }

  if (!STAGES.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No pipeline stages configured. Please set up pipeline stages in
          settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage Progress Bar with Pagination */}
      <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg border border-gray-200 [.dark_&]:border-white/10 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300">
            Pipeline Progress
          </h3>
          {STAGES.length > STAGES_PER_PAGE && (
            <div className="text-xs text-gray-500 [.dark_&]:text-gray-400">
              Showing {currentProgressPage * STAGES_PER_PAGE + 1}-
              {Math.min(
                (currentProgressPage + 1) * STAGES_PER_PAGE,
                STAGES.length
              )}{" "}
              of {STAGES.length} levels
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Left Arrow */}
          {STAGES.length > STAGES_PER_PAGE && (
            <button
              onClick={handlePrevProgressPage}
              disabled={currentProgressPage === 0}
              className={`flex-shrink-0 p-2 rounded-lg transition-all ${currentProgressPage === 0
                ? "text-gray-300 [.dark_&]:text-gray-600 cursor-not-allowed"
                : "text-gray-600 [.dark_&]:text-gray-400 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 hover:text-gray-900 [.dark_&]:hover:text-white"
                }`}
              title="Previous stages"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Progress Stages */}
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {visibleProgressStages.map((stage, idx) => {
              const count = groupedProjects[stage.id]?.length || 0;
              const isActive = count > 0;

              // Truncate label if longer than 20 characters
              const displayLabel =
                stage.label.length > 20
                  ? `${stage.label.substring(0, 20)}...`
                  : stage.label;

              return (
                <div key={stage.id} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-full h-2 rounded-full transition-colors ${isActive ? stage.color : "bg-gray-200 [.dark_&]:bg-white/10"
                        }`}
                    />
                    {idx < visibleProgressStages.length - 1 && (
                      <FaChevronRight className="text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className="text-xs font-medium text-gray-900 [.dark_&]:text-white px-1 truncate"
                      title={stage.label}
                    >
                      {displayLabel}
                    </p>
                    <p className="text-xs text-gray-500 [.dark_&]:text-gray-400 mt-0.5">
                      Level {stage.level}
                    </p>
                    <p className="text-lg font-bold text-gray-900 [.dark_&]:text-white mt-1">
                      {count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Arrow */}
          {STAGES.length > STAGES_PER_PAGE && (
            <button
              onClick={handleNextProgressPage}
              disabled={currentProgressPage === totalProgressPages - 1}
              className={`flex-shrink-0 p-2 rounded-lg transition-all ${currentProgressPage === totalProgressPages - 1
                ? "text-gray-300 [.dark_&]:text-gray-600 cursor-not-allowed"
                : "text-gray-600 [.dark_&]:text-gray-400 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 hover:text-gray-900 [.dark_&]:hover:text-white"
                }`}
              title="Next stages"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Page Indicators (dots) */}
        {STAGES.length > STAGES_PER_PAGE && totalProgressPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {Array.from({ length: totalProgressPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentProgressPage(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentProgressPage
                  ? "bg-indigo-600 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
                  }`}
                title={`Page ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Stages - All in one row with horizontal scrolling */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-min">
          {STAGES.map((stage) => {
            const stageProjects = groupedProjects[stage.id] || [];

            // Get smooth solid background color based on stage color
            const getBgColor = (color) => {
              const colorMap = {
                "bg-purple-500": "bg-purple-50 [.dark_&]:bg-purple-500/10",
                "bg-blue-500": "bg-blue-50 [.dark_&]:bg-blue-500/10",
                "bg-cyan-500": "bg-cyan-50 [.dark_&]:bg-cyan-500/10",
                "bg-indigo-500": "bg-indigo-50 [.dark_&]:bg-indigo-500/10",
                "bg-orange-500": "bg-orange-50 [.dark_&]:bg-orange-500/10",
                "bg-green-500": "bg-green-50 [.dark_&]:bg-green-500/10",
                "bg-emerald-500": "bg-emerald-50 [.dark_&]:bg-emerald-500/10",
                "bg-pink-500": "bg-pink-50 [.dark_&]:bg-pink-500/10",
                "bg-teal-500": "bg-teal-50 [.dark_&]:bg-teal-500/10",
                "bg-red-500": "bg-red-50 [.dark_&]:bg-red-500/10",
                "bg-amber-500": "bg-amber-50 [.dark_&]:bg-amber-500/10",
                "bg-lime-500": "bg-lime-50 [.dark_&]:bg-lime-500/10",
                "bg-sky-500": "bg-sky-50 [.dark_&]:bg-sky-500/10",
                "bg-violet-500": "bg-violet-50 [.dark_&]:bg-violet-500/10",
                "bg-fuchsia-500": "bg-fuchsia-50 [.dark_&]:bg-fuchsia-500/10",
                "bg-rose-500": "bg-rose-50 [.dark_&]:bg-rose-500/10",
                "bg-slate-500": "bg-slate-50 [.dark_&]:bg-slate-500/10",
                "bg-zinc-500": "bg-zinc-50 [.dark_&]:bg-zinc-500/10",
                "bg-stone-500": "bg-stone-50 [.dark_&]:bg-stone-500/10",
                "bg-neutral-500": "bg-neutral-50 [.dark_&]:bg-neutral-500/10",
              };
              return colorMap[color] || "bg-gray-50 [.dark_&]:bg-white/5";
            };

            // Get faint/light border color based on stage color
            const getBorderColor = (color) => {
              const borderMap = {
                "bg-purple-500": "border-purple-200 [.dark_&]:border-purple-500/20",
                "bg-blue-500": "border-blue-200 [.dark_&]:border-blue-500/20",
                "bg-cyan-500": "border-cyan-200 [.dark_&]:border-cyan-500/20",
                "bg-indigo-500": "border-indigo-200 [.dark_&]:border-indigo-500/20",
                "bg-orange-500": "border-orange-200 [.dark_&]:border-orange-500/20",
                "bg-green-500": "border-green-200 [.dark_&]:border-green-500/20",
                "bg-emerald-500": "border-emerald-200 [.dark_&]:border-emerald-500/20",
                "bg-pink-500": "border-pink-200 [.dark_&]:border-pink-500/20",
                "bg-teal-500": "border-teal-200 [.dark_&]:border-teal-500/20",
                "bg-red-500": "border-red-200 [.dark_&]:border-red-500/20",
                "bg-amber-500": "border-amber-200 [.dark_&]:border-amber-500/20",
                "bg-lime-500": "border-lime-200 [.dark_&]:border-lime-500/20",
                "bg-sky-500": "border-sky-200 [.dark_&]:border-sky-500/20",
                "bg-violet-500": "border-violet-200 [.dark_&]:border-violet-500/20",
                "bg-fuchsia-500": "border-fuchsia-200 [.dark_&]:border-fuchsia-500/20",
                "bg-rose-500": "border-rose-200 [.dark_&]:border-rose-500/20",
                "bg-slate-500": "border-slate-200 [.dark_&]:border-slate-500/20",
                "bg-zinc-500": "border-zinc-200 [.dark_&]:border-zinc-500/20",
                "bg-stone-500": "border-stone-200 [.dark_&]:border-stone-500/20",
                "bg-neutral-500": "border-neutral-200 [.dark_&]:border-neutral-500/20",
              };
              return borderMap[color] || "border-gray-200 [.dark_&]:border-white/10";
            };

            return (
              <div
                key={stage.id}
                className={`rounded-lg border-2 ${getBorderColor(
                  stage.color
                )} overflow-hidden flex flex-col flex-shrink-0 ${getBgColor(
                  stage.color
                )}`}
                style={{ width: "373px", minWidth: "373px" }}
              >
                {/* Stage Header - No border, merged with body background */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`flex-shrink-0 ${stage.color.replace(
                          "bg-",
                          "text-"
                        )}`}
                      >
                        {stage.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-semibold text-gray-900 [.dark_&]:text-white text-base leading-tight truncate overflow-hidden text-ellipsis whitespace-nowrap"
                          title={stage.label}
                        >
                          {stage.label}
                        </h3>
                      </div>
                    </div>
                    <span className="bg-white/60 [.dark_&]:bg-white/10 backdrop-blur-sm text-gray-900 [.dark_&]:text-white px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2 border border-gray-300/50 [.dark_&]:border-white/10">
                      {stageProjects.length}
                    </span>
                  </div>
                </div>

                {/* Projects List */}
                <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto max-h-[600px]">
                  {stageProjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="mx-auto h-8 w-8 mb-2 opacity-50 flex items-center justify-center">
                        {stage.icon}
                      </div>
                      <p className="text-xs">No projects</p>
                    </div>
                  ) : (
                    stageProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        stage={stage}
                        onUpdate={onUpdate}
                        allStages={STAGES}
                        getProgressColor={getProgressColor}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div >
  );
}

// ProjectCard component
function ProjectCard({
  project,
  stage,
  onUpdate,
  allStages,
  getProgressColor,
}) {
  const [showSubstageModal, setShowSubstageModal] = useState(false);

  // Define substages for each stage
  const stageSubs = {
    Diagnose: ["Discovery", "Analysis", "Documentation"],
    "Design Solution": ["Planning", "Architecture", "Wireframes"],
    Roadmap: ["Timeline", "Milestones", "Resource Planning"],
    "System Designing": ["Development", "Implementation", "Integration"],
    Testing: ["QA", "UAT", "Bug Fixes"],
    Deployment: ["Staging", "Production", "Go-Live"],
    Delivered: ["Handover", "Training", "Closure"],
  };

  // Get current substages for this stage - ensure it's always an array
  const currentSubstages = stageSubs[stage.id] || stageSubs[stage.label] || [];
  const completedSubstages = project.pipelineSubstages?.[stage.id] || [];

  const handleStageChange = async (newStageId) => {
    try {
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, {
        pipelineStage: newStageId,
      });

      if (onUpdate) {
        onUpdate(project.id, { pipelineStage: newStageId });
      }

      toast.success("Project stage updated");
    } catch (error) {
      console.error("Error updating project stage:", error);
      toast.error("Failed to update project stage");
    }
  };

  const toggleSubstage = async (substage) => {
    try {
      const projectRef = doc(db, "projects", project.id);
      const currentCompleted = project.pipelineSubstages?.[stage.id] || {};

      const newCompleted = currentCompleted.includes(substage)
        ? currentCompleted.filter((s) => s !== substage)
        : [...currentCompleted, substage];

      await updateDoc(projectRef, {
        [`pipelineSubstages.${stage.id}`]: newCompleted,
      });

      if (onUpdate) {
        onUpdate(project.id, {
          pipelineSubstages: {
            ...project.pipelineSubstages,
            [stage.id]: newCompleted,
          },
        });
      }

      toast.success("Substage updated");
    } catch (error) {
      console.error("Error updating substage:", error);
      toast.error("Failed to update substage");
    }
  };

  return (
    <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-3 shadow-sm hover:shadow-lg transition-all duration-300 border border-transparent [.dark_&]:border-white/10">
      {/* Project Name */}
      <h4
        className="font-medium text-gray-900 [.dark_&]:text-white mb-2 truncate overflow-hidden text-ellipsis whitespace-nowrap"
        title={project.projectName}
        style={{ maxWidth: "100%" }}
      >
        {project.projectName}
      </h4>

      {/* Client Name */}
      <p
        className="text-xs text-gray-600 [.dark_&]:text-gray-400 mb-2 truncate overflow-hidden text-ellipsis whitespace-nowrap"
        title={project.clientName || "N/A"}
      >
        Client: {project.clientName || "N/A"}
      </p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 [.dark_&]:text-gray-400 mb-1">
          <span>Progress</span>
          <span className="font-medium">{project.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 [.dark_&]:bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
              project.progress || 0
            )}`}
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Substages */}
      {Array.isArray(currentSubstages) && currentSubstages.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 [.dark_&]:text-gray-300">Substages</span>
            <button
              onClick={() => setShowSubstageModal(true)}
              className="text-xs text-indigo-600 [.dark_&]:text-indigo-400 hover:text-indigo-700 [.dark_&]:hover:text-indigo-300"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentSubstages.slice(0, 2).map((substage, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-0.5 rounded ${completedSubstages.includes(substage)
                  ? "bg-green-100 text-green-700 [.dark_&]:bg-green-500/20 [.dark_&]:text-green-300"
                  : "bg-gray-100 text-gray-600 [.dark_&]:bg-white/10 [.dark_&]:text-gray-400"
                  }`}
              >
                {substage}
              </span>
            ))}
            {currentSubstages.length > 2 && (
              <span className="text-xs text-gray-500 [.dark_&]:text-gray-400">
                +{currentSubstages.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stage Selector */}
      <select
        value={project.pipelineStage || stage.id}
        onChange={(e) => handleStageChange(e.target.value)}
        className="w-full text-xs border border-gray-300 [.dark_&]:border-white/10 rounded px-2 py-1 mt-2 bg-white [.dark_&]:bg-[#1F2234] text-gray-900 [.dark_&]:text-white focus:ring-indigo-500 focus:border-indigo-500"
      >
        {allStages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Substage Modal */}
      {showSubstageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white [.dark_&]:bg-[#181B2A] rounded-lg p-6 max-w-md w-full border border-gray-200 [.dark_&]:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 [.dark_&]:text-white">
                {stage.label} - Substages
              </h3>
              <button
                onClick={() => setShowSubstageModal(false)}
                className="text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2">
              {Array.isArray(currentSubstages) &&
                currentSubstages.map((substage, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 [.dark_&]:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={completedSubstages.includes(substage)}
                      onChange={() => toggleSubstage(substage)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-white [.dark_&]:bg-[#1F2234] border-gray-300 [.dark_&]:border-white/10"
                    />
                    <span className="text-sm text-gray-700 [.dark_&]:text-gray-300">{substage}</span>
                  </label>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSubstageModal(false)}
                className="px-4 py-2 bg-indigo-600 [.dark_&]:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 [.dark_&]:hover:bg-indigo-400 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

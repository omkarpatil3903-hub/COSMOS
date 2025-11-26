import { useMemo, useCallback, useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import {
  FaChevronRight,
  FaChevronLeft,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import toast from "react-hot-toast";

const STAGES = [
  "Diagnose",
  "Design Solution",
  "Roadmap",
  "System Designing",
  "Monitor and Review",
  "Optimization",
  "Closure or Continuity",
];

export default function SevenStageProjectKanban({
  projects = [],
  onLocalUpdate,
  onView,
  onEdit,
  onDelete,
}) {
  const [openSubs, setOpenSubs] = useState({});
  const [newSubstageName, setNewSubstageName] = useState({});

  const columns = useMemo(() => {
    const map = {};
    STAGES.forEach((s) => (map[s] = []));
    projects.forEach((p) => {
      const stage = STAGES.includes(p.pipelineStage)
        ? p.pipelineStage
        : "Diagnose";
      map[stage].push(p);
    });
    return map;
  }, [projects]);

  const move = useCallback(
    async (project, direction) => {
      const idx = STAGES.indexOf(project.pipelineStage || "Diagnose");
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= STAGES.length) return;
      const newStage = STAGES[nextIdx];
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
        onLocalUpdate?.(project.id, {
          pipelineStage: newStage,
          pipelineSubstages: { ...subs, [newStage]: subs[newStage] || [] },
        });
        toast.success(`Moved to ${newStage}`);
      } catch (e) {
        console.error("Stage update failed", e);
        toast.error("Failed to update stage");
      }
    },
    [onLocalUpdate]
  );

  const addSubstage = useCallback(
    async (project) => {
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
        onLocalUpdate?.(project.id, {
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
    },
    [newSubstageName, onLocalUpdate]
  );

  const toggleSubstage = useCallback(
    async (project, sub) => {
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
        onLocalUpdate?.(project.id, {
          pipelineSubstages: { ...subs, [stageKey]: updated },
        });
      } catch (e) {
        console.error("Toggle substage failed", e);
        toast.error("Failed to update substage");
      }
    },
    [onLocalUpdate]
  );

  const getProgressColor = (progress) => {
    if (progress === 0) return "bg-gray-400";
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    if (progress < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStageColor = (stage) => {
    const colors = {
      Diagnose: "border-purple-300 bg-purple-50",
      "Design Solution": "border-blue-300 bg-blue-50",
      Roadmap: "border-cyan-300 bg-cyan-50",
      "System Designing": "border-indigo-300 bg-indigo-50",
      "Monitor and Review": "border-yellow-300 bg-yellow-50",
      Optimization: "border-orange-300 bg-orange-50",
      "Closure or Continuity": "border-green-300 bg-green-50",
    };
    return colors[stage] || "border-gray-300 bg-gray-50";
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
      {STAGES.map((stage, stageIdx) => (
        <div
          key={stage}
          className={`flex-shrink-0 w-72 rounded-lg border-2 ${getStageColor(
            stage
          )} p-4 flex flex-col snap-start`}
        >
          {/* Column Header */}
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between flex-shrink-0 text-sm">
            {stage}
            <span className="text-xs bg-white px-2 py-1 rounded-full shadow-sm">
              {columns[stage].length}
            </span>
          </h3>

          {/* Cards Container */}
          <div
            className={`space-y-3 flex-1 ${
              columns[stage].length > 4
                ? "max-h-[600px] overflow-y-auto pr-1"
                : ""
            }`}
          >
            {columns[stage].map((p) => {
              const stageSubs = p.pipelineSubstages?.[stage] || [];
              const open = openSubs[p.id];
              const doneCount = stageSubs.filter(
                (s) => s.status === "done"
              ).length;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    {p.projectName || p.name}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Client: {p.clientName || "—"}
                  </p>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{p.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                          p.progress
                        )}`}
                        style={{ width: `${p.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    <div>Start: {p.startDate || "—"}</div>
                    <div>End: {p.endDate || "—"}</div>
                    {p.okrs?.[0]?.objective && (
                      <div className="mt-1 text-gray-600">
                        <strong>Obj:</strong>{" "}
                        {p.okrs[0].objective.substring(0, 25)}...
                      </div>
                    )}
                  </div>

                  {/* Substages Section */}
                  <div className="mb-2 pb-2 border-b border-gray-100">
                    <button
                      onClick={() =>
                        setOpenSubs((o) => ({ ...o, [p.id]: !o[p.id] }))
                      }
                      className="w-full text-[10px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 font-medium text-gray-700 flex items-center justify-between"
                    >
                      <span>
                        {open
                          ? "Hide Substages"
                          : `Substages (${stageSubs.length})`}
                      </span>
                      {stageSubs.length > 0 && (
                        <span className="text-green-600">
                          {doneCount}/{stageSubs.length}
                        </span>
                      )}
                    </button>

                    {open && (
                      <div className="mt-2 space-y-2">
                        <ul className="space-y-1">
                          {stageSubs.map((sub) => (
                            <li
                              key={sub.id}
                              className="flex items-center justify-between bg-gray-50 rounded border px-2 py-1"
                            >
                              <span
                                className={`text-[10px] truncate flex-1 ${
                                  sub.status === "done"
                                    ? "line-through text-green-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {sub.name}
                              </span>
                              <button
                                onClick={() => toggleSubstage(p, sub)}
                                className={`text-[9px] px-1.5 py-0.5 rounded ml-2 ${
                                  sub.status === "done"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {sub.status === "done" ? "✓" : "○"}
                              </button>
                            </li>
                          ))}
                          {stageSubs.length === 0 && (
                            <li className="text-[10px] italic text-gray-400 px-2 py-1">
                              No substages yet
                            </li>
                          )}
                        </ul>
                        <div className="flex gap-1">
                          <input
                            value={newSubstageName[p.id] || ""}
                            onChange={(e) =>
                              setNewSubstageName((ns) => ({
                                ...ns,
                                [p.id]: e.target.value,
                              }))
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter") addSubstage(p);
                            }}
                            placeholder="New substage"
                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-[10px] focus:border-indigo-400 focus:outline-none"
                            spellCheck="true"
                          />
                          <button
                            onClick={() => addSubstage(p)}
                            className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onView?.(p.id)}
                        className="p-1.5 rounded text-indigo-600 hover:bg-indigo-100"
                        title="View"
                      >
                        <FaEye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onEdit?.(p.id)}
                        className="p-1.5 rounded text-yellow-600 hover:bg-yellow-100"
                        title="Edit"
                      >
                        <FaEdit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDelete?.(p.id)}
                        className="p-1.5 rounded text-red-600 hover:bg-red-100"
                        title="Delete"
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => move(p, -1)}
                        disabled={stageIdx === 0}
                        className="disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded text-gray-600 hover:bg-gray-100"
                        title="Previous stage"
                      >
                        <FaChevronLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => move(p, +1)}
                        disabled={stageIdx === STAGES.length - 1}
                        className="disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded text-indigo-600 hover:bg-indigo-100"
                        title="Next stage"
                      >
                        <FaChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {columns[stage].length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                No projects
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

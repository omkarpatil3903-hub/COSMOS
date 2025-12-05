import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaPlus,
  FaTrash,
  FaFileAlt,
  FaSpinner,
  FaSave,
  FaDownload,
  FaPrint,
  FaUndo,
  FaShareAlt,
  FaFilePdf,
  FaEllipsisV,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// ---------- Utility: Rule-based notes generator (NO AI) ----------
function toLines(text) {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function bulletize(lines) {
  if (!lines.length) return "• (no points provided)";
  return lines.map((l) => `• ${l}`).join("<br/>");
}

function detectKeywords(topic, linesLower) {
  const s = `${topic} ${linesLower.join(" ")}`.toLowerCase();

  return {
    isUI: /ui|ux|design|responsive|layout|color|contrast/.test(s),
    isAPI: /api|endpoint|integration|backend|server/.test(s),
    isDelay: /delay|blocked|blocker|hold|waiting|pending|postpone/.test(s),
    isTesting: /test|qa|verify|bug|issue|defect|regression/.test(s),
    isDeploy: /deploy|release|prod|production|server|build/.test(s),
    isPlan: /plan|roadmap|timeline|milestone|phase/.test(s),
    isClient: /client|stakeholder|feedback|review/.test(s),
    isData: /data|db|database|migration|etl|import|export/.test(s),
  };
}

function decisionsFromFlags(flags) {
  const out = [];
  if (flags.isDelay)
    out.push("• Blockers highlighted; owners assigned to unblock.");
  if (flags.isAPI)
    out.push("• Critical API items prioritized for the next cycle.");
  if (flags.isUI) out.push("• UI refinement approved for upcoming sprint.");
  if (flags.isTesting)
    out.push("• Identified defects to be triaged and fixed before next build.");
  if (flags.isDeploy) out.push("• Release to proceed after sanity checks.");
  if (flags.isPlan) out.push("• Timeline to be updated with new milestones.");
  if (flags.isClient)
    out.push("• Client feedback to be incorporated as agreed.");
  if (flags.isData)
    out.push("• Data handling approach approved with minor revisions.");
  if (!out.length)
    out.push("• No final decision; items carried forward for next review.");
  return out.join("<br/>");
}

function nextStepsFromFlags(flags) {
  const steps = [];
  if (flags.isAPI)
    steps.push(
      "• Backend/Integration team to finalize endpoints and share specs."
    );
  if (flags.isUI)
    steps.push(
      "• Design/Frontend to implement UI fixes and validate responsiveness."
    );
  if (flags.isTesting)
    steps.push("• QA to prepare regression suite and verify fixes.");
  if (flags.isDeploy)
    steps.push("• DevOps to prepare deployment checklist and rollback plan.");
  if (flags.isPlan)
    steps.push("• PM to circulate updated plan with owners and dates.");
  if (flags.isClient)
    steps.push("• Schedule follow-up review with client for sign-off.");
  if (flags.isData)
    steps.push("• DB team to validate migrations and backup strategy.");
  if (!steps.length)
    steps.push("• Owners to execute agreed tasks before the next meeting.");
  return steps.join("<br/>");
}

function generateStructuredNotes(topic, rawNotes) {
  const lines = toLines(rawNotes);
  const linesLower = lines.map((l) => l.toLowerCase());
  const flags = detectKeywords(topic, linesLower);

  const summary =
    "• Discussion held to review status, identify issues, and agree on actions.";
  const keyPoints = bulletize(lines);
  const decisions = decisionsFromFlags(flags);
  const nextSteps = nextStepsFromFlags(flags);

  return `
<b>Summary:</b><br/>
${summary}<br/><br/>
<b>Key Points:</b><br/>
${keyPoints}<br/><br/>
<b>Decisions Taken:</b><br/>
${decisions}<br/><br/>
<b>Next Steps:</b><br/>
${nextSteps}
  `.trim();
}

export default function MomGeneratorPro() {
  // Reference data
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Meeting meta
  const [projectId, setProjectId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");
  const [meetingVenue, setMeetingVenue] = useState("");
  const [attendees, setAttendees] = useState([]); // userIds - Internal
  const [externalAttendees, setExternalAttendees] = useState(""); // Comma-separated names
  const [momPreparedBy, setMomPreparedBy] = useState("");

  // Versioning
  const [momVersion, setMomVersion] = useState(1);

  // Agenda / Discussions (topic + REQUIRED notes)
  const [inputDiscussions, setInputDiscussions] = useState([]);
  const [newDiscussionTopic, setNewDiscussionTopic] = useState("");
  const [newDiscussionNotes, setNewDiscussionNotes] = useState("");

  // Action items
  const [inputActionItems, setInputActionItems] = useState([]);
  const [newActionTask, setNewActionTask] = useState("");
  const [newActionPerson, setNewActionPerson] = useState(""); // Now stores text instead of userId
  const [newActionDeadline, setNewActionDeadline] = useState("");

  // Generated output (no AI)
  const [discussions, setDiscussions] = useState([]); // [{topic, notes(html)}]
  const [actionItems, setActionItems] = useState([]); // mapped + light polish

  // UI
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Load Projects
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "projects"), orderBy("projectName", "asc")),
      (snap) => {
        setProjects(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().projectName || "Unnamed Project",
          }))
        );
      }
    );
    return () => unsub();
  }, []);

  // Load Users
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), orderBy("name", "asc")),
      (snap) => {
        setUsers(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name || "Unknown User",
          }))
        );
      }
    );
    return () => unsub();
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Version fetch per project
  useEffect(() => {
    const fetchNextVersion = async () => {
      if (!projectId) {
        setMomVersion(1);
        return;
      }
      try {
        const qv = query(
          collection(db, "moms"),
          where("projectId", "==", projectId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(qv);
        if (!snap.empty) {
          const last = snap.docs[0].data();
          const prev = Number(last?.momVersion || 0);
          setMomVersion(isNaN(prev) ? 1 : prev + 1);
        } else {
          setMomVersion(1);
        }
      } catch (e) {
        console.error(e);
        setMomVersion(1);
      }
    };
    fetchNextVersion();
  }, [projectId]);

  // Helpers
  const toggleAttendee = (userId) => {
    setAttendees((prev) =>
      prev.includes(userId)
        ? prev.filter((i) => i !== userId)
        : [...prev, userId]
    );
  };

  const addDiscussion = () => {
    if (!newDiscussionTopic.trim())
      return toast.error("Enter discussion topic");
    if (!newDiscussionNotes.trim())
      return toast.error("Enter notes for the topic (notes are required)");

    setInputDiscussions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        topic: newDiscussionTopic.trim(),
        notes: newDiscussionNotes.trim(), // REQUIRED
      },
    ]);
    setNewDiscussionTopic("");
    setNewDiscussionNotes("");
  };

  const removeDiscussion = (id) => {
    setInputDiscussions(inputDiscussions.filter((d) => d.id !== id));
  };

  const addActionItem = () => {
    if (!newActionTask.trim()) return toast.error("Enter task");
    if (!newActionPerson.trim())
      return toast.error("Enter responsible person name");
    if (!newActionDeadline) return toast.error("Select deadline");

    setInputActionItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        task: newActionTask.trim(),
        responsiblePerson: newActionPerson.trim(), // Direct name
        deadline: newActionDeadline, // ISO
      },
    ]);
    setNewActionTask("");
    setNewActionPerson("");
    setNewActionDeadline("");
  };

  const removeActionItem = (id) => {
    setInputActionItems(inputActionItems.filter((a) => a.id !== id));
  };

  // DnD reordering
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    if (type === "DISCUSSIONS") {
      setInputDiscussions((prev) =>
        reorder(prev, source.index, destination.index)
      );
    } else if (type === "ACTIONS") {
      setInputActionItems((prev) =>
        reorder(prev, source.index, destination.index)
      );
    }
  };

  // --------- GENERATE (No AI) ----------
  const generateMom = async () => {
    if (!projectId) return toast.error("Select a project");
    if (!meetingDate) return toast.error("Enter meeting date");
    if (!attendees.length) return toast.error("Select at least one attendee");
    if (!inputDiscussions.length)
      return toast.error("Add at least one discussion topic");
    // Ensure notes are present for all topics (mandatory)
    const invalid = inputDiscussions.find((d) => !d.notes?.trim());
    if (invalid) return toast.error(`Notes required for: "${invalid.topic}"`);
    if (!inputActionItems.length)
      return toast.error("Add at least one action item");

    setLoading(true);
    try {
      // Build structured "discussions" using rule-based generator
      const builtDiscussions = inputDiscussions.map((d) => ({
        topic: d.topic,
        notes: generateStructuredNotes(d.topic, d.notes),
      }));

      // Lightly polish task wording (first letter uppercase + end without period normalization)
      const polish = (task) => {
        const t = task.trim();
        const cap = t.charAt(0).toUpperCase() + t.slice(1);
        return cap.replace(/\.+$/, "");
      };

      const builtActions = inputActionItems.map((a) => ({
        task: polish(a.task),
        responsiblePerson: a.responsiblePerson,
        responsiblePersonId: a.responsiblePersonId,
        deadline: a.deadline,
      }));

      setDiscussions(builtDiscussions);
      setActionItems(builtActions);
      setIsGenerated(true);
      toast.success("MOM generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate MOM");
    } finally {
      setLoading(false);
    }
  };

  // Save with versioning
  const saveMom = async () => {
    if (!isGenerated) return toast.error("Generate MOM first");
    try {
      await addDoc(collection(db, "moms"), {
        projectId,
        projectName: selectedProject?.name || "",
        momVersion,
        meetingDate,
        meetingStartTime,
        meetingEndTime,
        meetingVenue,
        attendees,
        externalAttendees,
        momPreparedBy,
        inputDiscussions,
        inputActionItems,
        discussions,
        actionItems,
        createdAt: Timestamp.now(),
      });
      toast.success(`MOM saved (v${momVersion})`);
      setMomVersion((v) => v + 1);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };

  // TXT download
  const downloadMomTxt = () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    const internalAttendeeNames = attendees
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    let content = `Minutes of Meeting (v${momVersion})\n\n`;
    content += `Project: ${selectedProject?.name || "N/A"}\n`;
    content += `Meeting Date & Time: ${meetingDate}${
      meetingStartTime ? ` ${meetingStartTime} to ${meetingEndTime}` : ""
    }\n`;
    content += `Venue: ${meetingVenue || "N/A"}\n`;
    content += `Internal Attendees: ${internalAttendeeNames || "N/A"}\n`;
    if (externalAttendees.trim()) {
      content += `External Attendees: ${externalAttendees}\n`;
    }
    content += `MoM Prepared by: ${momPreparedBy || "N/A"}\n\n`;

    content += `Meeting Agenda:\n`;
    inputDiscussions.forEach((d) => (content += `• ${d.topic}\n`));

    content += `\nDiscussion:\n`;
    discussions.forEach((d) => {
      content += `\n${d.topic}\n`;
      content +=
        d.notes.replace(/<br\/?>/g, "\n").replace(/<[^>]+>/g, "") + "\n";
    });

    content += `\nNext Action Plan:\n`;
    actionItems.forEach((a) => {
      content += `- ${a.task} | ${a.responsiblePerson} | ${a.deadline}\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MOM_${
      selectedProject?.name || "Project"
    }_${meetingDate}_v${momVersion}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded .txt");
  };

  // PDF export (html2pdf.js via CDN)
  const ensureHtml2Pdf = useCallback(async () => {
    if (window.html2pdf) return window.html2pdf;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("#html2pdf-cdn");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.html2pdf));
        existing.addEventListener("error", () =>
          reject(new Error("html2pdf failed to load"))
        );
        if (window.html2pdf) resolve(window.html2pdf);
        return;
      }
      const script = document.createElement("script");
      script.id = "html2pdf-cdn";
      script.src =
        "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => reject(new Error("html2pdf failed to load"));
      document.body.appendChild(script);
    });
  }, []);

  const exportPDF = async () => {
    if (!isGenerated) return toast.error("Generate MOM first");
    try {
      const html2pdf = await ensureHtml2Pdf();
      const element = document.querySelector(".mom-document");
      const filename = `MOM_${
        selectedProject?.name || "Project"
      }_${meetingDate}_v${momVersion}.pdf`;
      html2pdf()
        .from(element)
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed");
    }
  };

  // Share (Web Share API or mailto)
  const shareMom = () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    const projectName = selectedProject?.name || "Project";
    const title = `MoM v${momVersion} – ${projectName} (${meetingDate})`;

    const internalAttendeeNames = attendees
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    let text = `${title}\n\n`;
    text += `Date & Time: ${meetingDate}${
      meetingStartTime ? ` ${meetingStartTime} to ${meetingEndTime}` : ""
    }\nVenue: ${meetingVenue || "N/A"}\nInternal Attendees: ${
      internalAttendeeNames || "N/A"
    }`;
    if (externalAttendees.trim()) {
      text += `\nExternal Attendees: ${externalAttendees}`;
    }
    text += `\nPrepared by: ${momPreparedBy || "N/A"}\n\nAgenda:\n`;
    inputDiscussions.forEach((d) => (text += `• ${d.topic}\n`));
    text += `\nDiscussion:\n`;
    discussions.forEach((d) => {
      text += `\n${d.topic}\n`;
      text += d.notes.replace(/<br\/?>/g, "\n").replace(/<[^>]+>/g, "") + "\n";
    });
    text += `\nNext Action Plan:\n`;
    actionItems.forEach((a) => {
      text += `- ${a.task} | ${a.responsiblePerson} | ${a.deadline}\n`;
    });

    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {
        const mailto = `mailto:?subject=${encodeURIComponent(
          title
        )}&body=${encodeURIComponent(text)}`;
        window.location.href = mailto;
      });
    } else {
      const mailto = `mailto:?subject=${encodeURIComponent(
        title
      )}&body=${encodeURIComponent(text)}`;
      window.location.href = mailto;
    }
  };

  const resetGenerated = () => setIsGenerated(false);

  return (
    <div>
      <PageHeader title={`Minutes of Meeting `}>
        AI-powered MOM generation with professional structured format
      </PageHeader>

      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="overflow-visible">
          <div className="flex flex-wrap gap-3 relative">
            {!isGenerated ? (
              <Button
                onClick={generateMom}
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaFileAlt />
                )}
                {loading ? "Generating..." : "Generate MOM"}
              </Button>
            ) : (
              <>
                <Button onClick={resetGenerated} variant="secondary">
                  <FaUndo /> Edit Details
                </Button>

                {/* Actions Dropdown Menu */}
                <div className="relative">
                  <Button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <FaEllipsisV /> Actions
                  </Button>

                  {showActionsMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setShowActionsMenu(false)}
                      />

                      {/* Dropdown Menu */}
                      <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-[101]">
                        <button
                          onClick={() => {
                            saveMom();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700 transition-colors"
                        >
                          <FaSave className="text-indigo-600 flex-shrink-0" />
                          <span>Save v{momVersion}</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadMomTxt();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700 transition-colors"
                        >
                          <FaDownload className="text-green-600 flex-shrink-0" />
                          <span>Download .txt</span>
                        </button>

                        <button
                          onClick={() => {
                            exportPDF();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700 transition-colors"
                        >
                          <FaFilePdf className="text-red-600 flex-shrink-0" />
                          <span>Export PDF</span>
                        </button>

                        <div className="border-t border-gray-200 my-2"></div>

                        <button
                          onClick={() => {
                            shareMom();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700 transition-colors"
                        >
                          <FaShareAlt className="text-blue-600 flex-shrink-0" />
                          <span>Share</span>
                        </button>

                        <button
                          onClick={() => {
                            window.print();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700 transition-colors"
                        >
                          <FaPrint className="text-gray-600 flex-shrink-0" />
                          <span>Print</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Input Forms */}
        {!isGenerated && (
          <>
            <Card title="Meeting Details">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Project *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={meetingStartTime}
                      onChange={(e) => setMeetingStartTime(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={meetingEndTime}
                      onChange={(e) => setMeetingEndTime(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={meetingVenue}
                      onChange={(e) => setMeetingVenue(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="e.g., Office of Digi Sahyadri, Sangli"
                      spellCheck="true"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Internal Attendees * (Select multiple)
                  </label>
                  <div className="border rounded p-3 max-h-44 overflow-y-auto space-y-1">
                    {users.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={attendees.includes(u.id)}
                          onChange={() => toggleAttendee(u.id)}
                        />
                        <span className="text-sm">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    External Attendees (comma separated)
                  </label>
                  <input
                    type="text"
                    value={externalAttendees}
                    onChange={(e) => setExternalAttendees(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="e.g., John Doe (Client), Jane Smith (Vendor)"
                    spellCheck="true"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter names of external attendees (clients, vendors,
                    partners, etc.)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    MoM Prepared by
                  </label>
                  <input
                    type="text"
                    value={momPreparedBy}
                    onChange={(e) => setMomPreparedBy(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Your name"
                    spellCheck="true"
                  />
                </div>
              </div>
            </Card>

            {/* Agenda / Discussion topics (Notes REQUIRED) with Drag & Drop */}
            <Card title="Meeting Agenda & Discussions">
              {/* <p className="text-xs text-red-600 -mt-1 mb-3">
                Enter notes for every topic — notes are mandatory.
              </p> */}

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="discussions" type="DISCUSSIONS">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {inputDiscussions.length === 0 && (
                        <div className="text-sm text-gray-500 italic">
                          No topics added yet
                        </div>
                      )}
                      {inputDiscussions.map((disc, index) => (
                        <Draggable
                          key={disc.id}
                          draggableId={disc.id}
                          index={index}
                        >
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className="p-3 rounded border bg-gray-50"
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    {...drag.dragHandleProps}
                                    className="cursor-grab text-gray-500 select-none"
                                    title="Drag to reorder"
                                  >
                                    ☰
                                  </div>
                                  <div className="font-semibold">
                                    {disc.topic}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeDiscussion(disc.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Remove"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                Notes entered ({toLines(disc.notes).length}{" "}
                                point
                                {toLines(disc.notes).length === 1 ? "" : "s"})
                              </div>
                              <div className="text-sm text-gray-700 whitespace-pre-line">
                                {disc.notes}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="space-y-2 mt-3">
                <input
                  type="text"
                  value={newDiscussionTopic}
                  onChange={(e) => setNewDiscussionTopic(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  placeholder="Discussion topic (required)..."
                  spellCheck="true"
                />
                <textarea
                  value={newDiscussionNotes}
                  onChange={(e) => setNewDiscussionNotes(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 resize-vertical"
                  rows="3"
                  placeholder="Notes (required). One point per line (e.g., 'pending API', 'UI fix needed')"
                  spellCheck="true"
                />
                <Button onClick={addDiscussion} variant="primary">
                  <FaPlus /> Add Topic
                </Button>
              </div>
            </Card>

            {/* Action items with Drag & Drop */}
            <Card title="Next Action Plan (Drag to Reorder)">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="actions" type="ACTIONS">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {inputActionItems.length === 0 && (
                        <div className="text-sm text-gray-500 italic">
                          No action items added yet
                        </div>
                      )}
                      {inputActionItems.map((a, index) => (
                        <Draggable key={a.id} draggableId={a.id} index={index}>
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className="flex items-start gap-3 p-3 rounded border bg-gray-50"
                            >
                              <div
                                {...drag.dragHandleProps}
                                className="cursor-grab text-gray-500 select-none pt-1"
                                title="Drag to reorder"
                              >
                                ☰
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="font-semibold">Task:</span>{" "}
                                  {a.task}
                                </div>
                                <div>
                                  <span className="font-semibold">Person:</span>{" "}
                                  {a.responsiblePerson}
                                </div>
                                <div>
                                  <span className="font-semibold">
                                    Deadline:
                                  </span>{" "}
                                  {new Date(a.deadline).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => removeActionItem(a.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Remove"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                <input
                  type="text"
                  value={newActionTask}
                  onChange={(e) => setNewActionTask(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                  placeholder="Task description..."
                  spellCheck="true"
                />
                <input
                  type="text"
                  value={newActionPerson}
                  onChange={(e) => setNewActionPerson(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                  placeholder="Responsible person name..."
                  spellCheck="true"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newActionDeadline}
                    onChange={(e) => setNewActionDeadline(e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-3 py-2"
                  />
                  <Button
                    onClick={addActionItem}
                    variant="primary"
                    className="!px-3"
                  >
                    <FaPlus /> Add
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* PRINT-READY DOCUMENT */}
        {isGenerated && (
          <Card>
            <div className="mom-document bg-white rounded-lg border-2 border-gray-300 p-8 print:border-0">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-4 border-gray-800">
                <h1 className="text-3xl font-bold uppercase tracking-wide">
                  Minutes of Meeting
                </h1>
                <div className="text-sm text-gray-600 mt-2">
                  Version <b>{momVersion}</b>
                </div>
              </div>

              {/* Meeting Info Table */}
              <table className="w-full border-collapse border-2 border-gray-700 mb-6 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold w-1/3">
                      Project Name:
                    </td>
                    <td className="border border-gray-700 px-4 py-2">
                      {selectedProject?.name || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold">
                      Meeting Date & Time:
                    </td>
                    <td className="border border-gray-700 px-4 py-2">
                      {new Date(meetingDate).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {meetingStartTime
                        ? ` ${meetingStartTime} To ${meetingEndTime}`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold">
                      Meeting Venue:
                    </td>
                    <td className="border border-gray-700 px-4 py-2">
                      {meetingVenue || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold align-top">
                      Internal Attendees:
                    </td>
                    <td className="border border-gray-700 px-4 py-2">
                      {attendees
                        .map((id) => users.find((u) => u.id === id)?.name)
                        .filter(Boolean)
                        .map((n, i) => (
                          <div key={i}>{n}</div>
                        ))}
                      {attendees.length === 0 && "N/A"}
                    </td>
                  </tr>
                  {externalAttendees.trim() && (
                    <tr>
                      <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold align-top">
                        External Attendees:
                      </td>
                      <td className="border border-gray-700 px-4 py-2">
                        {externalAttendees.split(",").map((name, i) => (
                          <div key={i}>{name.trim()}</div>
                        ))}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-gray-700 bg-gray-100 px-4 py-2 font-semibold">
                      MoM Prepared by:
                    </td>
                    <td className="border border-gray-700 px-4 py-2">
                      {momPreparedBy || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Agenda */}
              <div className="mb-6">
                <h2 className="text-base font-bold mb-2 pb-2 border-b border-gray-300">
                  Meeting Agenda:
                </h2>
                <div className="text-sm leading-6">
                  {inputDiscussions.map((d, idx) => (
                    <div key={idx}>• {d.topic}</div>
                  ))}
                </div>
              </div>

              {/* Discussion Table */}
              <div className="mb-6">
                <h2 className="text-base font-bold mb-3 pb-2 border-b border-gray-300">
                  Discussion:
                </h2>
                <table className="w-full border-collapse border-2 border-gray-700 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-700 px-4 py-2 text-left w-1/3 font-semibold">
                        Discussion
                      </th>
                      <th className="border border-gray-700 px-4 py-2 text-left font-semibold">
                        Remark/Comments/Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discussions.map((disc, i) => (
                      <tr key={i}>
                        <td className="border border-gray-700 px-4 py-2 align-top font-semibold">
                          {disc.topic}
                        </td>
                        <td
                          className="border border-gray-700 px-4 py-2 align-top"
                          dangerouslySetInnerHTML={{
                            __html: (disc.notes || "").replace(/\n/g, "<br/>"),
                          }}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Next Action Plan */}
              <div className="mb-6">
                <h2 className="text-base font-bold mb-3 pb-2 border-b border-gray-300">
                  Next Action Plan:
                </h2>
                <table className="w-full border-collapse border-2 border-gray-700 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-700 px-4 py-2 text-left font-semibold">
                        Task
                      </th>
                      <th className="border border-gray-700 px-4 py-2 text-left font-semibold w-1/4">
                        Responsible Person
                      </th>
                      <th className="border border-gray-700 px-4 py-2 text-left font-semibold w-28">
                        Deadline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((a, i) => (
                      <tr key={i}>
                        <td className="border border-gray-700 px-4 py-2">
                          {a.task}
                        </td>
                        <td className="border border-gray-700 px-4 py-2">
                          {a.responsiblePerson}
                        </td>
                        <td className="border border-gray-700 px-4 py-2">
                          {new Date(a.deadline).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-xs text-gray-500 flex justify-between">
                <span>Generated on {new Date().toLocaleDateString()}</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Print rules: render only the MoM */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .mom-document, .mom-document * { visibility: visible; }
          .mom-document { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

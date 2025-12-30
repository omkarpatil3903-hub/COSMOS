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
  FaTasks,
  FaComments,
  FaMicrophone,
  FaStop,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { pdf } from "@react-pdf/renderer";
import MomPdfDocument from "../../components/MomPdfDocument";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  setDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage, auth } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import PageHeader from "../../components/PageHeader";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useThemeStyles } from "../../hooks/useThemeStyles";
import { useTheme } from "../../context/ThemeContext";

const ACCENT_COLORS = {
  purple: "#9333ea",
  blue: "#0284c7",
  pink: "#db2777",
  violet: "#7c3aed",
  orange: "#d97706",
  teal: "#0d9488",
  bronze: "#d97706",
  mint: "#059669",
  black: "#2563eb",
  indigo: "#4f46e5",
};


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
  const { buttonClass, iconColor, headerIconClass } = useThemeStyles();
  const { accent, mode } = useTheme();
  const activeColor = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

  const inputClass = `w-full rounded px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none border-none ${mode === "dark"
    ? "bg-gray-900 text-white placeholder-gray-500"
    : "bg-gray-50 text-gray-900 placeholder-gray-400"
    }`;

  // Reference data
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectStaffNames, setProjectStaffNames] = useState({ admins: [], members: [] });

  // Meeting meta
  const [projectId, setProjectId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");
  const [meetingVenue, setMeetingVenue] = useState("");
  const [attendees, setAttendees] = useState([]); // userIds - Internal
  const [externalAttendees, setExternalAttendees] = useState(""); // Comma-separated names
  const [momPreparedBy, setMomPreparedBy] = useState("");
  const [specialAgenda, setSpecialAgenda] = useState(""); // Special meeting agenda/objectives

  // Versioning
  const [momVersion, setMomVersion] = useState(1);
  // MOM ID (e.g. MOM_001) for current generated/saved MOM
  const [momNoState, setMomNoState] = useState("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [editSession, setEditSession] = useState(false);

  // Agenda / Discussions (topic + REQUIRED notes)
  const [inputDiscussions, setInputDiscussions] = useState([]);
  const [newDiscussionTopic, setNewDiscussionTopic] = useState("");
  const [newDiscussionNotes, setNewDiscussionNotes] = useState("");

  // Action items
  const [inputActionItems, setInputActionItems] = useState([]);
  const [newActionTask, setNewActionTask] = useState("");
  const [newActionPerson, setNewActionPerson] = useState(""); // Now stores text instead of userId
  const [newActionDeadline, setNewActionDeadline] = useState("");
  const [lastGenerateTime, setLastGenerateTime] = useState(0);

  // Task conversion state
  const [showTaskConversion, setShowTaskConversion] = useState(false);
  const [selectedActionItems, setSelectedActionItems] = useState(new Set());
  // Per-task overrides: { [index]: { assigneeId, assigneeName, dueDate, priority, assignedDate } }
  const [taskOverrides, setTaskOverrides] = useState({});

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  // Voice-to-text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef(null);

  // Generated output (no AI)
  const [discussions, setDiscussions] = useState([]); // [{topic, notes(html)}]
  const [actionItems, setActionItems] = useState([]); // mapped + light polish

  // UI
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const momRef = React.useRef(null);

  const buildSnapshot = useCallback(() => {
    const obj = {
      projectId,
      meetingDate,
      meetingStartTime,
      meetingEndTime,
      meetingVenue,
      attendees: [...attendees].sort(),
      externalAttendees: (externalAttendees || "").trim(),
      momPreparedBy: (momPreparedBy || "").trim(),
      inputDiscussions: (inputDiscussions || []).map((d) => ({
        topic: (d.topic || "").trim(),
        notes: (d.notes || "").trim(),
      })),
      inputActionItems: (inputActionItems || []).map((a) => ({
        task: (a.task || "").trim(),
        responsiblePerson: (a.responsiblePerson || "").trim(),
        deadline: a.deadline || "",
      })),
      discussions: (discussions || []).map((d) => ({
        topic: d.topic || "",
        notes: d.notes || "",
      })),
      actionItems: (actionItems || []).map((a) => ({
        task: a.task || "",
        responsiblePerson: a.responsiblePerson || "",
        deadline: a.deadline || "",
      })),
    };
    return JSON.stringify(obj);
  }, [
    projectId,
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
  ]);

  const currentSnapshot = useMemo(() => buildSnapshot(), [buildSnapshot]);
  const hasSaved = !!lastSavedSnapshot;
  const isChangedSinceSave = useMemo(
    () => !hasSaved || currentSnapshot !== lastSavedSnapshot,
    [hasSaved, currentSnapshot, lastSavedSnapshot]
  );
  // Show Save whenever a MOM is generated. When there are no changes since
  // last save, keep it visible but disabled and show the "Saved" label.
  const showSave = isGenerated;
  const disableSave = saveLoading || !isChangedSinceSave;

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
        setMomNoState("");
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

  // Auto-suggest attendees from project team when project is selected
  useEffect(() => {
    const suggestProjectTeam = async () => {
      if (!projectId || users.length === 0) return;
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          const data = projectDoc.data();
          const teamMemberIds = [];
          const adminIds = [];
          const memberIds = [];

          if (data.managerId) {
            teamMemberIds.push(data.managerId);
            adminIds.push(data.managerId);
          }
          if (data.assignedTo) {
            const arr = Array.isArray(data.assignedTo) ? data.assignedTo : [data.assignedTo];
            teamMemberIds.push(...arr);
            memberIds.push(...arr);
          }
          if (data.teamMembers && Array.isArray(data.teamMembers)) {
            teamMemberIds.push(...data.teamMembers);
            memberIds.push(...data.teamMembers);
          }

          // Auto-select unique team members
          const uniqueTeam = [...new Set(teamMemberIds)].filter(Boolean);
          if (uniqueTeam.length > 0 && attendees.length === 0) {
            setAttendees(uniqueTeam);
            toast.success(`Auto-selected ${uniqueTeam.length} team member(s) from project`);
          }

          // Derive Names for Access Control
          const adminNames = adminIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
          const memberNames = memberIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
          setProjectStaffNames({
            admins: [...new Set(adminNames)],
            members: [...new Set(memberNames)]
          });
        }
      } catch (err) {
        console.error("Error fetching project team:", err);
      }
    };
    suggestProjectTeam();
  }, [projectId, users]);

  // Load frequent external attendees from localStorage
  const [frequentExternalAttendees, setFrequentExternalAttendees] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("frequentExternalAttendees") || "[]");
    } catch {
      return [];
    }
  });

  // Save external attendees to localStorage when they change
  const saveExternalAttendee = (name) => {
    const trimmed = name.trim();
    if (!trimmed || frequentExternalAttendees.includes(trimmed)) return;
    const updated = [trimmed, ...frequentExternalAttendees].slice(0, 20); // Keep max 20
    setFrequentExternalAttendees(updated);
    localStorage.setItem("frequentExternalAttendees", JSON.stringify(updated));
  };

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

  const addComment = () => {
    if (!newComment.trim()) return;
    const currentUser = auth.currentUser;
    const authorName = currentUser?.displayName || currentUser?.email || "Admin";

    const comment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      author: authorName,
      authorId: currentUser?.uid || "",
      timestamp: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
    toast.success("Comment added (Save to persist)");
  };

  // Voice-to-text functions
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Changed to false to prevent duplication
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setNewDiscussionNotes((prev) => (prev + " " + transcript).trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Voice input error: " + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success("Listening... Speak now");
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    toast.success("Voice input stopped");
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

  // --------- GENERATE (AI with Fallback) ----------
  const generateOfflineMom = async () => {
    // Build structured "discussions" using rule-based generator
    const builtDiscussions = inputDiscussions.map((d) => ({
      topic: d.topic,
      notes: generateStructuredNotes(d.topic, d.notes),
    }));

    // Lightly polish task wording
    const polish = (task) => {
      const t = task.trim();
      const cap = t.charAt(0).toUpperCase() + t.slice(1);
      return cap.replace(/\.+$/, "");
    };

    // Start with manually entered action items
    const builtActions = inputActionItems.map((a) => ({
      task: polish(a.task),
      responsiblePerson: a.responsiblePerson,
      responsiblePersonId: a.responsiblePersonId,
      deadline: a.deadline,
    }));

    // Auto-extract action items from discussion notes if none were manually entered
    if (builtActions.length === 0 && inputDiscussions.length > 0) {
      const autoActions = [];

      inputDiscussions.forEach((d) => {
        const combined = `${d.topic} ${d.notes}`.toLowerCase();

        // Extract action items based on keyword patterns
        if (/api|endpoint|integration|backend/.test(combined)) {
          autoActions.push({
            task: `Complete API/Integration work for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
        if (/ui|ux|design|frontend|responsive/.test(combined)) {
          autoActions.push({
            task: `Implement UI changes for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
        if (/test|qa|bug|fix|defect/.test(combined)) {
          autoActions.push({
            task: `Complete testing and bug fixes for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
        if (/deploy|release|production/.test(combined)) {
          autoActions.push({
            task: `Prepare deployment for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
        if (/document|docs|spec/.test(combined)) {
          autoActions.push({
            task: `Update documentation for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
        if (/review|feedback|approve/.test(combined)) {
          autoActions.push({
            task: `Get review/approval for ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        }
      });

      // If still no actions, create a generic follow-up for each discussion
      if (autoActions.length === 0) {
        inputDiscussions.forEach((d) => {
          autoActions.push({
            task: `Follow up on ${d.topic}`,
            responsiblePerson: "TBD",
            deadline: "",
          });
        });
      }

      builtActions.push(...autoActions);
    }

    setDiscussions(builtDiscussions);
    setActionItems(builtActions);
    finishGeneration();
  };

  const finishGeneration = async () => {
    // Prefetch next MOM number from documents collection
    try {
      let nextNumber = 1;
      // Query documents collection for existing MOMs (scan recent docs to find last MOM no)
      const qn = query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(qn);
      snap.forEach((d) => {
        // Document ID itself is the momNo (e.g., MOM_001)
        const docId = d.id;
        // Check if ID matches MOM pattern
        const match = docId.match(/^MOM_(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= nextNumber) nextNumber = num + 1;
        }
      });
      const prefetchedNo = `MOM_${String(nextNumber).padStart(3, "0")}`;
      setMomNoState(prefetchedNo);
    } catch (e) {
      console.error("Failed to precompute MOM number", e);
      setMomNoState("MOM_001");
    }

    setIsGenerated(true);
    setEditSession(true);
    toast.success("MOM generated");
  };

  const generateMom = async () => {
    if (!projectId) return toast.error("Select a project");
    if (!meetingDate) return toast.error("Enter meeting date");
    if (!attendees.length) return toast.error("Select at least one attendee");
    if (!inputDiscussions.length)
      return toast.error("Add at least one discussion topic");

    // Ensure notes are present for all topics (mandatory)
    const invalid = inputDiscussions.find((d) => !d.notes?.trim());
    if (invalid) return toast.error(`Notes required for: "${invalid.topic}"`);

    // Rate limit
    const now = Date.now();
    if (now - lastGenerateTime < 5000) {
      return toast.error("Please wait before generating again.");
    }
    setLastGenerateTime(now);

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.warn("No Gemini API key found, using offline mode.");
      return generateOfflineMom();
    }

    setLoading(true);
    try {
      // 1. Prepare prompt
      const selectedProjName = projects.find(p => p.id === projectId)?.name || "N/A";
      const attendeeNames = attendees
        .map(id => users.find(u => u.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      const discussionsJson = JSON.stringify(inputDiscussions.map(d => ({
        topic: d.topic,
        rawNotes: d.notes
      })));

      const prompt = `
      You are an expert project manager. Transform the following meeting notes into a professional Minutes of Meeting (MoM) structure.
      
      **Context**:
      - Project: ${selectedProjName}
      - Internal Attendees: ${attendeeNames}
      - External Attendees: ${externalAttendees || "None"}
      - Date: ${meetingDate}

      **Raw Discussions**:
      ${discussionsJson}

      **Instructions**:
      ${specialAgenda ? `**Special Meeting Agenda/Objectives**: ${specialAgenda}\n\n` : ""}
      1. For each discussion topic, rewrite the raw notes into a professional, HTML-formatted summary using <b>Key Points</b>, <b>Decisions</b>, etc., similar to this format:
         "<b>Summary:</b> ...<br/><br/><b>Key Points:</b> <ul><li>...</li></ul><br/><b>Decisions:</b> ..."
         (Ensure valid HTML text, no markdown inside the HTML string).
      2. Extract strictly actionable tasks from the discussions.
      3. Return ONLY a valid JSON object with this structure:
      {
        "discussions": [
          { "topic": "Original Topic", "notes": "HTML Content" }
        ],
        "actionItems": [
          { "task": "Task description", "responsiblePerson": "Name inferred or TBD", "deadline": "YYYY-MM-DD or TBD" }
        ]
      }
      `;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Gemini API Error:", errorData);
        throw new Error(errorData.error?.message || `API Error: ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No content from AI");

      // 3. Parse JSON (strip markdown code fences if present)
      let jsonText = text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
      }
      const parsed = JSON.parse(jsonText);

      // 4. Merge results
      // Map back to expected state structure
      setDiscussions(parsed.discussions || []);

      // Combine AI actions with manually entered ones (simple concatenation)
      const aiActions = (parsed.actionItems || []).map(a => ({
        id: crypto.randomUUID(),
        task: a.task,
        responsiblePerson: a.responsiblePerson,
        deadline: a.deadline === "TBD" ? "" : a.deadline,
        responsiblePersonId: "" // AI won't know internal IDs easily without more context
      }));

      // Add inputActionItems to the list if they exist
      const manualActions = inputActionItems.map(a => ({
        ...a,
        task: a.task, // Ensure consistency
      }));

      setActionItems([...manualActions, ...aiActions]);

      finishGeneration();

    } catch (err) {
      console.error("AI Generation failed:", err);
      toast.error("AI generation failed, falling back to offline mode.");
      generateOfflineMom();
    } finally {
      setLoading(false);
    }
  };

  const convertToTasks = () => {
    if (!actionItems || actionItems.length === 0) {
      return toast.error("No action items to convert");
    }
    // Initialize overrides with default values for each action item
    const initialOverrides = {};
    actionItems.forEach((item, idx) => {
      // Try to find matching user
      const matchedUser = users.find(u =>
        u.name.toLowerCase() === item.responsiblePerson?.toLowerCase()
      );
      initialOverrides[idx] = {
        assigneeId: matchedUser?.id || "",
        assigneeName: item.responsiblePerson || "",
        dueDate: item.deadline || "",
        priority: "Medium",
        assignedDate: meetingDate || new Date().toISOString().split("T")[0],
        description: `Generated from MoM: ${item.task}`, // Editable description
      };
    });
    setTaskOverrides(initialOverrides);
    setShowTaskConversion(true);
  };

  // Update a single task override field
  const updateTaskOverride = (idx, field, value) => {
    setTaskOverrides(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value,
      },
    }));
  };

  // Batch apply helpers
  const applyBatchAssignee = (assigneeId, assigneeName) => {
    setTaskOverrides(prev => {
      const next = { ...prev };
      selectedActionItems.forEach(idx => {
        next[idx] = { ...next[idx], assigneeId, assigneeName };
      });
      return next;
    });
    toast.success(`Applied to ${selectedActionItems.size} tasks`);
  };

  const applyBatchPriority = (priority) => {
    setTaskOverrides(prev => {
      const next = { ...prev };
      selectedActionItems.forEach(idx => {
        next[idx] = { ...next[idx], priority };
      });
      return next;
    });
    toast.success(`Applied to ${selectedActionItems.size} tasks`);
  };

  const createTasksFromActions = async () => {
    const selected = Array.from(selectedActionItems);
    if (selected.length === 0)
      return toast.error("Select at least one action item");

    setLoading(true);
    const toastId = toast.loading("Creating tasks...");

    try {
      let createdCount = 0;
      for (const idx of selected) {
        const item = actionItems[idx];
        const override = taskOverrides[idx] || {};

        const newTask = {
          title: item.task,
          description: override.description || `Generated from Admin MoM: ${item.task}`,
          status: "To-Do",
          priority: override.priority || "Medium",
          projectId: projectId || "",
          momId: momNoState,
          source: "MoM_Admin",
          createdAt: serverTimestamp(),
          assigneeId: override.assigneeId || "",
          assigneeName: override.assigneeName || item.responsiblePerson,
          dueDate: override.dueDate && !isNaN(Date.parse(override.dueDate))
            ? Timestamp.fromDate(new Date(override.dueDate))
            : null,
          assignedDate: override.assignedDate && !isNaN(Date.parse(override.assignedDate))
            ? Timestamp.fromDate(new Date(override.assignedDate))
            : Timestamp.fromDate(new Date()),
          createdBy: "ADMIN",
          senderId: auth.currentUser?.uid || "ADMIN"
        };

        await addDoc(collection(db, "tasks"), newTask);
        createdCount++;
      }

      // Sync overrides back to actionItems state so they appear in PDF/Input list
      const updatedActionItems = [...actionItems];
      selected.forEach(idx => {
        const override = taskOverrides[idx] || {};
        const currentItem = updatedActionItems[idx];

        // Update local state with chosen assignee/deadline
        if (override.assigneeName) currentItem.responsiblePerson = override.assigneeName;
        if (override.dueDate) currentItem.deadline = override.dueDate;

        updatedActionItems[idx] = currentItem;
      });
      setActionItems(updatedActionItems);
      // Update input state as well for consistency
      setInputActionItems(updatedActionItems);

      toast.success(`Successfully created ${createdCount} task(s)!`, { id: toastId });
      setShowTaskConversion(false);
      setSelectedActionItems(new Set());
      setTaskOverrides({});
    } catch (error) {
      console.error("Error creating tasks:", error);
      toast.error("Failed to create tasks", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Save with versioning and sequential MOM number (momNo)
  const saveMom = async () => {
    if (saveLoading) return;
    if (!isGenerated) return toast.error("Generate MOM first");
    if (!projectId) return toast.error("Select a project");
    setSaveLoading(true);
    try {
      // Determine momNo: prefer precomputed ID from generateMom if available; otherwise compute now
      let momNo = momNoState;
      if (!momNo) {
        let nextNumber = 1;
        try {
          // Query documents collection for existing MOMs
          const qn = query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(100));
          const snap = await getDocs(qn);
          snap.forEach((d) => {
            // Document ID itself is the momNo (e.g., MOM_001)
            const docId = d.id;
            const match = docId.match(/^MOM_(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num >= nextNumber) nextNumber = num + 1;
            }
          });
        } catch (err) {
          console.error("Failed to compute next momNo", err);
          nextNumber = 1;
        }
        momNo = `MOM_${String(nextNumber).padStart(3, "0")}`;
      }

      // Reflect this MOM number in the UI header as the MOM ID
      setMomNoState(momNo);

      // Save MOM as a PDF snapshot to storage and metadata to documents collection
      try {
        const safeProject = (selectedProject?.name || "Project").replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );
        const baseName = `${momNo}_${safeProject}_${meetingDate || ""}`;
        const filename = `${baseName}.pdf`;
        // Save to documents/moms folder with momNo structure
        const storagePath = `documents/moms/${momNo}/${filename}`;
        const storageRef = ref(storage, storagePath);

        // Generate PDF using react-pdf (much cleaner than html2canvas)
        // Convert attendee IDs to names for the PDF
        const attendeeNames = attendees
          .map(id => users.find(u => u.id === id)?.name)
          .filter(Boolean);
        // Normalize externalAttendees to array
        const externalAttendeesArray = typeof externalAttendees === 'string' && externalAttendees.trim()
          ? externalAttendees.split(',').map(s => s.trim()).filter(Boolean)
          : (Array.isArray(externalAttendees) ? externalAttendees : []);

        const pdfData = {
          momNo,
          projectName: selectedProject?.name || "Project",
          meetingDate,
          meetingStartTime,
          meetingEndTime,
          meetingVenue,
          attendees: attendeeNames,
          externalAttendees: externalAttendeesArray,
          momPreparedBy,
          discussions,
          actionItems,
          comments,
        };

        const pdfBlob = await pdf(<MomPdfDocument data={pdfData} />).toBlob();

        const currentUser = auth.currentUser;
        const meta = {
          contentType: "application/pdf",
          customMetadata: {
            projectId,
            momNo,
            momVersion: String(momVersion || 1),
            documentName: `${momNo} – ${selectedProject?.name || "Project"}`,
            filename,
            uploadedBy: currentUser?.uid || "",
            uploadedAt: new Date().toISOString(),
            source: "mom-generator",
            momId: "", // will be set after creating moms metadata doc
          },
        };

        await uploadBytes(storageRef, pdfBlob, meta);
        const downloadURL = await getDownloadURL(storageRef);

        const createdByName = (() => {
          if (momPreparedBy && momPreparedBy.trim()) return momPreparedBy.trim();
          const u = currentUser;
          if (!u) return "";
          return u.displayName || u.email || "";
        })();

        // 3. Save full data to Firestore
        const momData = {
          projectId,
          momNo,
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
          discussions: discussions || [], // AI Generated content
          actionItems: actionItems || [], // Final action items
          storagePath,
          url: downloadURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastSavedSnapshot: JSON.stringify({ projectId, meetingDate, discussions, actionItems }), // Simplified snapshot
          isDraft: false,
          comments: comments || [],
        };

        // Create MoM document in documents collection with momNo as document ID
        const momDocRef = doc(db, "documents", momNo);
        await setDoc(momDocRef, {
          ...momData,
          name: `${momNo} – ${selectedProject?.name || "Project"}`,
          folder: "MOMs",
          shared: true,
          access: {
            admin: projectStaffNames.admins || [],
            member: projectStaffNames.members || [],
          },
          filename,
          fileType: "application/pdf",
          fileSize: pdfBlob.size,
          url: downloadURL,
          storagePath,
          location: "—",
          tags: ["MoM"],
          children: 0,
          createdByUid: currentUser?.uid || "",
          createdByName,
        });

        toast.success(`${momNo} saved successfully!`);
        setMomVersion((v) => v + 1);
        setLastSavedSnapshot(currentSnapshot);
        setEditSession(false);
      } catch (err) {
        console.error("Failed to save MOM:", err);
        throw err; // Re-throw to be caught by outer block
      }


    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaveLoading(false);
    }
  };

  // TXT download function removed; MOM is now persisted as PDF only

  // PDF export using react-pdf
  const handleExportPDF = async () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    const toastId = toast.loading("Generating PDF...");

    try {
      // Convert attendee IDs to names for the PDF
      const attendeeNames = attendees
        .map(id => users.find(u => u.id === id)?.name)
        .filter(Boolean);
      // Normalize externalAttendees to array
      const externalAttendeesArray = typeof externalAttendees === 'string' && externalAttendees.trim()
        ? externalAttendees.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(externalAttendees) ? externalAttendees : []);

      // Prepare data for PDF
      const pdfData = {
        momNo: momNoState,
        projectName: selectedProject?.name || "Project",
        meetingDate,
        meetingStartTime,
        meetingEndTime,
        meetingVenue,
        attendees: attendeeNames,
        externalAttendees: externalAttendeesArray,
        momPreparedBy,
        discussions,
        actionItems,
        comments,
      };

      // Generate PDF blob
      const pdfBlob = await pdf(<MomPdfDocument data={pdfData} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MOM_${selectedProject?.name || "Project"}_${meetingDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF Exported!", { id: toastId });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF", { id: toastId });
    }
  };

  const handlePrint = () => {
    if (!isGenerated) return toast.error("Generate MOM first");
    const printContent = momRef.current;
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printContents = printContent.innerHTML;

    document.body.innerHTML = `
      <div style="padding: 40px;">
        ${printContents}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore event listeners
  };

  // Share (Web Share API or mailto)
  const shareMom = () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    const projectName = selectedProject?.name || "Project";
    const title = `MoM – ${projectName} (${meetingDate})`;

    const internalAttendeeNames = attendees
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    let text = `${title}\n\n`;
    text += `Date & Time: ${meetingDate}${meetingStartTime ? ` ${meetingStartTime} to ${meetingEndTime}` : ""
      }\nVenue: ${meetingVenue || "N/A"}\nInternal Attendees: ${internalAttendeeNames || "N/A"
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

  const resetGenerated = () => {
    // Close any open action menus first
    setShowActionsMenu(false);
    // Switch back to edit mode
    setIsGenerated(false);
    // Clear current MOM ID; it will be recomputed on next generate
    setMomNoState("");
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title={`Minutes of Meeting`}
          description={`AI-powered MOM generation with professional structured format`}
        />
        <div className="flex items-center gap-3 mt-2">
          {!isGenerated ? (
            <Button
              onClick={generateMom}
              variant="custom"
              disabled={loading}
              className={`flex items-center gap-2 whitespace-nowrap ${buttonClass}`}
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
              <Button onClick={() => setIsGenerated(false)} variant="secondary">
                <FaUndo /> Edit Details
              </Button>

              {/* Actions Dropdown Menu */}
              <div className="relative">
                <Button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  variant="custom"
                  className={`flex items-center gap-2 ${buttonClass}`}
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
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-lg shadow-2xl border border-subtle py-2 z-[101]">
                      {showSave && (
                        <button
                          onClick={() => {
                            if (disableSave) return;
                            setShowSaveConfirm(true);
                          }}
                          disabled={disableSave}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${disableSave
                            ? "text-content-tertiary cursor-not-allowed"
                            : "text-content-primary hover:bg-surface-subtle"
                            }`}
                        >
                          <FaSave
                            className={`flex-shrink-0 ${disableSave ? "text-content-tertiary" : iconColor
                              }`} // Used iconColor
                          />
                          <span>
                            {saveLoading
                              ? "Saving..."
                              : isChangedSinceSave
                                ? "Save MOM"
                                : "Saved"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          // Handle PDF export
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 text-content-primary transition-colors"
                      >
                        <FaFilePdf className={`${iconColor} flex-shrink-0`} /> {/* Used iconColor */}
                        <span>Export PDF</span>
                      </button>

                      <div className="border-t border-subtle my-2"></div>

                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          // Handle share
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 text-content-primary transition-colors"
                      >
                        <FaShareAlt className={`${iconColor} flex-shrink-0`} /> {/* Used iconColor */}
                        <span>Share</span>
                      </button>

                      <button
                        onClick={() => {
                          window.print();
                          setShowActionsMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 text-content-primary transition-colors"
                      >
                        <FaPrint className={`${iconColor} flex-shrink-0`} /> {/* Used iconColor */}
                        <span>Print</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save confirmation modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-content-primary mb-2">Save MOM?</h2>
            <p className="text-sm text-content-secondary mb-4">
              Do you want to save this Minutes of Meeting with the current details?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSaveConfirm(false)}
                disabled={saveLoading}
              >
                Cancel
              </Button>
              <Button
                variant="custom"
                onClick={async () => {
                  if (saveLoading || disableSave) return;
                  await saveMom();
                  setShowSaveConfirm(false);
                  setShowActionsMenu(false);
                }}
                disabled={saveLoading || disableSave}
                className={`flex items-center gap-2 ${buttonClass}`}
              >
                {saveLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSave />
                )}
                {saveLoading ? "Saving..." : "Yes, Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
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
                    className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                      placeholder="e.g., Office of Digi Sahyadri, Sangli"
                      spellCheck="true"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Internal Attendees * (Select multiple)
                  </label>
                  <div className={`rounded p-3 max-h-44 overflow-y-auto space-y-1 ${mode === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
                    {users.map((u) => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 cursor-pointer p-1 rounded transition-colors ${mode === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-200"}`}
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
                    onBlur={() => {
                      // Save each external attendee to frequent list on blur
                      externalAttendees.split(",").forEach((name) => saveExternalAttendee(name));
                    }}
                    className={inputClass}
                    placeholder="e.g., John Doe (Client), Jane Smith (Vendor)"
                    spellCheck="true"
                    list="external-attendees-list"
                  />
                  <datalist id="external-attendees-list">
                    {frequentExternalAttendees.map((name, i) => (
                      <option key={i} value={name} />
                    ))}
                  </datalist>
                  {frequentExternalAttendees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500">Recent:</span>
                      {frequentExternalAttendees.slice(0, 5).map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setExternalAttendees((prev) =>
                              prev ? `${prev}, ${name}` : name
                            );
                          }}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${mode === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Click recent names to add, or type new ones
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    MoM Prepared by*
                  </label>
                  <input
                    type="text"
                    value={momPreparedBy}
                    onChange={(e) => setMomPreparedBy(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                    spellCheck="true"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Meeting Agenda *
                  </label>
                  <input
                    type="text"
                    value={specialAgenda}
                    onChange={(e) => setSpecialAgenda(e.target.value)}
                    className={inputClass}
                    placeholder="Enter the meeting agenda items..."
                    spellCheck="true"
                  />
                </div>
              </div>
            </Card>

            {/* Agenda / Discussion topics (Notes REQUIRED) with Drag & Drop */}
            <Card title="Meeting Agenda & Discussions*">
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
                  className={inputClass}
                  placeholder="Discussion topic (required)..."
                  spellCheck="true"
                />
                <div className="relative">
                  <textarea
                    value={newDiscussionNotes}
                    onChange={(e) => setNewDiscussionNotes(e.target.value)}
                    className={`${inputClass} resize-vertical pr-12`}
                    rows="3"
                    placeholder="Notes (required). One point per line. You can also use the microphone button →"
                    spellCheck="true"
                  />
                  <button
                    type="button"
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : `bg-gray-100 text-gray-600 hover:bg-surface-subtle hover:${iconColor}` // Used iconColor
                      }`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? <FaStop /> : <FaMicrophone />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={addDiscussion} variant="custom" className={buttonClass}>
                    <FaPlus /> Add Topic
                  </Button>
                  {isListening && (
                    <span className="text-xs text-red-500 animate-pulse flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Listening...
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Action items with Drag & Drop - Optional (AI generates these) */}
            <Card title="Next Action Plan (Optional - AI will generate)">
              <p className="text-xs text-gray-500 mb-3">
                You can skip this section. The AI will automatically extract action items from your discussion notes.
              </p>
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
                          No manual action items added — AI will generate from discussions
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
                  className={inputClass}
                  placeholder="Task description..."
                  spellCheck="true"
                />
                <input
                  type="text"
                  value={newActionPerson}
                  onChange={(e) => setNewActionPerson(e.target.value)}
                  className={inputClass}
                  placeholder="Responsible person name..."
                  spellCheck="true"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newActionDeadline}
                    onChange={(e) => setNewActionDeadline(e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <Button
                    onClick={addActionItem}
                    variant="custom"
                    className={`${buttonClass} !px-3`}
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
            <div
              ref={momRef}
              className="mom-document rounded-lg p-10 print:border-0"
              style={{
                backgroundColor: "#ffffff",
                fontFamily: "Arial, sans-serif",
                color: "#000000",
                lineHeight: "1.5",
              }}
            >
              {/* Header */}
              <div
                className="text-center mb-8"
                style={{ borderBottom: "2px solid #000000", paddingBottom: "10px" }}
              >
                <h1 className="text-3xl font-bold uppercase tracking-wide">
                  Minutes of Meeting
                </h1>
                <div
                  className="text-sm mt-2"
                  style={{ color: "#6d7887ff" }}
                >
                  {momNoState && <b>ID: {momNoState}</b>}
                </div>
              </div>

              {/* Meeting Info Table */}
              <table
                className="w-full border-collapse mb-8 text-sm"
                style={{ border: "1px solid #000000" }}
              >
                <tbody>
                  <tr>
                    <td
                      className="px-4 py-2 font-bold w-1/3"
                      style={{
                        border: "1px solid #000000",
                        backgroundColor: "#f0f0f0",
                      }}
                    >
                      Project Name:
                    </td>
                    <td
                      className="px-4 py-2 font-bold"
                      style={{ border: "1px solid #000000" }}
                    >
                      {selectedProject?.name || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="px-4 py-2 font-semibold"
                      style={{
                        border: "1px solid #000000",
                        backgroundColor: "#f3f4f6",
                      }}
                    >
                      Meeting Date & Time:
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ border: "1px solid #000000" }}
                    >
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
                    <td
                      className="px-4 py-2 font-semibold"
                      style={{
                        border: "1px solid #000000",
                        backgroundColor: "#f3f4f6",
                      }}
                    >
                      Meeting Venue:
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ border: "1px solid #000000" }}
                    >
                      {meetingVenue || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="px-4 py-2 font-bold align-top"
                      style={{
                        border: "1px solid #000000",
                        backgroundColor: "#f0f0f0",
                      }}
                    >
                      Internal Attendees:
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ border: "1px solid #000000" }}
                    >
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
                      <td
                        className="px-4 py-2 font-bold align-top"
                        style={{
                          border: "1px solid #000000",
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        External Attendees:
                      </td>
                      <td
                        className="px-4 py-2"
                        style={{ border: "1px solid #000000" }}
                      >
                        {externalAttendees.split(",").map((name, i) => (
                          <div key={i}>{name.trim()}</div>
                        ))}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      className="px-4 py-2 font-semibold"
                      style={{
                        border: "1px solid #000000",
                        backgroundColor: "#f3f4f6",
                      }}
                    >
                      MoM Prepared by:
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ border: "1px solid #000000" }}
                    >
                      {momPreparedBy || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Agenda */}
              <div className="mb-8">
                <table
                  className="w-full border-collapse text-sm"
                  style={{ border: "1px solid #000000" }}
                >
                  <thead>
                    <tr>
                      <th
                        className="px-4 py-2 text-left font-bold"
                        style={{
                          border: "1px solid #000000",
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        Meeting Agenda:
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="px-4 py-2"
                        style={{ border: "1px solid #000000", whiteSpace: "pre-line" }}
                      >
                        {specialAgenda || "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Discussion Table */}
              <div className="mb-8">
                <h2
                  className="text-lg font-bold mb-3"
                  style={{ color: "#000000" }}
                >
                  Discussion:
                </h2>
                <table
                  className="w-full border-collapse text-sm"
                  style={{ border: "1px solid #000000" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      <th
                        className="px-4 py-2 text-left w-1/3 font-bold"
                        style={{ border: "1px solid #000000" }}
                      >
                        Discussion
                      </th>
                      <th
                        className="px-4 py-2 text-left font-bold"
                        style={{ border: "1px solid #000000" }}
                      >
                        Remark/Comments/Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discussions.map((disc, i) => (
                      <tr key={i}>
                        <td
                          className="px-4 py-2 align-top font-bold"
                          style={{ border: "1px solid #000000" }}
                        >
                          {disc.topic}
                        </td>
                        <td
                          className="px-4 py-2 align-top"
                          style={{ border: "1px solid #000000" }}
                        >
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newNotes = e.currentTarget.innerHTML;
                              setDiscussions((prev) =>
                                prev.map((d, idx) =>
                                  idx === i ? { ...d, notes: newNotes } : d
                                )
                              );
                            }}
                            className="min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded p-1"
                            dangerouslySetInnerHTML={{
                              __html: (disc.notes || "").replace(/\n/g, "<br/>"),
                            }}
                          />
                          <p className="text-[10px] text-gray-400 mt-1 print:hidden">Click to edit</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Next Action Plan */}
              <div className="mb-8">
                <h2
                  className="text-lg font-bold mb-3"
                  style={{ color: "#000000" }}
                >
                  Next Action Plan:
                </h2>
                <div className="flex justify-end mb-2">
                  <Button onClick={convertToTasks} variant="secondary" className="text-xs py-1">
                    <FaTasks className="mr-1" /> Create Tasks ({actionItems.length})
                  </Button>
                </div>
                <table
                  className="w-full border-collapse text-sm"
                  style={{ border: "1px solid #000000" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      <th
                        className="px-4 py-2 text-left font-bold"
                        style={{ border: "1px solid #000000", width: "50%" }}
                      >
                        Task
                      </th>
                      <th
                        className="px-4 py-2 text-left font-bold w-1/4"
                        style={{ border: "1px solid #000000" }}
                      >
                        Responsible Person
                      </th>
                      <th
                        className="px-4 py-2 text-left font-bold w-28"
                        style={{ border: "1px solid #000000" }}
                      >
                        Deadline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((a, i) => (
                      <tr key={i}>
                        <td
                          className="px-4 py-2"
                          style={{ border: "1px solid #000000" }}
                        >
                          <input
                            type="text"
                            value={a.task}
                            onChange={(e) => {
                              setActionItems((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, task: e.target.value } : item
                                )
                              );
                            }}
                            className="w-full bg-transparent font-bold focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
                          />
                        </td>
                        <td
                          className="px-4 py-2"
                          style={{ border: "1px solid #000000" }}
                        >
                          <input
                            type="text"
                            value={a.responsiblePerson}
                            onChange={(e) => {
                              setActionItems((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, responsiblePerson: e.target.value } : item
                                )
                              );
                            }}
                            className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
                          />
                        </td>
                        <td
                          className="px-4 py-2"
                          style={{ border: "1px solid #000000" }}
                        >
                          <input
                            type="date"
                            value={a.deadline || ""}
                            onChange={(e) => {
                              setActionItems((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, deadline: e.target.value } : item
                                )
                              );
                            }}
                            className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>



              {/* Comments Section */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h2 className="text-lg font-bold mb-3" style={{ color: "#000000" }}>Comments / Notes</h2>
                {comments.length === 0 && <p className="text-xs text-gray-500 italic mb-3">No comments added.</p>}
                {comments.map((c, i) => (
                  <div key={i} className="mb-2 text-sm">
                    <span className="font-bold">{c.author}</span> <span className="text-xs text-gray-500">({new Date(c.timestamp).toLocaleString()})</span>: {c.text}
                  </div>
                ))}
                {/* Inline Comment Input */}
                <div className="mt-4 flex gap-2 items-center print:hidden">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addComment()}
                    placeholder="Add a comment..."
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
                  />
                  <button
                    onClick={addComment}
                    className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div
                className="mt-8 pt-4 text-xs flex justify-between"
                style={{
                  borderTop: "1px solid #000000",
                  color: "#000000",
                }}
              >
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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .mom-document, .mom-document * { visibility: visible; }
          .mom-document { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Task Conversion Modal */}
      {
        showTaskConversion && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTaskConversion(false)} />
            <div className="z-10 w-full max-w-4xl bg-white dark:bg-gray-800 max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-2">Create Tasks from Action Items</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Select items to convert and customize details.
                </p>

                {/* Batch Apply Controls */}
                <div className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider mr-2">Batch Apply to Selected:</span>
                  <select
                    className={`${inputClass} !w-auto !text-xs !px-2 !py-1`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const user = users.find(u => u.id === e.target.value);
                        applyBatchAssignee(e.target.value, user?.name || "");
                        e.target.value = ""; // Reset
                      }
                    }}
                  >
                    <option value="">Set Assignee...</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>

                  <select
                    className={`${inputClass} !w-auto !text-xs !px-2 !py-1`}
                    onChange={(e) => {
                      if (e.target.value) {
                        applyBatchPriority(e.target.value);
                        e.target.value = ""; // Reset
                      }
                    }}
                  >
                    <option value="">Set Priority...</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {actionItems.map((action, idx) => {
                  const override = taskOverrides[idx] || {};
                  const isSelected = selectedActionItems.has(idx);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border transition-colors ${isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                    >
                      {/* Header with checkbox and task title */}
                      <div
                        className="flex items-start gap-3 cursor-pointer mb-3"
                        onClick={(e) => {
                          const newSet = new Set(selectedActionItems);
                          if (isSelected) newSet.delete(idx);
                          else newSet.add(idx);
                          setSelectedActionItems(newSet);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="mt-1 w-4 h-4 pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-content-primary select-none">{action.task}</p>
                          <p className="text-xs text-gray-500 select-none">Original: {action.responsiblePerson} | {action.deadline || "No deadline"}</p>
                        </div>
                      </div>

                      {/* Editable fields (only visible when selected) */}
                      {isSelected && (
                        <div
                          className="mt-3 pl-7 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Description Field */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Task Description</label>
                            <textarea
                              value={override.description || ""}
                              onChange={(e) => updateTaskOverride(idx, "description", e.target.value)}
                              className={`${inputClass} !px-2 !py-1.5 h-20 resize-y`}
                              placeholder="Task description..."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Assignee */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Assignee</label>
                              <select
                                value={override.assigneeId || ""}
                                onChange={(e) => {
                                  const selectedUser = users.find(u => u.id === e.target.value);
                                  updateTaskOverride(idx, "assigneeId", e.target.value);
                                  updateTaskOverride(idx, "assigneeName", selectedUser?.name || "");
                                }}
                                className={`${inputClass} !px-2 !py-1.5`}
                              >
                                <option value="">Select Assignee</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Due Date */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Due Date</label>
                              <input
                                type="date"
                                value={override.dueDate || ""}
                                onChange={(e) => updateTaskOverride(idx, "dueDate", e.target.value)}
                                className={`${inputClass} !px-2 !py-1.5`}
                              />
                            </div>

                            {/* Priority */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Priority</label>
                              <select
                                value={override.priority || "Medium"}
                                onChange={(e) => updateTaskOverride(idx, "priority", e.target.value)}
                                className={`${inputClass} !px-2 !py-1.5`}
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                              </select>
                            </div>

                            {/* Assigned Date */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Assigned Date</label>
                              <input
                                type="date"
                                value={override.assignedDate || meetingDate}
                                onChange={(e) => updateTaskOverride(idx, "assignedDate", e.target.value)}
                                className={`${inputClass} !px-2 !py-1.5`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer with Select All and action buttons */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedActionItems.size === actionItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedActionItems(new Set(actionItems.map((_, i) => i)));
                      } else {
                        setSelectedActionItems(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                  Select All ({actionItems.length})
                </label>
                <div className="flex gap-3">
                  <Button onClick={() => setShowTaskConversion(false)} variant="secondary">Cancel</Button>
                  <Button
                    onClick={createTasksFromActions}
                    variant="primary"
                    disabled={selectedActionItems.size === 0 || loading}
                  >
                    {loading ? <FaSpinner className="animate-spin mr-1" /> : null}
                    Create {selectedActionItems.size} Task(s)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }


    </div >
  );
}

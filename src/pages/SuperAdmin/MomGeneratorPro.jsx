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
import VoiceInput from "../../components/Common/VoiceInput";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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

      // Prefetch next MOM number for header display so user sees MOM_00X immediately
      try {
        let nextNumber = 1;
        const qn = query(collection(db, "moms"), limit(200));
        const snap = await getDocs(qn);
        snap.forEach((d) => {
          const data = d.data() || {};
          const existing = String(data.momNo || "");
          const match = existing.match(/MOM_(\d+)/i);
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
      // After (re)generation, we are working with potentially changed content
      // so mark this as an edit session; Save visibility is driven by snapshot diff.
      setEditSession(true);
      toast.success("MOM generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate MOM");
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
          const qn = query(collection(db, "moms"), limit(200));
          const snap = await getDocs(qn);
          snap.forEach((d) => {
            const data = d.data() || {};
            const existing = String(data.momNo || "");
            const match = existing.match(/MOM_(\d+)/i);
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

      // Additionally, save a PDF snapshot as a document in knowledge management for this project
      let momDocRef = null;
      try {
        const safeProject = (selectedProject?.name || "Project").replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );
        const baseName = `${momNo}_${safeProject}_${meetingDate || ""}`;
        const filename = `${baseName}.pdf`;
        const storagePath = `Documents/${projectId}/${filename}`;
        const storageRef = ref(storage, storagePath);

        // Render the current MoM DOM into a PDF using html2canvas + jsPDF
        const element = momRef.current;
        if (!element) {
          throw new Error("MOM content not found for PDF generation");
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          logging: false,
          useCORS: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const pdfDoc = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdfDoc.internal.pageSize.getWidth();
        const pdfHeight = pdfDoc.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdfDoc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdfDoc.addPage();
          pdfDoc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const pdfBlob = pdfDoc.output("blob");

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

        const knowledgeDocRef = await addDoc(collection(db, "knowldge", projectId, "Documents"), {
          name: `${momNo} – ${selectedProject?.name || "Project"}`,
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
          tags: [],
          children: 0,
          projectId,
          momNo,
          momId: "", // will be set after moms metadata doc is created
          createdByUid: currentUser?.uid || "",
          createdByName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // After knowledge doc and storage are created, write minimal metadata into moms node
        momDocRef = await addDoc(collection(db, "moms"), {
          projectId: projectId || "",
          momNo,
          storagePath,
          url: downloadURL,
          createdAt: Timestamp.now(),
        });
      } catch (err) {
        console.error("Failed to save MOM document into knowledge documents", err);
      }

      toast.success(`${momNo} saved`);
      setMomVersion((v) => v + 1);
      setLastSavedSnapshot(currentSnapshot);
      setEditSession(false);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaveLoading(false);
    }
  };

  // TXT download function removed; MOM is now persisted as PDF only

  // PDF export (html2pdf.js via CDN) - REPLACED with local jsPDF + html2canvas
  const handleExportPDF = async () => {
    if (!isGenerated) return toast.error("Generate MOM first");
    const element = momRef.current;
    if (!element) return toast.error("Document content not found");

    const toastId = toast.loading("Generating PDF...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const filename = `MOM_${selectedProject?.name || "Project"}_${meetingDate}.pdf`;
      pdf.save(filename);
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
              variant="primary"
              disabled={loading}
              className="flex items-center gap-2 whitespace-nowrap"
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
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-[101]">
                      {showSave && (
                        <button
                          onClick={() => {
                            if (disableSave) return;
                            setShowSaveConfirm(true);
                          }}
                          disabled={disableSave}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${disableSave
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          <FaSave
                            className={`flex-shrink-0 ${disableSave ? "text-gray-400" : "text-indigo-600"
                              }`}
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
                          handleExportPDF();
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
                          handlePrint();
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
      </div>

      {/* Save confirmation modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Save MOM?</h2>
            <p className="text-sm text-gray-600 mb-4">
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
                variant="primary"
                onClick={async () => {
                  if (saveLoading || disableSave) return;
                  await saveMom();
                  setShowSaveConfirm(false);
                  setShowActionsMenu(false);
                }}
                disabled={saveLoading || disableSave}
                className="flex items-center gap-2"
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
                    <VoiceInput
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
                  <VoiceInput
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
                    MoM Prepared by*
                  </label>
                  <VoiceInput
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
                <VoiceInput
                  value={newDiscussionTopic}
                  onChange={(e) => setNewDiscussionTopic(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  placeholder="Discussion topic (required)..."
                  spellCheck="true"
                />
                <VoiceInput
                  as="textarea"
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
            <Card title="Next Action Plan (Drag to Reorder)*">
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
                <VoiceInput
                  value={newActionTask}
                  onChange={(e) => setNewActionTask(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                  placeholder="Task description..."
                  spellCheck="true"
                />
                <VoiceInput
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
                    {inputDiscussions.map((d, idx) => (
                      <tr key={idx}>
                        <td
                          className="px-4 py-2 font-bold"
                          style={{ border: "1px solid #000000" }}
                        >
                          {idx + 1}. {d.topic}
                        </td>
                      </tr>
                    ))}
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
              <div className="mb-8">
                <h2
                  className="text-lg font-bold mb-3"
                  style={{ color: "#000000" }}
                >
                  Next Action Plan:
                </h2>
                <table
                  className="w-full border-collapse text-sm"
                  style={{ border: "1px solid #000000" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      <th
                        className="px-4 py-2 text-left font-bold"
                        style={{ border: "1px solid #000000" }}
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
                          className="px-4 py-2 font-bold"
                          style={{ border: "1px solid #000000" }}
                        >
                          {a.task}
                        </td>
                        <td
                          className="px-4 py-2"
                          style={{ border: "1px solid #000000" }}
                        >
                          {a.responsiblePerson}
                        </td>
                        <td
                          className="px-4 py-2"
                          style={{ border: "1px solid #000000" }}
                        >
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
    </div>
  );
}

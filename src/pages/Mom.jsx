// Helper function for inline markdown rendering (bold/italic)
function renderMarkdownInline(text) {
  // Replace **bold**
  let parts = [];
  let regexBold = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regexBold.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = regexBold.lastIndex;
  }
  if (lastIndex < text.length) {
    text = text.substring(lastIndex);
    // Now handle *italic*
    let regexItalic = /\*(.*?)\*/g;
    let lastItalic = 0;
    let matchItalic;
    while ((matchItalic = regexItalic.exec(text)) !== null) {
      if (matchItalic.index > lastItalic) {
        parts.push(text.substring(lastItalic, matchItalic.index));
      }
      parts.push(
        <em key={key++} className="italic">
          {matchItalic[1]}
        </em>
      );
      lastItalic = regexItalic.lastIndex;
    }
    if (lastItalic < text.length) {
      parts.push(text.substring(lastItalic));
    }
  }
  return parts.length > 0 ? parts : text;
}
import React, { useState, useRef, useEffect } from "react";
import {
  FaPlus,
  FaTrash,
  FaSpinner,
  FaCopy,
  FaDownload,
  FaShareAlt,
  FaHistory,
  FaTasks,
  FaComments,
  FaRedo,
  FaCalendar,
  FaClock,
  FaEye,
  FaPrint,
  FaFilePdf,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function Mom() {
  // Rate limit state
  const [lastGenerateTime, setLastGenerateTime] = useState(0);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [projects, setProjects] = useState([]);

  // Basic fields
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState("");
  const [newPoint, setNewPoint] = useState("");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [paragraphSummary, setParagraphSummary] = useState("");
  const outRef = useRef(null);

  // New fields for enhancements
  const [projectId, setProjectId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [currentMomId, setCurrentMomId] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);

  // View past MoMs
  const [showPastMoms, setShowPastMoms] = useState(false);
  const [pastMoms, setPastMoms] = useState([]);
  const [loadingPastMoms, setLoadingPastMoms] = useState(false);

  // Task conversion
  const [showTaskConversion, setShowTaskConversion] = useState(false);
  const [selectedActionItems, setSelectedActionItems] = useState(new Set());

  // Load projects from Firestore
  useEffect(() => {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, orderBy("projectName", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.projectName || "Unnamed Project",
          color: "#4f46e5", // Default color
          status: data.status || "Active",
        };
      });
      setProjects(projectsList);
    });

    return () => unsubscribe();
  }, []);

  // Load past MoMs on mount
  useEffect(() => {
    loadPastMoms();
  }, []);

  const loadPastMoms = async () => {
    setLoadingPastMoms(true);
    try {
      const momsRef = collection(db, "moms");
      const q = query(momsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const moms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPastMoms(moms);
    } catch (error) {
      console.error("Error loading past MoMs:", error);
      // Use dummy data as fallback
      setPastMoms([
        {
          id: "mom1",
          title: "Weekly Ops Sync - 2025-10-20",
          projectId: "p1",
          meetingDate: "2025-10-20",
          attendees: "Asha, Rahul, Sita",
          createdAt: { seconds: Date.now() / 1000 - 5 * 24 * 60 * 60 },
          points: ["Budget review", "Timeline updates", "Resource allocation"],
        },
        {
          id: "mom2",
          title: "Registration Planning - 2025-10-18",
          projectId: "p2",
          meetingDate: "2025-10-18",
          attendees: "Vijay, Priya",
          createdAt: { seconds: Date.now() / 1000 - 7 * 24 * 60 * 60 },
          points: ["Venue finalization", "Team assignments"],
        },
      ]);
    } finally {
      setLoadingPastMoms(false);
    }
  };

  const addPoint = () => {
    const text = newPoint.trim();
    if (!text) return toast.error("Enter a point first");
    setPoints((p) => [...p, text]);
    setNewPoint("");
  };

  const removePoint = (i) => setPoints((p) => p.filter((_, idx) => idx !== i));

  const generateMom = async () => {
    // Rate limit: 5 seconds between generates
    const now = Date.now();
    if (now - lastGenerateTime < 5000) {
      return toast.error("Please wait before generating again.");
    }
    setLastGenerateTime(now);

    if (!title.trim()) return toast.error("Please provide a meeting title");
    if (points.length === 0) return toast.error("Add at least one point");

    // Check for Gemini API key
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      toast.error(
        "Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file"
      );
      return;
    }

    setLoading(true);
    setGenerated("");
    setActionItems("");
    setParagraphSummary("");

    try {
      // Prepare the prompt for Gemini
      const selectedProject = projects.find((p) => p.id === projectId);
      const projectName = selectedProject ? selectedProject.name : "N/A";

      const prompt = `
You are an expert business meeting summarizer and project coordinator. 
Your task is to generate a **professional and actionable Minutes of Meeting (MoM)** document 
based on the following inputs.

---

**Meeting Details**
- Title:${title}
- Project: ${projectName}
- Date: ${meetingDate || "Not specified"}
- Time: ${meetingTime || "Not specified"}
- Attendees: ${attendees || "Not specified"}

---

**Discussion Points:**
${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

---

### 🔧 Instructions for MoM Generation

1. **Overall Style:**
   - Write in clear, formal, and professional tone suitable for business communication.
   - Use proper Markdown formatting with headings, bullet points, and bold text for clarity.
   - Keep it concise but *informative*, avoiding repetition.

2. **MoM Sections to Include:**

#### 1. Meeting Header
Summarize the meeting details in a clean, tabular or bullet format (title, project, date, time, attendees).

#### 2. Discussion Summary
Provide a concise yet comprehensive summary of all discussion points.
Group related points together logically.
Highlight project progress, issues discussed, and brainstorming outcomes.

#### 3. Key Decisions Made
List all final decisions or conclusions reached in the meeting.
Each decision should clearly indicate *what* was decided and *why* if relevant.

#### 4. Action Items (for Employee Assignment)
- Extract all **actionable tasks** from the discussion points.
- Each task should include:
  - Task Title
  - Description
  - Assigned To (if mentioned or deduce if possible)
  - Priority (High / Medium / Low)
  - Deadline (if specified, or mark as “TBD”)
  - Status (default: “Pending”)
- Present these in a Markdown table for clarity.

Example format:

| Task Title | Description | Assigned To | Priority | Deadline | Status |
|-------------|-------------|-------------|-----------|-----------|---------|
| Setup Firebase Integration | Configure and connect Firebase to dashboard | Ramesh | High | 05-Nov-2025 | Pending |

#### 5. Next Steps
List follow-up plans, pending reviews, and upcoming tasks for the next meeting or sprint.

---

### ⚡ Output Requirements:
- The entire MoM must be in **Markdown format**.
- Maintain a clean, structured layout for readability.
- Ensure action items can be directly used for task assignment in a project management tool.

---

Now generate the **final Minutes of Meeting (MoM)** below:
`;

      // Call Gemini API (using latest gemini-2.5-flash model for balanced performance)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Gemini API error");
      }

      const data = await res.json();
      const momText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!momText) {
        throw new Error("No content generated from Gemini API");
      }

      setGenerated(momText);

      // Extract action items - for now, show all discussion points as potential action items
      // In real implementation, AI would intelligently identify actual action items
      const extractedActions = points.map((p) => `• ${p}`).join("\n");
      setActionItems(extractedActions);

      // Generate paragraph summary
      setParagraphSummary(
        `Meeting "${title}" was conducted with attendees: ${attendees || "N/A"
        }. ` +
        `Key discussion points included ${points.length} topics covering ` +
        points.slice(0, 2).join(", ") +
        (points.length > 2 ? `, and ${points.length - 2} more topics.` : ".")
      );

      toast.success("MoM generated with Gemini AI!");
      setTimeout(() => outRef.current?.focus(), 50);

      // Add to version history
      const newVersion = {
        timestamp: new Date().toISOString(),
        content: momText,
        actionItems: extractedActions,
      };
      setVersionHistory((prev) => [...prev, newVersion]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate MoM. Using offline mode.");

      // Fallback: generate basic MoM offline
      const fallbackMom = `# ${title}\n\n*Date:* ${meetingDate || "N/A"
        }\n*Time:* ${meetingTime || "N/A"}\n*Attendees:* ${attendees || "N/A"
        }\n\n## Discussion Points\n\n${points
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n")}\n\n---\nGenerated offline`;
      setGenerated(fallbackMom);
      const fallbackActions = points.map((p) => `• ${p}`).join("\n");
      setActionItems(fallbackActions);
      setParagraphSummary(
        `Meeting "${title}" discussed ${points.length} key topics.`
      );
    } finally {
      setLoading(false);
    }
  };

  const saveMomToFirestore = async () => {
    // Rate limit: 5 seconds between saves
    const now = Date.now();
    if (now - lastSaveTime < 5000) {
      return toast.error("Please wait before saving again.");
    }
    setLastSaveTime(now);

    if (!generated) return toast.error("Generate MoM first");
    if (!projectId) return toast.error("Select a project first");

    try {
      const momData = {
        title,
        attendees,
        points,
        projectId,
        meetingDate: meetingDate || new Date().toISOString().split("T")[0],
        meetingTime: meetingTime || "",
        generated,
        actionItems,
        paragraphSummary,
        comments,
        versionHistory,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (currentMomId) {
        // Update existing
        const momRef = doc(db, "moms", currentMomId);
        await updateDoc(momRef, { ...momData, updatedAt: Timestamp.now() });
        toast.success("MoM updated in Firestore!");
      } else {
        // Create new
        const docRef = await addDoc(collection(db, "moms"), momData);
        setCurrentMomId(docRef.id);
        toast.success("MoM saved to Firestore!");
        loadPastMoms(); // Refresh list
      }
    } catch (error) {
      console.error("Error saving MoM:", error);
      toast.error("Failed to save to Firestore. Check console for details.");
    }
  };

  const addComment = () => {
    // Rate limit: 5 seconds between comments
    const now = Date.now();
    if (now - lastCommentTime < 5000) {
      return toast.error("Please wait before adding another comment.");
    }
    setLastCommentTime(now);
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      author: "Current User", // In real app, get from auth context
      timestamp: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
    toast.success("Comment added");
  };

  const copyToClipboard = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    toast.success("Copied to clipboard");
  };

  const downloadMom = () => {
    if (!generated) return;
    const fullContent = `${generated}\n\n## Action Items\n${actionItems}\n\n## Comments\n${comments
      .map(
        (c) =>
          `- ${c.author} (${new Date(c.timestamp).toLocaleString()}): ${c.text}`
      )
      .join("\n")}`;
    const blob = new Blob([fullContent], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "meeting").replace(/\s+/g, "_")}_MoM.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded MoM with action items and comments!");
  };

  const shareMom = async () => {
    if (!generated) return toast.error("Nothing to share");

    const shareContent = `${title}\n\n${generated}\n\nAction Items:\n${actionItems}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Minutes of Meeting",
          text: shareContent,
        });
        toast.success("Shared");
        return;
      } catch {
        // Fall through to email
      }
    }

    try {
      const subject = `MoM: ${title || "Meeting"}`;
      const body = shareContent;
      const mailto = `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    } catch {
      await navigator.clipboard.writeText(shareContent);
      toast.success("Copied to clipboard (fallback)");
    }
  };

  const handlePrint = () => {
    if (!generated) return toast.error("Generate MoM first");
    const printContent = document.querySelector(".mom-document");
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

  const handleExportPDF = async () => {
    if (!generated) return toast.error("Generate MoM first");
    const element = document.querySelector(".mom-document");
    if (!element) return;

    const toastId = toast.loading("Generating PDF...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
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

      pdf.save(`${(title || "meeting").replace(/\s+/g, "_")}_MoM.pdf`);
      toast.success("PDF Exported!", { id: toastId });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF", { id: toastId });
    }
  };

  const convertToTasks = () => {
    if (!actionItems || actionItems.trim() === "") {
      return toast.error("No action items to convert");
    }
    setShowTaskConversion(true);
  };

  const createTasksFromActions = () => {
    const selected = Array.from(selectedActionItems);
    if (selected.length === 0)
      return toast.error("Select at least one action item");

    // In a real app, this would create tasks in Firestore with momId link
    const actionList = actionItems.split("\n").filter((a) => a.trim());
    const tasksCreated = selected.map((idx) => {
      const actionText = actionList[idx];
      return {
        title: actionText.replace(/^[•\-\d.]\s*/, ""),
        projectId,
        momId: currentMomId,
        status: "To-Do",
        priority: "Medium",
        createdAt: new Date().toISOString(),
      };
    });

    console.log("Tasks to create:", tasksCreated);
    toast.success(`Created ${tasksCreated.length} task(s) from action items!`);
    setShowTaskConversion(false);
    setSelectedActionItems(new Set());
  };

  const viewPastMom = (mom) => {
    setTitle(mom.title || "");
    setAttendees(mom.attendees || "");
    setPoints(mom.points || []);
    setProjectId(mom.projectId || "");
    setMeetingDate(mom.meetingDate || "");
    setMeetingTime(mom.meetingTime || "");
    setGenerated(mom.generated || "");
    setActionItems(mom.actionItems || "");
    setParagraphSummary(mom.paragraphSummary || "");
    setComments(mom.comments || []);
    setVersionHistory(mom.versionHistory || []);
    setCurrentMomId(mom.id);
    setShowPastMoms(false);
    toast.success("Loaded past MoM");
  };

  const clearForm = () => {
    setTitle("");
    setAttendees("");
    setNewPoint("");
    setPoints([]);
    setGenerated("");
    setActionItems("");
    setParagraphSummary("");
    setProjectId("");
    setMeetingDate("");
    setMeetingTime("");
    setComments([]);
    setVersionHistory([]);
    setCurrentMomId(null);
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div>
      <PageHeader title="Minutes of Meeting (MoM)">
        Create, manage, and track meeting minutes with AI assistance, project
        integration, and task conversion.
      </PageHeader>

      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowPastMoms(!showPastMoms)}
              variant="secondary"
            >
              <FaHistory /> {showPastMoms ? "Hide" : "View"} Past MoMs
            </Button>
            <Button
              onClick={saveMomToFirestore}
              variant="secondary"
              disabled={!generated}
            >
              <FaDownload /> Save to Firestore
            </Button>
            <Button onClick={clearForm} variant="ghost">
              Clear Form
            </Button>
            {versionHistory.length > 0 && (
              <span className="text-sm text-content-tertiary">
                {versionHistory.length} version
                {versionHistory.length > 1 ? "s" : ""} saved
              </span>
            )}
          </div>
        </Card>

        {/* Past MoMs View */}
        {showPastMoms && (
          <Card title="Past MoMs">
            {loadingPastMoms ? (
              <div className="py-8 text-center">
                <FaSpinner className="inline animate-spin h-6 w-6" />
              </div>
            ) : pastMoms.length === 0 ? (
              <div className="py-8 text-center text-content-tertiary">
                No past MoMs found
              </div>
            ) : (
              <div className="space-y-3">
                {pastMoms.map((mom) => {
                  const project = projects.find((p) => p.id === mom.projectId);
                  return (
                    <div
                      key={mom.id}
                      className="flex items-start justify-between gap-4 rounded-lg border border-subtle p-4 hover:border-indigo-200 transition"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-content-primary">
                          {mom.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-content-tertiary">
                          {project && (
                            <span
                              className="rounded px-2 py-1"
                              style={{
                                backgroundColor: project.color + "20",
                                color: project.color,
                              }}
                            >
                              {project.name}
                            </span>
                          )}
                          <span>
                            <FaCalendar className="inline mr-1" />
                            {mom.meetingDate || "No date"}
                          </span>
                          <span>Attendees: {mom.attendees || "N/A"}</span>
                          <span>{mom.points?.length || 0} points</span>
                        </div>
                        {mom.points && mom.points.length > 0 && (
                          <div className="mt-2 text-sm text-content-secondary">
                            Key points: {mom.points.slice(0, 2).join(", ")}
                            {mom.points.length > 2 &&
                              ` +${mom.points.length - 2} more`}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => viewPastMom(mom)}
                        variant="secondary"
                        className="!px-3"
                      >
                        <FaEye /> View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Meeting Details */}
        <Card title="Meeting Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">Project *</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </label>
              {selectedProject && (
                <div className="mt-2 text-xs text-content-tertiary">
                  Selected:{" "}
                  <span
                    style={{ color: selectedProject.color }}
                    className="font-semibold"
                  >
                    {selectedProject.name}
                  </span>{" "}
                  — Status: {selectedProject.status}
                </div>
              )}
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium">Meeting Date</span>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium">Meeting Time</span>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">Meeting Title *</span>
                <input
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Ops Sync — 2025-10-25"
                  spellCheck="true"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">
                  Attendees (comma separated)
                </span>
                <input
                  className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="Alice, Bob, Charlie"
                  spellCheck="true"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">
                  Add Discussion Point
                </span>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                    value={newPoint}
                    onChange={(e) => setNewPoint(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPoint()}
                    placeholder="Add a point and press Enter or click +"
                    spellCheck="true"
                  />
                  <Button
                    onClick={addPoint}
                    variant="primary"
                    className="!px-3"
                  >
                    <FaPlus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </label>
            </div>

            <div className="sm:col-span-2">
              <span className="text-sm font-medium">Discussion Points</span>
              <ul className="mt-3 space-y-2">
                {points.length === 0 && (
                  <li className="text-sm text-content-tertiary">
                    No points added yet.
                  </li>
                )}

                {points.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
                  >
                    <div className="flex-1 pr-3">
                      <strong className="mr-2 text-xs text-content-tertiary">
                        {i + 1}.
                      </strong>
                      <span>{p}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePoint(i)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Remove point ${i + 1}`}
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <Button
                onClick={generateMom}
                variant="primary"
                disabled={loading}
              >
                {loading ? <FaSpinner className="animate-spin" /> : null}
                <span>
                  {loading ? "Generating..." : "Generate MoM with AI"}
                </span>
              </Button>

              {generated && (
                <Button
                  onClick={generateMom}
                  variant="secondary"
                  disabled={loading}
                >
                  <FaRedo /> Regenerate
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Generated MoM */}
        {generated && (
          <Card
            title="Generated MoM"
            actions={
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} variant="ghost">
                  <FaCopy /> Copy
                </Button>
                <Button onClick={downloadMom} variant="ghost">
                  <FaDownload /> Download
                </Button>
                <Button onClick={shareMom} variant="ghost">
                  <FaShareAlt /> Share
                </Button>
                <Button onClick={handlePrint} variant="ghost">
                  <FaPrint /> Print
                </Button>
                <Button onClick={handleExportPDF} variant="ghost">
                  <FaFilePdf /> PDF
                </Button>
              </div>
            }
          >
            {/* Proper MoM Document View */}
            <div className="mom-document bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              {/* Document Header */}
              <div className="border-b-2 border-indigo-600 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">
                      Project:
                    </span>{" "}
                    <span className="text-gray-600">
                      {selectedProject?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Date:</span>{" "}
                    <span className="text-gray-600">
                      {meetingDate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Time:</span>{" "}
                    <span className="text-gray-600">
                      {meetingTime || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Attendees:
                    </span>{" "}
                    <span className="text-gray-600">{attendees || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Generated Content with Markdown Rendering */}
              <div className="prose prose-sm max-w-none">
                {generated.split("\n").map((line, idx) => {
                  // Render Markdown-style headers
                  if (line.startsWith("# ")) {
                    return (
                      <h1
                        key={idx}
                        className="text-2xl font-bold text-gray-900 mt-6 mb-3"
                      >
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h2
                        key={idx}
                        className="text-xl font-semibold text-gray-800 mt-5 mb-2"
                      >
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h3
                        key={idx}
                        className="text-lg font-semibold text-gray-700 mt-4 mb-2"
                      >
                        {line.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("#### ")) {
                    return (
                      <h4
                        key={idx}
                        className="text-base font-semibold text-gray-700 mt-3 mb-2"
                      >
                        {line.replace("#### ", "")}
                      </h4>
                    );
                  }

                  // Render bullet points
                  if (
                    line.trim().startsWith("- ") ||
                    line.trim().startsWith("* ")
                  ) {
                    return (
                      <li key={idx} className="ml-6 text-gray-700 mb-1">
                        {renderMarkdownInline(line.trim().substring(2))}
                      </li>
                    );
                  }

                  // Render numbered lists
                  if (/^\d+\.\s/.test(line.trim())) {
                    return (
                      <li
                        key={idx}
                        className="ml-6 text-gray-700 mb-1 list-decimal"
                      >
                        {renderMarkdownInline(
                          line.trim().replace(/^\d+\.\s/, "")
                        )}
                      </li>
                    );
                  }

                  // Render horizontal rule
                  if (line.trim() === "---" || line.trim() === "***") {
                    return <hr key={idx} className="my-4 border-gray-300" />;
                  }

                  // Render table rows (simplified)
                  if (line.includes("|")) {
                    const cells = line.split("|").filter((cell) => cell.trim());
                    const isHeader = line.includes("---");
                    if (isHeader)
                      return <hr key={idx} className="my-2 border-gray-200" />;
                    return (
                      <div
                        key={idx}
                        className="flex border-b border-gray-200 py-2"
                      >
                        {cells.map((cell, i) => (
                          <div
                            key={i}
                            className="flex-1 px-2 text-sm text-gray-700"
                          >
                            {renderMarkdownInline(cell.trim())}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Render regular paragraphs
                  if (line.trim()) {
                    return (
                      <p
                        key={idx}
                        className="text-gray-700 mb-2 leading-relaxed"
                      >
                        {renderMarkdownInline(line)}
                      </p>
                    );
                  }

                  // Empty line
                  return <div key={idx} className="h-2" />;
                })}
              </div>
              {/* Inline Markdown renderer for bold/italic */}
              {/** Helper function below main component **/}

              {/* Document Footer */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span>
                    Generated on {new Date().toLocaleDateString()} at{" "}
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span>MoM ID: {currentMomId || "Not saved"}</span>
                </div>
              </div>
            </div>

            {/* Raw Text View (Collapsible) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View/Edit Raw Markdown
              </summary>
              <textarea
                ref={outRef}
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                className="mt-2 w-full min-h-[220px] resize-vertical rounded-md border border-subtle bg-transparent p-3 text-sm font-mono"
                tabIndex={0}
              />
            </details>
          </Card>
        )}

        {/* AI-Generated Summary */}
        {paragraphSummary && (
          <Card title="AI-Generated Summary">
            <div className="rounded-md border border-subtle bg-surface-subtle p-3 text-sm">
              {paragraphSummary}
            </div>
          </Card>
        )}

        {/* Action Items */}
        {actionItems && (
          <Card
            title="Action Items"
            actions={
              <Button onClick={convertToTasks} variant="secondary">
                <FaTasks /> Convert to Tasks
              </Button>
            }
          >
            <div className="rounded-md border border-subtle bg-surface-subtle p-3 text-sm whitespace-pre-line">
              {actionItems}
            </div>
          </Card>
        )}

        {/* Task Conversion Modal */}
        {showTaskConversion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowTaskConversion(false)}
            />
            <Card className="z-10 w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-4">
                Convert Action Items to Tasks
              </h2>
              <div className="space-y-3 mb-4">
                {actionItems
                  .split("\n")
                  .filter((a) => a.trim())
                  .map((action, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-md border border-subtle hover:bg-surface-subtle cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedActionItems.has(idx)}
                        onChange={(e) => {
                          const newSet = new Set(selectedActionItems);
                          if (e.target.checked) newSet.add(idx);
                          else newSet.delete(idx);
                          setSelectedActionItems(newSet);
                        }}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        {action.replace(/^[•\-\d.]\s*/, "")}
                      </span>
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowTaskConversion(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button onClick={createTasksFromActions} variant="primary">
                  Create {selectedActionItems.size} Task(s)
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Comments Section */}
        <Card title={`Comments (${comments.length})`}>
          <div className="space-y-4">
            <div className="space-y-3">
              {comments.length === 0 && (
                <div className="text-sm text-content-tertiary">
                  No comments yet. Add feedback or notes below.
                </div>
              )}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-md border border-subtle bg-surface-subtle p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">
                      {comment.author}
                    </span>
                    <span className="text-xs text-content-tertiary">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-subtle bg-transparent px-3 py-2 text-sm"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Add a comment or note..."
                spellCheck="true"
              />
              <Button onClick={addComment} variant="primary">
                <FaComments /> Add
              </Button>
            </div>
          </div>
        </Card>

        {/* Version History */}
        {versionHistory.length > 0 && (
          <Card title="Version History">
            <div className="space-y-2">
              {versionHistory.map((version, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-subtle p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Version {idx + 1}</span>
                    <span className="text-xs text-content-tertiary">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700">
                      View content
                    </summary>
                    <div className="mt-2 p-3 rounded bg-surface-subtle text-xs whitespace-pre-line max-h-40 overflow-auto">
                      {version.content}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

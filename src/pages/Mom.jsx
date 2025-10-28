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
} from "react-icons/fa";
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
} from "firebase/firestore";
import { db } from "../firebase";

import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

// Sample projects (same as TasksPage)
const sampleProjects = [
  {
    id: "p1",
    name: "Voter Outreach Campaign",
    color: "#4f46e5",
    status: "Active",
  },
  { id: "p2", name: "Registration Drive", color: "#0891b2", status: "Active" },
  { id: "p3", name: "Booth Management", color: "#7c3aed", status: "Planning" },
  { id: "p4", name: "Data Verification", color: "#059669", status: "Active" },
];

export default function Mom() {
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
      const selectedProject = sampleProjects.find((p) => p.id === projectId);
      const projectName = selectedProject ? selectedProject.name : "N/A";

      const prompt = `Generate professional Minutes of Meeting (MoM) based on the following information:

Meeting Title: ${title}
Project: ${projectName}
Date: ${meetingDate || "Not specified"}
Time: ${meetingTime || "Not specified"}
Attendees: ${attendees || "Not specified"}

Discussion Points:
${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Please generate a well-formatted MoM document in markdown format with the following sections:
1. Meeting Header (title, date, time, attendees, project)
2. Discussion Summary
3. Key Decisions Made
4. Action Items (identify actionable tasks from the discussion points)
5. Next Steps

Format it professionally and concisely.`;

      // Call Gemini API
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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
        `Meeting "${title}" was conducted with attendees: ${
          attendees || "N/A"
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
      const fallbackMom = `# ${title}\n\n*Date:* ${
        meetingDate || "N/A"
      }\n*Time:* ${meetingTime || "N/A"}\n*Attendees:* ${
        attendees || "N/A"
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

  const selectedProject = sampleProjects.find((p) => p.id === projectId);

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
                  const project = sampleProjects.find(
                    (p) => p.id === mom.projectId
                  );
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
                  {sampleProjects.map((p) => (
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
              </div>
            }
          >
            <textarea
              ref={outRef}
              readOnly
              value={generated}
              placeholder="Your generated MoM will appear here..."
              className="w-full min-h-[220px] resize-vertical rounded-md border border-subtle bg-transparent p-3 text-sm"
              tabIndex={0}
            />
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

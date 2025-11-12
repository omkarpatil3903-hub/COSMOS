import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaTrash,
  FaSave,
  FaDownload,
  FaPrint,
  FaSpinner,
  FaFileAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function MomNew() {
  // Data from Firestore
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Meeting metadata
  const [projectId, setProjectId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");
  const [meetingVenue, setMeetingVenue] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [momPreparedBy, setMomPreparedBy] = useState("");

  // Discussion points (user input)
  const [inputDiscussions, setInputDiscussions] = useState([]);
  const [newDiscussionTopic, setNewDiscussionTopic] = useState("");
  const [newDiscussionNotes, setNewDiscussionNotes] = useState("");

  // Action items (user input)
  const [inputActionItems, setInputActionItems] = useState([]);
  const [newActionTask, setNewActionTask] = useState("");
  const [newActionPerson, setNewActionPerson] = useState("");
  const [newActionDeadline, setNewActionDeadline] = useState("");

  // AI Generated content
  const [discussions, setDiscussions] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Load projects
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "projects"), orderBy("projectName", "asc")),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().projectName || "Unnamed Project",
        }));
        setProjects(list);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load users
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "users"), orderBy("name", "asc")),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown User",
        }));
        setUsers(list);
      }
    );
    return () => unsubscribe();
  }, []);

  const addDiscussion = () => {
    if (!newDiscussionTopic.trim())
      return toast.error("Enter discussion topic");
    if (!newDiscussionNotes.trim())
      return toast.error("Enter discussion notes");
    setInputDiscussions([
      ...inputDiscussions,
      { topic: newDiscussionTopic.trim(), notes: newDiscussionNotes.trim() },
    ]);
    setNewDiscussionTopic("");
    setNewDiscussionNotes("");
  };

  const removeDiscussion = (index) => {
    setInputDiscussions(inputDiscussions.filter((_, i) => i !== index));
  };

  const addActionItem = () => {
    if (!newActionTask.trim()) return toast.error("Enter task");
    if (!newActionPerson) return toast.error("Select responsible person");
    if (!newActionDeadline) return toast.error("Select deadline");
    const person = users.find((u) => u.id === newActionPerson);
    setInputActionItems([
      ...inputActionItems,
      {
        task: newActionTask.trim(),
        responsiblePerson: person?.name || "",
        responsiblePersonId: newActionPerson,
        deadline: newActionDeadline,
      },
    ]);
    setNewActionTask("");
    setNewActionPerson("");
    setNewActionDeadline("");
  };

  const removeActionItem = (index) => {
    setInputActionItems(inputActionItems.filter((_, i) => i !== index));
  };

  const toggleAttendee = (userId) => {
    if (attendees.includes(userId)) {
      setAttendees(attendees.filter((id) => id !== userId));
    } else {
      setAttendees([...attendees, userId]);
    }
  };

  const generateMomWithAI = async () => {
    // Validation
    if (!projectId) return toast.error("Select a project");
    if (!meetingDate) return toast.error("Enter meeting date");
    if (attendees.length === 0)
      return toast.error("Select at least one attendee");
    if (inputDiscussions.length === 0)
      return toast.error("Add at least one discussion point");
    if (inputActionItems.length === 0)
      return toast.error("Add at least one action item");

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return toast.error(
        "Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env file"
      );
    }

    setLoading(true);

    try {
      const selectedProject = projects.find((p) => p.id === projectId);
      const attendeeNames = attendees
        .map((id) => users.find((u) => u.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      const prompt = `You are an expert meeting facilitator. Enhance and format the following meeting notes into professional Minutes of Meeting.

**Meeting Details:**
- Project: ${selectedProject?.name || "N/A"}
- Date: ${meetingDate}
- Time: ${meetingStartTime} to ${meetingEndTime}
- Venue: ${meetingVenue || "N/A"}
- Attendees: ${attendeeNames}

**Discussion Points (provided by user):**
${inputDiscussions
  .map((d, i) => `${i + 1}. ${d.topic}\\n   Notes: ${d.notes}`)
  .join("\\n\\n")}

**Action Items (provided by user):**
${inputActionItems
  .map((a, i) => `${i + 1}. ${a.task} | ${a.responsiblePerson} | ${a.deadline}`)
  .join("\\n")}

**Instructions:**
Enhance and expand the above content. Make it more professional and detailed while keeping the core information.

**IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no code blocks):**

{
  "discussions": [
    {
      "topic": "Enhanced topic from user input",
      "notes": "• Expanded point 1\\n• Expanded point 2\\n• Additional professional details\\n• Key decisions and outcomes"
    }
  ],
  "actionItems": [
    {
      "task": "Enhanced task description with more clarity",
      "responsiblePerson": "Person name from user input",
      "deadline": "YYYY-MM-DD from user input"
    }
  ]
}

Enhance the content to be more professional and detailed. Keep all original information but make it more comprehensive.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Gemini API error");
      }

      const data = await res.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!responseText) throw new Error("No content generated");

      // Parse JSON (remove markdown code blocks if present)
      const jsonText = responseText
        .replace(/```json\\n?/g, "")
        .replace(/```\\n?/g, "")
        .trim();
      const parsed = JSON.parse(jsonText);

      if (parsed.discussions && Array.isArray(parsed.discussions)) {
        setDiscussions(parsed.discussions);
      }

      if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
        // Map person names to user IDs
        const mappedActions = parsed.actionItems.map((action) => {
          const user = users.find(
            (u) =>
              u.name.toLowerCase() === action.responsiblePerson.toLowerCase()
          );
          return {
            task: action.task,
            responsiblePerson: user?.name || action.responsiblePerson,
            responsiblePersonId: user?.id || attendees[0],
            deadline: action.deadline,
          };
        });
        setActionItems(mappedActions);
      }

      setIsGenerated(true);
      toast.success("MOM generated successfully with AI!");
    } catch (err) {
      console.error("AI Generation Error:", err);
      toast.error("Failed to generate MOM. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const saveMom = async () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    try {
      const selectedProject = projects.find((p) => p.id === projectId);
      await addDoc(collection(db, "moms"), {
        projectId,
        projectName: selectedProject?.name || "",
        meetingDate,
        meetingStartTime,
        meetingEndTime,
        meetingVenue,
        attendees,
        momPreparedBy,
        inputDiscussions,
        inputActionItems,
        discussions,
        actionItems,
        createdAt: Timestamp.now(),
      });
      toast.success("MOM saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save MOM");
    }
  };

  const downloadMom = () => {
    if (!isGenerated) return toast.error("Generate MOM first");

    const selectedProject = projects.find((p) => p.id === projectId);
    const attendeeNames = attendees
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    let content = `MINUTES OF MEETING\\n\\n`;
    content += `Project: ${selectedProject?.name}\\n`;
    content += `Date: ${meetingDate} ${meetingStartTime} to ${meetingEndTime}\\n`;
    content += `Venue: ${meetingVenue}\\n`;
    content += `Attendees: ${attendeeNames}\\n`;
    content += `Prepared by: ${momPreparedBy}\\n\\n`;
    content += `DISCUSSION:\\n`;
    discussions.forEach((d) => {
      content += `\\nTopic: ${d.topic}\\n${d.notes}\\n`;
    });
    content += `\\nACTION ITEMS:\\n`;
    actionItems.forEach((a) => {
      content += `- ${a.task} | ${a.responsiblePerson} | ${a.deadline}\\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MOM_${selectedProject?.name}_${meetingDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div>
      <PageHeader title="Minutes of Meeting (MoM)">
        AI-powered MOM generation with professional structured format
      </PageHeader>

      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <div className="flex flex-wrap gap-3">
            {!isGenerated ? (
              <>
                <Button
                  onClick={generateMomWithAI}
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFileAlt />
                  )}
                  {loading ? "Generating..." : "Generate MOM with AI"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsGenerated(false)}
                  variant="secondary"
                >
                  Edit Details
                </Button>
                <Button onClick={saveMom} variant="primary">
                  <FaSave /> Save MOM
                </Button>
                <Button onClick={downloadMom} variant="secondary">
                  <FaDownload /> Download
                </Button>
                <Button onClick={() => window.print()} variant="ghost">
                  <FaPrint /> Print
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* INPUT FORM */}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Attendees * (Select multiple)
                  </label>
                  <div className="border rounded p-3 max-h-40 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={attendees.includes(user.id)}
                          onChange={() => toggleAttendee(user.id)}
                        />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                  {attendees.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      Selected: {attendees.length} attendee(s)
                    </div>
                  )}
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
                  />
                </div>
              </div>
            </Card>

            <Card title="Discussion Points">
              <div className="space-y-3">
                {inputDiscussions.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    No discussion points added yet
                  </div>
                )}
                {inputDiscussions.map((disc, index) => (
                  <div key={index} className="p-3 rounded border bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold">{disc.topic}</div>
                      <button
                        onClick={() => removeDiscussion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {disc.notes}
                    </div>
                  </div>
                ))}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newDiscussionTopic}
                    onChange={(e) => setNewDiscussionTopic(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Discussion topic..."
                  />
                  <textarea
                    value={newDiscussionNotes}
                    onChange={(e) => setNewDiscussionNotes(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 resize-vertical"
                    rows="3"
                    placeholder="Discussion notes (use bullet points with • or -)"
                  />
                  <Button onClick={addDiscussion} variant="primary">
                    <FaPlus /> Add Discussion
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Action Items">
              <div className="space-y-3">
                {inputActionItems.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    No action items added yet
                  </div>
                )}
                {inputActionItems.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded border bg-gray-50"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">Task:</span>{" "}
                        {action.task}
                      </div>
                      <div>
                        <span className="font-semibold">Person:</span>{" "}
                        {action.responsiblePerson}
                      </div>
                      <div>
                        <span className="font-semibold">Deadline:</span>{" "}
                        {new Date(action.deadline).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeActionItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newActionTask}
                    onChange={(e) => setNewActionTask(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2"
                    placeholder="Task description..."
                  />
                  <select
                    value={newActionPerson}
                    onChange={(e) => setNewActionPerson(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select Person</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
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
              </div>
            </Card>
          </>
        )}

        {/* GENERATED MOM DOCUMENT */}
        {isGenerated && (
          <Card>
            <div className="mom-document bg-white rounded-lg border-2 border-gray-300 p-8 print:border-0">
              <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold">Minutes of Meeting</h1>
              </div>

              {/* Meeting Info Table */}
              <table className="w-full border-collapse border border-gray-400 mb-6">
                <tbody>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 px-4 py-2 font-semibold w-1/3">
                      Project Name:
                    </td>
                    <td className="border border-gray-400 px-4 py-2">
                      {selectedProject?.name || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 px-4 py-2 font-semibold">
                      Meeting Date & Time:
                    </td>
                    <td className="border border-gray-400 px-4 py-2">
                      {new Date(meetingDate).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {meetingStartTime &&
                        ` ${meetingStartTime} to ${meetingEndTime}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 px-4 py-2 font-semibold">
                      Meeting Venue:
                    </td>
                    <td className="border border-gray-400 px-4 py-2">
                      {meetingVenue || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 px-4 py-2 font-semibold align-top">
                      Attendees:
                    </td>
                    <td className="border border-gray-400 px-4 py-2">
                      {attendees
                        .map((id) => users.find((u) => u.id === id)?.name)
                        .filter(Boolean)
                        .map((name, i) => (
                          <div key={i}>{name}</div>
                        ))}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 px-4 py-2 font-semibold">
                      MoM Prepared by:
                    </td>
                    <td className="border border-gray-400 px-4 py-2">
                      {momPreparedBy || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Discussion Table */}
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 pb-2 border-b border-gray-300">
                  Discussion:
                </h2>
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-4 py-2 text-left w-1/3">
                        Discussion
                      </th>
                      <th className="border border-gray-400 px-4 py-2 text-left">
                        Remark/Comments/Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discussions.map((disc, i) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-4 py-2 align-top font-semibold">
                          {disc.topic}
                        </td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-pre-line">
                          {disc.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Items Table */}
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 pb-2 border-b border-gray-300">
                  Next Action Plan:
                </h2>
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-4 py-2 text-left">
                        Task
                      </th>
                      <th className="border border-gray-400 px-4 py-2 text-left w-1/4">
                        Responsible Person
                      </th>
                      <th className="border border-gray-400 px-4 py-2 text-left w-1/6">
                        Deadline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((action, i) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-4 py-2">
                          {action.task}
                        </td>
                        <td className="border border-gray-400 px-4 py-2">
                          {action.responsiblePerson}
                        </td>
                        <td className="border border-gray-400 px-4 py-2">
                          {new Date(action.deadline).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-4 border-t text-xs text-gray-500 flex justify-between">
                <span>Generated on {new Date().toLocaleDateString()}</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </Card>
        )}
      </div>

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

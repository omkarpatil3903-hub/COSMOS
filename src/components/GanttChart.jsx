import React, { useEffect, useMemo, useRef, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_THEME = {
  "to-do": {
    from: "#e0e7ff",
    to: "#a5b4fc",
    text: "#312e81",
    glow: "0 2px 8px -2px rgba(99, 102, 241, 0.3)",
    legend: "#818cf8",
  },
  "in progress": {
    from: "#bfdbfe",
    to: "#60a5fa",
    text: "#1e3a8a",
    glow: "0 2px 8px -2px rgba(59, 130, 246, 0.3)",
    legend: "#3b82f6",
  },
  done: {
    from: "#bbf7d0",
    to: "#4ade80",
    text: "#14532d",
    glow: "0 2px 8px -2px rgba(34, 197, 94, 0.3)",
    legend: "#22c55e",
  },
  default: {
    from: "#e5e7eb",
    to: "#9ca3af",
    text: "#1f2937",
    glow: "0 2px 8px -2px rgba(107, 114, 128, 0.2)",
    legend: "#9ca3af",
  },
};

const PRIORITY_THEME = {
  High: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  Medium: { backgroundColor: "#fef3c7", color: "#b45309" },
  Low: { backgroundColor: "#dcfce7", color: "#166534" },
  default: { backgroundColor: "#e5e7eb", color: "#374151" },
};

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatFullDate = (date) => (date ? LONG_DATE.format(date) : "-");
const formatDuration = (days) => (days <= 1 ? "1 day" : `${days} days`);

// Props mirror previous version while elevating the visual polish.
export default function GanttChart({
  items = [],
  projects = [],
  users = [],
  clients = [],
  start,
  end,
  scale = "day",
  rowHeight = 32,
  baseDayWidth,
  showBarLabels = false,
  leftWidth = 280,
  visibleStatuses = ["To-Do", "In Progress", "Done"],
  groupByProject = true,
  onLeftWidthChange,
}) {
  const [hover, setHover] = useState(null);
  const [hoveredTaskId, setHoveredTaskId] = useState(null); // for synchronized highlighting
  const [collapsed, setCollapsed] = useState({}); // by projectId key
  const [leftW, setLeftW] = useState(leftWidth);
  const dragRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(leftWidth);
  const gridRef = useRef(null);
  const scrollRef = useRef(null);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollRef = useRef(0);
  const todayRef = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const chartStart = toDate(start);
  const chartEnd = toDate(end);

  // Visual density per day (affects all grid calculations)
  const defaultPx = scale === "day" ? 28 : scale === "week" ? 7 : 2.8;
  const pxPerDay =
    Number.isFinite(baseDayWidth) && baseDayWidth > 0
      ? baseDayWidth
      : defaultPx;

  // Build timeline ticks and helper values
  const timeline = useMemo(() => {
    if (!chartStart || !chartEnd) return { ticks: [], totalDays: 0 };
    const s = new Date(
      chartStart.getFullYear(),
      chartStart.getMonth(),
      chartStart.getDate()
    );
    const e = new Date(
      chartEnd.getFullYear(),
      chartEnd.getMonth(),
      chartEnd.getDate()
    );
    const ticks = [];
    if (scale === "day") {
      for (let d = new Date(s); d <= e; d = new Date(d.getTime() + DAY_MS)) {
        ticks.push({ key: d.toISOString().slice(0, 10), date: new Date(d) });
      }
    } else if (scale === "week") {
      for (
        let d = new Date(s);
        d <= e;
        d = new Date(d.getTime() + 7 * DAY_MS)
      ) {
        ticks.push({ key: d.toISOString().slice(0, 10), date: new Date(d) });
      }
    } else {
      // month
      for (
        let d = new Date(s);
        d <= e;
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      ) {
        ticks.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`,
          date: new Date(d),
        });
      }
    }
    const totalDays = Math.max(0, Math.ceil((e - s) / DAY_MS) + 1);
    // Build month header segments regardless of sub-scale
    const monthSegments = [];
    const mStart = new Date(s.getFullYear(), s.getMonth(), 1);
    for (
      let d = new Date(mStart);
      d <= e;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      const segStart = new Date(d);
      const segEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      // clip to chart bounds
      const clipStart = segStart < s ? s : segStart;
      const clipEnd = segEnd > e ? e : segEnd;
      const days = Math.max(1, Math.floor((clipEnd - clipStart) / DAY_MS) + 1);
      monthSegments.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        start: new Date(clipStart),
        end: new Date(clipEnd),
        label: `${clipStart.toLocaleString("en-US", {
          month: "short",
        })} ${clipStart.getFullYear()}`,
        width: days * pxPerDay,
      });
    }
    return { ticks, totalDays, monthSegments };
  }, [chartStart, chartEnd, scale, pxPerDay]);

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    clients.forEach((c) =>
      map.set(c.id, { ...c, name: c.clientName || c.name })
    );
    return map;
  }, [users, clients]);

  const rows = useMemo(() => {
    // Build normalized rows with computed left/width in pixels
    if (!chartStart || !chartEnd) return [];
    const s0 = new Date(
      chartStart.getFullYear(),
      chartStart.getMonth(),
      chartStart.getDate()
    );

    const allowed = new Set((visibleStatuses || []).map((s) => String(s)));

    const norm = items
      .filter((t) => (allowed.size ? allowed.has(String(t.status)) : true))
      .map((t) => {
        const s = toDate(t.startDate);
        const e = toDate(t.endDate || t.startDate);
        if (!s) return null;
        const sD = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const eD = e
          ? new Date(e.getFullYear(), e.getMonth(), e.getDate())
          : sD;
        const leftDays = Math.max(0, Math.floor((sD - s0) / DAY_MS));
        const durDays = Math.max(1, Math.floor((eD - sD) / DAY_MS) + 1);
        const statusKey = String(t.status || "").toLowerCase();
        const isDelayed = eD < todayRef && statusKey !== "done";
        const calculatedWidth = durDays * pxPerDay;
        const minBarWidth = 8; // Minimum visible width in pixels
        const displayWidth = Math.max(minBarWidth, calculatedWidth);
        const isTruncated = calculatedWidth < minBarWidth;

        return {
          ...t,
          leftPx: leftDays * pxPerDay,
          widthPx: displayWidth,
          actualWidthPx: calculatedWidth,
          isTruncated,
          project: projectMap.get(t.projectId),
          user: userMap.get(t.assigneeId),
          startDateObj: sD,
          endDateObj: eD,
          durationDays: durDays,
          statusKey,
          isDelayed,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const pn = (a.project?.name || "").localeCompare(b.project?.name || "");
        if (pn !== 0) return pn;
        const as = new Date(a.startDate || 0) - new Date(b.startDate || 0);
        if (as !== 0) return as;
        return (a.title || "").localeCompare(b.title || "");
      });

    return norm;
  }, [
    items,
    chartStart,
    chartEnd,
    pxPerDay,
    projectMap,
    userMap,
    visibleStatuses,
    todayRef,
  ]);

  // Group rows by project
  const sections = useMemo(() => {
    if (!groupByProject) {
      const done = rows.filter((r) => r.statusKey === "done").length;
      const overdue = rows.filter((r) => r.isDelayed).length;
      return [
        {
          key: "all",
          label: "All Tasks",
          color: "#6366f1",
          rows,
          metrics: { total: rows.length, done, overdue },
        },
      ];
    }
    const map = new Map();
    rows.forEach((r) => {
      const key = r.project?.id || "__none";
      if (!map.has(key))
        map.set(key, {
          key,
          label: r.project?.name || "No Project",
          color: r.project?.color || "#9ca3af",
          rows: [],
          metrics: { total: 0, done: 0, overdue: 0 },
        });
      const sec = map.get(key);
      sec.rows.push(r);
      sec.metrics.total += 1;
      if (r.statusKey === "done") sec.metrics.done += 1;
      if (r.isDelayed) sec.metrics.overdue += 1;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [rows, groupByProject]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reports:gantt:collapsed");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") setCollapsed(obj);
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("reports:gantt:collapsed", JSON.stringify(collapsed));
    } catch (e) {
      void e;
    }
  }, [collapsed]);

  // Handle left panel resizing
  useEffect(() => {
    setLeftW(leftWidth);
  }, [leftWidth]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(520, Math.max(200, startWRef.current + delta));
      setLeftW(next);
      if (typeof onLeftWidthChange === "function") onLeftWidthChange(next);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    if (isDraggingRef.current) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onLeftWidthChange]);

  const startDrag = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = leftW;
    document.body.style.userSelect = "none";
  };

  const onPanMouseDown = (e) => {
    if (e.button !== 0) return;
    if (!scrollRef.current) return;
    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    panStartScrollRef.current = scrollRef.current.scrollLeft || 0;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isPanningRef.current || !scrollRef.current) return;
      const dx = e.clientX - panStartXRef.current;
      scrollRef.current.scrollLeft = panStartScrollRef.current - dx;
    };
    const onUp = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const totalWidthPx = Math.max(0, timeline.totalDays * pxPerDay);

  useEffect(() => {
    if (!scrollRef.current || !chartStart || !chartEnd) return;
    const now = new Date();
    const s = new Date(
      chartStart.getFullYear(),
      chartStart.getMonth(),
      chartStart.getDate()
    );
    const e = new Date(
      chartEnd.getFullYear(),
      chartEnd.getMonth(),
      chartEnd.getDate()
    );
    const within = now >= s && now <= e;
    if (!within) return;
    const daysFromStart = Math.floor(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - s) / DAY_MS
    );
    const left = daysFromStart * pxPerDay;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const containerWidth = el.clientWidth || 0;
      const maxScroll = Math.max(0, totalWidthPx - containerWidth);
      const target = Math.min(
        maxScroll,
        Math.max(0, left - containerWidth / 2)
      );
      el.scrollTo({ left: target, behavior: "smooth" });
    });
  }, [chartStart, chartEnd, pxPerDay, totalWidthPx]);

  const currentWeekOverlay = useMemo(() => {
    if (!chartStart || !chartEnd || scale !== "day") return null;
    const startDay = new Date(
      chartStart.getFullYear(),
      chartStart.getMonth(),
      chartStart.getDate()
    );
    const weekStart = new Date(todayRef);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekEnd < startDay || weekStart > chartEnd) return null;
    const clipStart = weekStart < startDay ? startDay : weekStart;
    const clipEnd = weekEnd > chartEnd ? chartEnd : weekEnd;
    const leftDays = Math.max(0, Math.floor((clipStart - startDay) / DAY_MS));
    const widthDays = Math.max(
      1,
      Math.floor((clipEnd - clipStart) / DAY_MS) + 1
    );
    return { left: leftDays * pxPerDay, width: widthDays * pxPerDay };
  }, [chartStart, chartEnd, scale, todayRef, pxPerDay]);

  const legendEntries = useMemo(() => {
    const seen = new Map();
    const counts = {};
    rows.forEach((r) => {
      const key = r.statusKey || "default";
      if (!seen.has(key)) seen.set(key, r.status || "Status");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Array.from(seen.entries()).map(([key, label]) => ({
      key,
      label,
      color: (STATUS_THEME[key] || STATUS_THEME.default).legend,
      count: counts[key] || 0,
    }));
  }, [rows]);

  const dependencyLines = useMemo(() => {
    const headerH = 40;
    let y = 0;
    const pos = new Map();
    sections.forEach((sec) => {
      y += headerH;
      const isCol = !!collapsed[sec.key];
      if (!isCol) {
        sec.rows.forEach((r, idx) => {
          const top = y + idx * rowHeight;
          const cy = top + rowHeight / 2;
          pos.set(r.id, {
            xStart: r.leftPx,
            xEnd: r.leftPx + r.widthPx,
            y: cy,
          });
        });
        y += sec.rows.length * rowHeight;
      }
    });
    const lines = [];
    sections.forEach((sec) => {
      const isCol = !!collapsed[sec.key];
      if (isCol) return;
      sec.rows.forEach((r) => {
        const deps = Array.isArray(r.dependsOn) ? r.dependsOn : [];
        const to = pos.get(r.id);
        if (!to) return;
        deps.forEach((pid) => {
          const from = pos.get(pid);
          if (!from) return;
          const sx = from.xEnd + 6;
          const sy = from.y;
          const tx = to.xStart - 6;
          const ty = to.y;
          const c1x = sx + 16;
          const c2x = tx - 8;
          const d = `M ${sx} ${sy} L ${c1x} ${sy} L ${c1x} ${ty} L ${c2x} ${ty} L ${tx} ${ty}`;
          lines.push({ d });
        });
      });
    });
    return lines;
  }, [sections, collapsed, rowHeight]);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex max-w-full">
        {/* Left labels */}
        <div
          className="shrink-0 bg-white border-r border-gray-200"
          style={{ width: leftW }}
        >
          <div className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-200 bg-gray-50 px-4">
            <span className="text-sm font-semibold text-gray-700">
              Task Name
            </span>
          </div>
          <div>
            {sections.map((sec) => {
              const isCol = !!collapsed[sec.key];
              return (
                <div key={sec.key}>
                  {/* Section header */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [sec.key]: !c[sec.key] }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCollapsed((c) => ({ ...c, [sec.key]: !c[sec.key] }));
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-left transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    style={{ height: 40 }}
                    aria-expanded={!isCol}
                    aria-label={`${isCol ? "Expand" : "Collapse"} ${
                      sec.label
                    } section`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`text-gray-400 transition-transform text-xs ${
                          isCol ? "rotate-0" : "rotate-90"
                        }`}
                      >
                        ▶
                      </span>
                      <span
                        className="h-3 w-3 rounded shrink-0"
                        style={{ backgroundColor: sec.color }}
                      />
                      <span
                        className="truncate text-sm font-semibold text-gray-800"
                        title={sec.label}
                      >
                        {sec.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                      <span className="font-medium">{sec.rows.length}</span>
                      {sec.metrics?.overdue ? (
                        <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          {sec.metrics.overdue}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  {isCol && sec.rows.length > 0 && (
                    <div className="border-b border-gray-100 bg-gray-50/30 px-4 py-1.5 text-xs text-gray-500 italic">
                      {sec.rows.length}{" "}
                      {sec.rows.length === 1 ? "task" : "tasks"} hidden
                    </div>
                  )}
                  {!isCol &&
                    sec.rows.map((r, idx) => (
                      <div
                        key={r.id}
                        className={`${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        } flex items-center gap-2.5 border-b border-gray-100 px-4 py-2.5 transition-all cursor-pointer ${
                          hoveredTaskId === r.id
                            ? "bg-blue-100/60 ring-2 ring-blue-300 ring-inset"
                            : "hover:bg-blue-50/30"
                        }`}
                        style={{ minHeight: rowHeight }}
                        title={r.title}
                        onMouseEnter={() => setHoveredTaskId(r.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full shadow-sm"
                          style={{
                            backgroundColor: r.project?.color || "#9ca3af",
                          }}
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="truncate text-sm text-gray-900 font-medium leading-tight"
                              title={r.title}
                            >
                              {r.title}
                            </span>
                            {r.isDelayed && (
                              <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 shrink-0">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">
                              {r.user?.name || "Unassigned"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400 text-[10px]">
                              {formatDuration(r.durationDays)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resize handle */}
        <div
          ref={dragRef}
          onMouseDown={startDrag}
          className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-gray-300 active:bg-gray-400"
          style={{ minWidth: 6 }}
          title="Drag to resize"
        />

        {/* Timeline */}
        <div
          ref={scrollRef}
          onMouseDown={onPanMouseDown}
          className="relative flex-1 overflow-x-auto bg-white max-w-full cursor-grab"
        >
          {/* Header: Month row + sub-scale row */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
            <div
              className="relative"
              style={{ width: totalWidthPx, maxWidth: "100%" }}
            >
              {/* Month row */}
              <div className="flex h-10 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-700">
                {timeline.monthSegments.map((m) => (
                  <div
                    key={m.key}
                    className="flex shrink-0 items-center px-3"
                    style={{ width: m.width }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Sub-scale row */}
              <div className="flex h-8 bg-white text-[10px] text-gray-600">
                {timeline.ticks.map((t) => {
                  const width =
                    scale === "day"
                      ? pxPerDay
                      : scale === "week"
                      ? 7 * pxPerDay
                      : 30 * pxPerDay;
                  const dateObj = new Date(t.date);
                  const isMonthStart =
                    scale === "day" && dateObj.getDate() === 1;
                  return (
                    <div
                      key={t.key}
                      className={`flex shrink-0 items-center justify-center border-r border-gray-100 ${
                        isMonthStart ? "font-semibold text-gray-800" : ""
                      }`}
                      style={{ width }}
                    >
                      {scale === "day" && new Date(t.date).getDate()}
                      {scale === "week" &&
                        new Date(t.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      {scale === "month" && t.key}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid + Bars */}
          <div
            className="relative"
            style={{ width: totalWidthPx, maxWidth: "100%" }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0">
              <div className="flex h-full">
                {timeline.ticks.map((t) => {
                  const w =
                    scale === "day"
                      ? pxPerDay
                      : scale === "week"
                      ? 7 * pxPerDay
                      : 30 * pxPerDay;
                  const isWeekend =
                    scale === "day" &&
                    [0, 6].includes(new Date(t.date).getDay());
                  return (
                    <div
                      key={t.key}
                      className={`shrink-0 border-r border-gray-100 ${
                        isWeekend ? "bg-gray-50/50" : "bg-white"
                      }`}
                      style={{ width: w }}
                    />
                  );
                })}
              </div>
              {currentWeekOverlay ? (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 bg-blue-50/40"
                  style={{
                    left: currentWeekOverlay.left,
                    width: currentWeekOverlay.width,
                  }}
                />
              ) : null}
              {/* Today marker */}
              {(() => {
                const now = new Date();
                if (!chartStart || !chartEnd) return null;
                const s = new Date(
                  chartStart.getFullYear(),
                  chartStart.getMonth(),
                  chartStart.getDate()
                );
                const e = new Date(
                  chartEnd.getFullYear(),
                  chartEnd.getMonth(),
                  chartEnd.getDate()
                );
                const within = now >= s && now <= e;
                if (!within) return null;
                const daysFromStart = Math.floor(
                  (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
                    s) /
                    DAY_MS
                );
                const left = daysFromStart * pxPerDay;
                return (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500"
                    style={{ left }}
                  />
                );
              })()}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: totalWidthPx, height: "100%" }}
              >
                <defs>
                  <marker id="depArrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="#9ca3af" />
                  </marker>
                </defs>
                {dependencyLines.map((ln, i) => (
                  <path
                    key={i}
                    d={ln.d}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    markerEnd="url(#depArrow)"
                  />
                ))}
              </svg>
            </div>

            {/* Rows */}
            <div ref={gridRef}>
              {sections.map((sec) => {
                const isCol = !!collapsed[sec.key];
                return (
                  <div key={sec.key}>
                    {/* section header row */}
                    <div
                      className="relative border-b border-gray-200 bg-gray-50"
                      style={{ height: 40 }}
                    />
                    {!isCol &&
                      sec.rows.map((r, idx) => {
                        const theme =
                          STATUS_THEME[r.statusKey] || STATUS_THEME.default;
                        const palette = r.isDelayed
                          ? {
                              backgroundImage: `linear-gradient(135deg, rgba(254, 202, 202, 0.8), rgba(252, 165, 165, 0.4)), linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                              color: theme.text,
                              boxShadow: `0 2px 8px -2px rgba(239, 68, 68, 0.4), inset 0 0 0 1px rgba(239,68,68,0.2)`,
                            }
                          : {
                              backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                              color: theme.text,
                              boxShadow: theme.glow,
                            };
                        return (
                          <div
                            key={r.id}
                            className={`relative border-b border-gray-100 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            } ${hoveredTaskId === r.id ? "bg-blue-50/60" : ""}`}
                            style={{ height: rowHeight }}
                          >
                            <div
                              className={`group absolute top-1.5 bottom-1.5 overflow-hidden rounded shadow-sm ring-1 transition-all duration-150 ${
                                hoveredTaskId === r.id
                                  ? "ring-blue-400 ring-2 shadow-lg scale-105 z-10"
                                  : "ring-black/5 hover:shadow-md hover:ring-black/10"
                              }`}
                              style={{
                                left: r.leftPx,
                                width: r.widthPx,
                                borderLeft: `3px solid ${
                                  r.project?.color || "#9ca3af"
                                }`,
                                ...palette,
                              }}
                              onMouseEnter={(e) => {
                                setHoveredTaskId(r.id);
                                const top =
                                  e.currentTarget.parentElement?.offsetTop || 0;
                                const containerRect =
                                  gridRef.current?.getBoundingClientRect();
                                const targetRect =
                                  e.currentTarget.getBoundingClientRect();
                                const hostWidth =
                                  gridRef.current?.offsetWidth || totalWidthPx;
                                const center = r.leftPx + r.widthPx / 2;
                                const clampedX = Math.min(
                                  Math.max(center, 120),
                                  hostWidth - 40
                                );
                                setHover({
                                  id: r.id,
                                  x: clampedX,
                                  y:
                                    (containerRect
                                      ? targetRect.top - containerRect.top
                                      : top) +
                                    rowHeight * 0.2,
                                  r,
                                  theme,
                                });
                              }}
                              onMouseLeave={() => {
                                setHoveredTaskId(null);
                                setHover(null);
                              }}
                            >
                              {/* subtle gradient overlay */}
                              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/20 to-transparent" />
                              {r.durationDays === 1 && (
                                <div
                                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45"
                                  style={{
                                    backgroundColor: r.project?.color || "#9ca3af",
                                    boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                                  }}
                                  title="Milestone"
                                />
                              )}
                              {/* Truncated indicator */}
                              {r.isTruncated && (
                                <div
                                  className="absolute inset-y-0 right-0 w-1 bg-white/40"
                                  title="Task duration is longer than displayed"
                                />
                              )}
                              {showBarLabels && r.widthPx > 100 && (
                                <div
                                  className="flex items-center h-full px-2 text-xs font-medium truncate"
                                  style={{ color: theme.text }}
                                >
                                  {r.title}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
                style={{ left: hover.x, top: hover.y, marginTop: -8 }}
              >
                <div className="max-w-[280px]">
                  <div
                    className="font-semibold text-gray-900 mb-1"
                    title={hover.r.title}
                  >
                    {hover.r.title}
                  </div>
                  <div className="space-y-1 text-[11px] text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Project:</span>
                      <span className="font-medium text-gray-800">
                        {hover.r.project?.name || "No Project"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Assignee:</span>
                      <span className="font-medium text-gray-800">
                        {hover.r.user?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Status:</span>
                      <span
                        className="font-medium"
                        style={{ color: hover.theme?.text || "#1f2937" }}
                      >
                        {hover.r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium text-gray-800">
                        {formatDuration(hover.r.durationDays)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Dates:</span>
                      <span className="font-medium text-gray-800">
                        {formatFullDate(hover.r.startDateObj)} -{" "}
                        {formatFullDate(hover.r.endDateObj)}
                      </span>
                    </div>
                    {hover.r.isTruncated && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        📏 Bar shown at minimum width
                      </div>
                    )}
                    {hover.r.isDelayed && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Overdue
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        {legendEntries.map((entry) => (
          <span
            key={entry.key}
            className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-2.5 py-1"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.label}</span>
            <span className="ml-1 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {entry.count}
            </span>
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-2.5 py-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-gray-100" />
          <span className="text-gray-700">Weekend</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-2.5 py-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-red-500" />
          <span className="text-gray-700">Today</span>
        </span>
        {currentWeekOverlay ? (
          <span className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-2.5 py-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-blue-200" />
            <span className="text-gray-700">Current Week</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

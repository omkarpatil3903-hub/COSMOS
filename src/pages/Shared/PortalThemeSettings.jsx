import React from "react";
import Card from "../../components/Card";
import { useTheme } from "../../context/ThemeContext";

export default function PortalThemeSettings() {
  const { mode, setMode, accent, setAccent } = useTheme();

  const modes = [
    {
      id: "light",
      label: "Light",
      description: "Bright interface for well‑lit spaces.",
    },
    {
      id: "dark",
      label: "Dark",
      description: "Dim interface that’s easy on the eyes.",
    },
    {
      id: "auto",
      label: "Auto",
      description: "Match your system appearance.",
    },
  ];

  const accents = [
    { id: "black", label: "Black", className: "bg-slate-800" },
    { id: "purple", label: "Purple", className: "bg-purple-500" },
    { id: "blue", label: "Blue", className: "bg-blue-500" },
    { id: "pink", label: "Pink", className: "bg-pink-500" },
    { id: "violet", label: "Violet", className: "bg-violet-500" },
    { id: "indigo", label: "Indigo", className: "bg-indigo-500" },
    { id: "orange", label: "Orange", className: "bg-orange-500" },
    { id: "teal", label: "Teal", className: "bg-teal-500" },
    { id: "bronze", label: "Bronze", className: "bg-amber-600" },
    { id: "mint", label: "Mint", className: "bg-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 [.dark_&]:text-gray-400">
              Appearance
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {modes.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex h-36 flex-col items-start rounded-2xl border px-4 py-3 text-left shadow-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${active
                        ? "border-indigo-500 bg-indigo-50/80 [.dark_&]:bg-indigo-900/30 [.dark_&]:border-indigo-500/50"
                        : "border-gray-200 bg-white/80 hover:border-gray-300 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:hover:border-white/20"
                      }`}
                  >
                    {/* Preview mini-layout */}
                    <div className="mb-3 flex h-20 w-full items-stretch gap-2">
                      <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                        {/* COSMOS-style mini layout: left sidebar with icons, right content cards */}
                        {m.id === "light" && (
                          <div className="flex h-full w-full">
                            {/* Sidebar */}
                            <div className="w-2/7 bg-white px-1.5 py-1.5 space-y-1.5 border-r border-gray-100">
                              <div className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded-full bg-indigo-500" />
                                <span className="h-1.5 flex-1 rounded-full bg-gray-200" />
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-4/5 rounded-full bg-gray-100" />
                                <div className="h-1.5 w-3/4 rounded-full bg-gray-100" />
                                <div className="h-1.5 w-2/3 rounded-full bg-gray-100" />
                              </div>
                            </div>
                            {/* Main content */}
                            <div className="flex-1 bg-gray-50 px-2 py-1.5 space-y-1.5">
                              <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
                              <div className="flex gap-1.5">
                                <div className="h-6 flex-1 rounded-lg bg-white shadow-sm" />
                                <div className="h-6 flex-1 rounded-lg bg-white shadow-sm" />
                              </div>
                              <div className="h-4 w-1/2 rounded-lg bg-white shadow-sm" />
                            </div>
                          </div>
                        )}
                        {m.id === "dark" && (
                          <div className="flex h-full w-full bg-slate-900">
                            {/* Sidebar */}
                            <div className="w-2/7 bg-slate-950 px-1.5 py-1.5 space-y-1.5 border-r border-slate-800">
                              <div className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded-full bg-orange-400" />
                                <span className="h-1.5 flex-1 rounded-full bg-slate-700" />
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-4/5 rounded-full bg-slate-800" />
                                <div className="h-1.5 w-3/4 rounded-full bg-slate-800" />
                                <div className="h-1.5 w-2/3 rounded-full bg-slate-900" />
                              </div>
                            </div>
                            {/* Main content */}
                            <div className="flex-1 bg-slate-900 px-2 py-1.5 space-y-1.5">
                              <div className="h-1.5 w-2/3 rounded-full bg-slate-700" />
                              <div className="flex gap-1.5">
                                <div className="h-6 flex-1 rounded-lg bg-slate-800" />
                                <div className="h-6 flex-1 rounded-lg bg-slate-800" />
                              </div>
                              <div className="h-4 w-1/2 rounded-lg bg-slate-800" />
                            </div>
                          </div>
                        )}
                        {m.id === "auto" && (
                          <div className="relative flex h-full w-full">
                            {/* Light half */}
                            <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex">
                              <div className="w-2/7 bg-white px-1.5 py-1.5 space-y-1.5 border-r border-gray-100">
                                <div className="flex items-center gap-1">
                                  <span className="h-3 w-3 rounded-full bg-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                  <div className="h-1.5 w-4/5 rounded-full bg-gray-100" />
                                  <div className="h-1.5 w-3/4 rounded-full bg-gray-100" />
                                </div>
                              </div>
                              <div className="flex-1 px-2 py-1.5 space-y-1.5">
                                <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
                                <div className="h-4 w-2/3 rounded-lg bg-white shadow-sm" />
                              </div>
                            </div>
                            {/* Dark half */}
                            <div className="w-1/2 bg-slate-900 flex">
                              <div className="w-2/7 bg-slate-950 px-1.5 py-1.5 space-y-1.5 border-r border-slate-800">
                                <div className="flex items-center gap-1">
                                  <span className="h-3 w-3 rounded-full bg-orange-400" />
                                </div>
                                <div className="space-y-1">
                                  <div className="h-1.5 w-4/5 rounded-full bg-slate-800" />
                                  <div className="h-1.5 w-3/4 rounded-full bg-slate-900" />
                                </div>
                              </div>
                              <div className="flex-1 px-2 py-1.5 space-y-1.5">
                                <div className="h-1.5 w-2/3 rounded-full bg-slate-700" />
                                <div className="h-4 w-2/3 rounded-lg bg-slate-800" />
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gray-300/60" />
                          </div>
                        )}
                      </div>
                      <div className="flex w-10 flex-col items-center justify-center rounded-xl bg-white/60 text-gray-400 border border-dashed border-gray-200">
                        <span className="h-1.5 w-6 rounded-full bg-gray-200 mb-1" />
                        <span className="h-1 w-3 rounded-full bg-gray-100" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 [.dark_&]:text-white">
                      {m.label}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-500 [.dark_&]:text-gray-400">
                      {m.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 [.dark_&]:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 [.dark_&]:text-gray-400">
              Theme
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {accents.map((a) => {
                const active = accent === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.id)}
                    className={`flex items-center justify-start gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${active
                        ? "border-violet-500 bg-violet-100 text-gray-900 shadow-sm [.dark_&]:bg-violet-900/40 [.dark_&]:text-white [.dark_&]:border-violet-500/50"
                        : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-gray-400 [.dark_&]:hover:text-gray-200"
                      }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full ${a.className}`}
                    />
                    <span className="truncate">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

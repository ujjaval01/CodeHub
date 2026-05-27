"use client";

import React, { useEffect, useState, useRef, useTransition, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Editor from "@monaco-editor/react";
import {
  Terminal, Play, Upload, Code, BookOpen, MessageSquare, Notebook, Sparkles,
  ChevronDown, Maximize2, Minimize2, CheckCircle2, XCircle, AlertTriangle, Loader2, Save, Trophy, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { getCleanBoilerplate } from "@/lib/boilerplates";


function WorkspaceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const contestId = searchParams.get("contestId");
  const router = useRouter();
  const { user } = useAuth();
  
  const [isPending, startTransition] = useTransition();

  // Problem data states
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tab controllers
  const [leftTab, setLeftTab] = useState<"desc" | "editorial" | "notes" | "ai">("desc");

  // Editor states
  const [language, setLanguage] = useState("java");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [code, setCode] = useState("");

  // Notes state
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Console output states
  const [customInput, setCustomInput] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<"cases" | "result">("cases");
  const [activeTestCase, setActiveTestCase] = useState(0);

  // Compilation results
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // AI helper states
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  // Layout resizing states
  const [isDesktop, setIsDesktop] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50); // percentage (25% - 75%)
  const isResizing = useRef(false);
  const [editorHeight, setEditorHeight] = useState(500);
  const isConsoleResizing = useRef(false);

  // Monitor desktop layout
  useEffect(() => {
    const checkMedium = () => setIsDesktop(window.innerWidth >= 768);
    checkMedium();
    window.addEventListener("resize", checkMedium);
    return () => window.removeEventListener("resize", checkMedium);
  }, []);

  // Mouse drag listeners for resizer
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleConsoleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isConsoleResizing.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current) {
        const newWidthPercent = (e.clientX / window.innerWidth) * 100;
        setLeftWidth(Math.max(25, Math.min(75, newWidthPercent)));
      } else if (isConsoleResizing.current) {
        const newHeight = e.clientY - 130;
        const maxEditorHeight = window.innerHeight * 0.85;
        setEditorHeight(Math.max(200, Math.min(maxEditorHeight, newHeight)));
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (isConsoleResizing.current) {
        isConsoleResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Load editor theme preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("monaco-theme");
      if (storedTheme) {
        setEditorTheme(storedTheme);
      }
    }
  }, []);

  // Fetch problem details
  const fetchProblemDetails = async () => {
    try {
      const res = await fetch(`/api/problems/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setProblem(data.problem);
        setNotes(data.notes || "");
        
        // Initialize custom input from first sample testcase
        const sampleCase = data.problem.testCases?.find((t: any) => t.isSample);
        if (sampleCase) {
          setCustomInput(sampleCase.input);
        }

        // Initialize template code
        const initialCode = getCleanBoilerplate(language, slug);
        setCode(initialCode);
      } else {
        router.push("/problems");
      }
    } catch (e) {
      console.error(e);
      router.push("/problems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblemDetails();
  }, [slug]);

  // Handle boilerplate change on language change
  useEffect(() => {
    if (!problem) return;
    const currentBoilerplate = getCleanBoilerplate(language, slug);
    setCode(currentBoilerplate);
  }, [language]);

  // Notes Autosave trigger
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setSaveStatus("saving");

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(async () => {
      if (!user) {
        setSaveStatus("idle");
        return;
      }
      try {
        const res = await fetch(`/api/problems/${slug}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: val }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch (err) {
        setSaveStatus("idle");
        console.error("Autosave note failed:", err);
      }
    }, 2000);
  };

  // Run Custom Code
  const handleRun = async () => {
    if (!problem) return;
    setRunning(true);
    setConsoleOpen(true);
    setConsoleTab("result");
    setSubmitResult(null);
    setRunResult(null);

    try {
      const res = await fetch(`/api/problems/${slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input: customInput }),
      });

      const data = await res.json();
      setRunResult(data.result);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  // Submit Code
  const handleSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    setConsoleOpen(true);
    setConsoleTab("result");
    setRunResult(null);
    setSubmitResult(null);

    try {
      const res = await fetch(`/api/problems/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });

      const data = await res.json();
      setSubmitResult(data);

      // If ACCEPTED and in contest mode, submit to contest
      if (data.status === "ACCEPTED" && contestId) {
        try {
          await fetch(`/api/contests/${contestId}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problemId: problem.id, pointsEarned: 100 }),
          });
        } catch (e) {
          console.error("Failed to update contest score:", e);
        }
      }

    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // AI Prompt trigger
  const handleAiRequest = async (promptType: "hint" | "review" | "explain") => {
    setLeftTab("ai");
    setAiLoading(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/ai/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: promptType,
          problemTitle: problem?.title,
          problemStatement: problem?.statement,
          code,
          language,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.response);
      } else {
        setAiResponse(data.error || "AI service is currently busy. Try again shortly.");
      }
    } catch (e) {
      setAiResponse("Network connection error. AI service failed to load.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  const sampleCases = problem?.testCases?.filter((t: any) => t.isSample) || [];
  const tags = JSON.parse(problem?.tagsJson || "[]") as string[];

  // PREMIUM LOCK
  if (problem?.premium && !user?.isPremium) {
    return (
      <div className="flex-1 w-full bg-[#09090b] flex flex-col items-center justify-center text-center p-8 min-h-[calc(100vh-4rem)] relative z-10">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl mb-6">
          <ShieldAlert className="h-12 w-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-4">Premium Problem</h2>
        <p className="text-zinc-400 max-w-md mb-8">
          This problem ({problem?.title}) is locked. Upgrade to Premium to unlock this challenge and gain access to our full library of FAANG interview algorithms.
        </p>
        <button onClick={() => router.push("/premium")} className="glow-btn-primary px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 mx-auto">
          <Sparkles className="h-5 w-5" />
          Unlock Premium Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#09090b] flex flex-col md:flex-row items-stretch border-t border-white/5 relative z-10 min-h-[calc(100vh-4rem)]">
      {/* LEFT PANEL: Problem Details, Editorial, Notes, AI */}
      <div
        style={{ width: isDesktop ? `${leftWidth}%` : undefined }}
        className="w-full flex flex-col border-b md:border-b-0 border-white/10 bg-[#0b0b0d]"
      >
        {/* Tab Headers */}
        <div className="flex items-center gap-1 border-b border-white/5 bg-[#09090b] px-3 py-1 text-xs select-none">
          <button
            onClick={() => setLeftTab("desc")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
              leftTab === "desc" ? "text-white bg-white/5 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            Description
          </button>
          <button
            onClick={() => setLeftTab("editorial")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
              leftTab === "editorial" ? "text-white bg-white/5 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Editorial
          </button>
          <button
            onClick={() => setLeftTab("notes")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
              leftTab === "notes" ? "text-white bg-white/5 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Notebook className="h-3.5 w-3.5" />
            Notes
          </button>
          <button
            onClick={() => setLeftTab("ai")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
              leftTab === "ai" ? "text-gradient-indigo-cyan font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            AI Companion
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 text-left leading-relaxed">
          {leftTab === "desc" && (
            <div className="space-y-6">
              {/* Title & Difficulty */}
              <div className="space-y-2">
                {contestId && (
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mb-4 cursor-pointer" onClick={() => router.push(`/contests/${contestId}`)}>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Contest Mode Active</span>
                    </div>
                    <span className="text-xs text-amber-500/80 hover:text-amber-400 font-semibold">Return to Arena &rarr;</span>
                  </div>
                )}
                <h1 className="text-2xl font-extrabold text-white">{problem.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                    problem.difficulty === "EASY" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                    problem.difficulty === "MEDIUM" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                    "text-red-400 border-red-500/20 bg-red-500/5"
                  }`}>
                    {problem.difficulty}
                  </span>
                  <span className="text-zinc-500 font-medium">Category: {problem.category}</span>
                  <span className="text-zinc-500 font-medium">Acceptance: {problem.acceptanceRate.toFixed(1)}%</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 rounded-full px-2.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>

              {/* Divider */}
              <div className="h-[1px] w-full bg-white/5" />

              {/* Statement */}
              <div className="text-sm text-zinc-300 space-y-4">
                <p className="whitespace-pre-line">{problem.statement}</p>
              </div>

              {/* Examples */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h4>
                {(JSON.parse(problem.examplesJson || "[]") as any[]).map((ex, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-xs font-mono space-y-2">
                    <p className="text-zinc-400 font-semibold">Example {i + 1}:</p>
                    <p><span className="text-zinc-500">Input:</span> <span className="text-zinc-300">{ex.input}</span></p>
                    <p><span className="text-zinc-500">Output:</span> <span className="text-zinc-300">{ex.output}</span></p>
                    {ex.explanation && (
                      <p><span className="text-zinc-500">Explanation:</span> <span className="text-zinc-400 font-sans leading-relaxed">{ex.explanation}</span></p>
                    )}
                  </div>
                ))}
              </div>

              {/* Constraints */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Constraints</h4>
                <div className="text-xs text-zinc-400 font-mono bg-white/2 border border-white/2 rounded-xl p-4 whitespace-pre-line leading-loose">
                  {problem.constraints}
                </div>
              </div>
            </div>
          )}

          {leftTab === "editorial" && (
            <div className="space-y-6">
              <h3 className="text-xl font-extrabold text-white">Official Editorial</h3>
              <div className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {problem.editorial}
              </div>
              <div className="h-[1px] w-full bg-white/5" />
              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-white/[0.01] border border-white/5 rounded-xl p-4">
                <div>
                  <p className="text-zinc-500">Time Complexity:</p>
                  <p className="text-cyan-400 font-bold mt-1 text-sm">{problem.timeComplexity}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Space Complexity:</p>
                  <p className="text-indigo-400 font-bold mt-1 text-sm">{problem.spaceComplexity}</p>
                </div>
              </div>
            </div>
          )}

          {leftTab === "notes" && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-white">My Notes</h3>
                {user ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold">
                    {saveStatus === "saving" && (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        Saving to cloud...
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Autosaved
                      </>
                    )}
                    {saveStatus === "idle" && (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Typing triggers autosave
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-amber-500">Sign in to save notes</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                disabled={!user}
                placeholder={user ? "Write down your hints, logic explanations, complexities, or pseudocode drafts here. Autosaved automatically..." : "You must be signed in to store private notes in the workspace."}
                className="flex-1 w-full min-h-[300px] glass-input rounded-xl p-4 text-xs font-sans leading-relaxed focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>
          )}

          {leftTab === "ai" && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-extrabold text-white">AI Coding Companion</h3>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAiRequest("hint")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-2 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                >
                  Get Hint
                </button>
                <button
                  onClick={() => handleAiRequest("explain")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2 py-2 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                >
                  Explain Code
                </button>
                <button
                  onClick={() => handleAiRequest("review")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/5 px-2 py-2 text-[10px] font-bold text-pink-300 hover:bg-pink-500/10 cursor-pointer"
                >
                  Review Logic
                </button>
              </div>

              {/* AI Terminal Output */}
              <div className="flex-1 glass-panel rounded-xl p-4 text-xs leading-relaxed font-mono min-h-[250px] bg-zinc-950/20 relative overflow-y-auto text-zinc-300">
                {aiLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 bg-zinc-950/30">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                    <span className="animate-pulse text-[11px]">AI is analyzing your code...</span>
                  </div>
                ) : aiResponse ? (
                  <div className="whitespace-pre-wrap select-text">{aiResponse}</div>
                ) : (
                  <div className="text-zinc-600 flex flex-col items-center justify-center h-full text-center p-4">
                    <Sparkles className="h-8 w-8 text-zinc-700 mb-2" />
                    <p className="font-semibold text-zinc-500">Ask AI for assistance</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Select an operation above to analyze your Monaco Editor draft.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DRAG RESIZE DIVIDER */}
      {isDesktop && (
        <div
          onMouseDown={handleMouseDown}
          className="w-1 hover:w-1.5 bg-zinc-900 hover:bg-indigo-500/50 cursor-col-resize transition-all self-stretch relative z-30 flex items-center justify-center border-l border-r border-white/5"
        >
          {/* Draggable indicator line */}
          <div className="w-[1px] h-8 bg-zinc-700/60 hover:bg-indigo-400" />
        </div>
      )}

      {/* RIGHT PANEL: Monaco Editor, Run controls, output Console */}
      <div
        style={{ width: isDesktop ? `${100 - leftWidth}%` : undefined }}
        className="w-full flex flex-col bg-[#070709] border-t md:border-t-0 border-white/5"
      >
        {/* Editor controls header */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-white/5 bg-[#09090b] select-none text-xs gap-3">
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Language:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#09090b] text-white font-semibold outline-none cursor-pointer hover:text-cyan-400 border border-white/10 rounded px-2 py-0.5"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="kotlin">Kotlin</option>
              </select>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Font:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer"
              >
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running || submitting}
              className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition-all disabled:opacity-50 cursor-pointer"
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run Code
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting}
              className="glow-btn-primary flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Submit Solution
            </button>

            {/* Quick AI Trigger */}
            <button
              onClick={() => handleAiRequest("hint")}
              className="flex items-center gap-1 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded text-[10px] text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all cursor-pointer"
              title="Get AI Coding Hint"
            >
              <Sparkles className="h-3 w-3" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Component */}
        <div style={{ height: editorHeight }} className="relative border-b border-white/5 overflow-hidden w-full shrink-0 transition-all duration-0">
          <Editor
            height="100%"
            language={language}
            theme={editorTheme}
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: fontSize,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              lineHeight: 20,
              cursorBlinking: "smooth",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
            loading={
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-[#070709]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            }
          />
        </div>

        {/* Bottom Console Panel */}
        {/* DRAG RESIZE DIVIDER HORIZONTAL */}
        <div 
          onMouseDown={handleConsoleMouseDown}
          className="h-1 hover:h-1.5 bg-zinc-900 hover:bg-indigo-500/50 cursor-row-resize transition-all w-full relative z-30 flex items-center justify-center border-t border-white/5"
        >
          <div className="h-[1px] w-8 bg-zinc-700/60 hover:bg-indigo-400" />
        </div>
        <div className="flex flex-col bg-[#09090b]">
          {/* Console Header Toggle */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-1 select-none text-xs">
            <div className="flex gap-2">
              <button
                onClick={() => { setConsoleOpen(true); setConsoleTab("cases"); }}
                className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
                  consoleOpen && consoleTab === "cases" ? "text-white bg-white/5 font-semibold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Testcase
              </button>
              <button
                onClick={() => { setConsoleOpen(true); setConsoleTab("result"); }}
                className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer ${
                  consoleOpen && consoleTab === "result" ? "text-white bg-white/5 font-semibold text-gradient-indigo-cyan" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Result
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${consoleOpen ? "" : "transform rotate-180"}`} />
              </button>
            </div>
          </div>

          {/* Console Content */}
          <AnimatePresence initial={false}>
            {consoleOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-y-auto bg-[#070709] border-b border-white/5 p-4 text-left font-mono text-xs leading-relaxed"
              >
                {consoleTab === "cases" ? (
                  // Stdin Input Editor
                  <div className="space-y-3 h-full flex flex-col">
                    <div className="flex flex-wrap gap-1.5">
                      {sampleCases.map((tc: any, index: number) => (
                        <button
                          key={tc.id}
                          onClick={() => {
                            setActiveTestCase(index);
                            setCustomInput(tc.input);
                          }}
                          className={`px-2.5 py-1 rounded border text-[10px] font-semibold transition-all cursor-pointer ${
                            activeTestCase === index
                              ? "bg-indigo-500/10 border-indigo-500/60 text-white"
                              : "border-white/5 bg-white/2 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Case {index + 1}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Write standard inputs (stdin) here to test code..."
                      className="flex-1 w-full glass-input rounded-lg p-3 font-mono text-[11px] focus:ring-1 focus:ring-indigo-500 resize-none bg-[#09090b]/80"
                    />
                  </div>
                ) : (
                  // Results viewer
                  <div className="h-full">
                    {running && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 select-none">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                        <span className="animate-pulse text-[10px]">Compiling and running code...</span>
                      </div>
                    )}
                    {submitting && (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 select-none">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        <span className="animate-pulse text-[10px]">Evaluating all test cases against container...</span>
                      </div>
                    )}

                    {!running && !submitting && !runResult && !submitResult && (
                      <div className="flex items-center justify-center h-full text-zinc-600 select-none text-[11px]">
                        No code executed yet. Click Run or Submit.
                      </div>
                    )}

                    {/* Run result screen */}
                    {!running && runResult && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {runResult.status === "ACCEPTED" ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Finished
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                <XCircle className="h-3.5 w-3.5" /> {runResult.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-semibold">
                            <span>Time: <span className="text-zinc-300">{runResult.executionTime} ms</span></span>
                            <span>Memory: <span className="text-zinc-300">{runResult.memoryUsage} KB</span></span>
                          </div>
                        </div>

                        {runResult.status === "ACCEPTED" ? (
                          <div className="space-y-2">
                            <div className="bg-[#09090b]/80 border border-white/5 rounded-lg p-2.5 text-[11px]">
                              <p className="text-zinc-500">Stdout:</p>
                              <pre className="text-zinc-200 mt-1 whitespace-pre-wrap">{runResult.stdout || "(no output)"}</pre>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-[11px] text-red-400">
                            <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Execution Error:</p>
                            <pre className="mt-1 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{runResult.error || runResult.stderr}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit result screen */}
                    {!submitting && submitResult && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {submitResult.status === "ACCEPTED" ? (
                              <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.8 rounded text-xs">
                                <CheckCircle2 className="h-4 w-4" /> Accepted
                              </span>
                            ) : (
                              <span className="text-red-400 font-extrabold flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-0.8 rounded text-xs">
                                <XCircle className="h-4 w-4" /> {submitResult.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-semibold">
                            <span>Max Time: <span className="text-zinc-300">{submitResult.executionTime} ms</span></span>
                            <span>Max Memory: <span className="text-zinc-300">{submitResult.memoryUsage} KB</span></span>
                          </div>
                        </div>

                        {submitResult.status === "ACCEPTED" ? (
                          <div className="space-y-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-emerald-400 font-bold text-[11px]">All {submitResult.testCasesCount} test cases passed!</p>
                            {submitResult.xpGained > 0 ? (
                              <div className="text-[10px] text-zinc-400 space-y-1">
                                <p>🚀 Gained <span className="text-gradient-indigo-cyan font-bold">+{submitResult.xpGained} XP</span> for first correct solve!</p>
                                {submitResult.leveledUp && (
                                  <p className="text-pink-400 font-bold flex items-center gap-1.5 mt-1">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Level Up! You reached Level {submitResult.newLevel}!
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-500">Problem previously solved. No extra XP awarded.</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-[11px] text-red-400">
                            <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Failed TestCase Check:</p>
                            <pre className="mt-1 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{submitResult.error}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}

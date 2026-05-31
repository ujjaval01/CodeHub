"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, Users, Code, Activity, Trash2, Plus, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ArrowRight, Settings, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProblemItem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  acceptanceRate: number;
}

interface AnalyticsData {
  usersCount: number;
  problemsCount: number;
  submissionsCount: number;
  difficultyCounts: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface AdminDashboardData {
  analytics: AnalyticsData;
  recentSubmissions: Array<{
    id: string;
    userName: string;
    problemTitle: string;
    status: string;
    language: string;
    createdAt: string;
  }>;
}

function AdminContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create problem form states
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [difficulty, setDifficulty] = useState("EASY");
  const [category, setCategory] = useState("DSA");
  const [statement, setStatement] = useState("");
  const [constraints, setConstraints] = useState("");
  const [timeComplexity, setTimeComplexity] = useState("O(N)");
  const [spaceComplexity, setSpaceComplexity] = useState("O(1)");
  
  // Custom arrays inputs
  const [tagsInput, setTagsInput] = useState("");
  const [companiesInput, setCompaniesInput] = useState("");

  // Dynamic test cases builder
  const [testCases, setTestCases] = useState<Array<{ input: string; expectedOutput: string; isSample: boolean }>>([
    { input: "", expectedOutput: "", isSample: true }
  ]);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [analyticsRes, problemsRes, usersRes] = await Promise.all([
        fetch("/api/admin/analytics"),
        fetch("/api/problems?limit=100"),
        fetch("/api/admin/users")
      ]);

      if (analyticsRes.ok && problemsRes.ok && usersRes.ok) {
        const analyticsData = await analyticsRes.json();
        const problemsData = await problemsRes.json();
        const usersData = await usersRes.json();
        setData(analyticsData);
        setProblems(problemsData.problems || []);
        setUsersList(usersData.users || []);
      } else if (analyticsRes.status === 403) {
        setError("Access Denied: Admin privileges required.");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to connect to admin console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "ADMIN") {
        setError("Access Denied: Admin privileges required.");
        setLoading(false);
      } else {
        fetchAdminData();
      }
    }
  }, [user, authLoading]);

  // Update slug automatically based on title
  useEffect(() => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  }, [title]);

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", isSample: false }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: string, value: any) => {
    const updated = testCases.map((tc, i) => {
      if (i === index) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    setTestCases(updated);
  };

  // Submit Problem Form
  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!title || !slug || !statement) {
      setFormError("Please fill out Title, Slug, and Statement.");
      return;
    }

    const emptyTestcases = testCases.some(tc => !tc.input.trim() || !tc.expectedOutput.trim());
    if (emptyTestcases) {
      setFormError("All test cases must have non-empty inputs and expected outputs.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const companies = companiesInput.split(",").map(c => c.trim()).filter(Boolean);

      const res = await fetch("/api/admin/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, slug, difficulty, category, statement, constraints,
          timeComplexity, spaceComplexity,
          tags, companies,
          premium: false,
          testCases
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setFormSuccess("Problem created successfully!");
        // Reset form
        setTitle("");
        setStatement("");
        setConstraints("");
        setTagsInput("");
        setCompaniesInput("");
        setTestCases([{ input: "", expectedOutput: "", isSample: true }]);
        setFormOpen(false);
        fetchAdminData(); // Refresh list
      } else {
        setFormError(json.error || "Failed to create problem.");
      }
    } catch (err) {
      setFormError("Network error creating problem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Problem
  const handleDeleteProblem = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this problem and all its submissions?")) return;
    try {
      const res = await fetch(`/api/admin/problems/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProblems(problems.filter(p => p.id !== id));
        fetchAdminData(); // Refresh metrics
      } else {
        alert("Failed to delete problem.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error deleting problem.");
    }
  };

  // Force Verify User
  const handleForceVerify = async (id: string) => {
    if (!confirm("Force verify this user's email?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/verify`, { method: "POST" });
      if (res.ok) {
        fetchAdminData();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to verify user.");
      }
    } catch (e) {
      alert("Network error verifying user.");
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsersList(usersList.filter(u => u.id !== id));
        fetchAdminData();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete user.");
      }
    } catch (e) {
      alert("Network error deleting user.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 space-y-4">
        <ShieldAlert className="h-14 w-14 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">{error}</h2>
        <p className="text-sm text-zinc-500">Please sign in as an admin to access this page.</p>
        <Link href="/login" className="glow-btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white">
          Go to Sign In
        </Link>
      </div>
    );
  }

  const { analytics, recentSubmissions } = data!;

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-8 text-left">
      {/* Background radial glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-8 w-8 text-indigo-500 animate-spin-slow" />
            Admin Console
          </h1>
          <p className="text-xs text-zinc-500">Manage coding challenges, inspect system metrics, and track user completions.</p>
        </div>

        <button
          onClick={() => setFormOpen(!formOpen)}
          className="glow-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Challenge
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-xl text-cyan-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-extrabold text-white mt-1">{analytics.usersCount}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-xl text-indigo-400">
            <Code className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Challenges</p>
            <p className="text-2xl font-extrabold text-white mt-1">{analytics.problemsCount}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-xl text-pink-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-extrabold text-white mt-1">{analytics.submissionsCount}</p>
          </div>
        </div>
      </div>

      {/* Accordion form: Create problem */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-panel p-6 rounded-2xl border-indigo-500/30 overflow-hidden relative"
          >
            <h3 className="text-base font-bold text-white border-b border-white/5 pb-3 mb-5">Create New Coding Challenge</h3>

            <form onSubmit={handleCreateProblem} className="space-y-5 text-xs">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Grid 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fizz Buzz"
                    className="glass-input w-full rounded-xl py-2.5 px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Problem Slug (Auto)</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="glass-input w-full rounded-xl py-2.5 px-3 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="glass-input w-full rounded-xl py-2.5 px-3 bg-[#09090b]"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Textareas */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Problem Description (Markdown supported)</label>
                <textarea
                  required
                  rows={4}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Describe the problem, input format, output format, and general requirements..."
                  className="glass-input w-full rounded-xl p-3 font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Constraints (Markdown supported)</label>
                <textarea
                  rows={2}
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="- 1 <= nums.length <= 10^4..."
                  className="glass-input w-full rounded-xl p-3 font-mono"
                />
              </div>

              {/* Complexity, tags, companies */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Time Complexity</label>
                  <input
                    type="text"
                    value={timeComplexity}
                    onChange={(e) => setTimeComplexity(e.target.value)}
                    placeholder="O(N)"
                    className="glass-input w-full rounded-xl py-2.5 px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Space Complexity</label>
                  <input
                    type="text"
                    value={spaceComplexity}
                    onChange={(e) => setSpaceComplexity(e.target.value)}
                    placeholder="O(1)"
                    className="glass-input w-full rounded-xl py-2.5 px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Topic Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Arrays, Hashing"
                    className="glass-input w-full rounded-xl py-2.5 px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Companies (comma-separated)</label>
                  <input
                    type="text"
                    value={companiesInput}
                    onChange={(e) => setCompaniesInput(e.target.value)}
                    placeholder="Google, Microsoft"
                    className="glass-input w-full rounded-xl py-2.5 px-3"
                  />
                </div>
              </div>

              {/* Dynamic Test Cases Section */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Configure Test Cases (At least 1 required)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[10px] font-bold text-zinc-300 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Test Case
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {testCases.map((tc, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-[#0e0e11] border border-white/5 p-3 rounded-xl">
                      <div className="sm:col-span-5 space-y-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Input (stdin)</span>
                        <textarea
                          rows={1}
                          required
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
                          placeholder="[2,7,11,15]\n9"
                          className="glass-input w-full rounded-lg p-2 font-mono text-[10px] bg-[#09090b]"
                        />
                      </div>
                      <div className="sm:col-span-5 space-y-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Expected Output (stdout)</span>
                        <textarea
                          rows={1}
                          required
                          value={tc.expectedOutput}
                          onChange={(e) => handleTestCaseChange(index, "expectedOutput", e.target.value)}
                          placeholder="[0,1]"
                          className="glass-input w-full rounded-lg p-2 font-mono text-[10px] bg-[#09090b]"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center gap-1.5 h-full pb-2">
                        <input
                          type="checkbox"
                          id={`sample-${index}`}
                          checked={tc.isSample}
                          onChange={(e) => handleTestCaseChange(index, "isSample", e.target.checked)}
                          className="rounded border-zinc-700 bg-[#09090b]"
                        />
                        <label htmlFor={`sample-${index}`} className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider select-none cursor-pointer">
                          Sample
                        </label>
                      </div>
                      <div className="sm:col-span-1 text-center pb-1">
                        <button
                          type="button"
                          disabled={testCases.length === 1}
                          onClick={() => handleRemoveTestCase(index)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded bg-white/2 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glow-btn-primary flex items-center gap-1 rounded-xl px-5 py-2 text-white font-semibold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Challenge"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid: Challenges list + Recent submissions logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge Manager Table */}
        <div className="glass-panel p-6 rounded-2xl text-left space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Code className="h-4.5 w-4.5 text-indigo-400" />
            Challenge Manager
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Challenge</th>
                  <th className="px-4 py-2 w-24">Difficulty</th>
                  <th className="px-4 py-2 text-center w-24">Acceptance</th>
                  <th className="px-4 py-2 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {problems.map((prob) => (
                  <tr key={prob.id} className="hover:bg-white/[0.01]">
                    {/* Title */}
                    <td className="px-4 py-3 font-semibold text-white">
                      <Link href={`/problems/${prob.slug}`} className="hover:text-cyan-400 transition-all">
                        {prob.title}
                      </Link>
                    </td>
                    {/* Difficulty */}
                    <td className="px-4 py-3">
                      <span className={`inline-block border px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide ${
                        prob.difficulty === "EASY" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                        prob.difficulty === "MEDIUM" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                        "text-red-400 border-red-500/20 bg-red-500/5"
                      }`}>
                        {prob.difficulty}
                      </span>
                    </td>
                    {/* Acceptance */}
                    <td className="px-4 py-3 text-center font-mono text-zinc-400">
                      {prob.acceptanceRate.toFixed(1)}%
                    </td>
                    {/* Delete Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteProblem(prob.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete Problem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {problems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                      No problems uploaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Management Feed */}
        <div className="glass-panel p-6 rounded-2xl text-left space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Users className="h-4.5 w-4.5 text-pink-400" />
            User Management
          </h3>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {usersList.map((u) => (
              <div key={u.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-3 space-y-1.5 text-[11px] leading-relaxed">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white truncate max-w-[120px]" title={u.name}>{u.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${u.role === "ADMIN" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-white/5 text-zinc-400 border border-white/10"}`}>
                    {u.role}
                  </span>
                </div>
                <p className="text-zinc-500 font-mono text-[10px] truncate">{u.email}</p>
                <div className="flex justify-between items-center pt-1 border-t border-white/2">
                  <span className="font-mono text-[10px] text-zinc-400 flex items-center gap-2">
                    Level {u.level}
                    {u.emailVerified ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Unverified</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {!u.emailVerified && (
                      <button
                        onClick={() => handleForceVerify(u.id)}
                        className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-amber-500/10 transition-colors"
                        title="Force Verify Email"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {usersList.length === 0 && (
              <p className="text-xs text-zinc-500 font-mono py-4 text-center">No users found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Play, Sparkles, Trophy, User, Target, Zap, Swords } from "lucide-react";
import Link from "next/link";

const languages = ["C", "C++", "Java", "Kotlin", "Python", "JavaScript", "TypeScript", "Go", "Rust"];
const topics = ["Variables", "Loops", "Functions", "OOP", "Data Structures", "Algorithms", "Concurrency"];
const difficulties = ["Easy", "Medium", "Hard"];

export default function ArenaDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [lang, setLang] = useState("JavaScript");
  const [topic, setTopic] = useState("Functions");
  const [diff, setDiff] = useState("Medium");
  const [generating, setGenerating] = useState(false);

  const handleStartQuickQuiz = async () => {
    // Navigate to play mode with selected lang
    router.push(`/arena/play?mode=Quick&lang=${encodeURIComponent(lang)}`);
  };

  const handleGenerateAIQuiz = async () => {
    if (!user) return alert("Must be logged in!");
    setGenerating(true);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ language: lang, category: topic, difficulty: diff, count: 5 })
      });
      const data = await res.json();
      if (res.ok) {
        // AI generated successfully, now play Topic Challenge
        router.push(`/arena/play?mode=Topic&lang=${encodeURIComponent(lang)}`);
      } else {
        alert(data.error || "Failed to generate AI Quiz");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating quiz.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 relative z-10 text-white min-h-screen">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="text-left space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500 flex items-center gap-3">
            <Swords className="h-8 w-8 text-violet-400" />
            Quiz Arena
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl">
            Test your knowledge, compete with friends, and climb the global leaderboards in fast-paced coding quizzes.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/arena/leaderboard" className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/5 transition">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold">Leaderboard</span>
          </Link>
          <Link href="/arena/profile" className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/5 transition">
            <User className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold">Profile</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Setup Quiz */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Target className="w-48 h-48" />
            </div>
            
            <h2 className="text-2xl font-bold mb-6">Setup Challenge</h2>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">Select Language</label>
                <div className="flex flex-wrap gap-2">
                  {languages.map(l => (
                    <button 
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${lang === l ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">Select Topic (For AI Quiz)</label>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => (
                    <button 
                      key={t}
                      onClick={() => setTopic(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${topic === t ? 'bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">Difficulty</label>
                <div className="flex gap-3">
                  {difficulties.map(d => (
                    <button 
                      key={d}
                      onClick={() => setDiff(d)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        diff === d 
                        ? d === 'Easy' ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300' 
                        : d === 'Medium' ? 'border-amber-500/50 bg-amber-500/20 text-amber-300' 
                        : 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                        : 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button 
                onClick={handleStartQuickQuiz}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black px-6 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Zap className="h-5 w-5" />
                Play Quick Quiz
              </button>
              
              <button 
                onClick={handleGenerateAIQuiz}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-4 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                {generating ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {generating ? "Generating..." : "AI Generate & Play"}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Col: Modes & Daily Challenge */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/40 to-black relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <h3 className="text-xl font-black text-indigo-400 mb-2">Daily Challenge</h3>
            <p className="text-sm text-zinc-300 mb-6">Complete today's curated quiz to earn a 2x XP multiplier and keep your streak alive!</p>
            <button className="w-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 py-3 rounded-xl font-bold hover:bg-indigo-500/30 transition shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]">
              Play Daily Challenge
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl border border-white/10"
          >
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Swords className="h-5 w-5 text-rose-400" />
              1v1 Battle
             </h3>
             <p className="text-xs text-zinc-400 mb-4">Challenge your friends in real-time. First to 10 points wins the wager!</p>
             <div className="flex gap-2">
               <input type="text" placeholder="Room Code" className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 flex-1 text-sm outline-none focus:border-rose-500/50 transition-colors" />
               <button className="bg-rose-500/20 text-rose-400 font-bold px-4 py-2 rounded-xl hover:bg-rose-500/30 transition">Join</button>
             </div>
             <div className="mt-3">
               <button className="w-full text-xs text-zinc-500 font-bold hover:text-white transition py-2">Create Private Room</button>
             </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

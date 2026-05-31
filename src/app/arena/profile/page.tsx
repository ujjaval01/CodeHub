"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, User, Activity, Flame, Target, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function ArenaProfile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch the specific UserQuizStats for this user
    // For now we'll fetch the leaderboard and find our user
    const fetchStats = async () => {
      try {
        if (!user) return;
        const res = await fetch("/api/leaderboard/quiz");
        const data = await res.json();
        if (data.leaderboard) {
          const myStats = data.leaderboard.find((s: any) => s.userId === user.id);
          setStats(myStats || { totalXP: 0, accuracy: "0.0", totalPlayed: 0, longestStreak: 0, rank: "Unranked" });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (!user) return <div className="text-white text-center py-20">Please log in.</div>;

  return (
    <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-10 min-h-screen text-white">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/arena" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <User className="h-8 w-8 text-blue-400" />
            Arena Profile
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <Star className="w-10 h-10 text-yellow-400 mb-3 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total XP</p>
            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">{stats.totalXP}</p>
          </motion.div>

          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <Target className="w-10 h-10 text-emerald-400 mb-3 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Accuracy</p>
            <p className="text-4xl font-black text-emerald-400">{stats.accuracy}%</p>
          </motion.div>

          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <Flame className="w-10 h-10 text-orange-500 mb-3 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Max Streak</p>
            <p className="text-4xl font-black text-orange-400">{stats.longestStreak}</p>
          </motion.div>

          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <Activity className="w-10 h-10 text-fuchsia-400 mb-3 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Quizzes Played</p>
            <p className="text-4xl font-black text-fuchsia-400">{stats.totalPlayed}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
